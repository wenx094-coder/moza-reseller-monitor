var config = require('./products-config.js');
var fs = require('fs');

// Parse IG handles properly - extract all keys
var igContent = fs.readFileSync('../scripts/refresh-data.js', 'utf8');
var igKeys = [];
var lines = igContent.split('\n');
var inIg = false;
for (var i = 0; i < lines.length; i++) {
  var l = lines[i];
  if (l.indexOf('DEALER_INSTAGRAM_HANDLES') >= 0 && l.indexOf('=') >= 0) { inIg = true; continue; }
  if (!inIg) continue;
  if (l.trim() === '};') break;
  var m = l.match(/^\s*['"]?([a-zA-Z0-9_\.\-\s]+)['"]?\s*:/);
  if (m) igKeys.push(m[1].trim().replace(/['"]/g, ''));
}

var retailIds = config.RETAILERS.map(function(r) { return r.id; });
var activeIds = retailIds.filter(function(id) {
  return config.PRODUCT_URLS[id] && Object.keys(config.PRODUCT_URLS[id]).length > 0;
});

function norm(s) {
  return s.toLowerCase().replace(/[-_.\s]/g, '');
}

console.log('IG handles count: ' + igKeys.length);
console.log('Active price-tracked: ' + activeIds.length);

// Active but NO IG
console.log('\n=== Active price-tracked but missing from Instagram ===');
activeIds.forEach(function(id) {
  var r = config.RETAILERS.find(function(x) { return x.id === id; });
  var n = norm(id);
  var nn = norm(r.name);
  var found = igKeys.some(function(k) {
    var nk = norm(k);
    return nk.indexOf(n) >= 0 || n.indexOf(nk) >= 0 || nk.indexOf(nn) >= 0 || nn.indexOf(nk) >= 0;
  });
  if (!found) console.log('  ' + id + ' (' + r.name + ')');
});

// IG but no active URLs
console.log('\n=== Has Instagram handle but NO active product URLs ===');
igKeys.forEach(function(k) {
  var nk = norm(k);
  var found = activeIds.some(function(id) {
    var r = config.RETAILERS.find(function(x) { return x.id === id; });
    var n = norm(id);
    var nn = norm(r.name);
    return nk.indexOf(n) >= 0 || n.indexOf(nk) >= 0 || nk.indexOf(nn) >= 0 || nn.indexOf(nk) >= 0;
  });
  if (!found) {
    // Also check full retailer list (not just active)
    found = retailIds.some(function(id) {
      var r = config.RETAILERS.find(function(x) { return x.id === id; });
      var n = norm(id);
      var nn = norm(r.name);
      return nk.indexOf(n) >= 0 || n.indexOf(nk) >= 0 || nk.indexOf(nn) >= 0 || nn.indexOf(nk) >= 0;
    });
    if (!found) console.log('  ' + k);
  }
});
