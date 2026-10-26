import { Router } from 'express';

const router = Router();

const DEFAULT_PALETTE = ['#0f766e', '#f59e0b'];
const HEX = /^#[0-9a-fA-F]{3,8}$/;

const esc = (s) =>
  String(s || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

const hex = (v, fallback) => (HEX.test(String(v || '')) ? String(v) : fallback);

// On-the-fly branded SVG placeholder. Used by the seed data so demo images work
// on any host (including serverless, where there is no persistent filesystem)
// without shipping static files. Replace with real photos from the admin panel.
router.get('/:name', (req, res) => {
  const name = String(req.params.name).replace(/\.svg$/i, '');
  const label = req.query.label ? String(req.query.label) : name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const emoji = req.query.emoji ? String(req.query.emoji).slice(0, 8) : '\u{1F36C}';
  const c1 = hex(req.query.c1, DEFAULT_PALETTE[0]);
  const c2 = hex(req.query.c2, DEFAULT_PALETTE[1]);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="640" cy="140" r="180" fill="#ffffff" opacity="0.08"/>
  <circle cx="140" cy="500" r="140" fill="#ffffff" opacity="0.08"/>
  <text x="400" y="290" font-size="150" text-anchor="middle" dominant-baseline="middle">${esc(emoji)}</text>
  <text x="400" y="430" font-size="46" font-family="Georgia, serif" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(label)}</text>
  <text x="400" y="500" font-size="26" font-family="Arial, sans-serif" fill="#ffffff" opacity="0.85" text-anchor="middle">Chotulal Sweets \u00b7 Bijapur</text>
</svg>`;

  res
    .set('Content-Type', 'image/svg+xml; charset=utf-8')
    .set('Cache-Control', 'public, max-age=31536000, immutable')
    .send(svg);
});

export default router;
