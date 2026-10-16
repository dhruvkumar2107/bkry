import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';

export const DEFAULT_SETTINGS = {
  shopName: 'Chotulal Sweets',
  tagline: 'Fresh Sweets, Made with Love',
  logoUrl: '',
  address: 'Bijapur Locality, Chotulal Sweets',
  contactPhone: '+91 90000 00000',
  contactEmail: '',
  openTime: '08:00',
  closeTime: '22:00',
  deliveryFee: env.defaults.deliveryFee,
  freeDeliveryAbove: env.defaults.freeDeliveryAbove,
  minOrderAmount: env.defaults.minOrderAmount,
  taxPercent: env.defaults.taxPercent,
  taxEnabled: true,
  codEnabled: true,
  onlinePaymentEnabled: env.razorpay.enabled,
  guestCheckoutEnabled: true,
  deliveryZones: 'Bijapur Locality, Bijapur',
  notificationSmsEnabled: false,
  notificationWhatsappEnabled: false,
  notificationEmailEnabled: false,
};

const SETTINGS_COLUMNS = new Set(Object.keys(DEFAULT_SETTINGS));

export const getSettings = async () => {
  const rows = await prisma.shopSetting.findMany();
  const stored = {};
  for (const r of rows) {
    let v = r.value;
    try { v = JSON.parse(r.value); } catch { /* keep string */ }
    stored[r.key] = v;
  }
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  // If Razorpay keys are configured in environment, ensure online payment is
  // enabled unless the admin has explicitly turned it off in the database.
  if (env.razorpay.enabled && !('onlinePaymentEnabled' in stored)) {
    merged.onlinePaymentEnabled = true;
  }
  return merged;
};

export const getSetting = async (key, fallback) => {
  const row = await prisma.shopSetting.findUnique({ where: { key } });
  if (!row) return fallback ?? DEFAULT_SETTINGS[key];
  try { return JSON.parse(row.value); } catch { return row.value; }
};

export const updateSettings = async (patch) => {
  const entries = Object.entries(patch).filter(([k]) => SETTINGS_COLUMNS.has(k));
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.shopSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      })
    )
  );
  return getSettings();
};
