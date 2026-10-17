import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { computeTotals, validateCoupon, COD_FREE_THRESHOLD, COD_DELIVERY_FEE } from '../services/pricing.js';
import { getSettings } from '../services/settings.js';
import { genToken } from '../utils/helpers.js';

const router = Router();
router.use(optionalAuth);

const guestTokenFromReq = (req) => req.headers['x-guest-token'] || req.cookies?.guestToken || null;

const getOrCreateCart = async (req, res) => {
  if (req.user) {
    let cart = await prisma.cart.findFirst({ where: { userId: req.user.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user.id } });
    return cart;
  }
  let token = guestTokenFromReq(req);
  if (!token) {
    token = genToken(16);
    res.cookie('guestToken', token, { httpOnly: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
  let cart = await prisma.cart.findUnique({ where: { guestToken: token } });
  if (!cart) cart = await prisma.cart.create({ data: { guestToken: token } });
  return cart;
};

const serializeCart = async (cart, couponCode, paymentMethod = 'COD') => {
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
      variant: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const settings = await getSettings();
  const priced = items.map((it) => ({
    productId: it.productId,
    variantId: it.variantId,
    name: it.product.name,
    variant: it.variant,
    product: it.product,
    quantity: it.quantity,
  }));

  let coupon = null;
  if (couponCode) {
    const found = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });
    const check = validateCoupon(found, priced.reduce((s, i) => s + i.variant.price * i.quantity, 0));
    if (check.ok) coupon = found;
  }

  const totals = computeTotals({ items: priced, coupon, settings, paymentMethod: paymentMethod || 'COD' });

  return {
    id: cart.id,
    items: items.map((it, idx) => ({
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      name: it.product.name,
      slug: it.product.slug,
      image: it.product.images[0]?.url || null,
      variantLabel: it.variant.label,
      unitPrice: it.variant.price,
      stock: it.variant.stock,
      quantity: it.quantity,
      lineTotal: totals.lines[idx]?.lineTotal ?? it.variant.price * it.quantity,
    })),
    coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
    ...totals,
    paymentMethod: paymentMethod || 'COD',
    minOrderAmount: settings.minOrderAmount,
    freeDeliveryAbove: settings.freeDeliveryAbove,
    codFreeDeliveryAbove: COD_FREE_THRESHOLD,
    codDeliveryFee: COD_DELIVERY_FEE,
  };
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req, res);
    const data = await serializeCart(cart, req.query.coupon, req.query.paymentMethod);
    res.json({ success: true, cart: data });
  })
);

router.post(
  '/items',
  validate(z.object({ variantId: z.string(), quantity: z.number().int().positive().default(1) })),
  asyncHandler(async (req, res) => {
    const { variantId, quantity } = req.body;
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw new ApiError(400, 'This item is no longer available');
    }
    const cart = await getOrCreateCart(req, res);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    const nextQty = (existing?.quantity || 0) + quantity;
    if (variant.stock < nextQty) {
      throw new ApiError(409, `Only ${variant.stock} unit(s) available for ${variant.product.name} (${variant.label})`);
    }
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId: variant.productId, variantId, quantity } });
    }
    const data = await serializeCart(cart, req.query.coupon, req.query.paymentMethod);
    res.status(201).json({ success: true, cart: data });
  })
);

router.patch(
  '/items/:id',
  validate(z.object({ quantity: z.number().int().min(1) })),
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req, res);
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.id, cartId: cart.id } });
    if (!item) throw new ApiError(404, 'Cart item not found');
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (variant.stock < req.body.quantity) {
      throw new ApiError(409, `Only ${variant.stock} unit(s) available`);
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: req.body.quantity } });
    const data = await serializeCart(cart, req.query.coupon, req.query.paymentMethod);
    res.json({ success: true, cart: data });
  })
);

router.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req, res);
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.id, cartId: cart.id } });
    if (!item) throw new ApiError(404, 'Cart item not found');
    await prisma.cartItem.delete({ where: { id: item.id } });
    const data = await serializeCart(cart, req.query.coupon, req.query.paymentMethod);
    res.json({ success: true, cart: data });
  })
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req, res);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const data = await serializeCart(cart, undefined, req.query.paymentMethod);
    res.json({ success: true, cart: data });
  })
);

export { serializeCart, getOrCreateCart };
export default router;
