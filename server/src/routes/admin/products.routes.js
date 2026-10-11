import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { slugify, toCsv, parseCsv, round2 } from '../../utils/helpers.js';
import { logAudit } from '../../services/audit.js';
import { adjustStock } from '../../services/inventory.js';

const router = Router();

const variantSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  weightGrams: z.number().int().nullable().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  sku: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  basePrice: z.number().nonnegative().default(0),
  originalPrice: z.number().nonnegative().nullable().optional(),
  unit: z.string().nullable().optional(),
  ingredients: z.string().nullable().optional(),
  allergens: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  categoryIds: z.array(z.string()).default([]),
  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).default([]),
});

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: { sortOrder: 'asc' } },
  categories: { include: { category: true } },
};

const shapeAdminProduct = (p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  description: p.description,
  sku: p.sku,
  basePrice: p.basePrice,
  originalPrice: p.originalPrice,
  unit: p.unit,
  ingredients: p.ingredients,
  allergens: p.allergens,
  isActive: p.isActive,
  isFeatured: p.isFeatured,
  isBestseller: p.isBestseller,
  isNewArrival: p.isNewArrival,
  sortOrder: p.sortOrder,
  createdAt: p.createdAt,
  images: p.images,
  variants: p.variants,
  categoryIds: p.categories.map((c) => c.categoryId),
  categories: p.categories.map((c) => ({ id: c.category.id, name: c.category.name })),
  totalStock: p.variants.reduce((s, v) => s + v.stock, 0),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const where = {};
    if (req.query.q) where.OR = [{ name: { contains: req.query.q } }, { sku: { contains: req.query.q } }];
    if (req.query.categoryId) where.categories = { some: { categoryId: req.query.categoryId } };
    if (req.query.status === 'active') where.isActive = true;
    if (req.query.status === 'inactive') where.isActive = false;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ success: true, products: products.map(shapeAdminProduct), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
    if (!p) throw new ApiError(404, 'Product not found');
    res.json({ success: true, product: shapeAdminProduct(p) });
  })
);

router.post(
  '/',
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const slug = b.slug ? slugify(b.slug) : slugify(b.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) throw new ApiError(409, 'A product with this slug already exists');

    const product = await prisma.product.create({
      data: {
        name: b.name,
        slug,
        description: b.description,
        sku: b.sku || null,
        basePrice: b.basePrice,
        originalPrice: b.originalPrice ?? null,
        unit: b.unit,
        ingredients: b.ingredients,
        allergens: b.allergens,
        isActive: b.isActive,
        isFeatured: b.isFeatured,
        isBestseller: b.isBestseller,
        isNewArrival: b.isNewArrival,
        sortOrder: b.sortOrder,
        categories: { create: b.categoryIds.map((categoryId) => ({ categoryId })) },
        images: { create: b.images.map((img, i) => ({ url: img.url, alt: img.alt ?? null, sortOrder: img.sortOrder ?? i })) },
        variants: {
          create: b.variants.map((v, i) => ({
            label: v.label,
            weightGrams: v.weightGrams ?? null,
            price: v.price,
            originalPrice: v.originalPrice ?? null,
            stock: v.stock,
            sku: v.sku || null,
            isActive: v.isActive,
            sortOrder: v.sortOrder ?? i,
          })),
        },
      },
      include: productInclude,
    });
    await logAudit({ userId: req.user.id, action: 'PRODUCT_CREATE', entity: 'Product', entityId: product.id });
    res.status(201).json({ success: true, product: shapeAdminProduct(product) });
  })
);

