import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { logAudit } from '../../services/audit.js';

const router = Router();

const mapLink = (lat, lng) => (lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null);

router.get(
  '/boys',
  asyncHandler(async (_req, res) => {
    const boys = await prisma.user.findMany({
      where: { role: 'DELIVERY' },
      include: { deliveryProfile: true, _count: { select: { assignments: true } } },
      orderBy: { name: 'asc' },
    });
    const withStats = await Promise.all(
      boys.map(async (b) => {
        const delivered = await prisma.deliveryAssignment.count({ where: { deliveryBoyId: b.id, deliveredAt: { not: null } } });
        const active = await prisma.deliveryAssignment.count({
          where: { deliveryBoyId: b.id, acceptedAt: { not: null }, deliveredAt: null, failedAt: null },
        });
        return {
          id: b.id,
          name: b.name,
          phone: b.phone,
          email: b.email,
          isActive: b.isActive,
          profile: b.deliveryProfile,
          stats: { assigned: b._count.assignments, delivered, active },
          lastLocation: b.deliveryProfile?.lastLat != null
            ? { lat: b.deliveryProfile.lastLat, lng: b.deliveryProfile.lastLng, at: b.deliveryProfile.lastSeenAt, mapLink: mapLink(b.deliveryProfile.lastLat, b.deliveryProfile.lastLng) }
            : null,
        };
      })
    );
    res.json({ success: true, boys: withStats });
  })
);

router.post(
  '/boys',
  validate(
    z.object({
      name: z.string().min(2),
      phone: z.string().min(10).max(15),
      email: z.string().email().optional().nullable(),
      password: z.string().min(6),
      vehicleType: z.string().optional(),
      vehicleNumber: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const exists = await prisma.user.findFirst({ where: { OR: [{ phone: b.phone }, { email: b.email || undefined }] } });
    if (exists) throw new ApiError(409, 'A user with this phone or email already exists');
    const passwordHash = await bcrypt.hash(b.password, 10);
    const user = await prisma.user.create({
      data: {
        name: b.name,
        phone: b.phone,
        email: b.email || null,
        passwordHash,
        role: 'DELIVERY',
        deliveryProfile: { create: { vehicleType: b.vehicleType, vehicleNumber: b.vehicleNumber } },
      },
      include: { deliveryProfile: true },
    });
    await logAudit({ userId: req.user.id, action: 'DELIVERY_BOY_CREATE', entity: 'User', entityId: user.id });
    res.status(201).json({ success: true, boy: { id: user.id, name: user.name, phone: user.phone } });
  })
);

router.patch(
  '/boys/:id',
  validate(
    z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().nullable().optional(),
      password: z.string().min(6).optional(),
      isActive: z.boolean().optional(),
      vehicleType: z.string().optional(),
      vehicleNumber: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { password, vehicleType, vehicleNumber, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    if (vehicleType !== undefined || vehicleNumber !== undefined) {
      await prisma.deliveryProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, vehicleType, vehicleNumber },
        update: { vehicleType, vehicleNumber },
      });
    }
    await logAudit({ userId: req.user.id, action: 'DELIVERY_BOY_UPDATE', entity: 'User', entityId: user.id });
    res.json({ success: true });
  })
);

// Live deliveries: customer destination (fixed) + delivery boy (moving) markers.
router.get(
  '/live',
  asyncHandler(async (_req, res) => {
    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        order: { status: { in: ['ASSIGNED_FOR_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } },
      },
      include: {
        order: { include: { deliveryAddress: true, items: { select: { name: true, quantity: true, variantLabel: true } } } },
        deliveryBoy: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Last ping per order (batch)
    const orderIds = assignments.map((a) => a.orderId);
    const pings = orderIds.length
      ? await prisma.deliveryLocationHistory.findMany({
          where: { orderId: { in: orderIds } },
          orderBy: { recordedAt: 'desc' },
        })
      : [];
    const latestByOrder = {};
    for (const p of pings) if (!latestByOrder[p.orderId]) latestByOrder[p.orderId] = p;

    const STALE_MS = 60 * 1000;
    res.json({
      success: true,
      deliveries: assignments.map((a) => {
        const addr = a.order.deliveryAddress;
        const ping = latestByOrder[a.orderId];
        return {
          assignmentId: a.id,
          orderId: a.orderId,
          orderNumber: a.order.orderNumber,
          status: a.order.status,
          customerName: a.order.customerName,
          customerPhone: a.order.customerPhone,
          items: a.order.items,
          address: addr ? { line1: addr.line1, line2: addr.line2, landmark: addr.landmark, city: addr.city, pincode: addr.pincode } : null,
          destination: addr && addr.lat != null ? { lat: addr.lat, lng: addr.lng, mapLink: mapLink(addr.lat, addr.lng) } : null,
          deliveryBoy: a.deliveryBoy,
          trackingActive: a.trackingActive,
          boyLocation: ping
            ? { lat: ping.lat, lng: ping.lng, accuracy: ping.accuracy, recordedAt: ping.recordedAt, stale: Date.now() - new Date(ping.recordedAt).getTime() > STALE_MS, mapLink: mapLink(ping.lat, ping.lng) }
            : null,
        };
      }),
    });
  })
);

router.get(
  '/:orderId/locations',
  asyncHandler(async (req, res) => {
    const pings = await prisma.deliveryLocationHistory.findMany({
      where: { orderId: req.params.orderId },
      orderBy: { recordedAt: 'asc' },
      take: 500,
    });
    res.json({ success: true, locations: pings });
  })
);

export default router;
