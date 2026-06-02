const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'products-config.js');
const DATA_PATH = path.join(__dirname, '..', 'price-data.json');

const HANDLE_MAP = {
  'r3-racing-bundle-pc': 'r3-bundle',
  'r3-racing-bundle-xbox': 'r3-xbox',
  'r5-racing-bundle': 'r5-bundle',
  'r9-wheelbase': 'r9-v3-base',
  'r12-wheelbase': 'r12-base',
  'r21-ultra': 'r21-ultra',
  'r25-ultra': 'r25-ultra',
  'esx-steering-wheel': 'esx-wheel',
  'ks-gt-wheel': 'ks-wheel',
  'ks-pro-wheel': 'ks-pro-wheel',
  'cs-v2p-wheel': 'cs-v2p',
  'cs-pro-wheel': 'cs-pro-wheel',
  'gs-v2p-gt-wheel': 'gs-v2p-wheel',
  'rs-v2-wheel': 'rs-wheel',
  'fsr2-formula-wheel': 'fsr2-wheel',
  'vision-gs-wheel': 'vision-gs',
  'srp-pedals': 'srp-pedals',
  'srp2-pedals': 'srp2-pedals',
  'crp2-pedals': 'crp2-pedals',
  'hgp-shifter': 'hgp-shifter',
  'hbp-handbrake': 'handbrake',
  'table-clamp': 'table-clamp',
  'cm2-dash': 'cm2-dash',
  'moza-qr': 'quick-release',
  'universal-hub': 'universal-hub',
  'multi-function-stalks': 'multi-stalks',
  'sgp-shifter': 'sgp-shifter',
  'tsw-truck-wheel': 'tsw-wheel',
  'z-axis-module': 'z-axis',
  'extension-rod': 'extension-rod',
  'tsw-clamp': 'clamp-truck',
  'revuelto-sim-wheel': 'lambo-revuelto',
  'esx-formula-mod': 'es-formula-mod',
  'ab6-bundle': 'ab6-bundle',
  'ab9-base': 'ab9-base',
  'mhg-flightstick': 'mhg-stick',
  'mh16-flightstick': 'mh16-stick',
  'ma3x-sidestick': 'ma3x-stick',
  'ay210-ffb-yoke-bundle': 'ay210-yoke',
  'mtq-throttle': 'mtq-throttle',
  'mtp-throttle': 'mtp-throttle',
  'mtlp-panel': 'mtlp-panel',
  'mrp-rudder-pedals': 'mrp-pedals',
  'mfy-yoke': 'mfy-yoke',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9', 'X-Forwarded-For': '8.8.8.8' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`JSON parse failed for ${url}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const newMsrp = {};
  const handles = Object.keys(HANDLE_MAP);

  console.log(`Fetching ${handles.length} product pages from mozaracing.com...`);
  for (const handle of handles) {
    const pid = HANDLE_MAP[handle];
    try {
      const body = await fetchJSON(`https://mozaracing.com/products/${handle}.json`);
      const v = body.product.variants[0];
      let msrp;
      if (v.compare_at_price && parseFloat(v.compare_at_price) > parseFloat(v.price)) {
        msrp = Math.round(parseFloat(v.compare_at_price));
      } else {
        msrp = Math.round(parseFloat(v.price));
      }
      newMsrp[pid] = msrp;
      console.log(`  ${pid}: $${msrp} (${body.product.title})`);
    } catch (e) {
      console.log(`  ${pid}: FAILED (${handle}) - ${e.message}`);
    }
  }

  // Read existing config
  let config = fs.readFileSync(CONFIG_PATH, 'utf-8');

  const msrpStart = config.indexOf('const MSRP_MAP = {');
  const msrpEnd = config.indexOf('};', msrpStart) + 2;
  const before = config.substring(0, msrpStart);
  const after = config.substring(msrpEnd);

  const lines = ['const MSRP_MAP = {'];
  const rs21 = ['r3-bundle','r3-xbox','r5-bundle','r9-bundle','r9-v3-base','r12-base','r16-base','r21-base','r21-ultra','r25-ultra','es-wheel','esx-wheel','ks-wheel','ks-pro-wheel','cs-wheel','cs-pro-wheel','cs-v2p','gs-v2p-wheel','rs-wheel','fsr2-wheel','vision-gs','srp-lite','srp-pedals','crp-pedals','crp2-pedals','hgp-shifter','handbrake','table-clamp','cm2-dash','quick-release','universal-hub','multi-stalks','sgp-shifter','tsw-wheel','z-axis','extension-rod','clamp-truck','srp2-pedals','lambo-revuelto'];
  const flight = ['ab6-bundle','ab9-base','mhg-stick','mh16-stick','ma3x-stick','ay210-yoke','mtq-throttle','mtp-throttle','mtlp-panel','mrp-pedals','mfy-yoke','es-formula-mod'];

  for (const pid of rs21) {
    lines.push(`  '${pid}':    ${newMsrp[pid] !== undefined ? newMsrp[pid] : getExistingMsrp(config, pid)},`);
  }
  lines.push('  // MOZA Flight (飞模)');
  for (const pid of flight) {
    lines.push(`  '${pid}':    ${newMsrp[pid] !== undefined ? newMsrp[pid] : getExistingMsrp(config, pid)},`);
  }
  lines.push('};');

  const newConfig = before + lines.join('\n') + '\n' + after;
  fs.writeFileSync(CONFIG_PATH, newConfig);
  console.log('\nUpdated products-config.js MSRP_MAP');

  if (fs.existsSync(DATA_PATH)) {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    data.msrp = data.msrp || {};
    for (const pid of [...rs21, ...flight]) {
      if (newMsrp[pid] !== undefined) data.msrp[pid] = newMsrp[pid];
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log('Updated price-data.json msrp');
  }

  console.log('\nDone!');
}

function getExistingMsrp(config, pid) {
  const re = new RegExp(`'${pid}'\\s*:\\s*(\\d+)`);
  const m = config.match(re);
  return m ? m[1] : 'null';
}

main().catch(e => { console.error(e); process.exit(1); });
