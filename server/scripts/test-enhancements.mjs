const BASE = 'http://localhost:4000/api';

async function testAll() {
  console.log('--- Starting Chotulal Sweets Verification Suite ---');

  // Test 1: Health
  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json();
  if (!health.success || health.db !== 'up') {
    throw new Error('Health check failed: ' + JSON.stringify(health));
  }
  console.log('✓ Health check passed, DB is up');

  // Test 2: Public Settings
  const settingsRes = await fetch(`${BASE}/catalog/settings/public`);
  const settingsData = await settingsRes.json();
  if (!settingsData.success || !settingsData.settings) {
    throw new Error('Public settings failed');
  }
  const s = settingsData.settings;
  if (!s.shopName || !s.aboutUsContent || !s.faqList || !Array.isArray(s.faqList)) {
    throw new Error('Missing CMS/settings fields in public settings');
  }
  console.log('✓ Public settings passed with CMS content (Shop name: ' + s.shopName + ', FAQs: ' + s.faqList.length + ')');

  // Test 3: Catalog products endpoint
  const productsRes = await fetch(`${BASE}/catalog/products?limit=5`);
  const productsData = await productsRes.json();
  if (!productsData.success || !Array.isArray(productsData.products)) {
    throw new Error('Catalog products failed');
  }
  console.log('✓ Catalog products passed (Count: ' + productsData.products.length + ')');

  // Test 4: Homepage endpoint
  const homeRes = await fetch(`${BASE}/catalog/home`);
  const homeData = await homeRes.json();
  if (!homeData.success || !Array.isArray(homeData.banners) || !Array.isArray(homeData.sections)) {
    throw new Error('Home catalog failed');
  }
  console.log('✓ Homepage catalog passed (Banners: ' + homeData.banners.length + ', Sections: ' + homeData.sections.length + ')');

  // Test 5: Razorpay payment config
  const payConfigRes = await fetch(`${BASE}/payments/config`);
  const payConfig = await payConfigRes.json();
  if (!payConfig.success || payConfig.razorpayEnabled !== true) {
    throw new Error('Payment config failed: Razorpay should be enabled');
  }
  console.log('✓ Razorpay online payment configuration verified: enabled');

  console.log('--- All Verification Tests Passed Successfully! ---');
}

testAll().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
