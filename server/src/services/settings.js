import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';

export const DEFAULT_SETTINGS = {
  // Brand & Shop Identity
  shopName: 'Chotulal Sweets',
  tagline: 'Fresh Sweets, Made with Love',
  logoUrl: '/logo.svg',
  mobileLogoUrl: '/logo.svg',
  faviconUrl: '/favicon.ico',
  footerText: '',

  // Announcement Bar
  announcementBarActive: false,
  announcementBarText: 'Festive Offer: Flat 15% off on orders above ₹800! Use code FESTIVE15',
  announcementBarLink: '/products',

  // Contact & Store Hours
  address: 'Bijapur Locality, Chotulal Sweets',
  contactPhone: '+919000000000',
  contactEmail: 'info@chotulalsweets.com',
  openTime: '08:00',
  closeTime: '22:00',
  deliveryZones: 'Bijapur Locality, Bijapur',
  googleMapsUrl: '',

  // Pricing, Tax & Delivery Charges
  deliveryFee: 40,
  minOrderAmount: 0,
  taxPercent: 0,
  taxEnabled: false,
  codEnabled: false,
  onlinePaymentEnabled: env.razorpay.enabled,
  guestCheckoutEnabled: true,

  // Notifications
  notificationSmsEnabled: false,
  notificationWhatsappEnabled: false,
  notificationEmailEnabled: false,

  // Website Content / CMS Pages
  aboutUsTitle: 'A Legacy of Taste Since 1938',
  aboutUsContent:
    'Since 1938, Chotulal Sweets has been associated with the rich sweet-making traditions of Vijayapur, Karnataka. Known for our much-loved Peda and Makhan Peda, we take pride in bringing traditional flavours and the joy of Indian sweets to every occasion.\n\nOur journey is rooted in a passion for authentic taste, quality, and the timeless appeal of traditional Indian mithai. From everyday treats to festive celebrations, we aim to make every bite a memorable experience.\n\nAt Chotulal Sweets, tradition inspires everything we do. We welcome generations of sweet lovers to experience the flavours that have made our name familiar in Vijayapur.\n\n**Our Promise**\n- Traditional taste and a commitment to quality.\n- Carefully prepared sweets with attention to freshness.\n- A delightful selection for celebrations, gifting, and everyday enjoyment.\n- A customer-first approach built on trust and consistency.',

  deliveryPolicy:
    '## Delivery Charges\n- Orders below ₹999: delivery charge of ₹40.\n- Orders of ₹999 or above: free delivery, subject to the website\'s existing delivery coverage and checkout rules.\n\n## Delivery and Returns\n- Delivery timelines depend on the delivery location and courier service.\n- Customers should provide a correct and complete delivery address and contact number.\n- Once an order has been delivered, it is not eligible for return or refund under the standard policy.\n- If an order arrives damaged, incorrect, or otherwise has a verified fulfilment issue, customers should contact Chotulal Sweets promptly so the issue can be reviewed.',

  returnPolicy:
    'Delivered orders are not eligible for ordinary returns or refunds. If a product arrives damaged, incorrect, or otherwise has a verified fulfilment issue, customers should contact Chotulal Sweets promptly so the issue can be reviewed. Applicable consumer rights and remedies under Indian law will remain unaffected.',

  termsConditions:
    '### General\nBy accessing or placing an order through the Chotulal Sweets website, customers agree to these terms and the applicable policies published on the website.\n\n### Products and Quality\nWe make reasonable efforts to display accurate product descriptions, images, and prices. Actual product appearance may vary slightly from photographs.\n\n### Orders and Payments\nOrders are subject to product availability and successful payment or confirmation through the supported payment method. Customers should check their order details before confirming a purchase.\n\n### Pricing and Delivery\nPrices and applicable delivery charges are displayed during checkout. Orders below ₹999 incur a ₹40 delivery charge, while orders of ₹999 or more qualify for free delivery, subject to applicable service conditions.\n\n### Returns and Refunds\nDelivered orders are not eligible for ordinary returns or refunds. Verified cases involving damaged, incorrect, or improperly fulfilled orders will be reviewed according to the published policy and applicable law.\n\n### Customer Responsibilities\nCustomers must provide accurate contact, delivery, and order information.\n\n### Website Use\nCustomers must not misuse the website, interfere with its operation, or engage in fraudulent transactions.\n\n### Changes to Terms\nChotulal Sweets may update its website policies when necessary. Updates should be published with an appropriate effective date.',

  privacyPolicy:
    'At Chotu Lal Sweets, we value and respect your privacy. We only collect the minimal personal information (such as your name, mobile number, and delivery address) necessary to fulfill your orders and keep you updated on delivery status. We never sell or share your personal data with third-party marketers.',
  faqList: [
    { question: 'What is Chotulal Sweets famous for?', answer: 'Chotulal Sweets is known in Vijayapur for its traditional Peda and Makhan Peda, with a legacy dating back to 1938.' },
    { question: 'How much are the delivery charges?', answer: 'Orders below ₹999 have a delivery charge of ₹40. Orders of ₹999 or above qualify for free delivery, subject to applicable delivery conditions.' },
    { question: 'How can I contact Chotulal Sweets?', answer: 'You can call 9741857227 or email chotulalsweets@gmail.com. Our customer contact hours are 8:00 AM to 10:00 PM, all seven days of the week.' },
    { question: 'How do you maintain the quality of your sweets?', answer: 'We are committed to delivering sweets with attention to taste, quality, and freshness. Product-specific details should be based on the actual preparation and storage practices of the business.' },
    { question: 'Can I return or refund an order after delivery?', answer: 'Delivered orders are not eligible for ordinary returns or refunds. If you receive a damaged or incorrect order, contact our team promptly for assistance and review under our applicable policy.' },
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
  try {
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
  } catch (error) {
    console.error('[getSettings] error', error);
    return DEFAULT_SETTINGS;
  }
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