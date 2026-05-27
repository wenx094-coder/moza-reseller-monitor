const PRODUCTS = [
  { id: 'r3-bundle',    name: 'R3 Bundle' },
  { id: 'r5-bundle',    name: 'R5 Bundle' },
  { id: 'r9-bundle',    name: 'R9 Bundle' },
  { id: 'r3-base',      name: 'R3 Wheel Base' },
  { id: 'r5-base',      name: 'R5 Wheel Base' },
  { id: 'r7-base',      name: 'R7 Wheel Base' },
  { id: 'r9-base',      name: 'R9 Wheel Base' },
  { id: 'r9-v3-base',   name: 'R9 V3 Wheel Base' },
  { id: 'r11-base',     name: 'R11 Wheel Base' },
  { id: 'r12-base',     name: 'R12 Wheel Base' },
  { id: 'r16-base',     name: 'R16 Wheel Base' },
  { id: 'r21-base',     name: 'R21 Wheel Base' },
  { id: 'es-wheel',     name: 'ES Steering Wheel' },
  { id: 'esx-wheel',    name: 'ESX Steering Wheel' },
  { id: 'ks-wheel',     name: 'KS Steering Wheel' },
  { id: 'ks-pro-wheel', name: 'KS Pro Steering Wheel' },
  { id: 'cs-wheel',     name: 'CS Steering Wheel' },
  { id: 'cs-pro-wheel', name: 'CS Pro Steering Wheel' },
  { id: 'gs-wheel',     name: 'GS Steering Wheel' },
  { id: 'gs-v2p-wheel', name: 'GS V2P Steering Wheel' },
  { id: 'rs-wheel',     name: 'RS Steering Wheel' },
  { id: 'fsr2-wheel',   name: 'FSR2 Formula Wheel' },
  { id: 'vision-gs',    name: 'Vision GS Wheel' },
  { id: 'srp-pedals',   name: 'SR-P Pedals' },
  { id: 'srp-lite',     name: 'SR-P Lite Pedals' },
  { id: 'crp-pedals',   name: 'CRP Pedals' },
  { id: 'crp2-pedals',  name: 'CRP2 Pedals' },
  { id: 'hgp-shifter',  name: 'HGP Shifter' },
  { id: 'handbrake',    name: 'Handbrake' },
  { id: 'table-clamp',  name: 'Table Clamp' },
];

const RETAILERS = [
  { id: 'bhphoto',     name: 'B&H Photo',         url: 'https://www.bhphotovideo.com',   country: 'US', currency: 'USD' },
  { id: 'microcenter', name: 'Micro Center',      url: 'https://www.microcenter.com',     country: 'US', currency: 'USD' },
  { id: 'simmotion-eu',name: 'Sim-Motion EU',     url: 'https://eu.sim-motion.com',       country: 'DE', currency: 'EUR' },
  { id: 'simmotion-us',name: 'Sim-Motion US',     url: 'https://us.sim-motion.com',       country: 'US', currency: 'USD' },
  { id: 'tracksvr',    name: 'TracksVR',          url: 'https://tracksvr.com',            country: 'IE', currency: 'USD' },
  { id: 'apexsim',     name: 'Apex Sim Racing',   url: 'https://www.apexsimracing.com',   country: 'US', currency: 'USD' },
  { id: 'ricmotech',   name: 'Ricmotech',         url: 'https://ricmotech.com',           country: 'US', currency: 'USD' },
  { id: 'gtomega',     name: 'GT Omega',          url: 'https://gtomegaracing.com',       country: 'GB', currency: 'GBP' },
  { id: 'pagnian',     name: 'Pagnian',           url: 'https://pagnian.com.au',          country: 'AU', currency: 'AUD' },
  { id: 'abruzzi',     name: 'Abruzzi',           url: 'https://abruzzi.uk',              country: 'GB', currency: 'GBP' },
  { id: 'vr-hub',      name: 'Virtual Racing Hub', url: 'https://virtualracinghub.in',     country: 'IN', currency: 'INR' },
  { id: 'noxgaming',   name: 'NOX Gaming',        url: 'https://noxgaming.ca',            country: 'CA', currency: 'CAD' },
  { id: 'kfire',       name: 'KFire Racing',      url: 'https://kfireracing.com.br',      country: 'BR', currency: 'BRL' },
];

