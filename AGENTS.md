# Moza Monitor - Development Rules

## Session Summary (2026-08-18)

### What we did this session

#### Bug Fixes Applied

| Commit | Fix | Details |
|--------|-----|---------|
| `b0c1c17` | **PXN false positive** | Removed `displayUrl` from `detectBrands()` in refresh-data.js — CDN URL hashes contained random substrings matching brand keywords |
| `3293209` | **Stale IG posts filter** | Added 30-day max age filter in refresh-data.js to skip old Instagram posts |
| `3293209` | **Flight MSRP missing** | Added MSRP for tqa ($39), tqb ($39), mrp-damper ($65), flight-base-clamp ($59) to products-config.js, sync-msrp.js, and price-data.json |
| `3293209` | **apshop es-wheel** | Removed broken URL (returned $0 price) from products-config.js |
| `3293209` | **Stale data cleanup** | Removed 14 stale posts from data.json (speednation 2013, nobaracingstore 2025, etc.) |
| `02b538c` | **AUD/CAD symbol collision** | Fixed `A$` → `C$` for CAD in refresh-prices.js (3 locations: lines 507, 572, 632) |
| `02b538c` | **changeStr hardcoded $** | Now uses correct currency symbol (`sym3`) instead of `$` for price diffs |
| `02b538c` | **HEADLESS_ONLY missing** | Added 7 retailers: kfire, bestbuy, centralcomputer, electronicscrazy, racegear, pbtech, newegg |
| `02b538c` | **DingTalk fire-and-forget** | Wrapped both HTTP requests in Promises with `await` |
| `02b538c` | **Error-fallback symbols** | Expanded from 6 to all 22 currencies |
| `02b538c` | **Workflow race conditions** | Added concurrency groups to schedule-prices.yml and schedule-headless.yml |
| `02b538c` | **refresh-data.yml [skip ci]** | Added missing `[skip ci]` to commit message |
| `02b538c` | **Cron stagger** | refresh-data.yml → 00:30 UTC, schedule-headless.yml → 01:30 UTC, weekly-report.yml → 01:30 UTC |
| `02b538c` | **Playwright cache** | Added actions/cache for Chromium binary in schedule-headless.yml |
| `02b538c` | **permissions block** | Added `contents: read` to weekly-report.yml |
| `02b538c` | **APIFY_TOKEN leak** | Removed from npm ci step in refresh-data.yml |
| `5eb6e7e` | **noxgaming placeholders** | Removed $150 CAD placeholder prices for ks-pro-wheel and cs-pro-wheel |
| `5eb6e7e` | **player1simgear URL** | Fixed srp-pedals URL from 404 to correct product page |

#### Current MSRP_MAP additions
```
'tqa': 39, 'tqb': 39, 'mrp-damper': 65, 'flight-base-clamp': 59
```

#### sync-msrp.js HANDLE_MAP additions
```
'tqa-throttle-module': 'tqa',
'tqb-throttle-module': 'tqb',
'mrp-adjustable-damper': 'mrp-damper',
'flight-base-table-clamp': 'flight-base-clamp'
```

### Verified as correct (no fix needed)
- **sdeal/r9-v3-base** (MYR 900 = $189 USD, 0.38x MSRP) — Multi-variant product page, RM900 is "R9 BASE ONLY" option
- **delenordic/vision-gs** (EUR 429 = $463, 0.46x MSRP) — Genuine deep discount, confirmed
- **kfire prices** (BRL ×2-2.7x MSRP) — Expected Brazilian import taxes
- **simsolution prices** (ILS ×2 MSRP) — Expected Israeli 17% VAT
- **simustop prices** (USD ×2.16 MSRP) — Expected Argentina markup

### Current system state
- **Products tracked**: 62 (including r3-xbox, mfy-yoke)
- **MSRP_MAP**: 56 products
- **Retailers**: 69 configured, 55 active with prices
- **PRODUCT_URLS entries**: ~1,087
- **Instagram dealers**: 50

### GitHub Actions schedule (post-fix)
| Workflow | Cron | Notes |
|----------|------|-------|
| schedule-prices.yml | `0 0,12 * * *` | Concurrency group: price-scraper |
| schedule-headless.yml | `30 1 * * *` | Concurrency group: price-scraper, Playwright cached |
| refresh-data.yml | `30 0 */3 * *` | [skip ci] added |
| sync-msrp.yml | `0 8 * * *` | Unchanged |
| weekly-report.yml | `30 1 * * 1` | Permissions: contents: read |

### Known issues remaining
1. **18 stale price entries (>30d)** — Will auto-correct on next GHA run
2. **7 retailers with URLs but no price data** — caseking, gameone, megabikeplus, bestbuy, centralcomputer, pbtech, prosimtech, newegg (all new or anti-bot)
3. **10 retailers with no URLs** — Known blocked/unreachable (bhphoto, microcenter, thegamesmen, etc.)
4. **11 products in PRODUCTS array with no price data** — r3-base, r7-base, r9-base, r11-base, gs-wheel, crp2-clutch, crp2-perf-kit, srp-lite-perf-kit, r12-v2-base, porsche-wheel

### File locations
- Repository: `C:\Users\wenx0\moza-monitor`
- Config: `scripts/products-config.js`
- Price scraper: `scripts/refresh-prices.js`
- Headless scraper: `scripts/refresh-prices-headless.js`
- Instagram scraper: `scripts/refresh-data.js`
- MSRP sync: `scripts/sync-msrp.js`
- Price data: `price-data.json`
- Instagram data: `data.json`
- Dashboard: `prices.html`
- Workflows: `.github/workflows/`

### How to continue next session
```bash
cd C:\Users\wenx0\moza-monitor
git pull
```
Then check for any new issues or continue adding retailers/products.
