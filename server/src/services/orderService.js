import prisma from '../lib/prisma.js';
import { ApiError } from '../utils/http.js';
import { canTransition, STATUS_LABELS } from './orderStatus.js';
import { restoreStock } from './inventory.js';
import { notify, ORDER_EVENTS } from './notifications.js';
import { emitToOrder, emitToAdmins } from '../lib/socket.js';
import { logAudit } from './audit.js';

const EVENT_BY_STATUS = {
  CONFIRMED: ORDER_EVENTS.CONFIRMED,
  PREPARING: ORDER_EVENTS.PREPARING,
  READY_FOR_PICKUP: ORDER_EVENTS.READY_FOR_PICKUP,
  ASSIGNED_FOR_DELIVERY: ORDER_EVENTS.ASSIGNED_FOR_DELIVERY,
  PICKED_UP: ORDER_EVENTS.PICKED_UP,
  OUT_FOR_DELIVERY: ORDER_EVENTS.OUT_FOR_DELIVERY,
  DELIVERED: ORDER_EVENTS.DELIVERED,
  CANCELLED: ORDER_EVENTS.CANCELLED,
  FAILED_DELIVERY: ORDER_EVENTS.FAILED_DELIVERY,
};

// Advances an order through the status machine with side effects:
// stock restoration on cancel, payment/status timestamps, history, notify, sockets.
export const updateOrderStatus = async ({ orderId, to, userId, note, allowedFrom }) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (allowedFrom && !allowedFrom.includes(order.status)) {
    throw new ApiError(400, `Action not allowed from status ${STATUS_LABELS[order.status] || order.status}`);
  }
  if (!canTransition(order.status, to)) {
    throw new ApiError(400, `Cannot move order from ${order.status} to ${to}`);
  }

  const data = {
    status: to,
    statusHistory: { create: { status: to, note: note || null, userId: userId || null } },
  };
  if (to === 'CONFIRMED' && !order.confirmedAt) data.confirmedAt = new Date();
  if (to === 'DELIVERED') {
    data.deliveredAt = new Date();
    if (order.paymentMethod === 'COD') data.paymentStatus = 'PAID';
  }
  if (to === 'CANCELLED') data.cancelledReason = note || 'Cancelled';
  if (to === 'FAILED_DELIVERY') data.failedReason = note || 'Delivery failed';

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({ where: { id: orderId }, data });
    if (to === 'CANCELLED') {
      await restoreStock(tx, order.items, { orderId, userId, reason: 'CANCEL_RESTORE' });
    }
    if (to === 'DELIVERED' || to === 'CANCELLED' || to === 'FAILED_DELIVERY') {
      await tx.deliveryAssignment.updateMany({ where: { orderId }, data: { trackingActive: false, trackingStoppedAt: new Date() } });
    }
    return o;
  });

  const event = EVENT_BY_STATUS[to];
  if (event) {
    await notify({
      userId: order.userId,
      orderId,
      ...event,
      body: `Order ${order.orderNumber}: ${STATUS_LABELS[to] || to}`,
    });
  }

  emitToOrder(orderId, 'order:status', { orderId, status: to, label: STATUS_LABELS[to] || to, at: new Date() });
  emitToAdmins('order:status', { orderId, orderNumber: order.orderNumber, status: to });
  await logAudit({ userId, action: `ORDER_${to}`, entity: 'Order', entityId: orderId, meta: { note } });

  return updated;
};
