const { ApifyClient } = require('apify-client');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'apify~instagram-scraper';

const DEALER_INSTAGRAM_HANDLES = {
  microcenter: { name: 'Micro Center', location: 'US (nationwide stores)', country: 'US' },
  bhphoto: { name: 'B&H Photo Video', location: 'US (New York)', country: 'US' },
  ricmotech: { name: 'Ricmotech', location: 'US (Florida)', country: 'US' },
  focussimracing: { name: 'Focus Sim Racing', location: 'US (Santa Clarita, CA)', country: 'US' },
  simmotionus: { name: 'Sim-Motion', location: 'US (nationwide shipping)', country: 'US' },
  // gomotorsportsshop: { name: 'GO Motorsports', location: 'US (nationwide shipping)', country: 'US' }, // NO Instagram account found
  tracksvr: { name: 'TracksVR', location: 'US (nationwide shipping)', country: 'US' },
  'noxgaming.ca': { name: 'NOX Gaming', location: 'Canada (Quebec)', country: 'CA' },
  vipcbuilder: { name: 'VI PC Builder & Games', location: 'Canada (Vancouver Island)', country: 'CA' },
  pitlanesimracing: { name: 'Pit Lane Sim Racing', location: 'US (nationwide shipping)', country: 'US' },
  apexsimracing: { name: 'Apex Sim Racing', location: 'US (North America shipping)', country: 'US' },
  // South America — Brazil
  kfireracing: { name: 'KFire Racing', location: 'Brazil (nationwide shipping)', country: 'BR' },
  // Europe
  gtomegaracing: { name: 'GT Omega', location: 'UK (nationwide shipping)', country: 'GB' },
  abruzziuk: { name: 'Abruzzi', location: 'UK (nationwide shipping)', country: 'GB' },
  'simu.fy': { name: 'Simufy', location: 'Spain (nationwide shipping)', country: 'ES' },
  racegeareu: { name: 'RaceGear', location: 'Netherlands (EU shipping)', country: 'NL' },
  // UK
  demontweeksmotorsport: { name: 'Demon Tweeks', location: 'UK (nationwide shipping)', country: 'GB' },
  // Canada
  advancedsimracing: { name: 'Advanced Sim Racing', location: 'Canada (nationwide shipping)', country: 'CA' },
  // Sweden/Nordic
  wearemaxgaming: { name: 'MaxGaming', location: 'Sweden (Nordic shipping)', country: 'SE' },
  // Poland
  'simline.gt': { name: 'Simline', location: 'Poland (EU shipping)', country: 'PL' },
  // Netherlands
  sim_race_webshop: { name: 'SimRace Webshop', location: 'Netherlands (EU shipping)', country: 'NL' },
  // Australia
  gamer_gear_direct: { name: 'Gamer Gear Direct', location: 'Australia (nationwide shipping)', country: 'AU' },
  player1_sim_gear: { name: 'Player1 Sim Gear', location: 'Australia (nationwide shipping)', country: 'AU' },
  thegamesmenau: { name: 'The Gamesmen', location: 'Australia (nationwide shipping)', country: 'AU' },
  jbhifi: { name: 'JB Hi-Fi', location: 'Australia (nationwide shipping)', country: 'AU' },
  // Germany
  alternate_de: { name: 'Alternate', location: 'Germany (EU shipping)', country: 'DE' },
  // Sweden
  kjell_company: { name: 'Kjell & Company', location: 'Sweden (nationwide shipping)', country: 'SE' },
  // Australia
  pagnianadvancedsimulation: { name: 'Pagnian Advanced Simulation', location: 'Australia (nationwide shipping)', country: 'AU' },
  // India
  virtualracinghub: { name: 'Virtual Racing Hub', location: 'India (nationwide shipping)', country: 'IN' },
  // Batch 2: High-value dealers (May 2026)
  overclockersuk: { name: 'Overclockers UK', location: 'UK (nationwide shipping)', country: 'GB' },
  's5.tech': { name: 'S5 Technology', location: 'Singapore (nationwide shipping)', country: 'SG' },
  simsolution_ltd: { name: 'SimSolution', location: 'Israel (nationwide shipping)', country: 'IL' },
  simracingstore_cl: { name: 'SimRacing Store', location: 'Chile (nationwide shipping)', country: 'CL' },
  befastracing: { name: 'Be Fast Racing', location: 'Mexico (nationwide shipping)', country: 'MX' },
  simking_eu: { name: 'SimKing', location: 'France (EU shipping)', country: 'FR' },
  simhub_pro: { name: 'SIMHUB.PRO', location: 'Poland (EU shipping)', country: 'PL' },
  mozaracingkorea: { name: 'MOZA Korea', location: 'South Korea (nationwide shipping)', country: 'KR' },
  sdealgaming: { name: 'SDeal Gaming', location: 'Malaysia (nationwide shipping)', country: 'MY' },
  yohohongkong: { name: 'YOHO 友和', location: 'Hong Kong', country: 'HK' },
  pchome24h: { name: 'PChome 24h', location: 'Taiwan (nationwide shipping)', country: 'TW' },
  delenordic: { name: 'DELE Nordic', location: 'Denmark (Nordic shipping)', country: 'DK' },
  // Batch 3: New dealers (May 2026)
  'simracer.at': { name: 'SimRacer Austria', location: 'Austria (EU shipping)', country: 'AT' },
  'simultimate.ch': { name: 'SimUltimate', location: 'Switzerland (EU shipping)', country: 'CH' },
  arcteamsim: { name: 'ARC-Team Italy', location: 'Italy (EU shipping)', country: 'IT' },
   simracingpros: { name: 'Sim Racing Pros', location: 'US/Canada (nationwide shipping)', country: 'US' },
   // Batch 4: New Instagram finds (May 2026)
   simmotiongmbh: { name: 'Sim-Motion EU', location: 'Germany (EU shipping)', country: 'DE' },
   sonvideofrance: { name: 'Son-Video', location: 'France (EU shipping)', country: 'FR' },
   'caseking.de': { name: 'Caseking', location: 'Germany (EU shipping)', country: 'DE' },
};

