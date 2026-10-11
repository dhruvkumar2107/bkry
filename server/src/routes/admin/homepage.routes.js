import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { logAudit } from '../../services/audit.js';

const router = Router();

// --- Banners ----------------------------------------------------------------
const bannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().min(1),
  ctaLabel: z.string().nullable().optional(),
  ctaLink: z.string().nullable().optional(),
  bgColor: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

router.get('/banners', asyncHandler(async (_req, res) => {
  const banners = await prisma.homepageBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, banners });
}));

router.post('/banners', validate(bannerSchema), asyncHandler(async (req, res) => {
  const banner = await prisma.homepageBanner.create({ data: req.body });
  await logAudit({ userId: req.user.id, action: 'BANNER_CREATE', entity: 'HomepageBanner', entityId: banner.id });
  res.status(201).json({ success: true, banner });
}));

router.put('/banners/:id', validate(bannerSchema.partial()), asyncHandler(async (req, res) => {
  const banner = await prisma.homepageBanner.update({ where: { id: req.params.id }, data: req.body });
  await logAudit({ userId: req.user.id, action: 'BANNER_UPDATE', entity: 'HomepageBanner', entityId: banner.id });
  res.json({ success: true, banner });
}));

router.delete('/banners/:id', asyncHandler(async (req, res) => {
  await prisma.homepageBanner.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post('/banners/reorder', validate(z.object({ orderedIds: z.array(z.string()) })), asyncHandler(async (req, res) => {
  await prisma.$transaction(
    req.body.orderedIds.map((id, index) => prisma.homepageBanner.update({ where: { id }, data: { sortOrder: index } }))
  );
  res.json({ success: true });
}));

// --- Sections ---------------------------------------------------------------
const sectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['PRODUCT_CAROUSEL', 'CATEGORY_CAROUSEL']).default('PRODUCT_CAROUSEL'),
  categoryId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

router.get('/sections', asyncHandler(async (_req, res) => {
  const sections = await prisma.homepageSection.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, sections });
}));

router.post('/sections', validate(sectionSchema), asyncHandler(async (req, res) => {
  const section = await prisma.homepageSection.create({ data: req.body });
  res.status(201).json({ success: true, section });
}));

router.put('/sections/:id', validate(sectionSchema.partial()), asyncHandler(async (req, res) => {
  const section = await prisma.homepageSection.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, section });
}));

router.delete('/sections/:id', asyncHandler(async (req, res) => {
  await prisma.homepageSection.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post('/sections/reorder', validate(z.object({ orderedIds: z.array(z.string()) })), asyncHandler(async (req, res) => {
  await prisma.$transaction(
    req.body.orderedIds.map((id, index) => prisma.homepageSection.update({ where: { id }, data: { sortOrder: index } }))
  );
  res.json({ success: true });
}));

// --- Featured / homepage product selection ----------------------------------
router.post(
  '/feature-products',
  validate(z.object({ productIds: z.array(z.string()) })),
  asyncHandler(async (req, res) => {
    const { productIds } = req.body;
    await prisma.$transaction([
      prisma.product.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } }),
      prisma.product.updateMany({ where: { id: { in: productIds } }, data: { isFeatured: true } }),
    ]);
    await logAudit({ userId: req.user.id, action: 'HOMEPAGE_FEATURED', meta: { count: productIds.length } });
    res.json({ success: true });
  })
);

export default router;
