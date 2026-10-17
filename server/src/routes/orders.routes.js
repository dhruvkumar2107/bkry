import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { computeTotals, validateCoupon } from '../services/pricing.js';
import { getSettings } from '../services/settings.js';
import { decrementStock } from '../services/inventory.js';
import { notify, ORDER_EVENTS } from '../services/notifications.js';
import { logAudit } from '../services/audit.js';
import { emitToAdmins, emitToDelivery } from '../lib/socket.js';
import { genOrderNumber } from '../utils/helpers.js';

const router = Router();

export const signTrackingToken = (order) =>
  jwt.sign({ orderId: order.id, orderNumber: order.orderNumber, kind: 'track' }, env.jwtSecret, {
    expiresIn: '14d',
  });

const orderInclude = {
  items: true,
  deliveryAddress: true,
  assignment: { include: { deliveryBoy: { select: { id: true, name: true, phone: true } } } },
  statusHistory: { orderBy: { createdAt: 'asc' } },
  payments: true,
};

export const serializeOrder = (o, { includeTrackingToken = false } = {}) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  status: o.status,
  customerName: o.customerName,
  customerPhone: o.customerPhone,
  subtotal: o.subtotal,
  discount: o.discount,
  deliveryFee: o.deliveryFee,
  taxAmount: o.taxAmount,
  total: o.total,
  couponCode: o.couponCode,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  deliveryInstructions: o.deliveryInstructions,
  cancelledReason: o.cancelledReason,
  failedReason: o.failedReason,
  placedAt: o.placedAt,
  confirmedAt: o.confirmedAt,
  deliveredAt: o.deliveredAt,
  items: o.items,
  deliveryAddress: o.deliveryAddress,
  assignment: o.assignment,
  statusHistory: o.statusHistory,
  payments: (o.payments || []).map((p) => ({ id: p.id, provider: p.provider, status: p.status, amount: p.amount })),
  ...(includeTrackingToken ? { trackingToken: signTrackingToken(o) } : {}),
});

const addressSchema = z.object({
  addressId: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  instructions: z.string().optional(),
});

router.use(optionalAuth);

