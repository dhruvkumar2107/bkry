import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { getSettings } from './settings.js';
import { emitToUser } from '../lib/socket.js';

// Creates an in-app notification and, when the matching provider is
// configured, attempts an external delivery (SMS / WhatsApp / email).
// A message is never reported as "sent" unless a provider actually accepted it.
export const notify = async ({ userId, orderId, type, title, body, channels = ['IN_APP'] }) => {
  const settings = await getSettings();
  const results = [];

  for (const channel of channels) {
    const record = await prisma.notification.create({
      data: { userId: userId || null, orderId: orderId || null, type, title, body, channel },
    });

    if (channel === 'IN_APP') {
      await prisma.notification.update({ where: { id: record.id }, data: { sent: true } });
      if (userId) emitToUser(userId, 'notification', { id: record.id, title, body, type });
      results.push({ channel, sent: true });
      continue;
    }

    const enabled =
      (channel === 'SMS' && settings.notificationSmsEnabled && env.twilio.enabled) ||
      (channel === 'WHATSAPP' && settings.notificationWhatsappEnabled && env.whatsapp.enabled) ||
      (channel === 'EMAIL' && settings.notificationEmailEnabled && env.smtp.enabled);

    if (!enabled) {
      await prisma.notification.update({
        where: { id: record.id },
        data: { sent: false, providerResult: 'provider_not_configured' },
      });
      results.push({ channel, sent: false, reason: 'provider_not_configured' });
      continue;
    }

    // Provider integrations are intentionally stubbed pending real credentials.
    // When credentials exist they should call the provider API here and record
    // the true result. Until then, the message remains unsent.
    await prisma.notification.update({
      where: { id: record.id },
      data: { sent: false, providerResult: 'integration_stub' },
    });
    results.push({ channel, sent: false, reason: 'integration_stub' });
  }

  return results;
};

export const ORDER_EVENTS = {
  PLACED: { type: 'ORDER_PLACED', title: 'Order placed' },
  CONFIRMED: { type: 'ORDER_CONFIRMED', title: 'Order confirmed' },
  PREPARING: { type: 'ORDER_PREPARING', title: 'Order is being prepared' },
  READY_FOR_PICKUP: { type: 'ORDER_READY', title: 'Order ready for pickup' },
  ASSIGNED_FOR_DELIVERY: { type: 'ORDER_ASSIGNED', title: 'Delivery partner assigned' },
  PICKED_UP: { type: 'ORDER_PICKED_UP', title: 'Order picked up' },
  OUT_FOR_DELIVERY: { type: 'ORDER_OUT_FOR_DELIVERY', title: 'Order out for delivery' },
  DELIVERED: { type: 'ORDER_DELIVERED', title: 'Order delivered' },
  CANCELLED: { type: 'ORDER_CANCELLED', title: 'Order cancelled' },
  FAILED_DELIVERY: { type: 'ORDER_FAILED', title: 'Delivery failed' },
};
