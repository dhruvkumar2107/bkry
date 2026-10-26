import { ApiError } from '../utils/http.js';

// Validates req.body / req.query / req.params against a zod schema.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    req[source] = parsed;
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : err);
  }
};
