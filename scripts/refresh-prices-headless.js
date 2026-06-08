const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PRODUCTS, RETAILERS, MSRP_MAP } = require('./products-config');

const DATA_PATH = path.join(__dirname, '..', 'price-data.json');
const BLOCKED_RETAILERS = ['microcenter', 'kfire', 'demontweeks', 'overclockersuk', 'bestbuy', 'centralcomputer', 'electronicscrazy', 'alternate', 'thegamesmen', 'racegear', 'pbtech', 'simustop'];

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')); } catch { return { lastUpdated: null, prices: {}, msrp: {} }; }
}

function saveData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function extractPriceFromHtml(html) {
  var m = html.match(/"price"\s*:\s*([0-9.]+)/);
  if (m) return parseFloat(m[1]);
  m = html.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s$€£R]*([0-9,.]+)/i);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  m = html.match(/(?:product-price|our-price|sale-price)[^$€£R]*[\$€£R]\s*([0-9,.]+)/i);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  m = html.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
  if (m) return parseFloat(m[1]);
  return null;
}

function extractPriceWithSelector(html, selectors) {
  for (var i = 0; i < selectors.length; i++) {
    var s = selectors[i];
    var re = new RegExp(s.class + '[^>]*>\\s*[^<]*[$€£R\\s]*([0-9,.]+)', 'i');
    var m = html.match(re);
    if (m) {
      var p = parseFloat(m[1].replace(/,/g, ''));
      if (p > 0) return p;
    }
  }
  return null;
}

