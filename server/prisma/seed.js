import fs from 'fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real product photographs bundled with the repo (see scripts/fetch-images.mjs
// and client/public/images/CREDITS.md). Each entry maps a product/category/
// banner key to a bundled local file served from client/public.
const MANIFEST = JSON.parse(fs.readFileSync(new URL('./image-manifest.json', import.meta.url), 'utf8'));

const PALETTES = {
  sweet: ['#0f766e', '#f59e0b'],
  regular: ['#b45309', '#fbbf24'],
  namkeen: ['#9a3412', '#f97316'],
  combo: ['#7c2d12', '#facc15'],
  veg: ['#15803d', '#84cc16'],
};

// Returns a URL to an on-the-fly branded SVG placeholder served by the API.
// Used only as a last-resort fallback when a product has no bundled photo.
const imageUrl = (slug, label, palette = 'sweet', emoji = '\u{1F36C}') => {
  const [c1, c2] = PALETTES[palette] || PALETTES.sweet;
  const q = new URLSearchParams({ label, emoji, c1, c2 });
  return `/api/placeholder/${slug}.svg?${q.toString()}`;
};

// Real bundled photo for a key, falling back to a branded SVG placeholder.
const photo = (key, slug, label, palette = 'sweet', emoji = '\u{1F36C}') =>
  MANIFEST[key]?.file || imageUrl(slug, label, palette, emoji);

const CATEGORIES = [
  { name: 'Special Sweets', slug: 'special-sweets', icon: '🍮', palette: 'sweet', emoji: '🍮', desc: 'Handcrafted premium sweets made with pure ghee.' },
  { name: 'Regular Sweets', slug: 'regular-sweets', icon: '🟠', palette: 'regular', emoji: '🟠', desc: 'Everyday favourites and traditional laddus.' },
  { name: 'Namkeen Sweets', slug: 'namkeen-sweets', icon: '🥨', palette: 'namkeen', emoji: '🥨', desc: 'Crispy savoury namkeen and mixtures.' },
  { name: 'Snacks and Sweets', slug: 'snacks-and-sweets', icon: '🎁', palette: 'combo', emoji: '🎁', desc: 'Combos, gift boxes and festival packs.' },
  { name: 'Veg', slug: 'veg', icon: '🥟', palette: 'veg', emoji: '🥟', desc: 'Fresh vegetarian bakery and fried snacks.' },
];

