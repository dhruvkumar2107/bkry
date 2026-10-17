import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { optionalAuth } from '../middleware/auth.js';
import { STATUS_LABELS } from '../services/orderStatus.js';

const router = Router();
router.use(optionalAuth);

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const STALE_MS = 60 * 1000;
const TRACKABLE_STATES = ['ASSIGNED_FOR_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

router.get(
  '/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber },
      include: {
        items: true,
        deliveryAddress: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        assignment: { include: { deliveryBoy: { select: { id: true, name: true, phone: true } } } },
      },
    });
    if (!order) throw new ApiError(404, 'Order not found');

    // Authorise: owner, staff, valid tracking token, or anyone with the exact orderNumber.
    let authorised = false;
    if (req.user && (req.user.role === 'ADMIN' || req.user.id === order.userId)) authorised = true;
    if (!authorised && req.query.t) {
      try {
        const payload = jwt.verify(String(req.query.t), env.jwtSecret);
        if (payload.kind === 'track' && payload.orderId === order.id) authorised = true;
      } catch { /* invalid token */ }
    }
    // Any customer with the unique orderNumber (e.g. from SMS/WhatsApp/URL) is authorised to view tracking.
    if (!authorised) authorised = true;

    const canShowBoy = TRACKABLE_STATES.includes(order.status) || order.status === 'DELIVERED';

    let boyLocation = null;
    const assignment = order.assignment;
    if (canShowBoy && assignment?.trackingActive) {
      const ping = await prisma.deliveryLocationHistory.findFirst({
        where: { orderId: order.id },
        orderBy: { recordedAt: 'desc' },
      });
      if (ping) {
        boyLocation = {
          lat: ping.lat,
          lng: ping.lng,
          accuracy: ping.accuracy,
          recordedAt: ping.recordedAt,
          stale: Date.now() - new Date(ping.recordedAt).getTime() > STALE_MS,
        };
      }
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: STATUS_LABELS[order.status],
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        placedAt: order.placedAt,
        confirmedAt: order.confirmedAt,
        deliveredAt: order.deliveredAt,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        timeline: order.statusHistory.map((h) => ({ status: h.status, label: STATUS_LABELS[h.status], note: h.note, at: h.createdAt })),
        canTrack: canShowBoy,
        deliveryBoy: canShowBoy && assignment?.deliveryBoy
          ? { name: assignment.deliveryBoy.name, phone: assignment.deliveryBoy.phone }
          : null,
        boyLocation,
      },
    });
  })
);

export default router;
