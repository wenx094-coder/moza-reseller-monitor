const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const { PRODUCTS, RETAILERS, MSRP_MAP, buildUrlEntries } = require('./products-config');

const DATA_PATH = path.join(__dirname, '..', 'price-data.json');
const TIMEOUT = 30000;

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')); } catch { return { lastUpdated: null, prices: {}, msrp: {} }; }
}

function saveData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(new URL(res.headers.location, url).href).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error('HTTP ' + res.statusCode));
        else resolve(data);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parsePrice(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  var s = String(raw).trim().replace(/\s+/g, ' ');

  // Extract the first price-like segment
  // European: optional €/$/£/¥ prefix, then digits, optionally with . as thousand sep and , as decimal
  var euroMatch = s.match(/(?:€|EUR)?\s*([0-9]{1,3}(?:[.][0-9]{3})*(?:,[0-9]+))/);
  if (euroMatch) {
    var num = euroMatch[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(num);
  }

  // Standard: $ or £ or nothing, then digits
  var stdMatch = s.match(/(?:\$|£|USD)?\s*([0-9]+(?:[.,][0-9]+)?)/);
  if (stdMatch) {
    var cleaned = stdMatch[1].replace(/,/g, '');
    return parseFloat(cleaned);
  }

  return null;
}

function extractPrice(html, preferredCurrency) {
  var $ = cheerio.load(html);

  // JSON-LD
  var best = null;
  $('script[type="application/ld+json"]').each(function() {
    if (best) return;
    try {
      var json = JSON.parse($(this).text());
      var items = Array.isArray(json) ? json : [json];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item['@type'] === 'Product' && item.name && item.offers) {
          var offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (var j = 0; j < offers.length; j++) {
            var offer = offers[j];
            var price = parsePrice(offer.price);
            if (price != null) {
              best = {
                name: item.name,
                price: price,
                currency: offer.priceCurrency || preferredCurrency || 'USD',
                inStock: !offer.availability || offer.availability.toLowerCase().indexOf('instock') >= 0,
              };
              return;
            }
          }
        }
      }
    } catch (e) {}
  });
  if (best) return best;

  // CSS selectors
  var title = $('h1').first().text().trim() || $('title').first().text().trim();

  var selectors = [
    '.special-price',
    '.current-price',
    '.product-price',
    '.price_wrapper',
    '[itemprop="price"]',
    '[data-price]',
    '.price',
    '.product__price',
    '.sale-price',
    '.price-item',
  ];

  for (var si = 0; si < selectors.length; si++) {
    var el = $(selectors[si]).first();
    if (!el.length) continue;
    var text = el.text().trim().replace(/\s+/g, ' ');
    if (text) {
      var p = parsePrice(text);
      if (p != null && p > 0) {
        return { name: title, price: p, currency: preferredCurrency || 'USD', inStock: true };
      }
    }
  }

  return null;
}

