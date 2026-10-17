import { round2 } from '../utils/helpers.js';

// COD delivery fee rules:
// - subtotal >= COD_FREE_THRESHOLD → free delivery
// - subtotal < COD_FREE_THRESHOLD → flat ₹40 fee
export const COD_FREE_THRESHOLD = 999;
export const COD_DELIVERY_FEE = 40;

// Calculates delivery fee based on payment method and subtotal.
// For COD: free at/above ₹999, ₹40 below.
// For ONLINE: uses settings.deliveryFee, free if subtotal >= settings.freeDeliveryAbove.
export const calcDeliveryFee = ({ subtotal, paymentMethod, settings }) => {
  if (paymentMethod === 'COD') {
    return subtotal >= COD_FREE_THRESHOLD ? 0 : COD_DELIVERY_FEE;
  }
  // ONLINE payment
  let fee = settings.deliveryFee ?? 0;
  if (settings.freeDeliveryAbove && subtotal >= settings.freeDeliveryAbove) fee = 0;
  return fee;
};

// Recomputes an order's totals from authoritative variant prices. The browser
// never dictates prices, discounts, or totals - only variant ids and quantities.
// Tax is NOT added to customer-facing totals per business requirement.
export const computeTotals = ({ items, coupon, settings, deliveryFeeOverride, paymentMethod }) => {
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

  // Delivery fee: use override if provided, else use payment-method-aware calc.
  let deliveryFee;
  if (deliveryFeeOverride !== undefined && deliveryFeeOverride !== null) {
    deliveryFee = deliveryFeeOverride;
  } else if (paymentMethod) {
    deliveryFee = calcDeliveryFee({ subtotal, paymentMethod, settings });
  } else {
    // Fallback: use settings-based fee (for cart display without known payment method)
    deliveryFee = settings.deliveryFee ?? 0;
    if (settings.freeDeliveryAbove && subtotal >= settings.freeDeliveryAbove) deliveryFee = 0;
  }

  // Tax is NOT applied to customer-facing totals.
  // taxPercent/taxAmount are preserved for admin/accounting only.
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