router.put(
  '/:id',
  validate(productSchema.partial()),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id }, include: { variants: true } });
    if (!existing) throw new ApiError(404, 'Product not found');

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          ...(b.name !== undefined ? { name: b.name } : {}),
          ...(b.slug !== undefined ? { slug: slugify(b.slug) } : {}),
          ...(b.description !== undefined ? { description: b.description } : {}),
          ...(b.sku !== undefined ? { sku: b.sku } : {}),
          ...(b.basePrice !== undefined ? { basePrice: b.basePrice } : {}),
          ...(b.originalPrice !== undefined ? { originalPrice: b.originalPrice } : {}),
          ...(b.unit !== undefined ? { unit: b.unit } : {}),
          ...(b.ingredients !== undefined ? { ingredients: b.ingredients } : {}),
          ...(b.allergens !== undefined ? { allergens: b.allergens } : {}),
          ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
          ...(b.isFeatured !== undefined ? { isFeatured: b.isFeatured } : {}),
          ...(b.isBestseller !== undefined ? { isBestseller: b.isBestseller } : {}),
          ...(b.isNewArrival !== undefined ? { isNewArrival: b.isNewArrival } : {}),
          ...(b.sortOrder !== undefined ? { sortOrder: b.sortOrder } : {}),
        },
      });

      if (b.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: existing.id } });
        await tx.productCategory.createMany({
          data: b.categoryIds.map((categoryId) => ({ productId: existing.id, categoryId })),
          skipDuplicates: true,
        });
      }
      if (b.images) {
        await tx.productImage.deleteMany({ where: { productId: existing.id } });
        await tx.productImage.createMany({
          data: b.images.map((img, i) => ({ productId: existing.id, url: img.url, alt: img.alt ?? null, sortOrder: img.sortOrder ?? i })),
        });
      }
      if (b.variants) {
        const incomingIds = b.variants.filter((v) => v.id).map((v) => v.id);
        await tx.productVariant.deleteMany({
          where: { productId: existing.id, id: { notIn: incomingIds.length ? incomingIds : ['__none__'] } },
        });
        for (const [i, v] of b.variants.entries()) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                label: v.label,
                weightGrams: v.weightGrams ?? null,
                price: v.price,
                originalPrice: v.originalPrice ?? null,
                stock: v.stock,
                sku: v.sku || null,
                isActive: v.isActive,
                sortOrder: v.sortOrder ?? i,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: existing.id,
                label: v.label,
                weightGrams: v.weightGrams ?? null,
                price: v.price,
                originalPrice: v.originalPrice ?? null,
                stock: v.stock,
                sku: v.sku || null,
                isActive: v.isActive,
                sortOrder: v.sortOrder ?? i,
              },
            });
          }
        }
      }

      return tx.product.findUnique({ where: { id: existing.id }, include: productInclude });
    });

    await logAudit({ userId: req.user.id, action: 'PRODUCT_UPDATE', entity: 'Product', entityId: existing.id });
    res.json({ success: true, product: shapeAdminProduct(product) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user.id, action: 'PRODUCT_DELETE', entity: 'Product', entityId: req.params.id });
    res.json({ success: true });
  })
);

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
    if (!p) throw new ApiError(404, 'Product not found');
    const copy = await prisma.product.create({
      data: {
        name: `${p.name} (copy)`,
        slug: `${p.slug}-copy-${Date.now().toString(36)}`,
        description: p.description,
        basePrice: p.basePrice,
        originalPrice: p.originalPrice,
        unit: p.unit,
        ingredients: p.ingredients,
        allergens: p.allergens,
        isActive: false,
        categories: { create: p.categories.map((c) => ({ categoryId: c.categoryId })) },
        images: { create: p.images.map((i) => ({ url: i.url, alt: i.alt, sortOrder: i.sortOrder })) },
        variants: { create: p.variants.map((v) => ({ label: v.label, weightGrams: v.weightGrams, price: v.price, originalPrice: v.originalPrice, stock: v.stock, isActive: v.isActive, sortOrder: v.sortOrder })) },
      },
      include: productInclude,
    });
    res.status(201).json({ success: true, product: shapeAdminProduct(copy) });
  })
);

router.post(
  '/:id/stock',
  validate(z.object({ variantId: z.string(), delta: z.number().int(), note: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { variantId, delta, note } = req.body;
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId: req.params.id } });
    if (!variant) throw new ApiError(404, 'Variant not found for this product');
    const updated = await adjustStock({ variantId, delta, reason: 'MANUAL_ADJUST', note, userId: req.user.id });
    res.json({ success: true, variant: updated });
  })
);

