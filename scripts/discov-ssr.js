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

  // Get product names + IDs from Simple Sim Racing listing page
  await page.goto('https://simplesim.racing/brand.php?bid=4', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const ssr = await page.evaluate(() => {
    const items = document.querySelectorAll('.item-product');
    return Array.from(items).map(el => {
      const link = el.querySelector('a[href*="products-detail"]');
      const nameEl = el.querySelector('.product-name, h3, h4, .name');
      const priceEl = el.querySelector('.price, .product-price, .special-price');
      return {
        href: link ? link.href : '',
        name: nameEl ? nameEl.textContent.trim().substring(0, 50) : (link ? link.textContent.trim().substring(0, 50) : ''),
        price: priceEl ? priceEl.textContent.trim().substring(0, 20) : '',
      };
    });
  });
  console.log('Simple Sim Racing products:');
  ssr.forEach(i => console.log(`  ${i.name.padEnd(40)} ${i.price.padEnd(12)} ${i.href.split('=')[1] || ''}`));

  await browser.close();
})();
