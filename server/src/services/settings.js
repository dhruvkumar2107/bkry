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
  contactPhone: '+91 90000 00000',
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
  aboutUsTitle: 'About Chotulal Sweets',
  aboutUsContent:
    'Chotu Lal Sweets has been a cherished name in Vijayapur, Karnataka, since 1938. Known for its famous Peda and signature Makhan Peda, our brand represents a longstanding tradition of authentic taste and the joy of sharing sweets.\n\nFor generations, we have been a part of celebrations, family gatherings, festivals, and special occasions. Our focus remains on delivering delicious traditional sweets, maintaining quality, and creating a delightful experience for every customer.\n\nAt Chotu Lal Sweets, we believe that every sweet carries a memory and every tradition deserves to be celebrated.\n\nChotu Lal Sweets: A timeless tradition of sweetness in Vijayapur since 1938.',
  deliveryPolicy:
    'Delivery and Shipping Policy\n\nDelivery Charges\n1. Orders below ₹999 will incur a delivery charge of ₹40.\n2. Orders of ₹999 and above qualify for free delivery, subject to serviceability and applicable checkout conditions.\n\nOrder Processing: Orders are processed according to product availability and the information provided by the customer.\n\nDelivery Address: Customers must provide an accurate delivery address and valid contact information.\n\nDelivery Timelines: Delivery times may vary depending on the destination, courier availability, weather, and other unforeseen circumstances.\n\nReturn and Refund Policy: Once an order has been delivered, routine returns and refunds are not accepted. If a product arrives damaged, incorrect, defective, or with a quality issue, customers should contact us promptly with their order details and supporting photographs for review. Applicable consumer rights and remedies under Indian law will remain unaffected.\n\nCustomers are encouraged to verify their order details and delivery address before completing checkout.',
  returnPolicy:
    'Routine returns and refunds are not accepted after delivery. If a product arrives damaged, incorrect, defective, or with a quality issue, customers should contact us promptly with their order details and supporting photographs for review. Applicable consumer rights and remedies under Indian law will remain unaffected.',
  termsConditions:
    'Website Usage: Customers must use the website lawfully and provide accurate information while placing orders.\n\nProduct Information: We make reasonable efforts to display accurate product descriptions, photographs, prices, and other relevant details. Actual product appearance or packaging may vary slightly.\n\nPricing and Payment: All prices are displayed in Indian Rupees. Orders are subject to product availability, successful payment, and order confirmation.\n\nOrder Cancellation: Orders may be cancelled where necessary due to product unavailability, pricing errors, suspected fraud, or other legitimate reasons. Any applicable refunds will be processed in accordance with Indian law.\n\nShipping and Delivery: Delivery charges and available delivery information will be displayed during checkout. Delivery timelines are estimates and may be affected by unforeseen circumstances.\n\nReturns and Refunds: Routine returns and refunds are not accepted after delivery. This policy does not exclude remedies required under applicable consumer protection laws.\n\nProduct Storage: Customers should follow the storage instructions supplied with the products and consume sweets within the recommended period.\n\nPrivacy: Customer information will be handled in accordance with the website\'s Privacy Policy and applicable data protection laws.\n\nPolicy Updates: Chotu Lal Sweets may update these terms when necessary. Updated terms will be published on the website.\n\nCustomer Support: For assistance, contact 9741857227 or chotulalsweets@gmail.com.',
  privacyPolicy:
    'At Chotu Lal Sweets, we value and respect your privacy. We only collect the minimal personal information (such as your name, mobile number, and delivery address) necessary to fulfill your orders and keep you updated on delivery status. We never sell or share your personal data with third-party marketers.',
  faqList: [
    { question: 'What is Chotu Lal Sweets famous for?', answer: 'Chotu Lal Sweets is famous for its traditional Peda and signature Makhan Peda in Vijayapur, Karnataka, with a heritage dating back to 1938.' },
    { question: 'How can I order sweets online?', answer: 'Browse our available products, select your favourite sweets, add them to your cart, and complete checkout using the available payment options.' },
    { question: 'What are the delivery charges?', answer: 'Orders below ₹999 have a delivery charge of ₹40. Orders of ₹999 and above qualify for free delivery, subject to applicable conditions.' },
    { question: 'Can I return an order after delivery?', answer: 'Routine returns and refunds are not accepted after delivery. If your order arrives damaged, incorrect, or with a quality issue, please contact our customer support team promptly for assistance.' },
    { question: 'How can I contact Chotu Lal Sweets?', answer: 'Call 9741857227 or email chotulalsweets@gmail.com. Our customer support team is available from 8:00 AM to 10:00 PM, seven days a week.' },
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
