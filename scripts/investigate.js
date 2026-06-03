const cheerio = require('cheerio');
const https = require('https');
const http = require('http');

function fetch(url) {
  return new Promise(function(resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    var req = mod.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(new URL(res.headers.location, url).href).then(resolve).catch(reject);
        return;
      }
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode !== 200) reject(new Error('HTTP ' + res.statusCode));
        else resolve(data);
      });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout')); });
  });
}

function analyze($, label) {
  console.log('=== ' + label + ' ===');
  
  // JSON-LD
  $('script[type="application/ld+json"]').each(function(i) {
    try {
      var json = JSON.parse($(this).text());
      if (json['@type'] === 'Product' && json.offers) {
        console.log('JSON-LD: price=' + json.offers.price + ', currency=' + json.offers.priceCurrency);
      }
      if (json['@graph']) {
        var items = Array.isArray(json['@graph']) ? json['@graph'] : [json['@graph']];
        items.forEach(function(item) {
          if (item['@type'] === 'Product' && item.offers) {
            console.log('JSON-LD(@graph) Product: price=' + item.offers.price + ', currency=' + item.offers.priceCurrency);
          }
        });
      }
    } catch(e) {}
  });

  // Meta tags
  var metaPrice = $('meta[property="product:price:amount"]').attr('content');
  if (metaPrice) console.log('meta product:price:amount: ' + metaPrice);
  
  var metaCurrency = $('meta[property="product:price:currency"]').attr('content');
  if (metaCurrency) console.log('meta product:price:currency: ' + metaCurrency);
  
  var metaItemProp = $('[itemprop="price"]').first();
  if (metaItemProp.length) {
    var content = metaItemProp.attr('content');
    if (content) console.log('[itemprop="price"] content: ' + content);
    else console.log('[itemprop="price"] text: "' + metaItemProp.text().trim() + '"');
  }
  
  // WooCommerce
  var wcPrices = $('.woocommerce-Price-amount.amount');
  if (wcPrices.length) {
    for (var i = 0; i < wcPrices.length; i++) {
      var t = $(wcPrices[i]).text().trim().replace(/\s+/g, ' ');
      console.log('.woocommerce-Price-amount[' + i + ']: "' + t + '"');
    }
  }
  var wcPriceEl = $('.price .woocommerce-Price-amount');
  console.log('.price .woocommerce-Price-amount count: ' + wcPriceEl.length);
  if (wcPriceEl.length > 1) {
    console.log('  (first): "' + $(wcPriceEl[0]).text().trim().replace(/\s+/g, ' ') + '"');
    console.log('  (last):  "' + $(wcPriceEl[wcPriceEl.length-1]).text().trim().replace(/\s+/g, ' ') + '"');
  }
  
  // Generic selectors (first match)
  var selList = ['.current-price', '.product-price', '.price_wrapper', '.special-price', '.sale-price', '.price-item', '[data-price]'];
  selList.forEach(function(s) {
    var el = $(s).first();
    if (el.length) {
      var t = el.text().trim().replace(/\s+/g, ' ');
      console.log(s + ': "' + t.substring(0, 100) + '"');
    }
  });
  
  // Shopify JSON endpoint
  var title = $('h1').first().text().trim().substring(0, 80);
  if (title) console.log('Title: ' + title);
  
  console.log('');
}

async function test() {
  // 1. GGK Simracing
  try {
    var html = await fetch('https://guidegamingkits.com/product/moza-r9-v3-%e0%b8%9b%e0%b8%a3%e0%b8%b0%e0%b8%81%e0%b8%b1%e0%b8%99%e0%b8%a8%e0%b8%b9%e0%b8%99%e0%b8%a2%e0%b9%8c%e0%b9%84%e0%b8%97%e0%b8%a2-1-%e0%b8%9b%e0%b8%b5-direct-drive-9-nm-wheelbase-%e0%b8%88/');
    analyze(cheerio.load(html), 'GGK Simracing (R9 V3 THB)');
  } catch(e) { console.log('GGK Simracing: ' + e.message + '\n'); }

  // 2. DELE Nordic (apex300.com)
  try {
    var html = await fetch('https://apex300.com/products/moza-gs-v2p-formula-wheel');
    analyze(cheerio.load(html), 'DELE Nordic (GS V2P DKK)');
  } catch(e) { console.log('DELE Nordic: ' + e.message + '\n'); }

  // 3. PLE Computers
  try {
    var html = await fetch('https://www.ple.com.au/Products/663036/moza-r9-v3-direct-drive-wheel-base');
    analyze(cheerio.load(html), 'PLE Computers (R9 V3 AUD)');
  } catch(e) { console.log('PLE Computers: ' + e.message + '\n'); }

  // 4. Sim Racing Pros
  try {
    var html = await fetch('https://www.simracingpros.com/products/moza-crp2-load-cell-pedals');
    analyze(cheerio.load(html), 'Sim Racing Pros (CRP2 USD)');
  } catch(e) { console.log('Sim Racing Pros: ' + e.message + '\n'); }

  // 5. GO Motorsports cs-pro-wheel
  try {
    var html = await fetch('https://gomotorsportsshop.com/products/moza-cs-pro-steering-wheel');
    analyze(cheerio.load(html), 'GO Motorsports (CS Pro USD)');
  } catch(e) { console.log('GO Motorsports: ' + e.message + '\n'); }

  // 6. Simulator Cave
  try {
    var html = await fetch('https://simulatorcave.com/product/moza-r5-bundle/');
    analyze(cheerio.load(html), 'Simulator Cave (R5 ZAR)');
  } catch(e) { console.log('Simulator Cave: ' + e.message + '\n'); }

  // 7. ElectronicsCrazy
  try {
    var html = await fetch('https://www.electronicscrazy.sg/moza-sr-p-pedal-no-clutch/');
    analyze(cheerio.load(html), 'ElectronicsCrazy (SRP SGD)');
  } catch(e) { console.log('ElectronicsCrazy: ' + e.message + '\n'); }

  process.exit(0);
}
test().catch(function(e) { console.error(e.message); process.exit(1); });
