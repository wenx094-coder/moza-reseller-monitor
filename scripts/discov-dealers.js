const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\wenx0\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // === Game One PH page 2 ===
  console.log('=== Game One PH (Page 2) ===');
  await page.goto('https://gameone.ph/brand/moza-racing.html?p=2', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const game1 = await page.evaluate(() => {
    const items = document.querySelectorAll('.product-item-link');
    return Array.from(items).map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }));
  });
  game1.forEach(i => console.log(`  ${i.href}`));

  // === GGK Simracing Thailand (WooCommerce, THB) ===
  console.log('\n=== GGK Simracing Thailand ===');
  await page.goto('https://guidegamingkits.com/product_brand/moza-racing/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const ggk = await page.evaluate(() => {
    const items = document.querySelectorAll('.product-title a, h2.woocommerce-loop-product__title, .product-name a');
    return Array.from(items).map(a => ({ href: a.href || '', text: (a.textContent || '').trim().substring(0, 60), price: '' }));
  });
  const ggkPrices = await page.evaluate(() => {
    const prices = document.querySelectorAll('.price .amount, .price .woocommerce-Price-amount');
    return Array.from(prices).map(p => p.textContent.trim());
  });
  ggk.forEach((i, idx) => {
    const price = ggkPrices[idx] || '';
    console.log(`  ${i.href.replace('https://guidegamingkits.com/', '')}  ${i.text}  ${price}`);
  });

  // === SimRacing Store Chile (WooCommerce, CLP) ===
  console.log('\n=== SimRacing Store Chile ===');
  await page.goto('https://www.simracingstore.cl/marca/moza/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const src = await page.evaluate(() => {
    const items = document.querySelectorAll('.product-title a, h2.woocommerce-loop-product__title, .product-name a');
    return Array.from(items).map(a => ({ href: a.href || '', text: (a.textContent || '').trim().substring(0, 60), price: '' }));
  });
  const srcPrices = await page.evaluate(() => {
    const prices = document.querySelectorAll('.price .amount, .price .woocommerce-Price-amount, .price ins .amount');
    return Array.from(prices).map(p => p.textContent.trim());
  });
  src.forEach((i, idx) => {
    const price = srcPrices[idx] || '';
    console.log(`  ${i.href}  ${i.text}  ${price}`);
  });

  // === Megabike Plus Czech (WooCommerce, CZK) ===
  console.log('\n=== Megabike Plus Czech ===');
  await page.goto('https://www.megabikeplus.cz/znacka/moza-racing/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const mbp = await page.evaluate(() => {
    const items = document.querySelectorAll('a[href*="moza"], h2 a, .product-title a');
    return Array.from(items).map(a => ({ href: a.href || '', text: (a.textContent || '').trim().substring(0, 60) }));
  });
  mbp.forEach(i => console.log(`  ${i.text}  ${i.href}`));

  // === Think of Sim Thailand (Shopify) ===
  console.log('\n=== Think of Sim Thailand ===');
  await page.goto('https://www.thinkofsim.com/collections/moza', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const tos = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/products/"]');
    return Array.from(links).map(a => ({ href: a.href, text: (a.textContent || '').trim().substring(0, 60) }));
  });
  const unique = [];
  const seen = new Set();
  tos.forEach(i => { if (!seen.has(i.href)) { seen.add(i.href); unique.push(i); } });
  unique.forEach(i => console.log(`  ${i.href}  ${i.text}`));

  await browser.close();
})();
