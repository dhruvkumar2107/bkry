import { ZodError } from 'zod';
import { ApiError } from '../utils/http.js';
import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
  }

  if (err.code === 'P2002') {
    status = 409;
    message = `Duplicate value for ${err.meta?.target || 'unique field'}`;
  }
  if (err.code === 'P2025') {
    status = 404;
    message = 'Record not found';
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    error: message,
    details,
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
