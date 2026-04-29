/**
 * @fileoverview Full system health check for Gamma Stream Platform.
 * Run before AdSense application and after any major change.
 * Checks all revenue-critical systems and prints a pass/fail summary.
 *
 * Usage:
 *   node scripts/health-check.js
 *   node scripts/health-check.js --json   # machine-readable output
 */

import 'dotenv/config';

const WP_URL    = process.env.WORDPRESS_URL || 'https://gammacash.online';
const JSON_MODE = process.argv.includes('--json');

const results = [];

function pass(label, detail = '') { results.push({ status: 'PASS', label, detail }); }
function fail(label, detail = '') { results.push({ status: 'FAIL', label, detail }); }
function warn(label, detail = '') { results.push({ status: 'WARN', label, detail }); }

async function checkUrl(url, expectedStatus = 200) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return r.status;
  } catch { return 0; }
}

async function run() {
  console.log(`[health-check] Running full system check on ${WP_URL} …\n`);

  // ── 1. WordPress reachable ──────────────────────────────────────────────────
  const wpStatus = await checkUrl(WP_URL);
  wpStatus === 200 ? pass('WordPress reachable', WP_URL) : fail('WordPress unreachable', `HTTP ${wpStatus}`);

  // ── 2. Required pages ───────────────────────────────────────────────────────
  const requiredPages = [
    ['Privacy Policy',       `${WP_URL}/privacy-policy/`],
    ['About',                `${WP_URL}/about/`],
    ['Contact',              `${WP_URL}/contact/`],
    ['Affiliate Disclosure', `${WP_URL}/affiliate-disclosure/`],
    ['Sales Page',           `${WP_URL}/get-the-guide/`],
    ['Free Guide',           `${WP_URL}/free-guide/`],
  ];
  for (const [name, url] of requiredPages) {
    const s = await checkUrl(url);
    s === 200 ? pass(`Page: ${name}`, url) : fail(`Page missing: ${name}`, url);
  }

  // ── 3. /go/* redirects (spot-check 3) ──────────────────────────────────────
  const redirectChecks = ['jasper', 'systeme-io', 'copyai'];
  for (const slug of redirectChecks) {
    const s = await checkUrl(`${WP_URL}/go/${slug}/`);
    s === 200 ? pass(`Redirect: /go/${slug}`) : fail(`Redirect missing: /go/${slug}`);
  }

  // ── 4. Sitemap ──────────────────────────────────────────────────────────────
  const sitemapStatus = await checkUrl(`${WP_URL}/sitemap.xml`);
  sitemapStatus === 200
    ? pass('Sitemap', `${WP_URL}/sitemap.xml`)
    : fail('Sitemap missing', `${WP_URL}/sitemap.xml`);

  // ── 5. Post count ───────────────────────────────────────────────────────────
  try {
    const r = await fetch(`${WP_URL}/wp-json/wp/v2/posts?status=publish&per_page=1`);
    const count = parseInt(r.headers.get('x-wp-total') || '0', 10);
    if (count >= 10) pass(`Post count: ${count} (AdSense ready)`);
    else warn(`Post count: ${count}/10`, 'Need 10+ posts for AdSense — pipeline auto-generates 3/week');
  } catch { fail('Post count check failed'); }

  // ── 6. Environment variables ────────────────────────────────────────────────
  const envChecks = [
    ['ANTHROPIC_API_KEY',       !!process.env.ANTHROPIC_API_KEY],
    ['WORDPRESS_URL',           !!process.env.WORDPRESS_URL],
    ['WORDPRESS_PASSWORD',      !!process.env.WORDPRESS_PASSWORD],
    ['GA4_PROPERTY_ID',         !!process.env.GA4_PROPERTY_ID],
    ['GA4_SERVICE_ACCOUNT_JSON',!!process.env.GA4_SERVICE_ACCOUNT_JSON],
    ['CONVERTKIT_API_KEY',      !!process.env.CONVERTKIT_API_KEY],
    ['GUMROAD_ACCESS_TOKEN',    !!process.env.GUMROAD_ACCESS_TOKEN],
    ['PEXELS_API_KEY',          !!process.env.PEXELS_API_KEY],
  ];
  for (const [key, set] of envChecks) {
    set ? pass(`.env: ${key}`) : warn(`.env: ${key} missing`, 'Add to .env and GitHub Secrets');
  }

  // ── 7. GitHub Actions (check last run of each workflow) ────────────────────
  // Note: requires GH_TOKEN in env or gh CLI auth
  try {
    const { execSync } = await import('child_process');
    const raw = execSync('gh run list --limit 20 --json workflowName,conclusion', { encoding: 'utf8' });
    const runs = JSON.parse(raw);
    const latest = {};
    for (const r of runs) {
      if (!latest[r.workflowName]) latest[r.workflowName] = r.conclusion;
    }
    for (const [wf, conclusion] of Object.entries(latest)) {
      conclusion === 'success'
        ? pass(`Workflow: ${wf}`)
        : fail(`Workflow: ${wf}`, `Last run: ${conclusion}`);
    }
  } catch { warn('GitHub Actions check skipped', 'Run from a repo with gh CLI auth'); }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  if (JSON_MODE) {
    console.log(JSON.stringify({ passed, failed, warned, results }, null, 2));
    return;
  }

  console.log('─'.repeat(60));
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️ ';
    console.log(`${icon}  ${r.label}${r.detail ? `  (${r.detail})` : ''}`);
  }
  console.log('─'.repeat(60));
  console.log(`\nResult: ${passed} passed · ${failed} failed · ${warned} warnings`);
  if (failed > 0) { console.log('\nFix all ❌ items before applying for AdSense or going live.'); process.exit(1); }
  if (warned > 0) { console.log('\n⚠️  Review warnings — they block some revenue streams.'); }
  else            { console.log('\n🎉 All checks passed. Platform is healthy.'); }
}

run().catch(err => { console.error('[health-check] Error:', err.message); process.exit(1); });
