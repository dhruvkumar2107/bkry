import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// The directory may not be writable in serverless environments (read-only
// filesystem). Creating it is best-effort; local driver writes happen at
// request time and are only used off-serverless.
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch { /* read-only filesystem (e.g. Vercel) */ }

// Keep uploads in memory so both the local driver and Cloudinary can work
// regardless of filesystem permissions.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Only image uploads (jpeg, png, webp, gif, avif) are allowed'));
  },
});

const signCloudinary = (params, secret) => {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
};

// Uploads an in-memory image buffer to Cloudinary via REST API (no SDK).
const uploadToCloudinary = async (buffer, originalname) => {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(500, 'Cloudinary credentials are not configured');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: 'chotulal', timestamp };
  const signature = signCloudinary(params, apiSecret);

  const form = new FormData();
  form.append('file', new Blob([buffer]), path.basename(originalname || 'upload'));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', 'chotulal');
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(502, data?.error?.message || 'Cloudinary upload failed');
  return data.secure_url;
};

// Persists an uploaded file and returns a public URL.
// Driver "local" serves from /uploads; "cloudinary" pushes to object storage.
export const persistUpload = async (file) => {
  if (env.storageDriver === 'cloudinary') {
    return uploadToCloudinary(file.buffer, file.originalname);
  }
  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `${env.publicBaseUrl}/uploads/${filename}`;
};
