import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/http.js';
import { getSettings } from '../services/settings.js';

const router = Router();

// Ensure catalog endpoints are never cached by the browser or intermediary proxies
// so admin updates (pricing, products, stock, banners) reflect immediately.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

export const shapeProduct = (p) => {
  const variants = (p.variants || []).filter((v) => v.isActive);
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : p.basePrice;
  const maxPrice = prices.length ? Math.max(...prices) : p.basePrice;
  const inStock = variants.some((v) => v.stock > 0);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    sku: p.sku,
    unit: p.unit,
    ingredients: p.ingredients,
    allergens: p.allergens,
    basePrice: p.basePrice,
    originalPrice: p.originalPrice,
    minPrice,
    maxPrice,
    inStock,
    isFeatured: p.isFeatured,
    isBestseller: p.isBestseller,
    isNewArrival: p.isNewArrival,
    sortOrder: p.sortOrder,
    images: (p.images || []).map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    variants: variants.map((v) => ({
      id: v.id,
      label: v.label,
      weightGrams: v.weightGrams,
      price: v.price,
      originalPrice: v.originalPrice,
      stock: v.stock,
      sku: v.sku,
      isActive: v.isActive,
    })),
    categories: (p.categories || []).map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      slug: pc.category.slug,
    })),
  };
};

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: { sortOrder: 'asc' } },
  categories: { include: { category: true } },
};

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({
      success: true,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        icon: c.icon,
        bannerUrl: c.bannerUrl,
        showOnHome: c.showOnHome,
        sortOrder: c.sortOrder,
        productCount: c._count.products,
      })),
    });
  })
);

const buildProductWhere = (query) => {
  const where = { isActive: true };
  const and = [];

  if (query.category) {
    and.push({ categories: { some: { category: { slug: query.category, isActive: true } } } });
  }
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q } },
        { description: { contains: query.q } },
        { categories: { some: { category: { name: { contains: query.q } } } } },
      ],
    });
  }
  if (query.featured === 'true') and.push({ isFeatured: true });
  if (query.bestseller === 'true') and.push({ isBestseller: true });
  if (query.newArrival === 'true') and.push({ isNewArrival: true });

  if (query.minPrice || query.maxPrice) {
    const priceFilter = {};
    if (query.minPrice) priceFilter.gte = Number(query.minPrice);
    if (query.maxPrice) priceFilter.lte = Number(query.maxPrice);
    and.push({ variants: { some: { isActive: true, price: priceFilter } } });
  }
  if (query.inStock === 'true') {
    and.push({ variants: { some: { isActive: true, stock: { gt: 0 } } } });
  }

  if (and.length) where.AND = and;
  return where;
};

const orderFor = (sort) => {
  switch (sort) {
    case 'price_asc':
      return { basePrice: 'asc' };
    case 'price_desc':
      return { basePrice: 'desc' };
    case 'newest':
      return { createdAt: 'desc' };
    case 'popular':
      return [{ isBestseller: 'desc' }, { sortOrder: 'asc' }];
    default:
      return { sortOrder: 'asc' };
  }
};

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(60, Number(req.query.limit || 24));
    const where = buildProductWhere(req.query);

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: orderFor(req.query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      products: products.map(shapeProduct),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: productInclude,
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const related = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        categories: { some: { categoryId: product.categories[0]?.categoryId } },
      },
      include: productInclude,
      take: 8,
    });

    res.json({ success: true, product: shapeProduct(product), related: related.map(shapeProduct) });
  })
);

router.get(
  '/search/suggest',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, products: [], categories: [] });

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, name: { contains: q } },
        include: productInclude,
        take: 6,
        orderBy: { isBestseller: 'desc' },
      }),
      prisma.category.findMany({
        where: { isActive: true, name: { contains: q } },
        take: 4,
      }),
    ]);

    res.json({
      success: true,
      products: products.map(shapeProduct),
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl })),
    });
  })
);

