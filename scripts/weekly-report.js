const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const url = require('url');

const dataPath = path.join(__dirname, '..', 'data.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(raw);

const BRANDS = {
  moza:      { name: 'MOZA',          fullName: 'MOZA Racing' },
  fanatec:   { name: 'Fanatec',       fullName: 'Fanatec' },
  logitech:  { name: 'Logitech G',    fullName: 'Logitech G' },
  simucube:  { name: 'Simucube',      fullName: 'Simucube' },
  thrustmaster: { name: 'Thrustmaster', fullName: 'Thrustmaster' },
  simagic:   { name: 'Simagic',       fullName: 'Simagic' },
  turtlebeach: { name: 'Turtle Beach', fullName: 'Turtle Beach' },
  pxn:       { name: 'PXN',           fullName: 'PXN' },
};

function getLastWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday - 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function generateReport() {
  const { monday, sunday } = getLastWeekRange();
  const allPosts = [];
  for (const [dealer, posts] of Object.entries(data.posts)) {
    for (const p of posts) {
      allPosts.push({ ...p, dealer });
    }
  }

  const weekPosts = allPosts.filter(p => {
    if (!p.timestamp) return false;
    const d = new Date(p.timestamp);
    return d >= monday && d <= sunday;
  });

  const brandStats = {};
  for (const [id, brand] of Object.entries(BRANDS)) {
    brandStats[id] = { ...brand, posts: 0, likes: 0, comments: 0, dealers: new Set() };
  }
  brandStats.unknown = { name: '未识别品牌', fullName: '未识别品牌', posts: 0, likes: 0, comments: 0, dealers: new Set() };

  for (const p of weekPosts) {
    if (p.brands.length === 0) {
      brandStats.unknown.posts++;
      brandStats.unknown.likes += p.likes;
      brandStats.unknown.comments += p.comments;
      brandStats.unknown.dealers.add(p.dealer);
    }
    for (const b of p.brands) {
      if (brandStats[b]) {
        brandStats[b].posts++;
        brandStats[b].likes += p.likes;
        brandStats[b].comments += p.comments;
        brandStats[b].dealers.add(p.dealer);
      }
    }
  }

  const lines = [];
  const fmtDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  lines.push(`# 品牌曝光周报`);
  lines.push(`**统计周期**: ${fmtDate(monday)} ~ ${fmtDate(sunday)}`);
  lines.push(`**总帖子数**: ${weekPosts.length}`);
  lines.push('');

  const ranked = Object.values(brandStats)
    .filter(b => b.posts > 0)
    .sort((a, b) => b.posts - a.posts);

  if (ranked.length === 0) {
    lines.push('本周没有检测到品牌曝光数据。');
  } else {
    lines.push('| 品牌 | 帖子数 | 总点赞 | 总评论 | 涉及经销商数 |');
    lines.push('|------|--------|--------|--------|-------------|');
    for (const b of ranked) {
      lines.push(`| ${b.fullName} | ${b.posts} | ${b.likes} | ${b.comments} | ${b.dealers.size} |`);
    }
    lines.push('');

    lines.push('## 详情');
    for (const b of ranked) {
      lines.push(`### ${b.fullName}`);
      lines.push(`- 帖子: ${b.posts} | 点赞: ${b.likes} | 评论: ${b.comments}`);
      lines.push(`- 经销商 (${b.dealers.size}): ${[...b.dealers].join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function sendToDingTalk(text) {
  const webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const secret = process.env.DINGTALK_WEBHOOK_SECRET || '';
  const timestamp = Date.now();
  let fullUrl = webhookUrl;

  if (secret) {
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);
    const sign = hmac.digest('base64');
    const encoded = encodeURIComponent(sign);
    fullUrl += `${webhookUrl.includes('?') ? '&' : '?'}timestamp=${timestamp}&sign=${encoded}`;
  }

  const payload = JSON.stringify({
    msgtype: 'markdown',
    markdown: { title: '品牌曝光周报', text },
  });

  const parsed = new URL(fullUrl);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const report = generateReport();
console.log(report);
sendToDingTalk(report).then(r => {
  if (r) process.stderr.write('DingTalk response: ' + r + '\n');
});
