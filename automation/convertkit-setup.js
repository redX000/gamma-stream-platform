/**
 * @fileoverview ConvertKit + WordPress opt-in integration setup.
 * Run once after setting CONVERTKIT_API_KEY to bootstrap the full email list.
 *
 * What this does:
 *   1. Creates a "Gamma Stream Newsletter" form in ConvertKit
 *   2. Fetches the form embed code
 *   3. Adds the form to the WordPress sidebar widget area
 *   4. Creates a /free-guide landing page on WordPress with the form embedded
 *   5. Outputs a summary + next steps
 *
 * Usage:
 *   node automation/convertkit-setup.js
 *   node automation/convertkit-setup.js --dry-run
 */

import 'dotenv/config';

const CK_API_KEY   = process.env.CONVERTKIT_API_KEY;
const CK_API_URL   = 'https://api.convertkit.com/v3';
const WP_URL       = process.env.WORDPRESS_URL;
const WP_USER      = process.env.WORDPRESS_USERNAME;
const WP_PASS      = process.env.WORDPRESS_PASSWORD;
const DRY_RUN      = process.argv.includes('--dry-run');

const FORM_NAME    = 'Gamma Stream Newsletter';
const LEAD_MAGNET  = '/free-guide';

// ─────────────────────────────────────────────────────────────────────────────

async function getWpJwt() {
  const res = await fetch(`${WP_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: WP_USER, password: WP_PASS }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('WP JWT failed: ' + JSON.stringify(data));
  return data.token;
}

async function ckGet(path) {
  const res = await fetch(`${CK_API_URL}${path}?api_key=${CK_API_KEY}`);
  if (!res.ok) throw new Error(`ConvertKit GET ${path} → ${res.status}`);
  return res.json();
}

async function ckPost(path, body) {
  const res = await fetch(`${CK_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: CK_API_KEY, ...body }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ConvertKit POST ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

async function findOrCreateForm() {
  const { forms } = await ckGet('/forms');
  const existing = forms.find(f => f.name === FORM_NAME);
  if (existing) {
    console.log(`[ck] Found existing form "${FORM_NAME}" (ID ${existing.id})`);
    return existing;
  }
  if (DRY_RUN) {
    console.log(`[ck] [dry-run] Would create form "${FORM_NAME}"`);
    return { id: 0, embed_html: '', embed_url: '' };
  }
  const data = await ckPost('/forms', { name: FORM_NAME, type: 'embed' });
  console.log(`[ck] Created form "${FORM_NAME}" (ID ${data.form.id})`);
  return data.form;
}

async function getFormScript(formId) {
  // ConvertKit embed JS tag
  return `<script async data-uid="${formId}" src="https://gammacash.convertkit-mail.com/ck.5.js"></script>`;
}

async function addFormToWpSidebar(token, formEmbed) {
  // Fetch existing sidebars
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/sidebars`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { console.log('[wp] Sidebar REST API not available — skipping widget'); return false; }

  const sidebars = await res.json();
  const sidebar = sidebars.find(s => s.id === 'sidebar-1' || s.id === 'sidebar') || sidebars[0];
  if (!sidebar) { console.log('[wp] No sidebar found'); return false; }

  if (DRY_RUN) {
    console.log(`[wp] [dry-run] Would add ConvertKit form widget to sidebar "${sidebar.id}"`);
    return true;
  }

  // Add HTML widget with form embed
  const widgetRes = await fetch(`${WP_URL}/wp-json/wp/v2/widgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      id_base: 'custom_html',
      sidebar: sidebar.id,
      settings: {
        title: 'Free AI Tools Guide',
        content: formEmbed,
      },
    }),
  });
  if (widgetRes.ok) {
    const w = await widgetRes.json();
    console.log(`[wp] Added ConvertKit form widget to sidebar "${sidebar.id}" (widget ID ${w.id})`);
    return true;
  }
  console.log('[wp] Widget API returned', widgetRes.status, '— manual sidebar setup needed');
  return false;
}

