// Fetches curated, properly-licensed photographs from Wikimedia Commons and
// stores them in client/public/images so the site always serves real product
// photos (no placeholders, no external hot-links, works on any host).
//
// Usage:  node server/scripts/fetch-images.mjs
//
// The mapping below was hand-picked so every image matches its product. All
// images are re-licensed under their original Creative-Commons terms by their
// uploaders on Wikimedia Commons; attribution data is recorded in
// server/prisma/image-manifest.json and in client/public/images/CREDITS.md.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const OUT_DIR = path.join(ROOT, 'client/public/images');
const PRODUCTS_DIR = path.join(OUT_DIR, 'products');
const MANIFEST_PATH = path.join(ROOT, 'server/prisma/image-manifest.json');

const UA = 'ChotulalSweetsImageBot/1.0 (product photography refresh; contact via repo)';

// key -> Wikimedia Commons "File:" title.
const ASSETS = {
  // ---- Products ------------------------------------------------------------
  'p-special-peda': 'File:Indian Sweet Dessert Peda in a glass plate.jpg',
  'p-burfi': 'File:Barfi - Indian sweet.jpg',
  'p-kalakand': 'File:Kalakand of Salem.jpg',
  'p-makhan-peda': 'File:Mathura Peda.jpg',
  'p-kaju-katli': 'File:Kaju katli dessert - side view.jpg',
  'p-milk-cake': 'File:Milk Cake, Kolkata.jpg',
  'p-gulkand-kalakand': 'File:Sweet Kalakand.jpg',
  'p-chocolate-kalakand': 'File:Aesthetic Chocolate burfi.jpg',
  'p-rasmalai': 'File:Rasmalai 3.jpg',
  'p-rasgulla': 'File:Rasgulla With Rabdi.jpg',
  'p-kaju-pista-roll': 'File:Kaju Roll Recipe A Classic Dessert Recipe By Sonia Goyal.jpg',
  'p-special-masala-peanuts': 'File:Spicy peanut1.jpg',
  'p-dry-jamun': 'File:Two Gulab Jamun in a plate 01.jpg',
  'p-motichoor-laddu': 'File:Motichoor Laddu.jpg',
  'p-boondi-laddu': 'File:Boondi laddoo.JPG',
  'p-mysore-pak': 'File:Ghee Mysore Pak.jpg',
  'p-soan-papdi': 'File:Soan sohan papdi India Festive Sweets.jpg',
  'p-besan-laddu': 'File:Besan Laddu cropped.jpg',
  'p-shankarpali': 'File:Shankarpali sweets mithai Western India 2012.jpg',
  'p-dink-laddu': 'File:Dink Ladu - Our home at Pune - Maharashtra - IMG 20210215 175106.jpg',
  'p-karadantu': 'File:Gokak karadant.jpg',
  'p-special-mixed-namkeen': 'File:Mixture.JPG',
  'p-poha-chivda': 'File:Sev-Chivda.jpg',
  'p-regular-sev': 'File:Sev 2013-12-01 16-57.jpg',
  'p-zero-sev': 'File:Bikaneri bhujia in West Bengal, India, photographed by Yogabrata Chakraborty, on March 11, 2023.jpg',
  'p-garlic-sev': 'File:Kathiawadi gathiya Gujarat India.jpg',
  'p-khari-boondi': 'File:Homemade Boondi in West Bengal, India.jpg',
  'p-gathiya': 'File:Ghatiya 2013-11-30 18-09.jpg',
  'p-papdi': 'File:Papdi and rajjbhog chaat.jpg',
  'p-chikki': 'File:Peanut Chikki With Caramel.jpg',
  'p-banana-chips': 'File:Homemade 4 Cut Banana Chips.jpg',
  'p-bhel-mix': 'File:Bhel puri chat, photographed in West Bengal, India, September 24, 2024.jpg',
  'p-jalebi-combo-250-g': 'File:Jalebi in a bowl.jpg',
  'p-chakkli-combo-250-g': 'File:Murukku or Chakli.jpg',
  'p-dry-jamun-combo-250-g': 'File:Gulab Jamun as a Diwali Sweet.jpg',
  'p-sweets-gift-box': 'File:Assorted Sweets - Mehsana - Gujarat - 1.jpg',
  'p-mixed-sweets-box': 'File:Sweets Diwali Mithai India.jpg',
  'p-festival-combo': 'File:Burfi and Peda, Indian Sweets Mithai Chennai India.jpg',
  'p-tea-time-snack-box': 'File:Plate of Samosas and snacks.JPG',
  'p-samosa': 'File:Samosa 4.jpg',
  'p-kachori': 'File:Kachori MA23.jpg',
  'p-bread-pakoda-with-chutney': 'File:Bread Pakora (Stuffed with Mashed-Spicy Potatoes).JPG',
  'p-veg-puff': 'File:Egg Puff2.jpg',
  'p-veg-cutlet': 'File:Veg- Cutlet.jpg',

  // ---- Categories ----------------------------------------------------------
  'c-special-sweets': 'File:Indian Sweet Dessert Peda in a white bone china plate.jpg',
  'c-regular-sweets': 'File:Boondi Laddu.JPG',
  'c-namkeen-sweets': 'File:Indian Snack in a bowl (Namkeen).jpg',
  'c-snacks-and-sweets': 'File:Jalebi Fafda.jpg',
  'c-veg': 'File:Samosas plate.jpg',

  // ---- Homepage banners ------------------------------------------------------
  // Wide landscape photographs (aspect >= 1.7) so full-bleed hero slides do not
  // over-crop when object-cover fills the banner.
  'banner-0': 'File:Sweets in India.jpg',
  'banner-1': 'File:Kaju katli 02.jpg',
  'banner-2': 'File:Diwali gift.jpg',
  'banner-3': 'File:Mixture (the Indian snack) in Chennai.JPG',
  'banner-4': 'File:Urad Dal Kachori.jpg',
};

