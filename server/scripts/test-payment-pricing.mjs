import prisma from '../src/lib/prisma.js';

const BASE = 'http://localhost:4000/api';

async function run() {
  console.log('--- Testing Payment, Pricing & Online Delivery Rules ---');

  // Verify Logo URLs
  const settingsRes = await fetch(`${BASE}/catalog/settings/public`);
  const settingsData = await settingsRes.json();
  const s = settingsData.settings;
  console.log('Shop Logo URL:', s.logoUrl);
  if (!s.logoUrl.includes('logo.svg')) {
    throw new Error('Expected logoUrl to include logo.svg, got: ' + s.logoUrl);
  }
  console.log('✓ Test 0 Passed: Logo 2 (/logo.svg) is the active storefront logo in public settings');

  // Find a product variant to add to cart
  const variant = await prisma.productVariant.findFirst({
    where: { isActive: true, stock: { gt: 10 } },
    include: { product: true },
  });

  if (!variant) {
    throw new Error('No active variant with stock found');
  }

  console.log(`Using product: ${variant.product.name} - ${variant.label} (₹${variant.price})`);

  // --- Test 1: Online order < ₹999 -> ₹40 delivery fee, 0 tax ---
  const guestToken1 = 'test_guest_online_under_' + Date.now();
  const addRes1 = await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken1 },
    body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
  });
  const cart1 = (await addRes1.json()).cart;
  console.log(`Cart 1 subtotal: ₹${cart1.subtotal}`);

  const checkoutRes1 = await fetch(`${BASE}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken1 },
    body: JSON.stringify({
      customerName: 'Test Online Under',
      customerPhone: '9876543210',
      paymentMethod: 'ONLINE',
      address: { line1: '123 Sweet Lane', city: 'Bijapur', pincode: '586101' },
    }),
  });
  const orderData1 = await checkoutRes1.json();
  if (!orderData1.success) throw new Error('Checkout 1 failed: ' + JSON.stringify(orderData1));
  const o1 = orderData1.order;

  console.log(`Order 1 (ONLINE < ₹999): subtotal=${o1.subtotal}, deliveryFee=${o1.deliveryFee}, tax=${o1.taxAmount}, total=${o1.total}`);
  if (o1.taxAmount !== 0) throw new Error(`Expected taxAmount to be 0, got ${o1.taxAmount}`);
  if (o1.subtotal < 999 && o1.deliveryFee !== 40) throw new Error(`Expected deliveryFee to be 40, got ${o1.deliveryFee}`);
  if (o1.total !== o1.subtotal + 40 - o1.discount) throw new Error(`Total mismatch: ${o1.total} != ${o1.subtotal + 40}`);
  console.log('✓ Test 1 Passed: Online order < ₹999 charges flat ₹40 delivery, 0 tax');

  // --- Test 2: Online order >= ₹999 -> ₹0 delivery fee (FREE), 0 tax ---
  const guestToken2 = 'test_guest_online_over_' + Date.now();
  const qtyForOver999 = Math.ceil(1000 / variant.price);
  await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken2 },
    body: JSON.stringify({ variantId: variant.id, quantity: qtyForOver999 }),
  });

  const checkoutRes2 = await fetch(`${BASE}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken2 },
    body: JSON.stringify({
      customerName: 'Test Online Free',
      customerPhone: '9876543211',
      paymentMethod: 'ONLINE',
      address: { line1: '456 Royal Sweet Road', city: 'Bijapur', pincode: '586101' },
    }),
  });
  const orderData2 = await checkoutRes2.json();
  if (!orderData2.success) throw new Error('Checkout 2 failed: ' + JSON.stringify(orderData2));
  const o2 = orderData2.order;

  console.log(`Order 2 (ONLINE >= ₹999): subtotal=${o2.subtotal}, deliveryFee=${o2.deliveryFee}, tax=${o2.taxAmount}, total=${o2.total}`);
  if (o2.subtotal < 999) throw new Error(`Test setup error: subtotal should be >= 999, was ${o2.subtotal}`);
  if (o2.deliveryFee !== 0) throw new Error(`Expected free delivery (0), got ${o2.deliveryFee}`);
  if (o2.taxAmount !== 0) throw new Error(`Expected taxAmount to be 0, got ${o2.taxAmount}`);
  if (o2.total !== o2.subtotal - o2.discount) throw new Error(`Total mismatch: ${o2.total} != ${o2.subtotal}`);
  console.log('✓ Test 2 Passed: Online order >= ₹999 gives FREE delivery (₹0), 0 tax');

  // --- Test 3: Razorpay create endpoint creates real order without 401 ---
  console.log(`Calling /api/payments/razorpay/create for order ${o1.orderNumber} without JWT token...`);
  const rpCreateRes = await fetch(`${BASE}/payments/razorpay/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken1 },
    body: JSON.stringify({ orderNumber: o1.orderNumber }),
  });

  if (rpCreateRes.status === 401) {
    throw new Error('FAILED: /api/payments/razorpay/create returned 401 Unauthorized for guest checkout!');
  }

  const rpData = await rpCreateRes.json();
  if (!rpData.success || !rpData.razorpayOrderId) {
    throw new Error('Failed to create Razorpay order: ' + JSON.stringify(rpData));
  }

  console.log(`✓ Razorpay order successfully created: ${rpData.razorpayOrderId}, amount=₹${rpData.amount}, keyId=${rpData.keyId}`);
  if (rpData.amount !== o1.total) {
    throw new Error(`Amount mismatch: Razorpay amount ${rpData.amount} != order total ${o1.total}`);
  }
  console.log('✓ Test 3 Passed: Razorpay order created for guest without 401! Amounts match exactly.');

  // --- Test 4: COD is rejected when disabled ---
  const guestToken4 = 'test_guest_cod_rejected_' + Date.now();
  await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken4 },
    body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
  });

  const checkoutRes4 = await fetch(`${BASE}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-token': guestToken4 },
    body: JSON.stringify({
      customerName: 'Test COD Blocked',
      customerPhone: '9876543219',
      paymentMethod: 'COD',
      address: { line1: '789 Block Lane', city: 'Bijapur', pincode: '586101' },
    }),
  });

  if (checkoutRes4.status === 201) {
    throw new Error('COD should be rejected when codEnabled is false!');
  }
  console.log(`✓ Test 4 Passed: COD correctly blocked with status ${checkoutRes4.status} (only online payment allowed)`);

  // Clean up test orders
  await prisma.notification.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
  await prisma.orderDeliveryAddress.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
  await prisma.order.deleteMany({ where: { id: { in: [o1.id, o2.id] } } });
  await prisma.cart.deleteMany({ where: { guestToken: { in: [guestToken1, guestToken2, guestToken4] } } });

  console.log('--- All Payment, Pricing & Online Delivery Tests Passed Flawlessly! ---');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
