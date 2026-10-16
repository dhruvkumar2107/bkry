import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';

export const DEFAULT_SETTINGS = {
  // Brand & Shop Identity
  shopName: 'Chotulal Sweets',
  tagline: 'Fresh Sweets, Made with Love',
  logoUrl: '',
  mobileLogoUrl: '',
  faviconUrl: '',
  footerText: '',

  // Announcement Bar
  announcementBarActive: false,
  announcementBarText: 'Festive Offer: Flat 15% off on orders above ₹800! Use code FESTIVE15',
  announcementBarLink: '/products',

  // Contact & Store Hours
  address: 'Bijapur Locality, Chotulal Sweets',
  contactPhone: '+91 90000 00000',
  contactEmail: 'info@chotulalsweets.com',
  openTime: '08:00',
  closeTime: '22:00',
  deliveryZones: 'Bijapur Locality, Bijapur',
  googleMapsUrl: '',

  // Pricing, Tax & Delivery Charges
  deliveryFee: env.defaults.deliveryFee,
  freeDeliveryAbove: env.defaults.freeDeliveryAbove,
  minOrderAmount: env.defaults.minOrderAmount,
  taxPercent: env.defaults.taxPercent,
  taxEnabled: true,
  codEnabled: true,
  onlinePaymentEnabled: env.razorpay.enabled,
  guestCheckoutEnabled: true,

  // Notifications
  notificationSmsEnabled: false,
  notificationWhatsappEnabled: false,
  notificationEmailEnabled: false,

  // Website Content / CMS Pages
  aboutUsTitle: 'About Chotulal Sweets',
  aboutUsContent:
    'Welcome to Chotulal Sweets, where tradition meets purity. For decades, our master confectioners have handcrafted premium Indian sweets, namkeens, and festive delicacies using only pure ghee, rich dry fruits, and time-honored recipes passed down through generations.\n\nFrom melt-in-the-mouth Kaju Katli and Special Peda to sizzling Motichoor Laddus and crispy Namkeen mixtures, every item is prepared daily under the highest standards of hygiene and taste.',
  deliveryPolicy:
    'We deliver fresh sweets and savouries across our serviceable zones in Bijapur. All orders are carefully packaged in tamper-proof, food-grade boxes to preserve maximum freshness.\n\nStandard delivery is typically completed within 45 to 90 minutes from order confirmation during store hours (08:00 AM – 10:00 PM). Free delivery applies on orders above the threshold specified at checkout.',
  returnPolicy:
    'Because sweets and food products are perishable goods, returns are generally not accepted once an order is delivered.\n\nHowever, if you receive an incorrect, damaged, or spoiled item, please contact our support team at our contact phone number within 2 hours of delivery with photographic evidence. We will gladly arrange an immediate replacement or issue a full refund.',
  termsConditions:
    'By placing an order with Chotulal Sweets, you agree to provide accurate delivery details and be available to receive your order at the specified address.\n\nPrices and product availability are subject to change without prior notice. All weights are approximate net weights at the time of packing.',
  privacyPolicy:
    'At Chotulal Sweets, we value and respect your privacy. We only collect the minimal personal information (such as your name, mobile number, and delivery address) necessary to fulfill your orders and keep you updated on delivery status. We never sell or share your personal data with third-party marketers.',
  faqList: [
    { question: 'What are your delivery hours?', answer: 'We deliver daily between 8:00 AM and 10:00 PM.' },
    { question: 'Do you use pure ghee?', answer: 'Yes! All our traditional sweets and special delicacies are prepared with 100% pure desi ghee.' },
    { question: 'Can I place bulk orders for weddings or corporate events?', answer: 'Absolutely! Please contact us directly at our store phone number for custom gift packs, bulk discounts, and event catering.' },
    { question: 'What payment methods do you accept?', answer: 'We accept Cash on Delivery (COD) as well as online payments via UPI, Credit/Debit cards, and Net Banking.' },
  ],

  // Social & SEO
  socialInstagram: 'https://instagram.com',
  socialFacebook: 'https://facebook.com',
  socialWhatsapp: '+919000000000',
  socialTwitter: '',
  metaTitle: 'Chotulal Sweets - Pure Ghee Sweets & Savouries',
  metaDescription: 'Order fresh handcrafted Indian sweets, pure ghee delicacies, crispy namkeen, and festival gift packs online from Chotulal Sweets.',
  metaKeywords: 'sweets, mithai, kaju katli, peda, laddu, namkeen, chotulal sweets, bijapur',
};

const SETTINGS_COLUMNS = new Set(Object.keys(DEFAULT_SETTINGS));

export const getSettings = async () => {
  const rows = await prisma.shopSetting.findMany();
  const stored = {};
  for (const r of rows) {
    let v = r.value;
    try {
      v = JSON.parse(r.value);
    } catch {
      /* keep string */
    }
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
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
};

export const updateSettings = async (patch) => {
  // Allow all known settings or any non-empty string key for extensible CMS
  const entries = Object.entries(patch).filter(([k]) => typeof k === 'string' && k.length > 0);
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
