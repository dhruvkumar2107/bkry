import { round2 } from '../utils/helpers.js';

// Delivery fee rules:
// - subtotal (after discount) >= FREE_DELIVERY_THRESHOLD (999) → free delivery (₹0)
// - subtotal (after discount) < FREE_DELIVERY_THRESHOLD (999) → flat ₹40 fee
export const FREE_DELIVERY_THRESHOLD = 999;
export const STANDARD_DELIVERY_FEE = 40;
export const COD_FREE_THRESHOLD = 999;
export const COD_DELIVERY_FEE = 40;

// Calculates delivery fee based on subtotal (after discount).
// Below ₹999: ₹40. At or above ₹999: Free (₹0).
export const calcDeliveryFee = ({ subtotal }) => {
  return Number(subtotal) >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
};

// Recomputes an order's totals from authoritative variant prices. The browser
// never dictates prices, discounts, or totals - only variant ids and quantities.
// Tax is NOT added to customer-facing totals per business requirement.
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

  // Delivery fee: ₹40 below ₹999, free on ₹999+
  let deliveryFee;
  if (deliveryFeeOverride !== undefined && deliveryFeeOverride !== null) {
    deliveryFee = deliveryFeeOverride;
  } else {
    deliveryFee = calcDeliveryFee({ subtotal: afterDiscount, settings });
  }

  // Tax is NOT applied to customer-facing totals.
  const taxPercent = 0;
  const taxAmount = 0;

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
