import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { getSettings, updateSettings } from '../../services/settings.js';
import { env } from '../../config/env.js';
import { logAudit } from '../../services/audit.js';

const router = Router();

// --- Shop settings ----------------------------------------------------------
router.get('/', asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  res.json({
    success: true,
    settings,
    integrations: {
      cloudinary: Boolean(env.cloudinary.cloudName),
      razorpay: env.razorpay.enabled,
      twilio: env.twilio.enabled,
      whatsapp: env.whatsapp.enabled,
      email: env.smtp.enabled,
      googleMaps: Boolean(env.googleMapsApiKey),
      storageDriver: env.storageDriver,
      otpDevMode: env.otpDevMode,
    },
  });
}));

router.patch('/', validate(z.record(z.any())), asyncHandler(async (req, res) => {
  const settings = await updateSettings(req.body);
  await logAudit({ userId: req.user.id, action: 'SETTINGS_UPDATE', meta: Object.keys(req.body) });
  res.json({ success: true, settings });
}));

// --- Coupons ----------------------------------------------------------------
const couponSchema = z.object({
  code: z.string().min(3),
  description: z.string().nullable().optional(),
  type: z.enum(['PERCENT', 'FLAT']).default('PERCENT'),
  value: z.number().nonnegative().default(0),
  minOrder: z.number().nonnegative().default(0),
  maxDiscount: z.number().nonnegative().nullable().optional(),
  isActive: z.boolean().default(true),
  usageLimit: z.number().int().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

router.get('/coupons', asyncHandler(async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, coupons });
}));

router.post('/coupons', validate(couponSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const coupon = await prisma.coupon.create({
    data: {
      code: b.code.toUpperCase(),
      description: b.description,
      type: b.type,
      value: b.value,
      minOrder: b.minOrder,
      maxDiscount: b.maxDiscount ?? null,
      isActive: b.isActive,
      usageLimit: b.usageLimit ?? null,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
    },
  });
  res.status(201).json({ success: true, coupon });
}));

router.put('/coupons/:id', validate(couponSchema.partial()), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = { ...b };
  if (b.code) data.code = b.code.toUpperCase();
  if (b.startsAt !== undefined) data.startsAt = b.startsAt ? new Date(b.startsAt) : null;
  if (b.expiresAt !== undefined) data.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
  res.json({ success: true, coupon });
}));

router.delete('/coupons/:id', asyncHandler(async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

// --- Admin users ------------------------------------------------------------
router.get('/admins', asyncHandler(async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, phone: true, email: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, admins });
}));

router.post(
  '/admins',
  validate(z.object({ name: z.string().min(2), phone: z.string().min(10), email: z.string().email().optional().nullable(), password: z.string().min(6) })),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const exists = await prisma.user.findFirst({ where: { OR: [{ phone: b.phone }, { email: b.email || undefined }] } });
    if (exists) throw new ApiError(409, 'A user with this phone or email already exists');
    const passwordHash = await bcrypt.hash(b.password, 10);
    const user = await prisma.user.create({
      data: { name: b.name, phone: b.phone, email: b.email || null, passwordHash, role: 'ADMIN' },
    });
    await logAudit({ userId: req.user.id, action: 'ADMIN_CREATE', entity: 'User', entityId: user.id });
    res.status(201).json({ success: true, admin: { id: user.id, name: user.name } });
  })
);

router.patch(
  '/admins/:id',
  validate(z.object({ name: z.string().optional(), isActive: z.boolean().optional(), password: z.string().min(6).optional() })),
  asyncHandler(async (req, res) => {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ success: true });
  })
);

// --- Audit logs -------------------------------------------------------------
router.get('/audit', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.entity) where.entity = req.query.entity;
  if (req.query.action) where.action = req.query.action;
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  res.json({ success: true, logs });
}));

export default router;