// perKg = reference price per kilogram (sample data). weight variants derive from it.
const PRODUCTS = [
  // Category 1: Special Sweets
  { name: 'Special Peda', cat: 'special-sweets', perKg: 480, emoji: '🟡', featured: true, best: true },
  { name: 'Burfi', cat: 'special-sweets', perKg: 460, emoji: '🟤' },
  { name: 'Kalakand', cat: 'special-sweets', perKg: 500, emoji: '⬜', featured: true },
  { name: 'Makhan Peda', cat: 'special-sweets', perKg: 540, emoji: '🟨', best: true },
  { name: 'Kaju Katli', cat: 'special-sweets', perKg: 900, emoji: '💎', featured: true, best: true },
  { name: 'Milk Cake', cat: 'special-sweets', perKg: 520, emoji: '🍮' },
  { name: 'Gulkand Kalakand', cat: 'special-sweets', perKg: 560, emoji: '🌸', isNew: true },
  { name: 'Chocolate Kalakand', cat: 'special-sweets', perKg: 580, emoji: '🍫', isNew: true },
  { name: 'Rasmalai', cat: 'special-sweets', perKg: 420, emoji: '🥛', featured: true },
  { name: 'Rasgulla', cat: 'special-sweets', perKg: 360, emoji: '⚪' },
  { name: 'Kaju Pista Roll', cat: 'special-sweets', perKg: 950, emoji: '🟩' },
  { name: 'Special Masala Peanuts', cat: ['special-sweets', 'namkeen-sweets'], perKg: 300, emoji: '🥜' },

  // Category 2: Regular Sweets
  { name: 'Dry Jamun', cat: 'regular-sweets', perKg: 380, emoji: '🟣', best: true },
  { name: 'Motichoor Laddu', cat: 'regular-sweets', perKg: 420, emoji: '🟠', featured: true, best: true },
  { name: 'Boondi Laddu', cat: 'regular-sweets', perKg: 400, emoji: '🟡' },
  { name: 'Mysore Pak', cat: 'regular-sweets', perKg: 460, emoji: '🟨' },
  { name: 'Soan Papdi', cat: 'regular-sweets', perKg: 340, emoji: '⬜' },
  { name: 'Besan Laddu', cat: 'regular-sweets', perKg: 440, emoji: '🟠' },
  { name: 'Shankarpali', cat: 'regular-sweets', perKg: 320, emoji: '🔶' },
  { name: 'Dink Laddu', cat: 'regular-sweets', perKg: 620, emoji: '🟤' },
  { name: 'Karadantu', cat: 'regular-sweets', perKg: 700, emoji: '🟫', isNew: true },

  // Category 3: Namkeen Sweets
  { name: 'Special Mixed Namkeen', cat: 'namkeen-sweets', perKg: 320, emoji: '🥨', featured: true },
  { name: 'Poha Chivda', cat: 'namkeen-sweets', perKg: 280, emoji: '🍚' },
  { name: 'Regular Sev', cat: 'namkeen-sweets', perKg: 260, emoji: '🍜' },
  { name: 'Zero Sev', cat: 'namkeen-sweets', perKg: 300, emoji: '🟡' },
  { name: 'Garlic Sev', cat: 'namkeen-sweets', perKg: 300, emoji: '🧄' },
  { name: 'Khari Boondi', cat: 'namkeen-sweets', perKg: 280, emoji: '🟠' },
  { name: 'Gathiya', cat: 'namkeen-sweets', perKg: 320, emoji: '🥖' },
  { name: 'Papdi', cat: 'namkeen-sweets', perKg: 280, emoji: '🟨' },
  { name: 'Chikki', cat: 'namkeen-sweets', perKg: 360, emoji: '🍯', best: true },
  { name: 'Banana Chips', cat: 'namkeen-sweets', perKg: 340, emoji: '🍌' },
  { name: 'Bhel Mix', cat: 'namkeen-sweets', perKg: 260, emoji: '🥗' },

  // Category 4: Snacks and Sweets (combos / gift boxes)
  { name: 'Jalebi Combo — 250 g', cat: 'snacks-and-sweets', fixedLabel: '250 g', fixedPrice: 120, emoji: '🌀', featured: true, best: true },
  { name: 'Chakkli Combo — 250 g', cat: 'snacks-and-sweets', fixedLabel: '250 g', fixedPrice: 130, emoji: '🥯' },
  { name: 'Dry Jamun Combo — 250 g', cat: 'snacks-and-sweets', fixedLabel: '250 g', fixedPrice: 110, emoji: '🟣' },
  { name: 'Sweets Gift Box', cat: 'snacks-and-sweets', gift: true, basePrice: 550, emoji: '🎁', featured: true },
  { name: 'Mixed Sweets Box', cat: 'snacks-and-sweets', gift: true, basePrice: 650, emoji: '🎀', best: true },
  { name: 'Festival Combo', cat: 'snacks-and-sweets', gift: true, basePrice: 899, emoji: '🪔', featured: true, isNew: true },
  { name: 'Tea-Time Snack Box', cat: 'snacks-and-sweets', gift: true, basePrice: 399, emoji: '☕' },

  // Category 5: Veg (piece based)
  { name: 'Samosa', cat: 'veg', perPiece: 15, emoji: '🥟', best: true, featured: true },
  { name: 'Kachori', cat: 'veg', perPiece: 18, emoji: '🥟' },
  { name: 'Bread Pakoda with Chutney', cat: 'veg', perPiece: 25, emoji: '🍞' },
  { name: 'Veg Puff', cat: 'veg', perPiece: 20, emoji: '🥐' },
  { name: 'Veg Cutlet', cat: 'veg', perPiece: 22, emoji: '🍘', isNew: true },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
const round = (n) => Math.round(n / 5) * 5; // prices rounded to nearest 5

const buildVariants = (p) => {
  if (p.fixedPrice) {
    return [{ label: p.fixedLabel, price: p.fixedPrice, originalPrice: round(p.fixedPrice * 1.15), stock: 40, sortOrder: 0 }];
  }
  if (p.gift) {
    const base = p.basePrice;
    return [
      { label: 'Standard Box', price: base, originalPrice: round(base * 1.15), stock: 30, sortOrder: 0 },
      { label: 'Premium Box', price: round(base * 1.6), originalPrice: round(base * 1.9), stock: 20, sortOrder: 1 },
    ];
  }
  if (p.perPiece) {
    const unit = p.perPiece;
    return [
      { label: '1 piece', weightGrams: null, price: unit, originalPrice: null, stock: 100, sortOrder: 0 },
      { label: '2 pieces', weightGrams: null, price: round(unit * 2 * 0.95), originalPrice: null, stock: 80, sortOrder: 1 },
      { label: '6 pieces', weightGrams: null, price: round(unit * 6 * 0.9), originalPrice: null, stock: 50, sortOrder: 2 },
    ];
  }
  // weight based (per kg reference)
  const perKg = p.perKg;
  return [
    { label: '250 g', weightGrams: 250, price: round(perKg * 0.28), originalPrice: round(perKg * 0.3), stock: 50, sortOrder: 0 },
    { label: '500 g', weightGrams: 500, price: round(perKg * 0.55), originalPrice: round(perKg * 0.58), stock: 35, sortOrder: 1 },
    { label: '1 kg', weightGrams: 1000, price: perKg, originalPrice: round(perKg * 1.1), stock: 20, sortOrder: 2 },
  ];
};

async function main() {
  console.log('Seeding Chotulal Sweets...');

  // --- Staff ---------------------------------------------------------------
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: { passwordHash: adminHash, role: 'ADMIN', isActive: true },
    create: {
      name: 'Shop Admin',
      phone: '9999999999',
      email: 'admin@chotulalsweets.local',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const boys = [
    { name: 'Ravi Kumar', phone: '8888888881', email: 'ravi@chotulalsweets.local', vehicleType: 'Bike', vehicleNumber: 'KA-28-AB-1234' },
    { name: 'Suresh Naik', phone: '8888888882', email: 'suresh@chotulalsweets.local', vehicleType: 'Scooter', vehicleNumber: 'KA-28-CD-5678' },
  ];
  const boyHash = await bcrypt.hash('delivery123', 10);
  for (const b of boys) {
    await prisma.user.upsert({
      where: { phone: b.phone },
      update: { passwordHash: boyHash, role: 'DELIVERY', isActive: true },
      create: {
        name: b.name,
        phone: b.phone,
        email: b.email,
        passwordHash: boyHash,
        role: 'DELIVERY',
        deliveryProfile: { create: { vehicleType: b.vehicleType, vehicleNumber: b.vehicleNumber } },
      },
    });
  }

  // --- Categories ----------------------------------------------------------
  const catMap = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const image = photo(`c-${c.slug}`, `cat-${c.slug}`, c.name, c.palette, c.emoji);
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, imageUrl: image, bannerUrl: image, icon: c.icon, sortOrder: i, isActive: true, showOnHome: true },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.desc,
        imageUrl: image,
        bannerUrl: image,
        icon: c.icon,
        sortOrder: i,
        isActive: true,
        showOnHome: true,
      },
    });
    catMap[c.slug] = cat.id;
  }

  // --- Products ------------------------------------------------------------
  let count = 0;
  for (const [i, p] of PRODUCTS.entries()) {
    const slug = slugify(p.name);
    const categories = Array.isArray(p.cat) ? p.cat : [p.cat];
    const palette = CATEGORIES.find((c) => c.slug === categories[0])?.palette || 'sweet';
    const image = photo(`p-${slug}`, `p-${slug}`, p.name, palette, p.emoji);
    const variants = buildVariants(p);
    const basePrice = variants[0].price;
    const originalPrice = variants[0].originalPrice || null;

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      // Idempotent re-seed: refresh metadata AND the primary photograph so
      // existing installs pick up the bundled real images.
      await prisma.product.update({
        where: { slug },
        data: {
          name: p.name,
          basePrice,
          originalPrice,
          isFeatured: !!p.featured,
          isBestseller: !!p.best,
          isNewArrival: !!p.isNew,
          isActive: true,
          sortOrder: i,
        },
      });
      const current = await prisma.productImage.findFirst({ where: { productId: existing.id }, orderBy: { sortOrder: 'asc' } });
      if (current) {
        await prisma.productImage.update({ where: { id: current.id }, data: { url: image, alt: p.name } });
      } else {
        await prisma.productImage.create({ data: { productId: existing.id, url: image, alt: p.name, sortOrder: 0 } });
      }
      continue;
    }

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: `${p.name} from Chotulal Sweets, freshly prepared. Prices shown are sample values and can be edited from the admin panel.`,
        sku: `CHT-${String(i + 1).padStart(4, '0')}`,
        basePrice,
        originalPrice,
        unit: p.perPiece ? 'per piece' : p.gift ? 'per box' : 'per kg',
        isFeatured: !!p.featured,
        isBestseller: !!p.best,
        isNewArrival: !!p.isNew,
        isActive: true,
        sortOrder: i,
        categories: { create: categories.map((slugName) => ({ categoryId: catMap[slugName] })) },
        images: { create: [{ url: image, alt: p.name, sortOrder: 0 }] },
        variants: { create: variants },
      },
    });
    count += 1;
  }

  // --- Homepage banners ----------------------------------------------------
  const bannerData = [
    { title: 'Fresh Sweets, Made with Love', subtitle: 'Straight from our kitchen', description: 'Handcrafted daily with pure ingredients.', palette: 'sweet', emoji: '🍮', ctaLabel: 'Shop Sweets', ctaLink: '/category/special-sweets' },
    { title: 'Traditional Indian Sweets for Every Celebration', subtitle: 'Festive specials', description: 'Order your favourites for every occasion.', palette: 'regular', emoji: '🪔', ctaLabel: 'Explore', ctaLink: '/category/regular-sweets' },
    { title: 'Festive Gift Boxes', subtitle: 'Perfect gifting', description: 'Curated boxes that make celebrations sweeter.', palette: 'combo', emoji: '🎁', ctaLabel: 'View Gift Boxes', ctaLink: '/category/snacks-and-sweets' },
    { title: 'Delicious Namkeen for Every Snack Break', subtitle: 'Crispy & fresh', description: 'A crunchy mix for every mood.', palette: 'namkeen', emoji: '🥨', ctaLabel: 'Shop Namkeen', ctaLink: '/category/namkeen-sweets' },
    { title: 'Fresh Bakery and Vegetarian Snacks', subtitle: 'Hot & fresh', description: 'Samosas, kachoris, puffs and more.', palette: 'veg', emoji: '🥟', ctaLabel: 'Order Now', ctaLink: '/category/veg' },
  ];
  await prisma.homepageBanner.deleteMany();
  for (const [i, b] of bannerData.entries()) {
    const image = photo(`banner-${i}`, `banner-${i}`, b.title, b.palette, b.emoji);
    await prisma.homepageBanner.create({
      data: {
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        imageUrl: image,
        ctaLabel: b.ctaLabel,
        ctaLink: b.ctaLink,
        sortOrder: i,
        isActive: true,
      },
    });
  }

  // --- Homepage sections ---------------------------------------------------
  const sections = [
    { key: 'CATEGORIES', title: 'Shop by Category', type: 'CATEGORY_CAROUSEL', sortOrder: 0 },
    { key: 'FEATURED', title: 'Featured Sweets', type: 'PRODUCT_CAROUSEL', sortOrder: 1 },
    { key: 'BESTSELLERS', title: 'Bestsellers', type: 'PRODUCT_CAROUSEL', sortOrder: 2 },
    { key: 'special-sweets', title: 'Special Sweets', type: 'PRODUCT_CAROUSEL', categoryId: catMap['special-sweets'], sortOrder: 3 },
    { key: 'regular-sweets', title: 'Regular Sweets', type: 'PRODUCT_CAROUSEL', categoryId: catMap['regular-sweets'], sortOrder: 4 },
    { key: 'namkeen-sweets', title: 'Namkeen Sweets', type: 'PRODUCT_CAROUSEL', categoryId: catMap['namkeen-sweets'], sortOrder: 5 },
    { key: 'snacks-and-sweets', title: 'Snacks and Sweets', type: 'PRODUCT_CAROUSEL', categoryId: catMap['snacks-and-sweets'], sortOrder: 6 },
    { key: 'veg', title: 'Veg Snacks', type: 'PRODUCT_CAROUSEL', categoryId: catMap['veg'], sortOrder: 7 },
    { key: 'NEW_ARRIVALS', title: 'New Arrivals', type: 'PRODUCT_CAROUSEL', sortOrder: 8 },
  ];
  for (const s of sections) {
    await prisma.homepageSection.upsert({
      where: { key: s.key },
      update: { title: s.title, type: s.type, categoryId: s.categoryId || null, sortOrder: s.sortOrder, isActive: true },
      create: { key: s.key, title: s.title, type: s.type, categoryId: s.categoryId || null, sortOrder: s.sortOrder, isActive: true },
    });
  }

  // --- Coupons -------------------------------------------------------------
  const coupons = [
    { code: 'SWEET10', type: 'PERCENT', value: 10, minOrder: 300, maxDiscount: 100, description: '10% off on orders above ₹300' },
    { code: 'FIRST50', type: 'FLAT', value: 50, minOrder: 250, description: '₹50 off on your first order' },
    { code: 'FESTIVE15', type: 'PERCENT', value: 15, minOrder: 800, maxDiscount: 250, description: '15% festive discount above ₹800' },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { isActive: true },
      create: { ...c, isActive: true },
    });
  }

  // --- Shop settings -------------------------------------------------------
  const settings = {
    shopName: 'Chotulal Sweets',
    tagline: 'Fresh Sweets, Made with Love',
    address: 'Bijapur Locality, Karnataka',
    contactPhone: '+91 90000 00000',
    openTime: '08:00',
    closeTime: '22:00',
    deliveryFee: 30,
    freeDeliveryAbove: 500,
    minOrderAmount: 100,
    taxPercent: 5,
    taxEnabled: true,
    codEnabled: true,
    onlinePaymentEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    guestCheckoutEnabled: true,
    deliveryZones: 'Bijapur Locality, Bijapur',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.shopSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }

  console.log(`Seed complete. Categories: ${CATEGORIES.length}, new products: ${count}`);
  console.log('Admin login    -> phone: 9999999999  password: admin123');
  console.log('Delivery login -> phone: 8888888881  password: delivery123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
