import prisma from '../lib/prisma.js';

export const logAudit = async ({ userId, action, entity, entityId, meta, ip }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity: entity || null,
        entityId: entityId || null,
        meta: meta ? JSON.stringify(meta) : null,
        ip: ip || null,
      },
    });
  } catch {
    /* audit logging must never break the request */
  }
};
