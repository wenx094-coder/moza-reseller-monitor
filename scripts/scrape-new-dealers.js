const { chromium } = require('playwright');
const https = require('https');

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

  // === 1. Think of Sim Thailand (Shopify - use .json API) ===
  console.log('=== Think of Sim Thailand ===');
  try {
    const json = await fetchJson('https://www.thinkofsim.com/collections/moza/products.json?limit=250');
    if (json && json.products) {
      json.products.forEach(p => {
        const handle = p.handle;
        const title = p.title;
        const variants = p.variants || [];
        const price = variants.length > 0 ? variants[0].price : '?';
        console.log(`  products/${handle}  ${title}  ฿${price}`);
      });
    }
  } catch (e) { console.log('  Error:', e.message); }

  // === 2. GGK Simracing Thailand (WooCommerce - scrape all pages) ===
  console.log('\n=== GGK Simracing Thailand ===');
  for (let pn = 1; pn <= 5; pn++) {
    try {
      await page.goto(`https://guidegamingkits.com/product_brand/moza-racing/page/${pn}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const items = await page.evaluate(() => {
        const products = document.querySelectorAll('.product-title a, h2.woocommerce-loop-product__title a, .product-name a, .product-title');
        return Array.from(products).map(a => ({
          href: a.href || a.closest('a')?.href || '',
          text: (a.textContent || '').trim().substring(0, 80)
        }));
      });
      if (items.length === 0) break;
      items.forEach(i => console.log(`  ${i.href.replace('https://guidegamingkits.com/', '')}  ${i.text}`));
    } catch (e) { console.log(`  Page ${pn} error:`, e.message); break; }
  }

  // === 3. SimRacing Store Chile (WooCommerce - scrape all pages) ===
  console.log('\n=== SimRacing Store Chile ===');
  for (let pn = 1; pn <= 4; pn++) {
    try {
      await page.goto(`https://www.simracingstore.cl/marca/moza/page/${pn}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const items = await page.evaluate(() => {
        const products = document.querySelectorAll('.product-title a, h2.woocommerce-loop-product__title a, .product-name a');
        return Array.from(products).map(a => ({
          href: a.href || '',
          text: (a.textContent || '').trim().substring(0, 80)
        }));
      });
      if (items.length === 0) break;
      items.forEach(i => console.log(`  ${i.href}  ${i.text}`));
    } catch (e) { console.log(`  Page ${pn} error:`, e.message); break; }
  }

  // === 4. Megabike Plus Czech (WooCommerce) ===
  console.log('\n=== Megabike Plus Czech ===');
  try {
    await page.goto('https://www.megabikeplus.cz/znacka/moza-racing/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const items = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="moza-racing"]');
      const seen = new Set();
      return Array.from(links).filter(a => {
        const h = a.href;
        if (!h || seen.has(h)) return false;
        seen.add(h);
        return h.includes('moza-racing') && !h.includes('znacka') && !h.includes('brand');
      }).map(a => ({ href: a.href, text: (a.textContent || '').trim().substring(0, 80) }));
    });
    items.forEach(i => console.log(`  ${i.href.replace('https://www.megabikeplus.cz/', '')}  ${i.text}`));
  } catch (e) { console.log('  Error:', e.message); }

  await browser.close();
})();

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}