// --- Checkout -----------------------------------------------------------------
router.post(
  '/checkout',
  validate(
    z.object({
      customerName: z.string().min(2).optional(),
      customerPhone: z.string().min(10).max(15).optional(),
      address: addressSchema.optional(),
      addressId: z.string().optional(),
      couponCode: z.string().optional(),
      paymentMethod: z.enum(['COD', 'ONLINE']).default('COD'),
      deliveryInstructions: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    const body = req.body;

    if (!req.user && !settings.guestCheckoutEnabled) {
      throw new ApiError(401, 'Please log in to place an order');
    }

    const guestToken = req.headers['x-guest-token'] || req.cookies?.guestToken || null;
    const cart = req.user
      ? await prisma.cart.findFirst({ where: { userId: req.user.id } })
      : await prisma.cart.findUnique({ where: { guestToken } });
    if (!cart) throw new ApiError(400, 'Your cart is empty');

    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } }, variant: true },
    });
    if (!cartItems.length) throw new ApiError(400, 'Your cart is empty');

    const priced = cartItems.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      name: it.product.name,
      variant: it.variant,
      product: it.product,
      quantity: it.quantity,
    }));

    let coupon = null;
    if (body.couponCode) {
      const found = await prisma.coupon.findUnique({ where: { code: body.couponCode.toUpperCase() } });
      const check = validateCoupon(found, priced.reduce((s, i) => s + i.variant.price * i.quantity, 0));
      if (!check.ok) throw new ApiError(400, check.reason);
      coupon = found;
    }

    const totals = computeTotals({ items: priced, coupon, settings, paymentMethod: body.paymentMethod });
    if (settings.minOrderAmount && totals.subtotal < settings.minOrderAmount) {
      throw new ApiError(400, `Minimum order amount is ₹${settings.minOrderAmount}`);
    }

    if (body.paymentMethod === 'ONLINE' && !env.razorpay.enabled) {
      throw new ApiError(400, 'Online payment is not configured. Please choose Cash on Delivery.');
    }
    if (body.paymentMethod === 'COD' && !settings.codEnabled) {
      throw new ApiError(400, 'Cash on delivery is currently unavailable');
    }

    // Resolve delivery address
    let addr;
    if (body.addressId) {
      if (!req.user) throw new ApiError(401, 'Login required to use saved addresses');
      const saved = await prisma.address.findFirst({ where: { id: body.addressId, userId: req.user.id } });
      if (!saved) throw new ApiError(404, 'Saved address not found');
      addr = saved;
    } else if (body.address) {
      addr = body.address;
    } else {
      throw new ApiError(400, 'A delivery address is required');
    }
    if (!addr.line1) throw new ApiError(400, 'Delivery address line is required');

    const customerName = req.user?.name || body.customerName;
    const customerPhone = req.user?.phone || body.customerPhone;
    if (!customerName || !customerPhone) {
      throw new ApiError(400, 'Customer name and phone number are required');
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: genOrderNumber(),
          userId: req.user?.id || null,
          customerName,
          customerPhone,
          subtotal: totals.subtotal,
          discount: totals.discount,
          deliveryFee: totals.deliveryFee,
          taxAmount: totals.taxAmount,
          total: totals.total,
          couponCode: coupon?.code || null,
          paymentMethod: body.paymentMethod,
          paymentStatus: 'PENDING',
          deliveryInstructions: body.deliveryInstructions || addr.instructions || null,
          deliveryAddress: {
            create: {
              line1: addr.line1,
              line2: addr.line2 || null,
              landmark: addr.landmark || null,
              city: addr.city || null,
              pincode: addr.pincode || null,
              lat: addr.lat ?? null,
              lng: addr.lng ?? null,
              instructions: body.deliveryInstructions || addr.instructions || null,
            },
          },
          items: {
            create: totals.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              name: l.name,
              variantLabel: l.variantLabel,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
              imageUrl: l.imageUrl,
            })),
          },
          payments: {
            create: {
              provider: body.paymentMethod === 'ONLINE' ? 'RAZORPAY' : 'COD',
              amount: totals.total,
              status: 'PENDING',
            },
          },
          statusHistory: { create: { status: 'PENDING_CONFIRMATION', note: 'Order placed' } },
        },
        include: orderInclude,
      });

      // Transaction-safe stock deduction (prevents overselling).
      await decrementStock(tx, totals.lines, { orderId: created.id, userId: req.user?.id });

      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'ORDER_PLACED',
      entity: 'Order',
      entityId: order.id,
      meta: { orderNumber: order.orderNumber, total: order.total },
      ip: req.ip,
    });

    await notify({
      userId: req.user?.id,
      orderId: order.id,
      ...ORDER_EVENTS.PLACED,
      body: `Your order ${order.orderNumber} has been placed.`,
    });

    emitToAdmins('order:new', { orderId: order.id, orderNumber: order.orderNumber, total: order.total });
    emitToDelivery('order:new', { orderId: order.id, orderNumber: order.orderNumber });

    res.status(201).json({
      success: true,
      order: serializeOrder(order, { includeTrackingToken: true }),
      // Online payment orders need a Razorpay order - created in payments route.
    });
  })
);

// --- Customer order history ---------------------------------------------------
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true, deliveryAddress: true, assignment: { include: { deliveryBoy: true } } },
      orderBy: { placedAt: 'desc' },
    });
    res.json({ success: true, orders: orders.map((o) => serializeOrder(o)) });
  })
);

router.get(
  '/:orderNumber',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber, userId: req.user.id },
      include: orderInclude,
    });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ success: true, order: serializeOrder(order, { includeTrackingToken: true }) });
  })
);

// Cancel by customer (only before dispatch)
router.post(
  '/:orderNumber/cancel',
  requireAuth,
  validate(z.object({ reason: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber, userId: req.user.id },
      include: { items: true },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!['PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING'].includes(order.status)) {
      throw new ApiError(400, 'This order can no longer be cancelled. Please contact the shop.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledReason: req.body.reason || 'Cancelled by customer',
          statusHistory: { create: { status: 'CANCELLED', note: req.body.reason || 'Cancelled by customer', userId: req.user.id } },
        },
        include: orderInclude,
      });
      const { restoreStock } = await import('../services/inventory.js');
      await restoreStock(tx, order.items, { orderId: order.id, userId: req.user.id });
      return o;
    });

    await notify({ userId: req.user.id, orderId: order.id, ...ORDER_EVENTS.CANCELLED, body: `Order ${order.orderNumber} was cancelled.` });
    res.json({ success: true, order: serializeOrder(updated) });
  })
);

export default router;
