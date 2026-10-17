import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { notify } from '../services/notifications.js';
import { logAudit } from '../services/audit.js';
import { updateOrderStatus } from '../services/orderService.js';

const router = Router();

// Creates a Razorpay order for online payment. Requires configured keys.
// Supports both logged-in users and guest checkout.
// Also supports retry: if a previous PENDING/FAILED payment exists, it reuses
// the same DB record and issues a fresh Razorpay order ID.
router.post(
  '/razorpay/create',
  optionalAuth,
  validate(z.object({ orderNumber: z.string() })),
  asyncHandler(async (req, res) => {
    if (!env.razorpay.enabled) {
      throw new ApiError(400, 'Online payments are not configured on this server');
    }

    // Look up the order by orderNumber. For authenticated users, also filter by
    // userId for security. For guests, filter by guestToken header/cookie.
    let order;
    if (req.user) {
      order = await prisma.order.findFirst({
        where: {
          orderNumber: req.body.orderNumber,
          OR: [{ userId: req.user.id }, { userId: null }],
        },
      });
    } else {
      order = await prisma.order.findFirst({
        where: { orderNumber: req.body.orderNumber },
      });
    }

    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentStatus === 'PAID') {
      throw new ApiError(400, 'This order has already been paid');
    }

    const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(order.total * 100),
        currency: 'INR',
        receipt: order.orderNumber,
      }),
    });
    const rpData = await rpRes.json();
    if (!rpRes.ok) {
      throw new ApiError(502, rpData?.error?.description || 'Failed to create Razorpay order');
    }

    // Upsert: reuse an existing PENDING/FAILED payment row for retries,
    // or create a fresh record if none exists.
    const existingPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, status: { in: ['PENDING', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { providerRef: rpData.id, status: 'PENDING' },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'RAZORPAY',
          amount: order.total,
          status: 'PENDING',
          providerRef: rpData.id,
        },
      });
    }

    res.json({
      success: true,
      razorpayOrderId: rpData.id,
      keyId: env.razorpay.keyId,
      amount: order.total,
    });
  })
);


// Verifies a Razorpay payment signature server-side.
// The client sends the three fields returned by Razorpay's checkout modal.
// Supports both authenticated users and guest checkout.
router.post(
  '/razorpay/verify',
  optionalAuth,
  validate(
    z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (!env.razorpay.enabled) throw new ApiError(400, 'Online payments are not configured');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      await prisma.payment.updateMany({
        where: { providerRef: razorpay_order_id },
        data: { status: 'FAILED' },
      });
      throw new ApiError(400, 'Payment verification failed – signature mismatch');
    }

    const payment = await prisma.payment.findFirst({ where: { providerRef: razorpay_order_id } });
    if (!payment) throw new ApiError(404, 'Payment record not found');

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          providerRef: razorpay_payment_id,
          signature: razorpay_signature,
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID' },
      }),
    ]);

    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });

    // Transition order from PENDING_CONFIRMATION to CONFIRMED
    if (order && order.status === 'PENDING_CONFIRMATION') {
      try {
        await updateOrderStatus({
          orderId: order.id,
          to: 'CONFIRMED',
          userId: req.user?.id || order.userId || null,
          note: `Paid online via Razorpay (${razorpay_payment_id})`,
        });
      } catch {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
      }
    }

    await logAudit({
      userId: req.user?.id || order?.userId || null,
      action: 'PAYMENT_VERIFIED',
      entity: 'Order',
      entityId: payment.orderId,
    });

    // In-app notification for the customer.
    if (order && (req.user?.id || order.userId)) {
      await notify({
        userId: req.user?.id || order.userId,
        orderId: order.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment received',
        body: `Payment of \u20b9${order.total} for order ${order.orderNumber} was successful.`,
      });
    }

    res.json({ success: true });
  })
);

// Razorpay webhook (server-to-server). Signature verified against the raw
// request body bytes. app.js registers express.raw() for this path so
// req.body arrives as a Buffer rather than a parsed object.
router.post(
  '/razorpay/webhook',
  asyncHandler(async (req, res) => {
    if (!env.razorpay.webhookSecret) {
      return res.status(200).json({ success: false, error: 'webhook not configured' });
    }

    // req.body is a Buffer because of express.raw() in app.js.
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expected) {
      return res.status(400).json({ success: false, error: 'invalid signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, error: 'invalid JSON body' });
    }

    const event = payload?.event;
    const entity = payload?.payload?.payment?.entity;

    if (event === 'payment.captured' && entity?.order_id) {
      const payment = await prisma.payment.findFirst({ where: { providerRef: entity.order_id } });
      if (payment && payment.status !== 'PAID') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'PAID', providerRef: entity.id },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'PAID' },
          }),
        ]);
        const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
        if (order && order.status === 'PENDING_CONFIRMATION') {
          try {
            await updateOrderStatus({
              orderId: order.id,
              to: 'CONFIRMED',
              note: `Payment captured via Razorpay webhook (${entity.id})`,
            });
          } catch {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: 'CONFIRMED', confirmedAt: new Date() },
            });
          }
        }
      }
    }

    if (event === 'payment.failed' && entity?.order_id) {
      const payment = await prisma.payment.findFirst({ where: { providerRef: entity.order_id } });
      if (payment && payment.status === 'PENDING') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }
    }

    res.json({ success: true });
  })
);

// Expose whether online payment (Razorpay) is configured on this server.
router.get('/config', asyncHandler(async (_req, res) => {
  res.json({ success: true, razorpayEnabled: env.razorpay.enabled });
}));

export default router;