const PRODUCT_URLS = {
  microcenter: {
    'r5-bundle': 'https://www.microcenter.com/product/682583/moza-r5-direct-drive-sim-racing-bundle',
    'r12-base':  'https://www.microcenter.com/product/682588/moza-r12-direct-drive-wheel-base',
  },
  'simmotion-eu': {
    'r9-v3-base': 'https://eu.sim-motion.com/moza-r9-v3-wheel-base',
    'ks-pro-wheel': 'https://eu.sim-motion.com/moza-ks-pro-steering-wheel',
    'gs-v2p-wheel': 'https://eu.sim-motion.com/moza-gs-v2p-steering-wheel',
    'cs-pro-wheel': 'https://eu.sim-motion.com/MOZA-CS-Pro-Lenkrad',
    'crp2-pedals': 'https://eu.sim-motion.com/moza-crp2-load-cell-pedals',
    'hgp-shifter': 'https://eu.sim-motion.com/moza-hgp-shifter',
    'handbrake': 'https://eu.sim-motion.com/moza-hbp-handbrake',
    'srp-pedals': 'https://eu.sim-motion.com/moza-sr-p-pedale',
  },
  tracksvr: {
    'r16-base': 'https://tracksvr.com/products/moza-r16-v2-wheel-base',
    'r21-base': 'https://tracksvr.com/collections/new-sim-racing-hardware/products/moza-r21-wheel-base-ultra',
    'cs-pro-wheel': 'https://tracksvr.com/products/moza-cs-pro-steering-wheel',
  },
  'simmotion-us': {
    'r3-bundle': 'https://us.sim-motion.com/products/moza-racing-r3-sim-racing-bundle',
    'r5-bundle': 'https://us.sim-motion.com/products/moza-racing-r5-sim-racing-bundle',
    'r12-base': 'https://us.sim-motion.com/products/moza-racing-r12-v2-direct-drive-base',
    'ks-wheel': 'https://us.sim-motion.com/products/moza-racing-ks-steering-wheel',
    'cs-wheel': 'https://us.sim-motion.com/products/moza-racing-cs-v2p-steering-wheel',
    'rs-wheel': 'https://us.sim-motion.com/products/moza-racing-rs-gt-wheel',
    'crp2-pedals': 'https://us.sim-motion.com/products/moza-racing-crp2-pedals',
    'srp-pedals': 'https://us.sim-motion.com/products/moza-racing-srp-pedals',
    'hgp-shifter': 'https://us.sim-motion.com/products/moza-racing-hgp-shifter',
    'handbrake': 'https://us.sim-motion.com/products/moza-racing-hbp-handbrake',
  },
  ricmotech: {
    'r12-base': 'https://www.ricmotech.com/moza-r12-.html',
    'r16-base': 'https://www.ricmotech.com/moza-r16-direct-drive-wheel-base.html',
    'r21-base': 'https://www.ricmotech.com/MOZA-R21-Direct-Drive-Wheelbase_p_613.html',
    'ks-wheel': 'https://www.ricmotech.com/moza-ks-steering-wheel.html',
    'gs-v2p-wheel': 'https://www.ricmotech.com/MOZA-GS-V2P-Steering-Wheel_p_652.html',
    'cs-wheel': 'https://www.ricmotech.com/moza-cs-v2-steering-wheel.html',
    'fsr2-wheel': 'https://www.ricmotech.com/moza-fsr-steering-wheel.html',
    'srp-pedals': 'https://www.ricmotech.com/moza-sr-p-pedal.html',
    'crp2-pedals': 'https://www.ricmotech.com/-MOZA-CRP2-Throttle-and-Brake-Pedals_p_715.html',
  },
  noxgaming: {
    'r3-bundle': 'https://www.noxgaming.ca/product/moza-r3-bundle-steering-wheel-pedals-wheelbase-xbox-pc/',
    'r12-base': 'https://www.noxgaming.ca/product/moza-r12-v2-wheelbase/',
    'r21-base': 'https://www.noxgaming.ca/product/moza-r21-v2-direct-drive-wheelbase/',
    'cs-pro-wheel': 'https://www.noxgaming.ca/product/moza-cs-pro-round-sim-racing-steering-wheel/',
    'ks-pro-wheel': 'https://www.noxgaming.ca/product/moza-ks-pro-steering-wheel/',
  },
  apexsim: {
    'r9-v3-base': 'https://www.apexsimracing.com/products/moza-racing-r9-v3-wheel-base-9nm',
    'r12-base': 'https://www.apexsimracing.com/products/moza-racing-r12-wheel-base-12nm',
    'r21-base': 'https://www.apexsimracing.com/collections/sim-racing-direct-drive-wheel-bases/products/moza-racing-r21-ultra-wheelbase-21nm',
    'cs-pro-wheel': 'https://www.apexsimracing.com/products/moza-cs-pro-steering-wheel',
    'ks-pro-wheel': 'https://www.apexsimracing.com/collections/moza-racing-steering-wheels/products/moza-ks-pro-steering-wheel',
    'crp2-pedals': 'https://www.apexsimracing.com/products/moza-racing-crp2-load-cell-pedals',
    'fsr2-wheel': 'https://www.apexsimracing.com/products/moza-racing-fsr2-formula-wheel',
    'esx-wheel': 'https://www.apexsimracing.com/products/moza-racing-esx-steering-wheel',
    'rs-wheel': 'https://www.apexsimracing.com/products/moza-racing-rs-v2-steering-wheel',
  },
};

function buildUrlEntries() {
  var entries = [];
  for (var retailerId in PRODUCT_URLS) {
    var products = PRODUCT_URLS[retailerId];
    for (var productId in products) {
      entries.push({ url: products[productId], retailerId: retailerId, productId: productId });
    }
  }
  return entries;
}

// MSRP in USD from MOZA official store (mozaracing.com)
const MSRP_MAP = {
  'r3-bundle':    349,
  'r5-bundle':    599,
  'r9-bundle':    799,
  'r9-v3-base':   499,
  'r12-base':     499,
  'r16-base':     659,
  'r21-base':     999,
  'es-wheel':     99,
  'esx-wheel':    149,
  'ks-wheel':     199,
  'ks-pro-wheel': 349,
  'cs-wheel':     249,
  'cs-pro-wheel': 349,
  'gs-v2p-wheel': 399,
  'rs-wheel':     399,
  'fsr2-wheel':   599,
  'vision-gs':    699,
  'srp-lite':     79,
  'srp-pedals':   199,
  'crp-pedals':   349,
  'crp2-pedals':  399,
  'hgp-shifter':  159,
  'handbrake':    109,
  'table-clamp':  49,
};

module.exports = { PRODUCTS, RETAILERS, PRODUCT_URLS, MSRP_MAP, buildUrlEntries };
