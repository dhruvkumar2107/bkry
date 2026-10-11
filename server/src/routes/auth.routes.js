import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { signToken } from '../middleware/auth.js';
import { setOtp, verifyOtp, clearOtp } from '../lib/otpStore.js';
import { logAudit } from '../services/audit.js';
import { notify } from '../services/notifications.js';
import { genOtp } from '../utils/helpers.js';

const router = Router();

const cookieOpts = {
  httpOnly: true,
  sameSite: env.isProd ? 'none' : 'lax',
  secure: env.isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  email: u.email,
  role: u.role,
  avatarUrl: u.avatarUrl,
});

// --- Customer OTP login -----------------------------------------------------
router.post(
  '/request-otp',
  validate(z.object({ phone: z.string().min(10).max(15) })),
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const code = env.otpDevMode ? env.otpDevCode : genOtp();
    setOtp(phone, code);

    // In production, send via configured SMS provider. If none is configured
    // we do NOT pretend a message was sent.
    if (env.otpDevMode) {
      // eslint-disable-next-line no-console
      console.log(`\n[OTP] ${phone} => ${code} (development mode)\n`);
    } else if (env.twilio.enabled) {
      // Real SMS integration should be wired here using env.twilio credentials.
      throw new ApiError(501, 'SMS provider integration is not yet wired');
    } else {
      throw new ApiError(503, 'No SMS provider is configured. Set OTP_DEV_MODE=true for development.');
    }

    res.json({
      success: true,
      message: env.otpDevMode ? 'Development OTP issued' : 'OTP sent',
      ...(env.otpDevMode ? { devCode: code } : {}),
    });
  })
);

router.post(
  '/verify-otp',
  validate(
    z.object({
      phone: z.string().min(10).max(15),
      code: z.string().min(4).max(6),
      name: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { phone, code, name } = req.body;
    const result = verifyOtp(phone, code);
    if (!result.ok) throw new ApiError(400, result.reason);

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, name: name || null, role: 'CUSTOMER' },
      });
    } else if (!user.isActive) {
      throw new ApiError(403, 'This account has been disabled');
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = signToken(user);
    res.cookie('token', token, cookieOpts);
    res.json({ success: true, token, user: publicUser(user) });
  })
);

// --- Staff (admin / delivery) password login --------------------------------
router.post(
  '/login',
  validate(
    z.object({
      identifier: z.string().min(3), // phone or email
      password: z.string().min(4),
      role: z.enum(['ADMIN', 'DELIVERY']).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { identifier, password, role } = req.body;
    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: identifier }, { email: identifier }] },
    });
    if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid credentials');
    if (!user.isActive) throw new ApiError(403, 'Account disabled');
    if (user.role === 'CUSTOMER') throw new ApiError(403, 'Please use OTP login');
    if (role && user.role !== role) throw new ApiError(403, 'Not authorised for this panel');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Invalid credentials');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await logAudit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ip: req.ip });

    const token = signToken(user);
    res.cookie('token', token, cookieOpts);
    res.json({ success: true, token, user: publicUser(user) });
  })
);

router.post('/logout', asyncHandler(async (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
}));

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { deliveryProfile: true, _count: { select: { orders: true, addresses: true } } },
    });
    res.json({ success: true, user: { ...publicUser(user), deliveryProfile: user.deliveryProfile, counts: user._count } });
  })
);

router.patch(
  '/profile',
  requireAuth,
  validate(z.object({ name: z.string().optional(), email: z.string().email().optional() })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
    res.json({ success: true, user: publicUser(user) });
  })
);

// --- Saved addresses --------------------------------------------------------
router.get(
  '/addresses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, addresses });
  })
);

const addressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(3),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  instructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});

router.post(
  '/addresses',
  requireAuth,
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const data = { ...req.body, userId: req.user.id };
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({ data });
    res.status(201).json({ success: true, address });
  })
);

router.put(
  '/addresses/:id',
  requireAuth,
  validate(addressSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) throw new ApiError(404, 'Address not found');
    if (req.body.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.update({ where: { id: existing.id }, data: req.body });
    res.json({ success: true, address });
  })
);

router.delete(
  '/addresses/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) throw new ApiError(404, 'Address not found');
    await prisma.address.delete({ where: { id: existing.id } });
    res.json({ success: true });
  })
);

router.get(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, notifications });
  })
);

router.post(
  '/notifications/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id }, data: { isRead: true } });
    res.json({ success: true });
  })
);

export default router;