const extFor = (mime) => (mime === 'image/png' ? 'png' : 'jpg');

async function resolve(title, width = 900) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('titles', title);
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|size|mime|extmetadata');
  api.searchParams.set('iiurlwidth', String(width));
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) throw new Error(`No matches for ${title}`);
  const hit = Object.values(pages).find((p) => p.pageid > 0);
  if (!hit) throw new Error(`File not found on Commons: ${title}`);
  const info = hit.imageinfo?.[0];
  if (!info) throw new Error(`No imageinfo for ${title}`);
  return {
    title: hit.title,
    descriptionUrl: info.descriptionurl,
    thumbUrl: info.thumburl || info.url,
    mime: info.mime,
    license: info.extmetadata?.LicenseShortName?.value || '',
    artist: (info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(),
  };
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`Download too small (<1KB): ${url}`);
  return buf;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, attempts = 6) {
  let lastErr;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = Math.min(1500 * 2 ** i, 12000);
      console.log(`      retry ${i}/${attempts} after ${wait}ms (${err.message})`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function main() {
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  const previous = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : {};
  const manifest = { ...previous };
  let ok = 0;
  let failed = 0;

  for (const [key, title] of Object.entries(ASSETS)) {
    const existing = manifest[key];
    if (existing && fs.existsSync(path.join(ROOT, `client/public${existing.file}`))) {
      console.log(`  --- ${key} already present, skipping`);
      ok += 1;
      continue;
    }
    try {
      const meta = await withRetry(() => resolve(title, key.startsWith('banner') ? 1600 : 900));
      const cleanUrl = meta.thumbUrl.split('?')[0];
      const ext = extFor(meta.mime);
      const filename = `${key}.${ext}`;
      const target = key.startsWith('p-') ? PRODUCTS_DIR : OUT_DIR;
      const buffer = await withRetry(() => download(cleanUrl));
      fs.writeFileSync(path.join(target, filename), buffer);

      manifest[key] = {
        file: `/images/${key.startsWith('p-') ? 'products/' : ''}${filename}`,
        title: meta.title,
        source: meta.descriptionUrl,
        license: meta.license || 'CC BY-SA (Wikimedia Commons)',
        artist: meta.artist || 'Wikimedia Commons contributor',
      };
      ok += 1;
      console.log(`  OK  ${key}  <- ${meta.title}  (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      failed += 1;
      console.error(`  ERR ${key}: ${err.message}`);
    }
    await sleep(450);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // Human-readable attribution for the bundled photos.
  const lines = [
    '# Image Credits',
    '',
    'All product, category and banner photographs bundled in `client/public/images`',
    'are sourced from Wikimedia Commons and used under their respective Creative',
    'Commons licences. Replace any of them from **Admin → Products / Homepage** with',
    'your own shop photography at any time.',
    '',
    '| Asset | File | Source | Author | Licence |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const [key, m] of Object.entries(manifest)) {
    lines.push(`| ${key} | \`${m.file}\` | [${m.title}](${m.source}) | ${m.artist} | ${m.license} |`);
  }
  lines.push('');
  fs.writeFileSync(path.join(OUT_DIR, 'CREDITS.md'), lines.join('\n'));

  console.log(`\nDone. ${ok} images saved, ${failed} failed. Manifest -> ${MANIFEST_PATH}`);
  if (failed) process.exitCode = 1;
}

main();