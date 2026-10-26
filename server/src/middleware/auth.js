import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import prisma from '../lib/prisma.js';
import { ApiError } from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, phone: user.phone, name: user.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const extractToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7);
  }
  if (req.cookies?.token) return req.cookies.token;
  return null;
};

// Populates req.user when a valid token is present, otherwise continues.
export const optionalAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user && user.isActive) {
      req.user = { id: user.id, role: user.role, phone: user.phone, name: user.name };
    }
  } catch {
    /* ignore invalid token */
  }
  return next();
};

// Requires a valid token.
export const requireAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) return next(new ApiError(401, 'Account not found or disabled'));
    req.user = { id: user.id, role: user.role, phone: user.phone, name: user.name };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired session'));
  }
};

// Requires one of the given roles. Use after requireAuth.
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };

export const requireAdmin = [requireAuth, requireRole('ADMIN')];
export const requireDelivery = [requireAuth, requireRole('DELIVERY')];