async function main() {
  var data = loadData();
  var entries = buildUrlEntries();

  console.log('Fetching ' + entries.length + ' product pages...');
  var success = 0;

  for (var e = 0; e < entries.length; e++) {
    var url = entries[e].url;
    var retailerId = entries[e].retailerId;
    var productId = entries[e].productId;

    try {
      var html = await fetch(url);
      var retailer = RETAILERS.find(function(r) { return r.id === retailerId; });
      var currency = retailer ? retailer.currency : 'USD';

      var result = extractPrice(html, currency);
      if (result) {
        if (!data.prices[productId]) data.prices[productId] = {};
        data.prices[productId][retailerId] = {
          price: result.price,
          currency: result.currency || currency,
          url: url,
          name: result.name,
          inStock: result.inStock !== false,
          checkedAt: new Date().toISOString(),
        };
        var sym = result.currency === 'EUR' ? '\u20AC' : result.currency === 'GBP' ? '\u00A3' : '$';
        console.log('  OK ' + result.name + ': ' + sym + result.price + ' @ ' + retailerId);
        success++;
      } else {
        console.log('  -- No price for ' + productId + ' @ ' + retailerId);
      }
    } catch (e) {
      console.log('  XX ' + productId + ' @ ' + retailerId + ': ' + e.message);
    }
  }

  // Save MSRP reference
  data.msrp = {};
  for (var pid2 in MSRP_MAP) {
    data.msrp[pid2] = MSRP_MAP[pid2];
  }

  saveData(data);
  console.log('\nDone. ' + success + '/' + entries.length + ' pages.');

  // Check for below-MSRP prices and build alerts
  var alerts = [];
  var lines = ['## MOZA Price Alert - Below MSRP Detected', ''];
  for (var pid3 in data.prices) {
    var p3 = PRODUCTS.find(function(x) { return x.id === pid3; });
    var name3 = p3 ? p3.name : pid3;
    var msrp = MSRP_MAP[pid3];
    var msrpLine = msrp ? ' (MSRP: $' + msrp + ')' : '';
    for (var rid2 in data.prices[pid3]) {
      var r2 = RETAILERS.find(function(x) { return x.id === rid2; });
      var rname2 = r2 ? r2.name : rid2;
      var info2 = data.prices[pid3][rid2];
      var sym2 = info2.currency === 'EUR' ? '\u20AC' : info2.currency === 'GBP' ? '\u00A3' : '$';
      console.log('  ' + name3 + ': ' + sym2 + info2.price + ' @ ' + rname2 + msrpLine);

      if (msrp && info2.price > 0) {
        var msrpUsd = msrp;
        var priceUsd = info2.price;
        // Rough currency conversion for comparison
        if (info2.currency === 'EUR') priceUsd = info2.price * 1.08;
        else if (info2.currency === 'GBP') priceUsd = info2.price * 1.27;

        if (priceUsd < msrpUsd * 0.95) {
          var pct = ((msrpUsd - priceUsd) / msrpUsd * 100).toFixed(1);
          alerts.push({ product: name3, retailer: rname2, price: info2.price, currency: info2.currency, msrp: msrpUsd, pct: pct });
          lines.push('### ' + name3 + ' @ ' + rname2);
          lines.push('- Listed: ' + sym2 + info2.price + ' vs MSRP: $' + msrpUsd + ' (' + pct + '% below)');
          lines.push('- URL: ' + info2.url);
          lines.push('');
        }
      }
    }
  }

  if (alerts.length > 0) {
    var msg = lines.join('\n');
    console.log('\n!! PRICE ALERTS: ' + alerts.length + ' product(s) below MSRP');
    console.log(msg);

    // Send DingTalk notification
    var webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
    var secret = process.env.DINGTALK_WEBHOOK_SECRET;
    if (webhookUrl) {
      var crypto = require('crypto');
      var timestamp = Date.now();
      var fullUrl = webhookUrl;
      if (secret) {
        var stringToSign = timestamp + '\n' + secret;
        var hmac = crypto.createHmac('sha256', secret);
        hmac.update(stringToSign);
        var sign = hmac.digest('base64');
        fullUrl += (webhookUrl.indexOf('?') >= 0 ? '&' : '?') + 'timestamp=' + timestamp + '&sign=' + encodeURIComponent(sign);
      }
      var payload = JSON.stringify({
        msgtype: 'markdown',
        markdown: { title: 'MOZA Price Alert', text: msg },
      });
      var parsed = new URL(fullUrl);
      var httpMod = parsed.protocol === 'https:' ? https : http;
      var options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      };
      var req = httpMod.request(options, function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() { console.log('DingTalk alert sent:', body); });
      });
      req.on('error', function(e) { console.error('DingTalk error:', e.message); });
      req.write(payload);
      req.end();
    }
  } else {
    console.log('\nNo below-MSRP alerts.');
  }
}

main().catch(function(e) { console.error(e); process.exit(1); });
