import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { notFound } from './utils/http.js';
import { UPLOAD_DIR } from './lib/storage.js';
import prisma from './lib/prisma.js';

import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/orders.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import uploadRoutes from './routes/uploads.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import placeholderRoutes from './routes/placeholder.routes.js';
import adminRoutes from './routes/admin/index.js';
import deliveryRoutes from './routes/delivery.routes.js';

// Builds the Express application. Kept free of any listen()/socket wiring so
// it can run either as a long-lived node server (src/index.js) or as a Vercel
// serverless function (../../api/index.js).
const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, true); // permissive; restrict via CORS_ORIGINS in prod
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
if (!env.isProd) app.use(morgan('dev'));

// Static uploaded images (local storage driver only; Cloudinary returns
// absolute URLs so this is unused when STORAGE_DRIVER=cloudinary).
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// Basic API rate limiting
app.use(
  '/api/auth',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
);
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  let db = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'up';
  } catch { /* db down */ }
  res.json({ success: true, status: 'ok', db, time: new Date().toISOString() });
});

app.use('/api/placeholder', placeholderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);

app.use('/api', notFound);

// Serve the built client in production (single-service / VPS deploy).
// Skipped on Vercel, where the CDN serves client/dist and rewrites handle SPA.
if (env.isProd && !process.env.VERCEL) {
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
