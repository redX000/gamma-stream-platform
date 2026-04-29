/**
 * @fileoverview AppSumo AI deals fetcher + /deals page updater.
 *
 * Current state: returns a hardcoded array of example deals.
 * Future expansion: replace fetchDeals() body with a real RSS/scrape call.
 *
 * AppSumo RSS feed (unofficial, monitor for changes):
 *   https://appsumo.com/rss/deals/
 *
 * Usage:
 *   node automation/appsumo-deals-fetcher.js            # update /deals page
 *   node automation/appsumo-deals-fetcher.js --dry-run  # preview only
 */

import 'dotenv/config';

const WP_URL  = process.env.WORDPRESS_URL?.replace(/\/$/, '');
const WP_USER = process.env.WORDPRESS_USERNAME;
const WP_PASS = process.env.WORDPRESS_PASSWORD;
const DRY_RUN = process.argv.includes('--dry-run');

// Replace PLACEHOLDER with your real AppSumo affiliate ID after signup.
// Sign up: appsumo.com/affiliates (instant approval, free).
// Payout: Payoneer USD account. Typical commission: $10–$150 per sale.
const AFFILIATE_ID  = process.env.APPSUMO_AFFILIATE_ID || 'PLACEHOLDER';
const APPSUMO_BASE  = `https://appsumo.com`;
const APPSUMO_DEALS = `${APPSUMO_BASE}/collections/software-deals/?ref=${AFFILIATE_ID}`;

