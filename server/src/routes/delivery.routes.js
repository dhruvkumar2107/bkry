import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { updateOrderStatus } from '../services/orderService.js';
import { emitToAdmins, emitToOrder } from '../lib/socket.js';
import { logAudit } from '../services/audit.js';

const router = Router();
router.use(requireAuth, requireRole('DELIVERY'));

const assignmentInclude = {
  order: {
    include: {
      items: true,
      deliveryAddress: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  },
};

const serializeAssignment = (a) => ({
  id: a.id,
  orderId: a.orderId,
  orderNumber: a.order.orderNumber,
  status: a.order.status,
  paymentMethod: a.order.paymentMethod,
  paymentStatus: a.order.paymentStatus,
  total: a.order.total,
  collectAmount: a.order.paymentMethod === 'COD' && a.order.paymentStatus !== 'PAID' ? a.order.total : 0,
  acceptedAt: a.acceptedAt,
  pickedUpAt: a.pickedUpAt,
  deliveredAt: a.deliveredAt,
  trackingActive: a.trackingActive,
  customer: {
    name: a.order.customerName,
    phone: a.order.customerPhone,
  },
  items: a.order.items,
  address: a.order.deliveryAddress,
  deliveryInstructions: a.order.deliveryInstructions,
});

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const profile = await prisma.deliveryProfile.findUnique({ where: { userId: req.user.id } });
    const [assigned, active, completed] = await Promise.all([
      prisma.deliveryAssignment.count({ where: { deliveryBoyId: req.user.id, acceptedAt: null } }),
      prisma.deliveryAssignment.count({
        where: { deliveryBoyId: req.user.id, acceptedAt: { not: null }, deliveredAt: null, failedAt: null },
      }),
      prisma.deliveryAssignment.count({ where: { deliveryBoyId: req.user.id, deliveredAt: { not: null } } }),
    ]);
    res.json({ success: true, profile, stats: { assigned, active, completed } });
  })
);

router.get(
  '/assignments',
  asyncHandler(async (req, res) => {
    const filter = req.query.filter || 'assigned';
    const base = { deliveryBoyId: req.user.id };
    let where = base;
    if (filter === 'assigned') where = { ...base, acceptedAt: null, failedAt: null, deliveredAt: null };
    if (filter === 'active') where = { ...base, acceptedAt: { not: null }, deliveredAt: null, failedAt: null };
    if (filter === 'completed') where = { ...base, deliveredAt: { not: null } };
    if (filter === 'failed') where = { ...base, failedAt: { not: null } };

    const assignments = await prisma.deliveryAssignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { assignedAt: 'desc' },
    });
    res.json({ success: true, assignments: assignments.map(serializeAssignment) });
  })
);

router.get(
  '/assignments/:id',
  asyncHandler(async (req, res) => {
    const a = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, deliveryBoyId: req.user.id },
      include: assignmentInclude,
    });
    if (!a) throw new ApiError(404, 'Assignment not found');
    res.json({ success: true, assignment: serializeAssignment(a) });
  })
);

router.post(
  '/assignments/:id/accept',
  asyncHandler(async (req, res) => {
    const a = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, deliveryBoyId: req.user.id },
      include: assignmentInclude,
    });
    if (!a) throw new ApiError(404, 'Assignment not found');
    if (!a.acceptedAt) {
      await prisma.deliveryAssignment.update({ where: { id: a.id }, data: { acceptedAt: new Date() } });
    }
    await logAudit({ userId: req.user.id, action: 'DELIVERY_ACCEPTED', entity: 'DeliveryAssignment', entityId: a.id });
    emitToAdmins('delivery:accepted', { assignmentId: a.id, orderId: a.orderId, orderNumber: a.order.orderNumber });
    res.json({ success: true });
  })
);

const statusSchema = z.object({
  status: z.enum(['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY']),
  note: z.string().optional(),
});

router.post(
  '/assignments/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const a = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, deliveryBoyId: req.user.id },
    });
    if (!a) throw new ApiError(404, 'Assignment not found');
    const { status, note } = req.body;

    await updateOrderStatus({ orderId: a.orderId, to: status, userId: req.user.id, note });

    const patch = {};
    if (status === 'PICKED_UP') patch.pickedUpAt = new Date();
    if (status === 'DELIVERED') patch.deliveredAt = new Date();
    if (status === 'FAILED_DELIVERY') patch.failedAt = new Date();
    if (Object.keys(patch).length) {
      await prisma.deliveryAssignment.update({ where: { id: a.id }, data: patch });
    }
    res.json({ success: true });
  })
);

router.post(
  '/assignments/:id/tracking/start',
  asyncHandler(async (req, res) => {
    const a = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, deliveryBoyId: req.user.id },
      include: { order: true },
    });
    if (!a) throw new ApiError(404, 'Assignment not found');
    if (!a.acceptedAt) throw new ApiError(400, 'Accept the order before sharing location');
    await prisma.deliveryAssignment.update({
      where: { id: a.id },
      data: { trackingActive: true, trackingStartedAt: new Date() },
    });
    emitToAdmins('delivery:tracking', { assignmentId: a.id, orderId: a.orderId, active: true });
    res.json({ success: true });
  })
);

router.post(
  '/assignments/:id/tracking/stop',
  asyncHandler(async (req, res) => {
    const a = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, deliveryBoyId: req.user.id },
    });
    if (!a) throw new ApiError(404, 'Assignment not found');
    await prisma.deliveryAssignment.update({
      where: { id: a.id },
      data: { trackingActive: false, trackingStoppedAt: new Date() },
    });
    emitToAdmins('delivery:tracking', { assignmentId: a.id, orderId: a.orderId, active: false });
    res.json({ success: true });
  })
);

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});

// Records a GPS ping. Only accepted while tracking is active for an assignment
// that belongs to the caller - prevents spoofed or background updates.
router.post(
  '/assignments/:id/location',
  validate(locationSchema),
  asyncHandler(async (req, res) => {
    const a = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, deliveryBoyId: req.user.id },
    });
    if (!a) throw new ApiError(404, 'Assignment not found');
    if (!a.trackingActive) throw new ApiError(400, 'Location sharing is not active for this order');

    const { lat, lng, accuracy } = req.body;
    const ping = await prisma.deliveryLocationHistory.create({
      data: { orderId: a.orderId, userId: req.user.id, lat, lng, accuracy: accuracy ?? null },
    });
    await prisma.deliveryProfile.updateMany({
      where: { userId: req.user.id },
      data: { lastLat: lat, lastLng: lng, lastAccuracy: accuracy ?? null, lastSeenAt: new Date() },
    });

    const payload = {
      orderId: a.orderId,
      assignmentId: a.id,
      deliveryBoyId: req.user.id,
      lat,
      lng,
      accuracy: accuracy ?? null,
      recordedAt: ping.recordedAt,
    };
    emitToAdmins('delivery:location', payload);
    emitToOrder(a.orderId, 'delivery:location', payload);
    res.json({ success: true, recordedAt: ping.recordedAt });
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { deliveryBoyId: req.user.id, OR: [{ deliveredAt: { not: null } }, { failedAt: { not: null } }] },
      include: assignmentInclude,
      orderBy: { deliveredAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, assignments: assignments.map(serializeAssignment) });
  })
);

export default router;