const BRANDS = {
  moza:      { name: 'MOZA',          keywords: ['moza'] },
  fanatec:   { name: 'Fanatec',       keywords: ['fanatec'] },
  logitech:  { name: 'Logitech G',    keywords: ['logitech'] },
  simucube:  { name: 'Simucube',      keywords: ['simucube'] },
  thrustmaster: { name: 'Thrustmaster', keywords: ['thrustmaster'] },
  simagic:   { name: 'Simagic',       keywords: ['simagic'] },
  turtlebeach: { name: 'Turtle Beach', keywords: ['turtle beach', 'turtlebeach'] },
  pxn:       { name: 'PXN',           keywords: ['pxn'] },
};

const client = new ApifyClient({ token: TOKEN });

function detectBrands(post) {
  const text = ((post.text || post.caption || '') + ' ' + (post.displayUrl || '')).toLowerCase();
  const found = [];
  for (const [id, brand] of Object.entries(BRANDS)) {
    for (const kw of brand.keywords) {
      if (text.includes(kw)) { found.push(id); break; }
    }
  }
  return found;
}

function formatPost(item) {
  const text = (item.caption || item.text || '').trim();
  const type = item.type === 'Video' ? 'video' : item.type === 'Sidecar' ? 'carousel' : 'image';
  const ownerUsername = item.ownerUsername || item.username || '';
  const timestamp = item.timestamp || '';
  const postUrl = item.url || `https://www.instagram.com/p/${item.shortCode}/`;

  return {
    platform: 'instagram',
    type,
    text,
    url: postUrl,
    timestamp,
    likes: item.likesCount != null ? item.likesCount : 0,
    comments: item.commentsCount != null ? item.commentsCount : 0,
    displayUrl: item.displayUrl || '',
    videoUrl: item.videoUrl || '',
    ownerUsername,
    shortCode: item.shortCode || '',
    brands: detectBrands(item),
  };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + 'h ago';
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return diffD + 'd ago';
  const diffM = Math.floor(diffD / 30);
  return diffM + 'mo ago';
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('[refresh-data] Starting Instagram data refresh...');

  const usernames = Object.keys(DEALER_INSTAGRAM_HANDLES);
  const directUrls = usernames.map(u => `https://www.instagram.com/${u}/`);

  console.log(`[refresh-data] Running scraper for ${usernames.length} dealers...`);

  const run = await client.actor(ACTOR_ID).start({
    directUrls,
    resultsLimit: 3,
    proxy: { useApifyProxy: true },
  });

  console.log(`[refresh-data] Run started: ${run.id} (dataset: ${run.defaultDatasetId})`);

  let finished = false;
  let status = '';
  while (!finished) {
    await sleep(5000);
    const info = await client.run(run.id).get();
    status = info.status;
    if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'TIMED-OUT' || status === 'ABORTED') {
      finished = true;
    }
    console.log(`[refresh-data] Status: ${status}`);
  }

  if (status !== 'SUCCEEDED') {
    console.error(`[refresh-data] Run failed with status: ${status}`);
    process.exit(1);
  }

  const datasetId = run.defaultDatasetId;
  console.log(`[refresh-data] Fetching results from dataset: ${datasetId}`);

  const { items } = await client.dataset(datasetId).listItems();
  console.log(`[refresh-data] Got ${items.length} total items`);

  const grouped = {};
  for (const item of items) {
    const ownerUsername = item.ownerUsername || item.username || '';
    if (!ownerUsername || !DEALER_INSTAGRAM_HANDLES[ownerUsername]) continue;

    if (!grouped[ownerUsername]) grouped[ownerUsername] = [];
    grouped[ownerUsername].push(formatPost(item));
  }

  const result = {
    lastUpdated: new Date().toISOString(),
    posts: {},
  };

  for (const [username, posts] of Object.entries(grouped)) {
    result.posts[username] = posts;
  }

  const brandCounts = {};
  for (const posts of Object.values(result.posts)) {
    for (const p of posts) {
      for (const b of p.brands) {
        brandCounts[b] = (brandCounts[b] || 0) + 1;
      }
    }
  }
  console.log('[refresh-data] Brand mentions:', brandCounts);

  const outputPath = path.join(__dirname, '..', 'data.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`[refresh-data] Written to ${outputPath}`);
  console.log(`[refresh-data] Dealers with posts: ${Object.keys(result.posts).length}`);

  const totalPosts = Object.values(result.posts).reduce((a, b) => a + b.length, 0);
  console.log(`[refresh-data] Total posts: ${totalPosts}`);

  const cost = items.length * 0.0027;
  console.log(`[refresh-data] Estimated cost: $${cost.toFixed(4)}`);
}

run().catch(err => {
  console.error('[refresh-data] Fatal error:', err);
  process.exit(1);
});