// Homepage content: banners + sections + selected products. All admin-editable.
router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const [banners, sections, categories, settings] = await Promise.all([
      prisma.homepageBanner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.homepageSection.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.category.findMany({ where: { isActive: true, showOnHome: true }, orderBy: { sortOrder: 'asc' } }),
      getSettings(),
    ]);

    const sectionData = [];
    for (const section of sections) {
      if (section.type === 'CATEGORY_CAROUSEL') {
        sectionData.push({ ...section, categories: categories });
        continue;
      }
      const where = { isActive: true };
      if (section.key === 'FEATURED') where.isFeatured = true;
      if (section.key === 'NEW_ARRIVALS') where.isNewArrival = true;
      if (section.key === 'BESTSELLERS') where.isBestseller = true;
      if (section.key === 'OFFERS') where.originalPrice = { not: null };
      if (section.categoryId) where.categories = { some: { categoryId: section.categoryId } };

      const products = await prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { sortOrder: 'asc' },
        take: 12,
      });
      sectionData.push({ ...section, products: products.map(shapeProduct) });
    }

    res.json({
      success: true,
      banners,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        icon: c.icon,
      })),
      sections: sectionData,
      settings: {
        shopName: settings.shopName,
        tagline: settings.tagline,
        logoUrl: settings.logoUrl,
        contactPhone: settings.contactPhone,
        minOrderAmount: settings.minOrderAmount,
        deliveryFee: settings.deliveryFee,
        freeDeliveryAbove: settings.freeDeliveryAbove,
        openTime: settings.openTime,
        closeTime: settings.closeTime,
      },
    });
  })
);

router.get(
  '/settings/public',
  asyncHandler(async (_req, res) => {
    const s = await getSettings();
    res.json({
      success: true,
      settings: {
        shopName: s.shopName,
        tagline: s.tagline,
        logoUrl: s.logoUrl,
        mobileLogoUrl: s.mobileLogoUrl,
        faviconUrl: s.faviconUrl,
        footerText: s.footerText,
        announcementBarActive: Boolean(s.announcementBarActive),
        announcementBarText: s.announcementBarText,
        announcementBarLink: s.announcementBarLink,
        address: s.address,
        contactPhone: s.contactPhone,
        contactEmail: s.contactEmail,
        openTime: s.openTime,
        closeTime: s.closeTime,
        deliveryZones: s.deliveryZones,
        googleMapsUrl: s.googleMapsUrl,
        deliveryFee: s.deliveryFee,
        freeDeliveryAbove: s.freeDeliveryAbove,
        minOrderAmount: s.minOrderAmount,
        taxPercent: s.taxEnabled ? s.taxPercent : 0,
        taxEnabled: s.taxEnabled,
        codEnabled: s.codEnabled,
        onlinePaymentEnabled: s.onlinePaymentEnabled,
        guestCheckoutEnabled: s.guestCheckoutEnabled,
        aboutUsTitle: s.aboutUsTitle,
        aboutUsContent: s.aboutUsContent,
        deliveryPolicy: s.deliveryPolicy,
        returnPolicy: s.returnPolicy,
        termsConditions: s.termsConditions,
        privacyPolicy: s.privacyPolicy,
        faqList: s.faqList || [],
        socialInstagram: s.socialInstagram,
        socialFacebook: s.socialFacebook,
        socialWhatsapp: s.socialWhatsapp,
        socialTwitter: s.socialTwitter,
        metaTitle: s.metaTitle,
        metaDescription: s.metaDescription,
        metaKeywords: s.metaKeywords,
      },
    });
  })
);

router.get(
  '/coupons/:code',
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.findUnique({ where: { code: req.params.code.toUpperCase() } });
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ success: false, error: 'Invalid coupon' });
    }
    res.json({ success: true, coupon: { code: coupon.code, type: coupon.type, value: coupon.value, minOrder: coupon.minOrder, description: coupon.description } });
  })
);

router.post(
  '/contact',
  asyncHandler(async (req, res) => {
    const { name, phone, email, orderNumber, subject, message } = req.body;
    if (!name || !phone || !email || !message) {
      return res.status(400).json({ success: false, error: 'All required fields must be filled' });
    }
    if (!phone.match(/^\+?[6-9]\d{5,10}$/)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid phone number' });
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }
    // In a production system, this would be saved to a database or sent via email
    console.log('Contact form submission:', { name, phone, email, orderNumber, subject, message });
    res.json({ success: true, message: 'Your message has been received. Our team will contact you soon.' });
  })
);

export default router;
