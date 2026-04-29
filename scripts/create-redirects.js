/**
 * @fileoverview Creates /go/* affiliate redirect pages in WordPress.
 * No Pretty Links plugin required — uses WordPress parent/child pages with JS redirects.
 *
 * Usage:
 *   node scripts/create-redirects.js              # Create all with placeholder URLs
 *   node scripts/create-redirects.js --update     # Update existing pages
 *   node scripts/create-redirects.js --dry-run    # Preview without changes
 *
 * After joining affiliate programs, edit REDIRECTS below and re-run with --update.
 */

import 'dotenv/config';

const WP_URL       = process.env.WORDPRESS_URL;
const WP_USER      = process.env.WORDPRESS_USERNAME;
const WP_PASS      = process.env.WORDPRESS_PASSWORD;
const DRY_RUN      = process.argv.includes('--dry-run');
const UPDATE       = process.argv.includes('--update');

// ── Affiliate redirect map ──────────────────────────────────────────────────
// Replace '#' with your real affiliate URL once you have been approved.
// Re-run: node scripts/create-redirects.js --update
const REDIRECTS = {
  'jasper':       { title: 'Jasper AI',      url: '#' },   // jasper.ai/affiliate   — 25% recurring
  'copyai':       { title: 'Copy.ai',         url: '#' },   // copy.ai/affiliate     — 45% recurring
  'surfer-seo':   { title: 'Surfer SEO',      url: '#' },   // surferseo.com/aff.    — 25% recurring
  'convertkit':   { title: 'ConvertKit',      url: '#' },   // convertkit.com/aff.   — 30% recurring
  'writesonic':   { title: 'Writesonic',      url: '#' },   // writesonic.com/aff.   — 30% recurring
  'grammarly':    { title: 'Grammarly',       url: '#' },   // grammarly.com/aff.    — various
  'canva':        { title: 'Canva',           url: '#' },   // canva.com/affiliates  — various
  'chatgpt-plus': { title: 'ChatGPT Plus',    url: '#' },   // openai.com — n/a
  'midjourney':   { title: 'Midjourney',      url: '#' },   // midjourney.com — n/a
  'systeme-io':   { title: 'Systeme.io',      url: '#' },   // systeme.io/affiliate  — 60% recurring ⭐
  'zapier':       { title: 'Zapier',          url: '#' },   // zapier.com/affiliate  — 20-25% recurring
  'scalenut':     { title: 'Scalenut',        url: '#' },   // scalenut.com/aff.     — 30% lifetime
  'notion':       { title: 'Notion AI',       url: '#' },   // notion.so/affiliate   — 20% per sale
};

// ─────────────────────────────────────────────────────────────────────────────

function redirectPageContent(url, title) {
  if (url === '#' || !url) {
    return `<!-- redirect-target: # -->\n<p><em>${title} affiliate link coming soon.</em></p>`;
  }
  return `<!-- redirect-target: ${url} -->
<script>window.location.replace('${url}');</script>
<meta http-equiv="refresh" content="0;url=${url}">
<noscript><a href="${url}">Click here to continue to ${title}</a></noscript>`;
}

async function getJwt() {
  const res = await fetch(`${WP_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: WP_USER, password: WP_PASS }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('JWT failed: ' + JSON.stringify(data));
  return data.token;
}

async function findOrCreateGoParent(token) {
  // Look for existing 'go' page
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages?slug=go&per_page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pages = await res.json();
  if (pages.length > 0) {
    console.log(`[redirects] Found existing parent page "go" (ID ${pages[0].id})`);
    return pages[0].id;
  }
  if (DRY_RUN) { console.log('[redirects] [dry-run] Would create parent page "go"'); return 0; }

  const create = await fetch(`${WP_URL}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Go',
      slug: 'go',
      status: 'publish',
      content: '<!-- redirect container — do not delete -->',
      meta: { _yoast_wpseo_meta_robots: 'noindex,nofollow' },
    }),
  });
  const created = await create.json();
  console.log(`[redirects] Created parent page "go" (ID ${created.id})`);
  return created.id;
}

async function getExistingChildren(token, parentId) {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/pages?parent=${parentId}&per_page=50&_fields=id,slug`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const pages = await res.json();
  return Object.fromEntries(pages.map(p => [p.slug, p.id]));
}

async function run() {
  if (!WP_URL || !WP_USER || !WP_PASS) {
    console.error('[redirects] Missing WORDPRESS_URL / WORDPRESS_USERNAME / WORDPRESS_PASSWORD in .env');
    process.exit(1);
  }

  console.log(`[redirects] ${DRY_RUN ? '[DRY RUN] ' : ''}Creating /go/* redirect pages on ${WP_URL}`);
  const token    = await getJwt();
  const parentId = await findOrCreateGoParent(token);
  const existing = DRY_RUN ? {} : await getExistingChildren(token, parentId);

  let created = 0, updated = 0, skipped = 0;

  for (const [slug, { title, url }] of Object.entries(REDIRECTS)) {
    const content = redirectPageContent(url, title);
    const existingId = existing[slug];

    if (existingId && !UPDATE) {
      console.log(`[redirects] Skip /go/${slug} (already exists — use --update to overwrite)`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      const action = existingId ? 'update' : 'create';
      console.log(`[redirects] [dry-run] Would ${action} /go/${slug} → ${url}`);
      continue;
    }

    if (existingId) {
      const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages/${existingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, title }),
      });
      const data = await res.json();
      console.log(`[redirects] Updated /go/${slug} (ID ${data.id}) → ${url}`);
      updated++;
    } else {
      const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          slug,
          parent: parentId,
          status: 'publish',
          content,
        }),
      });
      const data = await res.json();
      console.log(`[redirects] Created /go/${slug} (ID ${data.id}) → ${url}`);
      created++;
    }
  }

  console.log(`\n[redirects] Done — ${created} created, ${updated} updated, ${skipped} skipped`);
  if (skipped > 0) console.log('[redirects] Run with --update to overwrite skipped pages');
  console.log('\nNext step: join affiliate programs and replace # with real URLs, then run:');
  console.log('  node scripts/create-redirects.js --update');
}

run().catch(err => { console.error(err.message); process.exit(1); });
