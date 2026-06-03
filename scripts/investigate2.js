const https = require('https');
const http = require('http');

function fetch(url) {
  return new Promise(function(resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    var req = mod.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 200) resolve(d);
        else reject(new Error('HTTP ' + res.statusCode));
      });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function test() {
  // PLE search for MOZA
  try {
    var h = await fetch('https://www.ple.com.au/Search?q=moza');
    var title = h.match(/<title>([^<]+)/);
    console.log('PLE search: title=' + (title ? title[1].trim() : 'N/A') + ', length=' + h.length);
    var links = h.match(/\/Products\/\d+\/[^"']+/g);
    if (links) {
      var unique = [...new Set(links)];
      console.log('Found ' + unique.length + ' product links:');
      unique.slice(0, 20).forEach(function(l) { console.log('  ' + decodeURI(l)); });
    } else {
      // try to find any product reference
      var mozaCount = (h.match(/moza/gi) || []).length;
      console.log('No product links, moza references: ' + mozaCount);
    }
  } catch(e) { console.log('PLE search error: ' + e.message); }
  
  // Simulator Cave - find price in HTML more precisely  
  try {
    var h2 = await fetch('https://simulatorcave.com/product/moza-r5-bundle/');
    // Look for product page specific price
    var m1 = h2.match(/<p class="price[^"]*">[\s\S]*?<\/p>/);
    if (m1) {
      var text = m1[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('SimCave <p.price>: ' + text.substring(0, 150));
    }
    // Check if there's JSON-LD with @graph in other format
    var jlds = h2.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (jlds) console.log('SimCave JSON-LD blocks: ' + jlds.length);
    else console.log('SimCave: no JSON-LD at all');
    
    // Check for an 816 in the HTML
    if (h2.indexOf('816') >= 0) {
      var ctx = h2.substring(Math.max(0, h2.indexOf('816') - 30), h2.indexOf('816') + 30);
      console.log('Context around "816": "' + ctx.replace(/\s+/g, ' ') + '"');
    }
  } catch(e) { console.log('SimCave error: ' + e.message); }
  
  // GO Motorsports - check if cs-pro-wheel product page is actually the wrong product
  try {
    var h3 = await fetch('https://gomotorsportsshop.com/products/moza-cs-pro-steering-wheel');
    var titleG = h3.match(/<title>([^<]+)/);
    if (titleG) console.log('GO cs-pro title: "' + titleG[1].trim() + '"');
  } catch(e) { console.log('GO error: ' + e.message); }

  process.exit(0);
}
test().catch(function(e) { console.error(e.message); process.exit(1); });
