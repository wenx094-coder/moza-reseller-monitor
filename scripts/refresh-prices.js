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

  // Try standard format first (with $ or £ prefix, comma as thousand sep)
  var prefixMatch = s.match(/(?:\$|£|€|¥|zł|R|kr|₩|₪|RM|₱|฿|Kč|₹|NT\$|HK\$|S\$|MX\$|CLP\$|COL\$|NZ\$|A\$|JP¥|USD|CAD|AUD|NZD|SGD|HKD|CHF|AED|د\.إ|₫|₨)?\s*([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)/);
  if (prefixMatch) {
    var rawNum = prefixMatch[1];
    // CLP, ARS, some LATAM: dot (.) is thousand separator, e.g. "$619.900" = 619900
    // Detect: no comma, dot followed by 3+ digits
    if (rawNum.indexOf(',') < 0) {
      var lastDot = rawNum.lastIndexOf('.');
      if (lastDot >= 0) {
        var afterDot = rawNum.substring(lastDot + 1);
        if (afterDot.length >= 3) {
          // Dot is thousand separator, not decimal
          return parseInt(rawNum.replace(/\./g, ''), 10);
        }
      }
    }
    // Detect format: if last separator is comma followed by 1-2 digits, it's European
    var lastComma = rawNum.lastIndexOf(',');
    var lastDot = rawNum.lastIndexOf('.');
    var usesEuroSep = false;
    if (lastComma > lastDot) {
      // Last separator is comma → European format (comma = decimal)
      var afterComma = rawNum.substring(lastComma + 1);
      if (afterComma.length <= 2) usesEuroSep = true;
    }
    if (usesEuroSep) {
      var euroClean = rawNum.replace(/\./g, '').replace(',', '.');
      return parseFloat(euroClean);
    } else {
      var stdClean = rawNum.replace(/,/g, '');
      return parseFloat(stdClean);
    }
  }

  // European with EUR prefix, comma as decimal
  var eurMatch = s.match(/EUR\s*([0-9]+(?:[.,][0-9]+)?)/);
  if (eurMatch) {
    return parseFloat(eurMatch[1].replace(',', '.'));
  }

  return null;
}

function fetchJson(url) {
  return new Promise(function(resolve) {
    var jsonUrl;
    // Handle Shopify /collections/.../products/... URLs
    if (url.indexOf('/collections/') >= 0) {
      var parts = url.split('/products/');
      if (parts.length === 2) jsonUrl = parts[0] + '/products/' + parts[1] + '.json';
      else resolve(null);
    } else {
      jsonUrl = url.replace(/\/$/, '') + '.json';
    }
    var mod = jsonUrl.indexOf('https') === 0 ? https : http;
    var req = mod.get(jsonUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 200) {
          try {
            var j = JSON.parse(d);
            if (j.product && j.product.variants && j.product.variants.length > 0) {
              var v = j.product.variants[0];
              resolve({ name: j.product.title, price: parseFloat(v.price), currency: (v.currency || null), inStock: v.available !== false });
            } else resolve(null);
          } catch(e) { resolve(null); }
        } else resolve(null);
      });
    });
    req.on('error', function() { resolve(null); });
    req.setTimeout(10000, function() { req.destroy(); resolve(null); });
  });
}

function fetchWooCommerceJson(apiUrl) {
  return new Promise(function(resolve) {
    var mod = apiUrl.indexOf('https') === 0 ? https : http;
    var req = mod.get(apiUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 200) {
          try {
            var j = JSON.parse(d);
            if (j && j.prices && j.prices.price) {
              var price = parseFloat(j.prices.price);
              var minorUnit = j.prices.currency_minor_unit || 2;
              price = price / Math.pow(10, minorUnit);
              resolve({
                name: j.name,
                price: price,
                currency: j.prices.currency_code || 'ILS',
                inStock: j.is_in_stock === true,
              });
            } else resolve(null);
          } catch(e) { resolve(null); }
        } else resolve(null);
      });
    });
    req.on('error', function() { resolve(null); });
    req.setTimeout(10000, function() { req.destroy(); resolve(null); });
  });
}

