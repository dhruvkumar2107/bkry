import { Router } from 'express';
import dayjs from 'dayjs';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/http.js';
import { toCsv, round2 } from '../../utils/helpers.js';

const router = Router();

const rangeWhere = (req) => {
  const where = { status: { notIn: ['CANCELLED', 'FAILED_DELIVERY'] } };
  if (req.query.from || req.query.to) {
    where.placedAt = {};
    if (req.query.from) where.placedAt.gte = dayjs(req.query.from).startOf('day').toDate();
    if (req.query.to) where.placedAt.lte = dayjs(req.query.to).endOf('day').toDate();
  }
  return where;
};

router.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const groupBy = req.query.groupBy || 'daily';
    const where = rangeWhere(req);
    const orders = await prisma.order.findMany({ where, select: { placedAt: true, total: true } });

    const buckets = {};
    for (const o of orders) {
      let key;
      if (groupBy === 'monthly') key = dayjs(o.placedAt).format('YYYY-MM');
      else if (groupBy === 'weekly') key = dayjs(o.placedAt).startOf('week').format('YYYY-MM-DD');
      else key = dayjs(o.placedAt).format('YYYY-MM-DD');
      if (!buckets[key]) buckets[key] = { period: key, orders: 0, sales: 0 };
      buckets[key].orders += 1;
      buckets[key].sales += o.total;
    }
    const data = Object.values(buckets).sort((a, b) => (a.period < b.period ? -1 : 1)).map((b) => ({ ...b, sales: round2(b.sales) }));
    res.json({ success: true, groupBy, data, totalSales: round2(data.reduce((s, d) => s + d.sales, 0)), totalOrders: orders.length });
  })
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const where = req.query.from || req.query.to ? { order: rangeWhere(req) } : { order: { status: { notIn: ['CANCELLED', 'FAILED_DELIVERY'] } } };
    const grouped = await prisma.orderItem.groupBy({
      by: ['name'],
      where,
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
    });
    res.json({
      success: true,
      products: grouped.map((g) => ({ name: g.name, units: g._sum.quantity || 0, revenue: round2(g._sum.lineTotal || 0) })),
    });
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const where = rangeWhere(req);
    const categories = await prisma.category.findMany({
      include: {
        products: {
          include: {
            product: { include: { orderItems: { where: { order: where } } } },
          },
        },
      },
    });
    res.json({
      success: true,
      categories: categories.map((c) => {
        let units = 0;
        let revenue = 0;
        for (const pc of c.products) {
          for (const oi of pc.product.orderItems) {
            units += oi.quantity;
            revenue += oi.lineTotal;
          }
        }
        return { id: c.id, name: c.name, units, revenue: round2(revenue) };
      }),
    });
  })
);

router.get(
  '/orders-by-status',
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.order.groupBy({ by: ['status'], _count: true, _sum: { total: true } });
    res.json({ success: true, statuses: grouped.map((g) => ({ status: g.status, count: g._count, value: round2(g._sum.total || 0) })) });
  })
);

router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const where = rangeWhere(req);
    const grouped = await prisma.order.groupBy({ by: ['paymentMethod', 'paymentStatus'], where, _count: true, _sum: { total: true } });
    res.json({
      success: true,
      payments: grouped.map((g) => ({ method: g.paymentMethod, status: g.paymentStatus, count: g._count, amount: round2(g._sum.total || 0) })),
    });
  })
);

router.get(
  '/delivery-performance',
  asyncHandler(async (_req, res) => {
    const boys = await prisma.user.findMany({ where: { role: 'DELIVERY' }, select: { id: true, name: true } });
    const results = await Promise.all(
      boys.map(async (b) => {
        const assignments = await prisma.deliveryAssignment.findMany({
          where: { deliveryBoyId: b.id, OR: [{ deliveredAt: { not: null } }, { failedAt: { not: null } }] },
          select: { assignedAt: true, deliveredAt: true, failedAt: true },
        });
        const delivered = assignments.filter((a) => a.deliveredAt);
        const failed = assignments.filter((a) => a.failedAt);
        const durations = delivered.map((a) => (new Date(a.deliveredAt) - new Date(a.assignedAt)) / 60000);
        const avgMinutes = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
        return { id: b.id, name: b.name, delivered: delivered.length, failed: failed.length, avgMinutes: round2(avgMinutes) };
      })
    );
    res.json({ success: true, performance: results });
  })
);

router.get(
  '/inventory-valuation',
  asyncHandler(async (_req, res) => {
    const variants = await prisma.productVariant.findMany({ include: { product: { select: { name: true } } } });
    const rows = variants.map((v) => ({ product: v.product.name, variant: v.label, price: v.price, stock: v.stock, value: round2(v.price * v.stock) }));
    res.json({ success: true, rows, totalValue: round2(rows.reduce((s, r) => s + r.value, 0)) });
  })
);

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const type = req.query.type || 'orders';
    let csv = '';
    if (type === 'products') {
      const grouped = await prisma.orderItem.groupBy({ by: ['name'], _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: 'desc' } } });
      csv = toCsv(grouped.map((g) => ({ product: g.name, units: g._sum.quantity || 0, revenue: round2(g._sum.lineTotal || 0) })));
    } else if (type === 'status') {
      const grouped = await prisma.order.groupBy({ by: ['status'], _count: true, _sum: { total: true } });
      csv = toCsv(grouped.map((g) => ({ status: g.status, count: g._count, value: round2(g._sum.total || 0) })));
    } else if (type === 'inventory') {
      const variants = await prisma.productVariant.findMany({ include: { product: { select: { name: true } } } });
      csv = toCsv(variants.map((v) => ({ product: v.product.name, variant: v.label, price: v.price, stock: v.stock, value: round2(v.price * v.stock) })));
    } else {
      const orders = await prisma.order.findMany({ orderBy: { placedAt: 'desc' } });
      csv = toCsv(orders.map((o) => ({ orderNumber: o.orderNumber, date: dayjs(o.placedAt).format('YYYY-MM-DD HH:mm'), customer: o.customerName, status: o.status, total: o.total, paymentMethod: o.paymentMethod })));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chotulal-${type}.csv"`);
    res.send(csv);
  })
);

export default router;
