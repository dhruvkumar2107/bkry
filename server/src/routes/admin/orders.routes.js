import { Router } from 'express';
import dayjs from 'dayjs';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { toCsv } from '../../utils/helpers.js';
import { updateOrderStatus } from '../../services/orderService.js';
import { nextStatuses } from '../../services/orderStatus.js';
import { signTrackingToken } from '../orders.routes.js';
import { getSettings } from '../../services/settings.js';
import { logAudit } from '../../services/audit.js';
import { emitToDelivery, emitToUser } from '../../lib/socket.js';

const router = Router();

const orderInclude = {
  items: true,
  deliveryAddress: true,
  payments: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  assignment: { include: { deliveryBoy: { select: { id: true, name: true, phone: true } } } },
  user: { select: { id: true, name: true, phone: true, email: true } },
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.paymentMethod) where.paymentMethod = req.query.paymentMethod;
    if (req.query.paymentStatus) where.paymentStatus = req.query.paymentStatus;
    if (req.query.q) {
      where.OR = [
        { orderNumber: { contains: req.query.q } },
        { customerName: { contains: req.query.q } },
        { customerPhone: { contains: req.query.q } },
      ];
    }
    if (req.query.from || req.query.to) {
      where.placedAt = {};
      if (req.query.from) where.placedAt.gte = dayjs(req.query.from).startOf('day').toDate();
      if (req.query.to) where.placedAt.lte = dayjs(req.query.to).endOf('day').toDate();
    }
    if (req.query.assigned === 'true') where.assignment = { isNot: null };
    if (req.query.unassigned === 'true') where.assignment = { is: null };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { assignment: { include: { deliveryBoy: { select: { id: true, name: true } } } } },
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        placedAt: o.placedAt,
        deliveryBoy: o.assignment?.deliveryBoy || null,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  '/export/csv',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const orders = await prisma.order.findMany({ where, include: orderInclude, orderBy: { placedAt: 'desc' } });
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      date: dayjs(o.placedAt).format('YYYY-MM-DD HH:mm'),
      customer: o.customerName,
      phone: o.customerPhone,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      subtotal: o.subtotal,
      discount: o.discount,
      deliveryFee: o.deliveryFee,
      tax: o.taxAmount,
      total: o.total,
      items: o.items.map((i) => `${i.name} ${i.variantLabel} x${i.quantity}`).join('; '),
      address: o.deliveryAddress?.line1 || '',
      deliveryBoy: o.assignment?.deliveryBoy?.name || '',
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chotulal-orders.csv"');
    res.send(toCsv(rows));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
    if (!order) throw new ApiError(404, 'Order not found');
    const locationPings = await prisma.deliveryLocationHistory.findMany({
      where: { orderId: order.id },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
    res.json({
      success: true,
      order,
      nextStatuses: nextStatuses(order.status),
      locationPings,
      trackingToken: signTrackingToken(order),
    });
  })
);

router.post(
  '/:id/status',
  validate(z.object({ status: z.string(), note: z.string().optional() })),
  asyncHandler(async (req, res) => {
    await updateOrderStatus({ orderId: req.params.id, to: req.body.status, userId: req.user.id, note: req.body.note });
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
    res.json({ success: true, order, nextStatuses: nextStatuses(order.status) });
  })
);

router.post(
  '/:id/assign',
  validate(z.object({ deliveryBoyId: z.string() })),
  asyncHandler(async (req, res) => {
    const { deliveryBoyId } = req.body;
    const boy = await prisma.user.findFirst({ where: { id: deliveryBoyId, role: 'DELIVERY', isActive: true } });
    if (!boy) throw new ApiError(404, 'Delivery boy not found or inactive');
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new ApiError(404, 'Order not found');

    const existing = await prisma.deliveryAssignment.findUnique({ where: { orderId: order.id } });
    if (existing) {
      await prisma.deliveryAssignment.update({
        where: { orderId: order.id },
        data: { deliveryBoyId, assignedAt: new Date(), acceptedAt: null, trackingActive: false },
      });
    } else {
      await prisma.deliveryAssignment.create({ data: { orderId: order.id, deliveryBoyId } });
    }

    // Move order into the assignment state when appropriate.
    const assignable = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'];
    if (assignable.includes(order.status)) {
      await updateOrderStatus({ orderId: order.id, to: 'ASSIGNED_FOR_DELIVERY', userId: req.user.id, note: `Assigned to ${boy.name}` });
    } else {
      emitToUser(boy.id, 'order:new', { orderId: order.id, orderNumber: order.orderNumber });
    }

    emitToDelivery('order:new', { orderId: order.id, orderNumber: order.orderNumber });
    await logAudit({ userId: req.user.id, action: 'DELIVERY_ASSIGN', entity: 'Order', entityId: order.id, meta: { deliveryBoyId } });

    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude });
    res.json({ success: true, order: updated });
  })
);

router.get(
  '/:id/invoice',
  asyncHandler(async (req, res) => {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude }),
      getSettings(),
    ]);
    if (!order) throw new ApiError(404, 'Order not found');
    const rows = order.items
      .map(
        (i) =>
          `<tr><td>${i.name}<br><small>${i.variantLabel}</small></td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${i.unitPrice.toFixed(2)}</td><td style="text-align:right">₹${i.lineTotal.toFixed(2)}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.orderNumber}</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;color:#222}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #eee;padding:8px}.totals{margin-top:16px;text-align:right}.muted{color:#777}@media print{.noprint{display:none}}</style>
</head><body>
<button class="noprint" onclick="window.print()" style="padding:8px 14px;margin-bottom:12px">Print</button>
<h1>${settings.shopName}</h1>
<div class="muted">${settings.address || ''}<br>${settings.contactPhone || ''}</div>
<h2>Invoice ${order.orderNumber}</h2>
<div class="muted">Date: ${dayjs(order.placedAt).format('DD MMM YYYY, hh:mm A')}<br>
Customer: ${order.customerName} (${order.customerPhone})<br>
Deliver to: ${order.deliveryAddress?.line1 || ''} ${order.deliveryAddress?.landmark ? `(${order.deliveryAddress.landmark})` : ''}</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
<div>Subtotal: ₹${order.subtotal.toFixed(2)}</div>
<div>Discount: -₹${order.discount.toFixed(2)}</div>
<div>Delivery: ₹${order.deliveryFee.toFixed(2)}</div>
<div>Tax: ₹${order.taxAmount.toFixed(2)}</div>
<h3>Total: ₹${order.total.toFixed(2)}</h3>
<div class="muted">Payment: ${order.paymentMethod} (${order.paymentStatus})</div>
</div>
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  })
);

export default router;
