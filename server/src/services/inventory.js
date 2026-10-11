import prisma from '../lib/prisma.js';
import { ApiError } from '../utils/http.js';

// Transaction-safe stock decrement for a set of order lines.
// Throws if any variant would go negative (prevents overselling under
// concurrent checkouts). Must be called with a prisma transaction client.
export const decrementStock = async (tx, lines, { orderId, userId, reason = 'ORDER' }) => {
  for (const line of lines) {
    const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } });
    if (!variant) throw new ApiError(400, `Variant ${line.variantId} no longer exists`);
    if (!variant.isActive) throw new ApiError(400, `${line.name} (${line.variantLabel}) is unavailable`);
    if (variant.stock < line.quantity) {
      throw new ApiError(
        409,
        `Only ${variant.stock} left of ${line.name} (${line.variantLabel})`
      );
    }
    await tx.productVariant.update({
      where: { id: variant.id },
      data: { stock: variant.stock - line.quantity },
    });
    await tx.stockMovement.create({
      data: {
        variantId: variant.id,
        delta: -line.quantity,
        reason,
        orderId,
        userId: userId || null,
      },
    });
  }
};

// Restores stock for cancelled / failed orders that had been deducted.
export const restoreStock = async (tx, lines, { orderId, userId, reason = 'CANCEL_RESTORE' }) => {
  for (const line of lines) {
    if (!line.variantId) continue;
    const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } });
    if (!variant) continue;
    await tx.productVariant.update({
      where: { id: variant.id },
      data: { stock: variant.stock + line.quantity },
    });
    await tx.stockMovement.create({
      data: {
        variantId: variant.id,
        delta: line.quantity,
        reason,
        orderId,
        userId: userId || null,
      },
    });
  }
};

export const adjustStock = async ({ variantId, delta, reason = 'MANUAL_ADJUST', note, userId }) => {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new ApiError(400, 'delta must be a non-zero integer');
  }
  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new ApiError(404, 'Variant not found');
    const next = variant.stock + delta;
    if (next < 0) throw new ApiError(400, 'Stock cannot be negative');
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: next },
    });
    await tx.stockMovement.create({
      data: { variantId, delta, reason, note, userId: userId || null },
    });
    return updated;
  });
};