async function scrapeUrl(browser, url, retailerId) {
  var context = null;
  try {
    var isBestBuy = retailerId === 'bestbuy';
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: retailerId === 'kfire' ? 'pt-BR' : 'en-US',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: isBestBuy ? { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.5' } : {},
    });
    var page = await context.newPage();
    page.setDefaultTimeout(30000);

    if (isBestBuy) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(function(){});
      await page.waitForTimeout(5000);
      try { await page.waitForSelector('.priceView-customer-price', { timeout: 8000 }); } catch(e) {}
    } else {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    var html = await page.content();
    var title = await page.title();
    var price = null;

    // Try structured data first
    var jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLd) {
      try {
        var json = JSON.parse(jsonLd[1]);
        var items = json['@graph'] || (Array.isArray(json) ? json : [json]);
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if (item['@type'] === 'Product' && item.offers) {
            var offers = Array.isArray(item.offers) ? item.offers : [item.offers];
            for (var j = 0; j < offers.length; j++) {
              if (offers[j].price) { price = parseFloat(offers[j].price); break; }
            }
          }
          if (item['@type'] === 'ProductGroup' && item.hasVariant) {
            for (var vi = 0; vi < item.hasVariant.length; vi++) {
              var v = item.hasVariant[vi];
              if (v.offers) {
                var offers = Array.isArray(v.offers) ? v.offers : [v.offers];
                for (var oj = 0; oj < offers.length; oj++) {
                  var offer = offers[oj];
                  if (offer.priceSpecification) {
                    var specs = Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [offer.priceSpecification];
                    for (var si = 0; si < specs.length; si++) {
                      if (specs[si].price && (!specs[si].priceType || specs[si].priceType.indexOf('Strikethrough') < 0)) {
                        price = parseFloat(specs[si].price);
                        break;
                      }
                    }
                  }
                  if (!price && offer.price) price = parseFloat(offer.price);
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // Fallback: regex-based HTML price extraction
    if (!price) {
      price = extractPriceFromHtml(html);
    }

    // Retailer-specific price selectors (headless-only sites)
    if (!price && retailerId === 'demontweeks') {
      var dtMatch = html.match(/c-product-detail__price--now[^>]*>[\s\S]{0,100}?£\s*([0-9,.]+)/);
      if (dtMatch) price = parseFloat(dtMatch[1].replace(/,/g, ''));
    }

    if (!price && retailerId === 'overclockersuk') {
      var ocMatch = html.match(/price--pdp[^>]*>[\s\S]{0,200}?£\s*([0-9,.]+)/);
      if (ocMatch) price = parseFloat(ocMatch[1].replace(/,/g, ''));
    }

    // Best Buy: price in structured data + <span> with data-price or similar
    if (!price && retailerId === 'bestbuy') {
      // Try Best Buy's JSON-LD product schema
      var bbJson = html.match(/"price"\s*:\s*"([0-9.]+)"/);
      if (bbJson) price = parseFloat(bbJson[1]);
      // Fallback: look for price in the product page HTML
      if (!price) {
        var bbMatch = html.match(/class="priceView-customer-price"[^>]*>[\s\S]{0,200}?\$\s*([0-9,.]+)/);
        if (bbMatch) price = parseFloat(bbMatch[1].replace(/,/g, ''));
      }
    }

    // Central Computers: Magento price in <span class="price">
    if (!price && retailerId === 'centralcomputer') {
      var ccMatch = html.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>\s*\$?([0-9,.]+)/);
      if (ccMatch) price = parseFloat(ccMatch[1].replace(/,/g, ''));
    }

    // ElectronicsCrazy: WooCommerce custom theme, price in #Item_main_price or JSON-LD
    if (!price && retailerId === 'electronicscrazy') {
      var ecMatch = html.match(/"price"\s*:\s*"([0-9.]+)"/);
      if (ecMatch) price = parseFloat(ecMatch[1]);
      if (!price) {
        var ecHtmlMatch = html.match(/Item_main_price[^>]*>[\s\S]{0,200}?[S$]\s*([0-9,.]+)/);
        if (ecHtmlMatch) price = parseFloat(ecHtmlMatch[1].replace(/,/g, ''));
      }
    }

    // Alternate: JS-rendered prices, look for JSON-LD or data-price attributes
    // Note: prices may be stored in cents (e.g., 34900 = €349.00), divide by 100
    if (!price && retailerId === 'alternate') {
      var altJson = html.match(/"price"\s*:\s*"([0-9.]+)"/);
      if (altJson) price = parseFloat(altJson[1]);
      if (!price) {
        var altMatch = html.match(/data-price[^>]*>\s*[^<]*?([0-9,.]+)/);
        if (altMatch) price = parseFloat(altMatch[1].replace(/,/g, ''));
      }
    }
    if (price && retailerId === 'alternate' && price > 100 && price % 1 === 0) {
      price = price / 100;
    }

    // PB Tech: custom .NET platform, uses sticky-price or font-size-28 selectors
    if (!price && retailerId === 'pbtech') {
      var pbMatch = html.match(/sticky-price[^>]*>[\s\S]{0,50}?\$\s*([0-9,.]+)/);
      if (pbMatch) price = parseFloat(pbMatch[1].replace(/,/g, ''));
      if (!price) {
        pbMatch = html.match(/font-size-28[^>]*>[\s\S]{0,50}?\$\s*([0-9,.]+)/);
        if (pbMatch) price = parseFloat(pbMatch[1].replace(/,/g, ''));
      }
    }

    // SIMUSTOP (Tienda Nube): JSON-LD contains all category products (wrong), use .js-price-display instead
    // Tienda Nube stores price in data attribute (cents), extract data-price and divide by 100
    if (!price && retailerId === 'simustop') {
      var simuMatch = html.match(/js-price-display[^>]*data-price="?([0-9]+)"?[^>]*>/);
      if (simuMatch) price = parseFloat(simuMatch[1]) / 100;
      if (!price) {
        simuMatch = html.match(/js-price-display[^>]*>\s*[^$]*?\$?\s*([0-9,.]+)/);
        if (simuMatch) price = parseFloat(simuMatch[1].replace(/,/g, ''));
      }
      if (!price) {
        simuMatch = html.match(/js-price-container[^>]*>[\s\S]{0,200}?\$?\s*([0-9,.]+)/);
        if (simuMatch) price = parseFloat(simuMatch[1].replace(/,/g, ''));
      }
    }

    await context.close();
    return { name: title, price: price, inStock: true };

  } catch (e) {
    if (context) await context.close().catch(function(){});
    return { error: e.message };
  }
}

async function main() {
  console.log('Headless scraper starting...');
  var data = loadData();
  var entries = [];

  // Build URL entries for blocked retailers only
  var { PRODUCT_URLS } = require('./products-config');
  for (var retailerId in PRODUCT_URLS) {
    if (BLOCKED_RETAILERS.indexOf(retailerId) < 0) continue;
    var products = PRODUCT_URLS[retailerId];
    for (var productId in products) {
      entries.push({ url: products[productId], retailerId: retailerId, productId: productId });
    }
  }

  if (entries.length === 0) {
    console.log('No blocked retailer URLs to scrape.');
    return;
  }

  console.log('Scraping ' + entries.length + ' URLs via headless browser...');
  var browser = null;
  var success = 0;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    for (var e = 0; e < entries.length; e++) {
      var url = entries[e].url;
      var retailerId = entries[e].retailerId;
      var productId = entries[e].productId;

      if (e > 0) await new Promise(function(r) { setTimeout(r, 3000); });

      console.log('  ' + productId + ' @ ' + retailerId + '...');
      var result = await scrapeUrl(browser, url, retailerId);

      if (result.error) {
        console.log('  XX ' + productId + ' @ ' + retailerId + ': ' + result.error);
        continue;
      }

      var retailer = RETAILERS.find(function(r) { return r.id === retailerId; });
      var currency = retailer ? retailer.currency : 'USD';

      if (result.price && result.price > 0) {
        if (!data.prices[productId]) data.prices[productId] = {};
        data.prices[productId][retailerId] = {
          price: result.price,
          currency: currency,
          url: url,
          name: result.name || productId,
          inStock: result.inStock !== false,
          checkedAt: new Date().toISOString(),
        };
        var sym = currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : '$';
        console.log('  OK ' + (result.name || productId) + ': ' + sym + result.price + ' @ ' + retailerId);
        success++;
      } else {
        console.log('  -- No price found for ' + productId + ' @ ' + retailerId);
      }
    }
  } finally {
    if (browser) await browser.close().catch(function(){});
  }

  data.msrp = {};
  for (var pid in MSRP_MAP) data.msrp[pid] = MSRP_MAP[pid];
  saveData(data);
  console.log('\nDone. ' + success + '/' + entries.length + ' pages via headless.');
}

main().catch(function(e) { console.error('Fatal:', e); process.exit(1); });
