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
  // Australia (handles TBD — none of the provisional handles were found on Instagram)
  // South America — Brazil
  kfireracing: { name: 'KFire Racing', location: 'Brazil (nationwide shipping)', country: 'BR' },
  // Europe
  gtomegaracing: { name: 'GT Omega', location: 'UK (nationwide shipping)', country: 'GB' },
  abruzziuk: { name: 'Abruzzi', location: 'UK (nationwide shipping)', country: 'GB' },
  'simu.fy': { name: 'Simufy', location: 'Spain (nationwide shipping)', country: 'ES' },
  // Australia
  pagnianadvancedsimulation: { name: 'Pagnian Advanced Simulation', location: 'Australia (nationwide shipping)', country: 'AU' },
  // India
  virtualracinghub: { name: 'Virtual Racing Hub', location: 'India (nationwide shipping)', country: 'IN' },
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
