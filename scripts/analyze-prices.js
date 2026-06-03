const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'price-data.json'), 'utf-8'));
const { MSRP_MAP, RETAILERS } = require('./products-config');

function toUsd(price, currency) {
  if (currency === 'USD') return price;
  if (currency === 'EUR') return price * 1.08;
  if (currency === 'GBP') return price * 1.27;
  if (currency === 'CAD') return price * 0.73;
  if (currency === 'AUD') return price * 0.66;
  if (currency === 'PLN') return price * 0.25;
  if (currency === 'INR') return price * 0.012;
  if (currency === 'BRL') return price * 0.19;
  if (currency === 'SEK') return price * 0.093;
  if (currency === 'DKK') return price * 0.145;
  if (currency === 'NZD') return price * 0.61;
  if (currency === 'SGD') return price * 0.74;
  if (currency === 'HKD') return price * 0.128;
  if (currency === 'TWD') return price * 0.031;
  if (currency === 'KRW') return price * 0.00072;
  if (currency === 'ILS') return price * 0.27;
  if (currency === 'MYR') return price * 0.21;
  if (currency === 'MXN') return price * 0.055;
  if (currency === 'CLP') return price * 0.0011;
  if (currency === 'ZAR') return price * 0.055;
  if (currency === 'CHF') return price * 1.11;
  if (currency === 'PHP') return price * 0.017;
  if (currency === 'THB') return price * 0.028;
  if (currency === 'CZK') return price * 0.043;
  if (currency === 'AED') return price * 0.27;
  if (currency === 'JPY') return price * 0.0069;
  if (currency === 'VND') return price * 0.000041;
  if (currency === 'COP') return price * 0.00024;
  if (currency === 'NOK') return price * 0.094;
  return price;
}

function retailerName(id) {
  var r = RETAILERS.find(function(rr) { return rr.id === id; });
  return r ? r.name + ' (' + r.currency + '/' + r.country + ')' : id;
}

var issues = [];
var ok = [];

for (var pid in data.prices) {
  var msrp = MSRP_MAP[pid];
  if (!msrp) continue;
  var dealers = data.prices[pid];
  for (var rid in dealers) {
    var entry = dealers[rid];
    var usdPrice = toUsd(entry.price, entry.currency);
    var ratio = usdPrice / msrp;
    var diff = usdPrice - msrp;
    if (ratio < 0.3 || ratio > 2.0) {
      issues.push({
        pid: pid,
        msrp: msrp,
        retailer: rid,
        rawPrice: entry.price,
        currency: entry.currency,
        usdPrice: Math.round(usdPrice * 100) / 100,
        ratio: Math.round(ratio * 100) / 100,
        diff: Math.round(diff),
      });
    } else {
      ok.push({ pid: pid, retailer: rid, ratio: Math.round(ratio * 100) / 100, usdPrice: Math.round(usdPrice) });
    }
  }
}

issues.sort(function(a, b) { return Math.abs(a.ratio - 1) < Math.abs(b.ratio - 1) ? 1 : -1; });

console.log('\n========== SUSPICIOUS PRICES (ratio < 0.3 or > 2.0 vs MSRP) ==========\n');
if (issues.length === 0) {
  console.log('None found!');
} else {
  for (var i = 0; i < issues.length; i++) {
    var iss = issues[i];
    var arrow = iss.ratio < 1 ? '<<<< WAY BELOW' : '>>>> WAY ABOVE';
    console.log(
      iss.pid + ' @ ' + retailerName(iss.retailer) +
      ': ' + iss.currency + ' ' + iss.rawPrice +
      ' -> USD ' + iss.usdPrice +
      ' (MSRP $' + iss.msrp + ', ratio ' + iss.ratio + 'x) ' + arrow
    );
  }
}

var totalDealers = {};
for (var pid in data.prices) {
  for (var rid in data.prices[pid]) {
    if (!totalDealers[rid]) totalDealers[rid] = { count: 0, issues: 0 };
    totalDealers[rid].count++;
  }
}
for (var i = 0; i < issues.length; i++) {
  var rid = issues[i].retailer;
  if (totalDealers[rid]) totalDealers[rid].issues++;
}

console.log('\n========== DEALER SUMMARY ==========\n');
for (var rid in totalDealers) {
  var d = totalDealers[rid];
  var pct = d.count > 0 ? Math.round(d.issues / d.count * 100) : 0;
  if (d.issues > 0) {
    console.log('  ' + retailerName(rid) + ': ' + d.issues + '/' + d.count + ' products flagged (' + pct + '%)');
  }
}

console.log('\n========== OK RATIO RANGES ==========\n');
var ranges = {};
for (var i = 0; i < ok.length; i++) {
  var key = ok[i].retailer;
  if (!ranges[key]) ranges[key] = { min: 2, max: 0, samples: [] };
  var r = ranges[key];
  if (ok[i].ratio < r.min) r.min = ok[i].ratio;
  if (ok[i].ratio > r.max) r.max = ok[i].ratio;
  r.samples.push(ok[i].ratio);
}
for (var rid in ranges) {
  var r = ranges[rid];
  var avg = r.samples.reduce(function(a, b) { return a + b; }, 0) / r.samples.length;
  console.log('  ' + retailerName(rid) + ': ratios ' + r.min + 'x ~ ' + r.max + 'x (avg ' + Math.round(avg * 100) / 100 + 'x, ' + r.samples.length + ' products)');
}
