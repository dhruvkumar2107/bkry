import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { toCsv } from '../../utils/helpers.js';
import { adjustStock } from '../../services/inventory.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.q) where.product = { name: { contains: req.query.q } };
    if (req.query.lowStock === 'true') where.stock = { gt: 0, lte: 5 };
    if (req.query.outOfStock === 'true') where.stock = { lte: 0 };

    const variants = await prisma.productVariant.findMany({
      where: { ...where, isActive: true },
      include: { product: { select: { id: true, name: true, slug: true, sku: true } } },
      orderBy: { stock: 'asc' },
      take: 500,
    });
    res.json({
      success: true,
      variants: variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        product: v.product.name,
        sku: v.sku || v.product.sku,
        label: v.label,
        price: v.price,
        stock: v.stock,
        status: v.stock <= 0 ? 'OUT' : v.stock <= 5 ? 'LOW' : 'OK',
      })),
    });
  })
);

router.get(
  '/movements',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.variantId) where.variantId = req.query.variantId;
    if (req.query.orderId) where.orderId = req.query.orderId;
    const movements = await prisma.stockMovement.findMany({
      where,
      include: { variant: { include: { product: { select: { name: true } } } }, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({
      success: true,
      movements: movements.map((m) => ({
        id: m.id,
        product: m.variant.product.name,
        variant: m.variant.label,
        delta: m.delta,
        reason: m.reason,
        note: m.note,
        orderId: m.orderId,
        by: m.user?.name || 'system',
        at: m.createdAt,
      })),
    });
  })
);

router.post(
  '/adjust',
  validate(z.object({ variantId: z.string(), delta: z.number().int(), note: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const variant = await adjustStock({
      variantId: req.body.variantId,
      delta: req.body.delta,
      reason: 'MANUAL_ADJUST',
      note: req.body.note,
      userId: req.user.id,
    });
    res.json({ success: true, variant });
  })
);

router.get(
  '/export/csv',
  asyncHandler(async (_req, res) => {
    const variants = await prisma.productVariant.findMany({
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { stock: 'asc' },
    });
    const rows = variants.map((v) => ({
      product: v.product.name,
      sku: v.sku || v.product.sku || '',
      variant: v.label,
      price: v.price,
      stock: v.stock,
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chotulal-inventory.csv"');
    res.send(toCsv(rows));
  })
);

export default router;
