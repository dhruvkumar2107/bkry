import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export const upload = multer({
  storage,
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

// Uploads a local temp file to Cloudinary via REST API (no SDK dependency).
const uploadToCloudinary = async (filePath) => {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(500, 'Cloudinary credentials are not configured');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: 'chotulal', timestamp };
  const signature = signCloudinary(params, apiSecret);

  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buffer]), path.basename(filePath));
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
    const url = await uploadToCloudinary(file.path);
    fs.unlink(file.path, () => {});
    return url;
  }
  return `${env.publicBaseUrl}/uploads/${file.filename}`;
};
