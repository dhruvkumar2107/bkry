import dotenv from 'dotenv';
dotenv.config();

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');
const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || 'chotulal-insecure-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  otpDevMode: bool(process.env.OTP_DEV_MODE, true),
  otpDevCode: process.env.OTP_DEV_CODE || '123456',

  storageDriver: process.env.STORAGE_DRIVER || 'local',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${num(process.env.PORT, 4000)}`,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    get enabled() {
      return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    },
  },

  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID || '',
    token: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM_NUMBER || '',
    get enabled() {
      return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
    },
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    get enabled() {
      return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
    },
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER || '',
    get enabled() {
      return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    },
  },

  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',

  defaults: {
    deliveryFee: num(process.env.DELIVERY_FEE, 30),
    freeDeliveryAbove: num(process.env.FREE_DELIVERY_ABOVE, 500),
    minOrderAmount: num(process.env.MIN_ORDER_AMOUNT, 100),
    taxPercent: num(process.env.TAX_PERCENT, 5),
  },
};
