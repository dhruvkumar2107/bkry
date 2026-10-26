import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api';

async function run() {
  console.log('--- Testing Admin Price Changes & Order Tracking Integration ---');

  // 1. Get admin user and generate auth token
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No admin user found');
  const token = jwt.sign({ id: admin.id, role: admin.role }, 'dev-local-secret-change-me-0123456789abcdef', { expiresIn: '1d' });

  // 2. Find a product to test price updates
  const testProd = await prisma.product.findFirst({ where: { slug: 'special-peda' }, include: { variants: true } });
  if (!testProd) throw new Error('Special Peda not found');
  console.log(`Original Special Peda basePrice: ${testProd.basePrice}, variant 0 price: ${testProd.variants[0]?.price}`);

  // Test updating price in admin
  const newPrice = testProd.basePrice === 165 ? 175 : 165;
  const updateRes = await fetch(`${BASE}/admin/products/${testProd.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      basePrice: newPrice,
      originalPrice: newPrice + 20,
    }),
  });
  const updateData = await updateRes.json();
  if (!updateData.success) throw new Error('Admin update failed: ' + JSON.stringify(updateData));
  console.log(`✓ Admin price update API succeeded. New basePrice: ${updateData.product.basePrice}`);

  // 3. Verify storefront catalog returns the updated price immediately
  const storeProdRes = await fetch(`${BASE}/catalog/products/special-peda`);
  const storeProdData = await storeProdRes.json();
  if (!storeProdData.success) throw new Error('Storefront product fetch failed');
  const storePrice = storeProdData.product.minPrice;
  const storeVar0Price = storeProdData.product.variants[0]?.price;
  console.log(`Storefront Special Peda minPrice: ${storePrice}, variant 0: ${storeVar0Price}`);
  if (storePrice !== newPrice || storeVar0Price !== newPrice) {
    throw new Error(`Storefront did not reflect new price! Expected ${newPrice}, got minPrice: ${storePrice}, variant 0: ${storeVar0Price}`);
  }
  console.log('✓ Verified: Admin price change reflected IMMEDIATELY on storefront product API!');

  // Also check /catalog/home
  const homeRes = await fetch(`${BASE}/catalog/home`);
  const homeData = await homeRes.json();
  const homeProd = homeData.sections.flatMap(s => s.products || []).find(p => p.id === testProd.id);
  if (homeProd) {
    console.log(`Homepage section product minPrice: ${homeProd.minPrice}`);
    if (homeProd.minPrice !== newPrice) {
      throw new Error(`Homepage section did not reflect new price! Expected ${newPrice}, got ${homeProd.minPrice}`);
    }
    console.log('✓ Verified: Homepage section immediately displays the updated price!');
  }

  // 4. Test Order Tracking directly by orderNumber (public tracking)
  const existingOrder = await prisma.order.findFirst({ orderBy: { placedAt: 'desc' } });
  if (existingOrder) {
    const trackRes = await fetch(`${BASE}/track/${existingOrder.orderNumber}`);
    const trackData = await trackRes.json();
    if (!trackData.success || !trackData.order) {
      throw new Error('Public tracking lookup failed: ' + JSON.stringify(trackData));
    }
    console.log(`✓ Order tracking lookup succeeded directly for ${existingOrder.orderNumber}: Status = ${trackData.order.status}, Items = ${trackData.order.items.length}, Timeline = ${trackData.order.timeline.length} events`);
  }

  // 5. Test End-to-End Cart -> Checkout -> Razorpay create -> order transition
  const guestToken = 'test-token-' + Date.now();
  const cartAddRes = await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-token': guestToken,
    },
    body: JSON.stringify({
      variantId: testProd.variants[0].id,
      quantity: 1,
    }),
  });
  const cartAddData = await cartAddRes.json();
  if (!cartAddData.success) throw new Error('Cart add failed: ' + JSON.stringify(cartAddData));
  console.log(`✓ Added Special Peda to cart (${cartAddData.cart.items.length} item in cart)`);

  const checkoutRes = await fetch(`${BASE}/orders/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-token': guestToken,
    },
    body: JSON.stringify({
      customerName: 'Test Customer',
      customerPhone: '9876543210',
      paymentMethod: 'ONLINE',
      address: {
        line1: '123 Sweet Lane',
        city: 'Bijapur',
        pincode: '586101',
      },
    }),
  });
  const checkoutData = await checkoutRes.json();
  if (!checkoutData.success || !checkoutData.order) {
    throw new Error('Checkout failed: ' + JSON.stringify(checkoutData));
  }
  const newOrder = checkoutData.order;
  console.log(`✓ Placed test online order: ${newOrder.orderNumber}, Total: ₹${newOrder.total}, Status: ${newOrder.status}`);

  // Razorpay order creation
  const rzpCreateRes = await fetch(`${BASE}/payments/razorpay/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: newOrder.orderNumber }),
  });
  const rzpData = await rzpCreateRes.json();
  if (!rzpData.success || !rzpData.razorpayOrderId) {
    throw new Error('Razorpay order creation failed: ' + JSON.stringify(rzpData));
  }
  console.log(`✓ Real Razorpay order created: ${rzpData.razorpayOrderId}, Amount: ₹${rzpData.amount}, Key: ${rzpData.keyId}`);

  // Verify tracking for this newly placed order
  const newTrackRes = await fetch(`${BASE}/track/${newOrder.orderNumber}`);
  const newTrackData = await newTrackRes.json();
  if (!newTrackData.success || newTrackData.order.status !== 'PENDING_CONFIRMATION') {
    throw new Error('New order tracking state unexpected: ' + JSON.stringify(newTrackData));
  }
  console.log(`✓ Initial tracking state verified: ${newTrackData.order.status}`);

  // Admin updates order status to CONFIRMED
  const statusUpdateRes = await fetch(`${BASE}/admin/orders/${newOrder.id}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'CONFIRMED',
      note: 'Order confirmed and ingredients prepared',
    }),
  });
  const statusUpdateData = await statusUpdateRes.json();
  if (!statusUpdateData.success || statusUpdateData.order.status !== 'CONFIRMED') {
    throw new Error('Admin status update failed: ' + JSON.stringify(statusUpdateData));
  }
  console.log(`✓ Admin updated order status to CONFIRMED`);

  // Verify tracking timeline updated
  const updatedTrackRes = await fetch(`${BASE}/track/${newOrder.orderNumber}`);
  const updatedTrackData = await updatedTrackRes.json();
  if (updatedTrackData.order.status !== 'CONFIRMED') {
    throw new Error('Tracking did not reflect updated status!');
  }
  console.log(`✓ Tracking timeline verified live: ${updatedTrackData.order.timeline.map(t => `${t.status} (${t.note || ''})`).join(' -> ')}`);

  console.log('\n--- ALL ADMIN PRICING & ORDER TRACKING TESTS PASSED! ---');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Test script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
