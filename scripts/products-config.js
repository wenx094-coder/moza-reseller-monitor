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

module.exports = { PRODUCTS, RETAILERS, PRODUCT_URLS, buildUrlEntries };