function extractPrice(html, preferredCurrency, retailerId) {
  var $ = cheerio.load(html);

  // JSON-LD
  var best = null;
  $('script[type="application/ld+json"]').each(function() {
    if (best) return;
    try {
      var json = JSON.parse($(this).text());
      // Handle @graph (multiple entities in one JSON-LD block)
      if (json['@graph']) json = json['@graph'];
      var items = Array.isArray(json) ? json : [json];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];

        // Handle Product variants (Shopify ProductGroup)
        var variants = item['@type'] === 'ProductGroup' && item.hasVariant ? item.hasVariant : null;
        if (variants) {
          for (var vi = 0; vi < variants.length; vi++) {
            if (best) return;
            var v = variants[vi];
            if (v.offers) {
              var offers = Array.isArray(v.offers) ? v.offers : [v.offers];
              for (var oj = 0; oj < offers.length; oj++) {
                var offer = offers[oj];
                // Some Shopify stores use priceSpecification array
                var pSpecs = offer.priceSpecification;
                if (pSpecs) {
                  var specs = Array.isArray(pSpecs) ? pSpecs : [pSpecs];
                  for (var si = 0; si < specs.length; si++) {
                    if (best) return;
                    var spec = specs[si];
                    if (spec.price && spec.price > 0 && (!spec.priceType || spec.priceType.indexOf('Strikethrough') < 0)) {
                      var p = parsePrice(spec.price);
                      if (p != null) {
                        best = {
                          name: v.name || item.name,
                          price: p,
                          currency: spec.priceCurrency || preferredCurrency || 'USD',
                          inStock: !offer.availability || offer.availability.toLowerCase().indexOf('instock') >= 0,
                        };
                        return;
                      }
                    }
                  }
                }
                // Direct price on offer
                var price = parsePrice(offer.price);
                if (price != null && price > 0) {
                  best = {
                    name: v.name || item.name,
                    price: price,
                    currency: offer.priceCurrency || preferredCurrency || 'USD',
                    inStock: !offer.availability || offer.availability.toLowerCase().indexOf('instock') >= 0,
                  };
                  return;
                }
              }
            }
          }
        }

        // Handle standard Product with offers
        if (item['@type'] === 'Product' && item.name && item.offers) {
          var offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (var j = 0; j < offers.length; j++) {
            if (best) return;
            var offer = offers[j];
            var price = parsePrice(offer.price);
            if (price != null && price > 0) {
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

  var title = $('h1').first().text().trim() || $('title').first().text().trim();

  // Simracingstore (WooCommerce CLP): prefer last .woocommerce-Price-amount (sale price)
  if (retailerId === 'simracingstore') {
    var srPrices = $('.price .woocommerce-Price-amount.amount');
    if (srPrices.length > 1) {
      var srEl = srPrices.last();
      var srP = parsePrice(srEl.text().trim().replace(/\s+/g, ' '));
      if (srP != null && srP > 0) {
        return { name: title, price: srP, currency: 'CLP', inStock: true };
      }
    }
  }

  // Retailer-specific selectors
  var selectors = [
    '.special-price',
    '.current-price',
    '.product-price',
    '.price ins .woocommerce-Price-amount',
    '.price_wrapper',
    '[itemprop="price"]',
    '[data-price]',
    '.price',
    '.product__price',
    '.sale-price',
    '.price-item',
    '.current-price .price',
  ];

  // Ricmotech: "Your Price:" followed by price
  if (retailerId === 'ricmotech') {
    var bodyText = $.root().text();
    var rmMatch = bodyText.match(/Your\s*Price:\s*[:\s]*(\$[0-9,.]+)/);
    if (rmMatch) {
      var p = parsePrice(rmMatch[1]);
      if (p != null && p > 0) {
        return { name: title, price: p, currency: preferredCurrency || 'USD', inStock: true };
      }
    }
  }

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

  // ElectronicsCrazy: custom WooCommerce theme, price in #Item_main_price
  if (retailerId === 'electronicscrazy') {
    var ecEl = $('#Item_main_price').first();
    if (ecEl.length) {
      var ecText = ecEl.text().trim().replace(/\s+/g, ' ');
      var ecPrice = parsePrice(ecText);
      if (ecPrice != null && ecPrice > 0) {
        return { name: title, price: ecPrice, currency: preferredCurrency || 'USD', inStock: true };
      }
    }
  }

  // Simustop: Tienda Nube platform, price in #price_display data attribute (cents)
  if (retailerId === 'simustop') {
    var spEl = $('#price_display');
    if (spEl.length) {
      var spPrice = spEl.attr('data-product-price');
      if (spPrice) {
        var p = parseFloat(spPrice) / 100;
        if (p > 0) {
          return { name: title, price: p, currency: preferredCurrency || 'USD', inStock: true };
        }
      }
    }
  }

  // PB Tech: custom .NET platform, price in .sticky-price or .font-size-28
  if (retailerId === 'pbtech') {
    var pbPrice = null;
    // Use sticky-price first (exact inc-GST price)
    var pbSticky = $('.sticky-price').first();
    if (pbSticky.length) {
      pbPrice = parsePrice(pbSticky.text().trim());
    }
    // Fallback to .font-size-28 (rounded price)
    if (pbPrice == null || pbPrice <= 0) {
      var pbEl = $('.font-size-28').first();
      if (pbEl.length) {
        pbPrice = parsePrice(pbEl.text().trim());
      }
    }
    if (pbPrice != null && pbPrice > 0) {
      return { name: title, price: pbPrice, currency: preferredCurrency || 'NZD', inStock: true };
    }
  }

  return null;
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function main() {
  var data = loadData();
  var entries = buildUrlEntries();

  // Deep clone old prices for change detection
  var oldPrices = JSON.parse(JSON.stringify(data.prices || {}));

  console.log('Fetching ' + entries.length + ' product pages...');
  var success = 0;

  for (var e = 0; e < entries.length; e++) {
    var url = entries[e].url;
    var retailerId = entries[e].retailerId;
    var productId = entries[e].productId;

    // Rate limiting delay between requests
    if (e > 0) await delay(1500);

    try {
      var retailer = RETAILERS.find(function(r) { return r.id === retailerId; });
      var currency = retailer ? retailer.currency : 'USD';
      var result = null;

      // For WooCommerce Store API URLs, try /wp-json/wc/store/v1/products/{id} first
      if (url.indexOf('/wp-json/wc/store/v1/products/') >= 0) {
        for (var ri = 0; ri < 3; ri++) {
          if (ri > 0) await delay(2000);
          var wooResult = await fetchWooCommerceJson(url);
          if (wooResult) {
            result = wooResult;
            break;
          }
        }
      }

      // For Shopify stores, try .json endpoint first (most reliable)
      if (!result && url.indexOf('/products/') >= 0) {
        for (var ri = 0; ri < 3; ri++) {
          if (ri > 0) await delay(2000);
          var jsonResult = await fetchJson(url);
          if (jsonResult) {
            result = jsonResult;
            break;
          }
        }
      }

      // Fallback to HTML extraction if .json failed or not a Shopify URL
      if (!result) {
        var html = await fetch(url);
        result = extractPrice(html, currency, retailerId);

        // Retry HTML extraction once if no price found
        if (!result) {
          await delay(2000);
          html = await fetch(url);
          result = extractPrice(html, currency, retailerId);
        }
      }

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
        var c = result.currency || currency;
        var sym = c === 'EUR' ? '\u20AC' : c === 'GBP' ? '\u00A3' : c === 'INR' ? '\u20B9' : c === 'JPY' ? '\u00A5' : c === 'BRL' ? 'R$' : c === 'AUD' || c === 'CAD' ? 'A$' : c === 'SEK' ? 'kr' : c === 'DKK' ? 'kr' : c === 'NZD' ? 'NZ$' : c === 'PLN' ? 'zł' : c === 'SGD' ? 'S$' : c === 'HKD' ? 'HK$' : c === 'TWD' ? 'NT$' : c === 'KRW' ? '₩' : c === 'ILS' ? '₪' : c === 'MYR' ? 'RM' : c === 'MXN' ? 'MX$' : c === 'CLP' ? 'CLP$' : c === 'ZAR' ? 'R' : c === 'CHF' ? 'CHF' : c === 'PHP' ? '₱' : c === 'THB' ? '฿' : c === 'CZK' ? 'Kč' : c === 'AED' ? 'AED' : c === 'VND' ? '₫' : c === 'COP' ? 'COL$' : '$';
        console.log('  OK ' + result.name + ': ' + sym + result.price + ' @ ' + retailerId);
        success++;
      } else {
        console.log('  -- No price for ' + productId + ' @ ' + retailerId);
      }
    } catch (e) {
      // If initial fetch fails, try Shopify .json endpoint as fallback (with retry)
      if (url.indexOf('/products/') >= 0) {
        var jsonResult = null;
        for (var ri = 0; ri < 3; ri++) {
          if (ri > 0) await delay(2000);
          jsonResult = await fetchJson(url);
          if (jsonResult) break;
        }
        if (jsonResult && jsonResult.price > 0) {
          if (!data.prices[productId]) data.prices[productId] = {};
          data.prices[productId][retailerId] = {
            price: jsonResult.price,
            currency: jsonResult.currency || currency,
            url: url,
            name: jsonResult.name,
            inStock: jsonResult.inStock !== false,
            checkedAt: new Date().toISOString(),
          };
          var sym = jsonResult.currency === 'EUR' ? '\u20AC' : jsonResult.currency === 'GBP' ? '\u00A3' : jsonResult.currency === 'CHF' ? 'CHF' : jsonResult.currency === 'JPY' ? '\u00A5' : jsonResult.currency === 'VND' ? '\u20AB' : jsonResult.currency === 'COP' ? 'COL$' : '$';
          console.log('  OK ' + jsonResult.name + ': ' + sym + jsonResult.price + ' @ ' + retailerId + ' (via .json)');
          success++;
        } else {
          console.log('  XX ' + productId + ' @ ' + retailerId + ': ' + e.message + ' (.json also failed)');
        }
      } else {
        console.log('  XX ' + productId + ' @ ' + retailerId + ': ' + e.message);
      }
    }
  }

  // Save MSRP and brand references
  data.msrp = {};
  data.brands = {};
  for (var pi = 0; pi < PRODUCTS.length; pi++) {
    var p = PRODUCTS[pi];
    if (MSRP_MAP[p.id]) data.msrp[p.id] = MSRP_MAP[p.id];
    if (p.brand) data.brands[p.id] = p.brand;
  }

  saveData(data);
  console.log('\nDone. ' + success + '/' + entries.length + ' pages.');

  // Detect price changes and send DingTalk notification
  var changeLines = ['## MOZA Price Change Report', '', '| Product | Retailer | Old | New | Change |'];
  changeLines.push('|---|---|---|---|---|');
  var changeCount = 0;
  for (var pid4 in data.prices) {
    var p4 = PRODUCTS.find(function(x) { return x.id === pid4; });
    var name4 = p4 ? p4.name : pid4;
    for (var rid3 in data.prices[pid4]) {
      var oldEntry = oldPrices[pid4] && oldPrices[pid4][rid3];
      var newEntry = data.prices[pid4][rid3];
      if (!newEntry || !newEntry.price) continue;
      if (oldEntry && oldEntry.price === newEntry.price) continue;
      var r3 = RETAILERS.find(function(x) { return x.id === rid3; });
      var rname3 = r3 ? r3.name : rid3;
      var oldP = oldEntry ? oldEntry.price : '-';
      var newP = newEntry.price;
      var sym3 = newEntry.currency === 'EUR' ? '\u20AC' : newEntry.currency === 'GBP' ? '\u00A3' : newEntry.currency === 'INR' ? '\u20B9' : newEntry.currency === 'JPY' ? '\u00A5' : newEntry.currency === 'BRL' ? 'R$' : newEntry.currency === 'AUD' || newEntry.currency === 'CAD' ? 'A$' : newEntry.currency === 'SEK' || newEntry.currency === 'DKK' ? 'kr' : newEntry.currency === 'NZD' ? 'NZ$' : newEntry.currency === 'PLN' ? 'z\u0142' : newEntry.currency === 'SGD' ? 'S$' : newEntry.currency === 'HKD' ? 'HK$' : newEntry.currency === 'TWD' ? 'NT$' : newEntry.currency === 'KRW' ? '\u20A9' : newEntry.currency === 'ILS' ? '\u20AA' : newEntry.currency === 'MYR' ? 'RM' : newEntry.currency === 'MXN' ? 'MX$' : newEntry.currency === 'CLP' ? 'CLP$' : newEntry.currency === 'ZAR' ? 'R' : newEntry.currency === 'CHF' ? 'CHF' : newEntry.currency === 'PHP' ? '\u20B1' : newEntry.currency === 'THB' ? '\u0E3F' : newEntry.currency === 'CZK' ? 'K\u010D' : newEntry.currency === 'AED' ? 'AED' : newEntry.currency === 'VND' ? '\u20AB' : newEntry.currency === 'COP' ? 'COL$' : '$';
      var changeStr = oldEntry ? (newP > oldP ? '+$' + (newP - oldP).toFixed(2) : '-$' + (oldP - newP).toFixed(2)) : 'NEW';
      changeLines.push('| ' + name4 + ' | ' + rname3 + ' | ' + (oldEntry ? sym3 + oldP : '-') + ' | ' + sym3 + newP + ' | ' + changeStr + ' |');
      changeCount++;
    }
  }
  if (changeCount > 0) {
    var changeMsg = changeLines.join('\n');
    console.log('\n!! PRICE CHANGES: ' + changeCount + ' change(s) detected');
    // Send DingTalk for price changes
    var webhookUrl2 = process.env.DINGTALK_WEBHOOK_URL;
    var secret2 = process.env.DINGTALK_WEBHOOK_SECRET;
    if (webhookUrl2) {
      var crypto2 = require('crypto');
      var timestamp2 = Date.now();
      var fullUrl2 = webhookUrl2;
      if (secret2) {
        var stringToSign2 = timestamp2 + '\n' + secret2;
        var hmac2 = crypto2.createHmac('sha256', secret2);
        hmac2.update(stringToSign2);
        var sign2 = hmac2.digest('base64');
        fullUrl2 += (webhookUrl2.indexOf('?') >= 0 ? '&' : '?') + 'timestamp=' + timestamp2 + '&sign=' + encodeURIComponent(sign2);
      }
      var payload2 = JSON.stringify({
        msgtype: 'markdown',
        markdown: { title: 'MOZA Price Changes', text: changeMsg },
      });
      var parsed2 = new URL(fullUrl2);
      var httpMod2 = parsed2.protocol === 'https:' ? https : http;
      var options2 = {
        hostname: parsed2.hostname,
        path: parsed2.pathname + parsed2.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload2) },
      };
      var req2 = httpMod2.request(options2, function(res) {
        var body2 = '';
        res.on('data', function(c) { body2 += c; });
        res.on('end', function() { console.log('DingTalk price change sent:', body2); });
      });
      req2.on('error', function(e) { console.error('DingTalk price change error:', e.message); });
      req2.write(payload2);
      req2.end();
    }
  } else {
    console.log('No price changes detected.');
  }

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
        var sym2 = info2.currency === 'EUR' ? '\u20AC' : info2.currency === 'GBP' ? '\u00A3' : info2.currency === 'INR' ? '\u20B9' : info2.currency === 'JPY' ? '\u00A5' : info2.currency === 'BRL' ? 'R$' : info2.currency === 'AUD' || info2.currency === 'CAD' ? 'A$' : info2.currency === 'SEK' ? 'kr' : info2.currency === 'DKK' ? 'kr' : info2.currency === 'NZD' ? 'NZ$' : info2.currency === 'PLN' ? 'zł' : info2.currency === 'SGD' ? 'S$' : info2.currency === 'HKD' ? 'HK$' : info2.currency === 'TWD' ? 'NT$' : info2.currency === 'KRW' ? '₩' : info2.currency === 'ILS' ? '₪' : info2.currency === 'MYR' ? 'RM' : info2.currency === 'MXN' ? 'MX$' : info2.currency === 'CLP' ? 'CLP$' : info2.currency === 'ZAR' ? 'R' : info2.currency === 'CHF' ? 'CHF' : info2.currency === 'PHP' ? '₱' : info2.currency === 'THB' ? '฿' : info2.currency === 'CZK' ? 'Kč' : info2.currency === 'AED' ? 'AED' : info2.currency === 'VND' ? '₫' : info2.currency === 'COP' ? 'COL$' : '$';
      console.log('  ' + name3 + ': ' + sym2 + info2.price + ' @ ' + rname2 + msrpLine);

      if (msrp && info2.price > 0) {
        var msrpUsd = msrp;
        var priceUsd = info2.price;
        // Rough currency conversion for comparison
        if (info2.currency === 'EUR') priceUsd = info2.price * 1.08;
        else if (info2.currency === 'GBP') priceUsd = info2.price * 1.27;
        else if (info2.currency === 'CAD') priceUsd = info2.price * 0.73;
        else if (info2.currency === 'AUD') priceUsd = info2.price * 0.66;
        else if (info2.currency === 'INR') priceUsd = info2.price * 0.012;
        else if (info2.currency === 'BRL') priceUsd = info2.price * 0.19;
        else if (info2.currency === 'SEK') priceUsd = info2.price * 0.093;
        else if (info2.currency === 'DKK') priceUsd = info2.price * 0.145;
        else if (info2.currency === 'NZD') priceUsd = info2.price * 0.61;
        else if (info2.currency === 'PLN') priceUsd = info2.price * 0.25;
        else if (info2.currency === 'SGD') priceUsd = info2.price * 0.74;
        else if (info2.currency === 'HKD') priceUsd = info2.price * 0.128;
        else if (info2.currency === 'TWD') priceUsd = info2.price * 0.031;
        else if (info2.currency === 'KRW') priceUsd = info2.price * 0.00072;
        else if (info2.currency === 'ILS') priceUsd = info2.price * 0.27;
        else if (info2.currency === 'MYR') priceUsd = info2.price * 0.21;
        else if (info2.currency === 'MXN') priceUsd = info2.price * 0.055;
        else if (info2.currency === 'CLP') priceUsd = info2.price * 0.0011;
        else if (info2.currency === 'ZAR') priceUsd = info2.price * 0.055;
        else if (info2.currency === 'PHP') priceUsd = info2.price * 0.017;
        else if (info2.currency === 'THB') priceUsd = info2.price * 0.028;
        else if (info2.currency === 'CZK') priceUsd = info2.price * 0.043;
        else if (info2.currency === 'AED') priceUsd = info2.price * 0.27;
        else if (info2.currency === 'VND') priceUsd = info2.price * 0.000041;
        else if (info2.currency === 'COP') priceUsd = info2.price * 0.00024;
        else if (info2.currency === 'JPY') priceUsd = info2.price * 0.0069;
        else if (info2.currency === 'CHF') priceUsd = info2.price * 1.11;

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
