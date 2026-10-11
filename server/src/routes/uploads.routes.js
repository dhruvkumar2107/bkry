import { Router } from 'express';
import { asyncHandler } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, persistUpload } from '../lib/storage.js';

const router = Router();

// Single image upload. Restricted to staff (admin) by default; delivery/
// customers do not need to upload images.
router.post(
  '/image',
  requireAuth,
  requireRole('ADMIN'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const url = await persistUpload(req.file);
    res.status(201).json({ success: true, url });
  })
);

router.post(
  '/images',
  requireAuth,
  requireRole('ADMIN'),
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ success: false, error: 'No files uploaded' });
    const urls = await Promise.all(req.files.map((f) => persistUpload(f)));
    res.status(201).json({ success: true, urls });
  })
);

export default router;
