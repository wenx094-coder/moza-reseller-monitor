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

  // === Simple Sim Racing - find all product IDs ===
  console.log('\n=== Simple Sim Racing products ===');
  await page.goto('https://simplesim.racing/brand.php?bid=4', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const ssr1 = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="products-detail"]');
    return Array.from(links).map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }));
  });
  ssr1.forEach(i => console.log(`  ${i.href.replace('https://www.simplesim.racing/', '').replace('https://simplesim.racing/', '')}  ${i.text}`));

  // === Datablitz search ===
  console.log('\n=== DataBlitz MOZA products ===');
  await page.goto('https://ecommerce.datablitz.com.ph/catalogsearch/result/?q=moza+racing', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const db = await page.evaluate(() => {
    const links = document.querySelectorAll('a.product-item-link');
    return Array.from(links).map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }));
  });
  if (db.length) {
    db.forEach(i => console.log(`  ${i.href.replace('https://ecommerce.datablitz.com.ph/', '')}  ${i.text}`));
  } else {
    console.log('  No products found on first page');
    const url = page.url();
    console.log('  Current URL:', url);
  }

  await browser.close();
})();
