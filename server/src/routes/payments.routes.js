import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { notify, ORDER_EVENTS } from '../services/notifications.js';
import { logAudit } from '../services/audit.js';

const router = Router();

// Creates a Razorpay order for online payment. Requires configured keys.
router.post(
  '/razorpay/create',
  requireAuth,
  validate(z.object({ orderNumber: z.string() })),
  asyncHandler(async (req, res) => {
    if (!env.razorpay.enabled) {
      throw new ApiError(400, 'Online payments are not configured on this server');
    }
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.body.orderNumber, userId: req.user.id },
    });
    if (!order) throw new ApiError(404, 'Order not found');

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
    if (!rpRes.ok) throw new ApiError(502, rpData?.error?.description || 'Failed to create payment');

    await prisma.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { providerRef: rpData.id },
    });

    res.json({ success: true, razorpayOrderId: rpData.id, keyId: env.razorpay.keyId, amount: order.total });
  })
);

// Verifies a Razorpay payment signature. Never trust the browser's word.
router.post(
  '/razorpay/verify',
  requireAuth,
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
      throw new ApiError(400, 'Payment verification failed');
    }

    const payment = await prisma.payment.findFirst({ where: { providerRef: razorpay_order_id } });
    if (!payment) throw new ApiError(404, 'Payment record not found');

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', providerRef: razorpay_payment_id, signature: razorpay_signature },
      }),
      prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } }),
    ]);

    await logAudit({ userId: req.user.id, action: 'PAYMENT_VERIFIED', entity: 'Order', entityId: payment.orderId });
    res.json({ success: true });
  })
);

// Razorpay webhook (server-to-server). Signature verified with webhook secret.
router.post(
  '/razorpay/webhook',
  asyncHandler(async (req, res) => {
    if (!env.razorpay.webhookSecret) return res.status(200).json({ success: false, error: 'webhook not configured' });
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(body).digest('hex');
    if (signature !== expected) return res.status(400).json({ success: false });

    const event = req.body?.event;
    const entity = req.body?.payload?.payment?.entity;
    if (event === 'payment.captured' && entity?.order_id) {
      const payment = await prisma.payment.findFirst({ where: { providerRef: entity.order_id } });
      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', providerRef: entity.id } }),
          prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } }),
        ]);
      }
    }
    res.json({ success: true });
  })
);

// Payment is optional for COD orders; expose whether online payment is live.
router.get('/config', asyncHandler(async (_req, res) => {
  res.json({ success: true, razorpayEnabled: env.razorpay.enabled });
}));

export default router;
