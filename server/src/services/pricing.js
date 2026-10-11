import { round2 } from '../utils/helpers.js';

// Recomputes an order's totals from authoritative variant prices. The browser
// never dictates prices, discounts, or totals - only variant ids and quantities.
export const computeTotals = ({ items, coupon, settings, deliveryFeeOverride }) => {
  let subtotal = 0;
  const lines = [];
  for (const item of items) {
    const unitPrice = Number(item.variant.price);
    const lineTotal = round2(unitPrice * item.quantity);
    subtotal += lineTotal;
    lines.push({
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      variantLabel: item.variant.label,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      imageUrl: item.product.images?.[0]?.url || null,
    });
  }
  subtotal = round2(subtotal);

  let discount = 0;
  if (coupon) {
    if (coupon.type === 'PERCENT') discount = (subtotal * coupon.value) / 100;
    else discount = coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(round2(Math.max(0, discount)), subtotal);
  }

  const afterDiscount = round2(subtotal - discount);

  let deliveryFee = deliveryFeeOverride ?? settings.deliveryFee ?? 0;
  if (settings.freeDeliveryAbove && subtotal >= settings.freeDeliveryAbove) deliveryFee = 0;

  const taxPercent = settings.taxEnabled ? settings.taxPercent || 0 : 0;
  const taxAmount = round2((afterDiscount * taxPercent) / 100);

  const total = round2(afterDiscount + deliveryFee + taxAmount);

  return {
    lines,
    subtotal,
    discount,
    deliveryFee: round2(deliveryFee),
    taxPercent,
    taxAmount,
    total,
  };
};

// Validates a coupon for a given subtotal and returns it or an error message.
export const validateCoupon = (coupon, subtotal) => {
  if (!coupon || !coupon.isActive) return { ok: false, reason: 'Coupon not found or inactive' };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: 'Coupon not yet active' };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: 'Coupon expired' };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: 'Coupon usage limit reached' };
  }
  if (subtotal < coupon.minOrder) {
    return { ok: false, reason: `Minimum order of ₹${coupon.minOrder} required` };
  }
  return { ok: true };
};
