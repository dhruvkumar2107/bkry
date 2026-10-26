import { Router } from 'express';
import dayjs from 'dayjs';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/http.js';
import { round2 } from '../../utils/helpers.js';

const router = Router();

const startOfToday = () => dayjs().startOf('day').toDate();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const today = startOfToday();

    const [
      todayOrders,
      totalOrders,
      todaySalesAgg,
      pendingOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      totalCustomers,
      activeDeliveries,
      lowStockVariants,
      outOfStockVariants,
      recentOrders,
      recentActivity,
    ] = await Promise.all([
      prisma.order.count({ where: { placedAt: { gte: today } } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { placedAt: { gte: today }, status: { notIn: ['CANCELLED', 'FAILED_DELIVERY'] } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: 'PENDING_CONFIRMATION' } }),
      prisma.order.count({
        where: {
          status: { in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED_FOR_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
        },
      }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.deliveryAssignment.count({
        where: { acceptedAt: { not: null }, deliveredAt: null, failedAt: null },
      }),
      prisma.productVariant.findMany({
        where: { isActive: true, stock: { gt: 0, lte: 5 } },
        include: { product: { select: { name: true } } },
        take: 10,
        orderBy: { stock: 'asc' },
      }),
      prisma.productVariant.findMany({
        where: { isActive: true, stock: { lte: 0 } },
        include: { product: { select: { name: true } } },
        take: 10,
      }),
      prisma.order.findMany({
        orderBy: { placedAt: 'desc' },
        take: 10,
        include: { assignment: { include: { deliveryBoy: { select: { name: true } } } } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { name: true, role: true } } },
      }),
    ]);

    // Bestselling products by units sold (delivered + active orders)
    const bestsellers = await prisma.orderItem.groupBy({
      by: ['name'],
      _sum: { quantity: true },
      where: { order: { status: { notIn: ['CANCELLED', 'FAILED_DELIVERY'] } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });

    // Sales for last 7 days
    const chart = [];
    for (let i = 6; i >= 0; i -= 1) {
      const from = dayjs().subtract(i, 'day').startOf('day').toDate();
      const to = dayjs().subtract(i, 'day').endOf('day').toDate();
      // eslint-disable-next-line no-await-in-loop
      const agg = await prisma.order.aggregate({
        where: { placedAt: { gte: from, lte: to }, status: { notIn: ['CANCELLED', 'FAILED_DELIVERY'] } },
        _sum: { total: true },
        _count: true,
      });
      chart.push({
        day: dayjs(from).format('ddd'),
        date: dayjs(from).format('YYYY-MM-DD'),
        sales: round2(agg._sum.total || 0),
        orders: agg._count,
      });
    }

    res.json({
      success: true,
      stats: {
        todayOrders,
        totalOrders,
        todaySales: round2(todaySalesAgg._sum.total || 0),
        pendingOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        totalCustomers,
        activeDeliveries,
      },
      lowStock: lowStockVariants.map((v) => ({ id: v.id, product: v.product.name, label: v.label, stock: v.stock })),
      outOfStock: outOfStockVariants.map((v) => ({ id: v.id, product: v.product.name, label: v.label, stock: v.stock })),
      bestsellers: bestsellers.map((b) => ({ name: b.name, units: b._sum.quantity || 0 })),
      chart,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        placedAt: o.placedAt,
        deliveryBoy: o.assignment?.deliveryBoy?.name || null,
      })),
      recentActivity,
    });
  })
);

export default router;
