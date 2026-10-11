import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { slugify } from '../../utils/helpers.js';
import { logAudit } from '../../services/audit.js';

const router = Router();

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
  bannerUrl: z.string().nullable().optional(),
  productIds: z.array(z.string()).optional(),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, categories });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { products: { include: { product: true } } },
    });
    if (!category) throw new ApiError(404, 'Category not found');
    res.json({
      success: true,
      category,
      productIds: category.products.map((p) => p.productId),
    });
  })
);

router.post(
  '/',
  validate(schema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const category = await prisma.category.create({
      data: {
        name: b.name,
        slug: b.slug ? slugify(b.slug) : slugify(b.name),
        description: b.description,
        imageUrl: b.imageUrl,
        icon: b.icon,
        sortOrder: b.sortOrder,
        isActive: b.isActive,
        showOnHome: b.showOnHome,
        bannerUrl: b.bannerUrl,
        ...(b.productIds?.length
          ? { products: { create: b.productIds.map((productId) => ({ productId })) } }
          : {}),
      },
    });
    await logAudit({ userId: req.user.id, action: 'CATEGORY_CREATE', entity: 'Category', entityId: category.id });
    res.status(201).json({ success: true, category });
  })
);

router.put(
  '/:id',
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.slug !== undefined ? { slug: slugify(b.slug) } : {}),
        ...(b.description !== undefined ? { description: b.description } : {}),
        ...(b.imageUrl !== undefined ? { imageUrl: b.imageUrl } : {}),
        ...(b.icon !== undefined ? { icon: b.icon } : {}),
        ...(b.sortOrder !== undefined ? { sortOrder: b.sortOrder } : {}),
        ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
        ...(b.showOnHome !== undefined ? { showOnHome: b.showOnHome } : {}),
        ...(b.bannerUrl !== undefined ? { bannerUrl: b.bannerUrl } : {}),
      },
    });
    if (b.productIds) {
      await prisma.productCategory.deleteMany({ where: { categoryId: category.id } });
      await prisma.productCategory.createMany({
        data: b.productIds.map((productId) => ({ productId, categoryId: category.id })),
        skipDuplicates: true,
      });
    }
    await logAudit({ userId: req.user.id, action: 'CATEGORY_UPDATE', entity: 'Category', entityId: category.id });
    res.json({ success: true, category });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user.id, action: 'CATEGORY_DELETE', entity: 'Category', entityId: req.params.id });
    res.json({ success: true });
  })
);

router.post(
  '/reorder',
  validate(z.object({ orderedIds: z.array(z.string()) })),
  asyncHandler(async (req, res) => {
    await prisma.$transaction(
      req.body.orderedIds.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } }))
    );
    res.json({ success: true });
  })
);

export default router;