// ─────────────────────────────────────────────────────────────────────────────
// Deal fetcher
// To connect to a real feed: replace this function's body with an RSS parse
// or a fetch to the AppSumo deals endpoint. The return shape must stay the same.
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDeals() {
  // STUB — replace with real RSS/API call when ready.
  // Real feed candidate: https://appsumo.com/rss/deals/
  return [
    {
      name: 'Jasper AI Business Plan',
      tagline: 'AI writing assistant for long-form content, ads & SEO — 50% off lifetime',
      price: '$69',
      originalPrice: '$149/yr',
      category: 'AI Writing',
      dealUrl: `${APPSUMO_BASE}/products/jasper/?ref=${AFFILIATE_ID}`,
      badge: '🔥 Best Seller',
    },
    {
      name: 'Surfer SEO',
      tagline: 'Real-time SEO scoring and content editor — rank on Google faster',
      price: '$49',
      originalPrice: '$99/mo',
      category: 'AI SEO',
      dealUrl: `${APPSUMO_BASE}/products/surfer/?ref=${AFFILIATE_ID}`,
      badge: '⭐ Top Rated',
    },
    {
      name: 'Writesonic Business',
      tagline: 'GPT-4 powered copywriter — unlimited words, team access',
      price: '$59',
      originalPrice: '$129/mo',
      category: 'AI Writing',
      dealUrl: `${APPSUMO_BASE}/products/writesonic/?ref=${AFFILIATE_ID}`,
      badge: '🆕 New Deal',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Page builder
// ─────────────────────────────────────────────────────────────────────────────

function buildDealsPage(deals) {
  const dealCards = deals.map(d => `
    <div class="gc-deal-card" data-tilt>
      <div class="gc-deal-header">
        <span class="gc-deal-badge">${d.badge}</span>
        <span class="gc-deal-category">${d.category}</span>
      </div>
      <h3 class="gc-deal-name">${d.name}</h3>
      <p class="gc-deal-tagline">${d.tagline}</p>
      <div class="gc-deal-pricing">
        <span class="gc-deal-price">${d.price}</span>
        <span class="gc-deal-original">was ${d.originalPrice}</span>
        <span class="gc-deal-saving">one-time</span>
      </div>
      <a href="${d.dealUrl}" class="affiliate-btn gc-deal-cta" target="_blank" rel="noopener sponsored">
        Get This Deal →
      </a>
    </div>`).join('\n');

  return `<!-- wp:html -->
<style>
.gc-deals-hero{background:linear-gradient(145deg,#0a0a0a,#0b1a10);padding:72px 24px 56px;text-align:center;border-bottom:1px solid rgba(0,255,136,.12)}
.gc-deals-hero h1{font-size:clamp(1.8rem,4vw,3rem)!important;font-weight:800!important;color:#fff!important;margin-bottom:16px}
.gc-deals-hero h1 span{color:#00ff88}
.gc-deals-hero p{color:#a0a0a0;max-width:560px;margin:0 auto 28px;font-size:1.05rem}
.gc-deals-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;max-width:1100px;margin:0 auto;padding:56px 24px}
.gc-deal-card{background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:28px;display:flex;flex-direction:column;gap:12px;transition:all .3s}
.gc-deal-card:hover{border-color:#00ff88;transform:translateY(-4px);box-shadow:0 10px 32px rgba(0,255,136,.1)}
.gc-deal-header{display:flex;justify-content:space-between;align-items:center}
.gc-deal-badge{font-size:.78rem;font-weight:700;color:#00ff88}
.gc-deal-category{font-size:.72rem;background:rgba(0,255,136,.1);color:#00ff88;border:1px solid rgba(0,255,136,.2);border-radius:50px;padding:3px 10px}
.gc-deal-name{color:#fff!important;font-size:1.1rem!important;font-weight:700!important;margin:0!important}
.gc-deal-tagline{color:#a0a0a0;font-size:.875rem;line-height:1.6;margin:0;flex:1}
.gc-deal-pricing{display:flex;align-items:baseline;gap:10px}
.gc-deal-price{font-size:1.6rem;font-weight:800;color:#00ff88;font-family:'Space Grotesk',sans-serif}
.gc-deal-original{font-size:.8rem;color:#666;text-decoration:line-through}
.gc-deal-saving{font-size:.75rem;background:rgba(0,255,136,.1);color:#00ff88;border-radius:4px;padding:2px 6px}
.gc-deal-cta{margin-top:6px;text-align:center;display:block}
.gc-deals-footer{text-align:center;padding:24px;color:#666;font-size:.8rem;max-width:700px;margin:0 auto 48px}
.gc-deals-footer a{color:#00ff88!important}
@media(max-width:600px){.gc-deals-grid{grid-template-columns:1fr;padding:32px 16px}}
</style>

<div class="gc-deals-hero">
  <h1>Best AI Lifetime Deals —<br><span>Updated Weekly</span></h1>
  <p>One-time payment. No monthly fees. The best AI tool deals sourced from AppSumo, curated for makers and content creators.</p>
  <a href="${APPSUMO_DEALS}" class="gc-hero-btn hero-cta-magnetic" target="_blank" rel="noopener sponsored">
    Browse All Deals on AppSumo →
  </a>
</div>

<div class="gc-deals-grid">
  ${dealCards}
</div>

<div class="gc-deals-footer">
  <p>
    Deals are sourced via <a href="${APPSUMO_DEALS}" target="_blank" rel="noopener sponsored">AppSumo</a>.
    We earn a commission at no extra cost to you.
    Prices and availability change — click through to confirm current offer.
    <a href="/affiliate-disclosure">Affiliate disclosure →</a>
  </p>
</div>
<!-- /wp:html -->`;
}

// ─────────────────────────────────────────────────────────────────────────────
// WordPress helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch(`${WP_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: WP_USER, password: WP_PASS }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('JWT auth failed: ' + JSON.stringify(data));
  return data.token;
}

async function upsertPage(token, slug, title, content) {
  const r = await fetch(`${WP_URL}/wp-json/wp/v2/pages?slug=${slug}&per_page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await r.json();
  const body = { title, content, status: 'publish' };

  if (existing.length > 0) {
    const updated = await fetch(`${WP_URL}/wp-json/wp/v2/pages/${existing[0].id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
    return { action: 'updated', link: updated.link };
  }

  const created = await fetch(`${WP_URL}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, slug }),
  }).then(r => r.json());
  return { action: 'created', link: created.link };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[deals-fetcher] ${DRY_RUN ? '[DRY RUN] ' : ''}Fetching AppSumo deals...\n`);

  const deals = await fetchDeals();
  console.log(`[deals-fetcher] ${deals.length} deals loaded`);

  if (AFFILIATE_ID === 'PLACEHOLDER') {
    console.warn('[deals-fetcher] ⚠️  APPSUMO_AFFILIATE_ID not set — deal links use PLACEHOLDER ref');
    console.warn('                   Sign up at appsumo.com/affiliates, then:');
    console.warn('                   1. Add APPSUMO_AFFILIATE_ID=<your-id> to .env + GitHub Secrets');
    console.warn('                   2. Re-run: npm run deals:update');
  }

  if (DRY_RUN) {
    console.log('[deals-fetcher] [dry-run] Would update /deals page with:');
    deals.forEach(d => console.log(`  • ${d.name} — ${d.price} (was ${d.originalPrice})`));
    return;
  }

  const token = await getToken();
  const result = await upsertPage(token, 'deals', '🔥 Best AI Lifetime Deals', buildDealsPage(deals));
  console.log(`[deals-fetcher] /deals page ${result.action}: ${result.link}`);
  console.log('\n✅ Done. Run npm run deals:update after getting real AppSumo affiliate ID.\n');
}

main().catch(err => { console.error('[deals-fetcher] Fatal:', err.message); process.exit(1); });
