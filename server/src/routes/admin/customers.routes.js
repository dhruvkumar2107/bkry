import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { toCsv } from '../../utils/helpers.js';
import { logAudit } from '../../services/audit.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const where = { role: 'CUSTOMER' };
    if (req.query.q) {
      where.OR = [{ name: { contains: req.query.q } }, { phone: { contains: req.query.q } }, { email: { contains: req.query.q } }];
    }
    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { orders: true } } },
      }),
    ]);
    res.json({
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        isActive: c.isActive,
        createdAt: c.createdAt,
        lastLoginAt: c.lastLoginAt,
        orderCount: c._count.orders,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  '/export/csv',
  asyncHandler(async (req, res) => {
    await logAudit({ userId: req.user.id, action: 'CUSTOMER_EXPORT', ip: req.ip });
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: { _count: { select: { orders: true } }, orders: { select: { total: true } } },
    });
    const rows = customers.map((c) => ({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      orders: c._count.orders,
      lifetimeValue: c.orders.reduce((s, o) => s + o.total, 0).toFixed(2),
      joined: c.createdAt.toISOString().slice(0, 10),
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chotulal-customers.csv"');
    res.send(toCsv(rows));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'CUSTOMER' },
      include: {
        orders: { orderBy: { placedAt: 'desc' }, include: { items: true } },
        addresses: true,
      },
    });
    if (!customer) throw new ApiError(404, 'Customer not found');
    const totalSpent = customer.orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
    res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        lastLoginAt: customer.lastLoginAt,
        addresses: customer.addresses,
        orders: customer.orders,
        stats: { totalOrders: customer.orders.length, totalSpent },
      },
    });
  })
);

router.patch(
  '/:id',
  validate(z.object({ isActive: z.boolean().optional(), name: z.string().optional(), email: z.string().email().nullable().optional() })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user.id, action: 'CUSTOMER_UPDATE', entity: 'User', entityId: user.id, meta: req.body });
    res.json({ success: true, customer: { id: user.id, isActive: user.isActive } });
  })
);

export default router;
