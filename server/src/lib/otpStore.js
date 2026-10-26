// Simple in-memory OTP store. Fine for single-instance development.
// For production behind multiple instances, back this with Redis or the DB.
const store = new Map();
const TTL_MS = 5 * 60 * 1000;

export const setOtp = (phone, code) => {
  store.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });
};

export const verifyOtp = (phone, code) => {
  const rec = store.get(phone);
  if (!rec) return { ok: false, reason: 'No OTP requested for this number' };
  if (Date.now() > rec.expiresAt) {
    store.delete(phone);
    return { ok: false, reason: 'OTP expired' };
  }
  if (rec.attempts >= 5) {
    store.delete(phone);
    return { ok: false, reason: 'Too many attempts. Request a new OTP.' };
  }
  if (rec.code !== String(code)) {
    rec.attempts += 1;
    return { ok: false, reason: 'Incorrect OTP' };
  }
  store.delete(phone);
  return { ok: true };
};

export const clearOtp = (phone) => store.delete(phone);