async function createLandingPage(token, formEmbed) {
  // Check if free-guide page exists
  const check = await fetch(`${WP_URL}/wp-json/wp/v2/pages?slug=free-guide&per_page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await check.json();
  if (existing.length > 0) {
    console.log(`[wp] /free-guide page already exists (ID ${existing[0].id}) — skipping`);
    return existing[0].id;
  }

  if (DRY_RUN) {
    console.log('[wp] [dry-run] Would create /free-guide landing page');
    return 0;
  }

  const content = `<!-- wp:html -->
${formEmbed}
<!-- /wp:html -->

<!-- wp:heading {"textAlign":"center"} -->
<h2 class="has-text-align-center">Get the Free AI Tools Guide 2026</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Join 1,000+ readers getting the best AI tools, reviews, and income strategies every week.</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul>
<li>✅ The 15 best AI tools in 2026 (honest rankings)</li>
<li>✅ Which tools have affiliate programs worth joining</li>
<li>✅ Step-by-step setup guides for each tool</li>
<li>✅ Weekly newsletter with new reviews &amp; tutorials</li>
</ul>
<!-- /wp:list -->`;

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Free AI Tools Guide 2026',
      slug: 'free-guide',
      status: 'publish',
      content,
    }),
  });
  const page = await res.json();
  console.log(`[wp] Created /free-guide landing page (ID ${page.id})`);
  return page.id;
}

async function run() {
  if (!CK_API_KEY) {
    console.error('[ck] CONVERTKIT_API_KEY not set.');
    console.error('Get it at: https://app.convertkit.com/account/edit → API → Secret API Key');
    console.error('Then: add to .env and GitHub Secrets, re-run this script.');
    process.exit(1);
  }
  if (!WP_URL || !WP_USER || !WP_PASS) {
    console.error('[wp] Missing WordPress credentials in .env');
    process.exit(1);
  }

  console.log(`[setup] ${DRY_RUN ? '[DRY RUN] ' : ''}ConvertKit + WordPress opt-in setup`);

  const form       = await findOrCreateForm();
  const formScript = await getFormScript(form.id);
  console.log(`[ck] Form embed script ready (form ID ${form.id})`);

  const wpToken = await getWpJwt();
  await addFormToWpSidebar(wpToken, formScript);
  const pageId = await createLandingPage(wpToken, formScript);

  console.log('\n[setup] ✅ Complete! Summary:');
  console.log(`  ConvertKit form ID : ${form.id}`);
  console.log(`  Landing page       : ${WP_URL}${LEAD_MAGNET}`);
  console.log(`  Form embed script  :`);
  console.log('  ' + formScript);
  console.log('\nNext steps:');
  console.log('  1. Add CONVERTKIT_API_KEY to GitHub Secrets');
  console.log('  2. In ConvertKit → Sequences → create "Gamma Stream Welcome"');
  console.log('     Use content from automation/email-sequences/welcome.md');
  console.log('  3. Link the sequence to your form automation');
  console.log(`  4. Add ${WP_URL}${LEAD_MAGNET} to your navigation menu`);
  console.log('  5. Add the form embed to post footers via functions.php or Code Snippets');
  console.log('');
  console.log('SparkLoop (Upscribe referral widget) — activate at 500 subscribers:');
  console.log('  • Apply at sparkloop.app (free, 2–5 days approval)');
  console.log('  • After approval: add SPARKLOOP_API_KEY + SPARKLOOP_PARTNER_ID to .env + GitHub Secrets');
  console.log('  • Embed widget from scripts/sparkloop-widget.html into /newsletter-confirmed WP page');
  console.log('  • In ConvertKit → Forms → [your form] → Settings → Redirect URL:');
  console.log(`    Set to: ${WP_URL}/newsletter-confirmed`);
  console.log('  • Revenue: $1–$5 per referred subscriber. Payout: PayPal → Payoneer USD.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