router.post(
  '/bulk-update',
  validate(
    z.object({
      confirm: z.literal(true),
      variantIds: z.array(z.string()).min(1),
      price: z.object({ mode: z.enum(['PERCENT', 'FLAT', 'SET', 'NONE']).default('NONE'), value: z.number().default(0) }).optional(),
      stock: z.object({ mode: z.enum(['DELTA', 'SET', 'NONE']).default('NONE'), value: z.number().int().default(0) }).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { variantIds, price, stock } = req.body;
    const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } } });
    if (!variants.length) throw new ApiError(404, 'No matching variants');

    const ops = variants.map((v) => {
      const data = {};
      if (price && price.mode !== 'NONE') {
        let next = v.price;
        if (price.mode === 'PERCENT') next = v.price * (1 + price.value / 100);
        if (price.mode === 'FLAT') next = v.price + price.value;
        if (price.mode === 'SET') next = price.value;
        data.price = round2(Math.max(0, next));
      }
      if (stock && stock.mode !== 'NONE') {
        let next = v.stock;
        if (stock.mode === 'DELTA') next = v.stock + stock.value;
        if (stock.mode === 'SET') next = stock.value;
        data.stock = Math.max(0, Math.round(next));
      }
      return prisma.productVariant.update({ where: { id: v.id }, data });
    });
    await prisma.$transaction(ops);
    await logAudit({ userId: req.user.id, action: 'PRODUCT_BULK_UPDATE', meta: { count: variants.length } });
    res.json({ success: true, updated: variants.length });
  })
);

// --- CSV export -------------------------------------------------------------
router.get(
  '/export/csv',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ include: productInclude });
    const rows = [];
    for (const p of products) {
      const cats = p.categories.map((c) => c.category.name).join('|');
      if (!p.variants.length) {
        rows.push({
          sku: p.sku || '', name: p.name, slug: p.slug, categories: cats, description: p.description || '',
          basePrice: p.basePrice, originalPrice: p.originalPrice ?? '', unit: p.unit || '',
          isActive: p.isActive, isFeatured: p.isFeatured, isBestseller: p.isBestseller, isNewArrival: p.isNewArrival,
          variantLabel: '', variantPrice: p.basePrice, variantStock: 0,
        });
      }
      for (const v of p.variants) {
        rows.push({
          sku: p.sku || '', name: p.name, slug: p.slug, categories: cats, description: p.description || '',
          basePrice: p.basePrice, originalPrice: p.originalPrice ?? '', unit: p.unit || '',
          isActive: p.isActive, isFeatured: p.isFeatured, isBestseller: p.isBestseller, isNewArrival: p.isNewArrival,
          variantLabel: v.label, variantPrice: v.price, variantStock: v.stock,
        });
      }
    }
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chotulal-products.csv"');
    res.send(csv);
  })
);

// --- CSV import (upsert by product name/slug) --------------------------------
router.post(
  '/import/csv',
  asyncHandler(async (req, res) => {
    const csvText = req.body?.csv || '';
    if (!csvText) throw new ApiError(400, 'No CSV content provided');
    const rows = parseCsv(csvText);
    if (!rows.length) throw new ApiError(400, 'CSV has no data rows');

    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) continue;
      const slug = row.slug ? slugify(row.slug) : slugify(name);
      const bool = (v) => String(v).toLowerCase() === 'true' || v === '1';

      let product = await prisma.product.findFirst({ where: { OR: [{ slug }, { name }] }, include: { variants: true } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            name, slug,
            description: row.description || null,
            basePrice: Number(row.basePrice || row.variantPrice || 0),
            originalPrice: row.originalPrice ? Number(row.originalPrice) : null,
            unit: row.unit || null,
            isFeatured: bool(row.isFeatured),
            isBestseller: bool(row.isBestseller),
            isNewArrival: bool(row.isNewArrival),
            isActive: row.isActive === '' ? true : bool(row.isActive),
          },
          include: { variants: true },
        });
        created += 1;
      } else {
        updated += 1;
      }

      if (row.categories) {
        const names = row.categories.split('|').map((s) => s.trim()).filter(Boolean);
        for (const cn of names) {
          const cat = await prisma.category.findFirst({ where: { name: cn } });
          if (cat) {
            await prisma.productCategory.upsert({
              where: { productId_categoryId: { productId: product.id, categoryId: cat.id } },
              create: { productId: product.id, categoryId: cat.id },
              update: {},
            });
          }
        }
      }

      if (row.variantLabel) {
        const existing = await prisma.productVariant.findFirst({ where: { productId: product.id, label: row.variantLabel } });
        if (existing) {
          await prisma.productVariant.update({
            where: { id: existing.id },
            data: { price: Number(row.variantPrice || 0), stock: parseInt(row.variantStock || '0', 10) },
          });
        } else {
          await prisma.productVariant.create({
            data: { productId: product.id, label: row.variantLabel, price: Number(row.variantPrice || 0), stock: parseInt(row.variantStock || '0', 10) },
          });
        }
      }
    }
    await logAudit({ userId: req.user.id, action: 'PRODUCT_IMPORT', meta: { created, updated } });
    res.json({ success: true, created, updated });
  })
);

export default router;
