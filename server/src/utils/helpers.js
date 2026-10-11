import crypto from 'crypto';

export const slugify = (str) =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const genOrderNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CHT-${ymd}-${rand}`;
};

export const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const genToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows, headers) => {
  const cols = headers || (rows[0] ? Object.keys(rows[0]) : []);
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => csvEscape(row[c])).join(','));
  }
  return lines.join('\n');
};

export const parseCsv = (text) => {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (ch === '\r') { /* skip */ }
    else field += ch;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const filtered = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!filtered.length) return [];
  const headers = filtered[0].map((h) => h.trim());
  return filtered.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
};
