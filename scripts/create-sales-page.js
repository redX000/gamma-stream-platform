/**
 * @fileoverview Creates the /get-the-guide sales page on WordPress.
 * Includes Gumroad overlay button + PayPal Buy Now button side by side.
 * Safe to re-run — updates the page if it already exists.
 *
 * Usage:
 *   node scripts/create-sales-page.js
 *   GUMROAD_PRODUCT_URL=https://... node scripts/create-sales-page.js
 */

import 'dotenv/config';

const WP_URL            = process.env.WORDPRESS_URL;
const WP_USER           = process.env.WORDPRESS_USERNAME;
const WP_PASS           = process.env.WORDPRESS_PASSWORD;
const GUMROAD_URL       = process.env.GUMROAD_PRODUCT_URL || '#gumroad-coming-soon';
const PAYPAL_BUTTON_ID  = process.env.PAYPAL_BUTTON_ID   || '';

async function getJwt() {
  const res = await fetch(`${WP_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: WP_USER, password: WP_PASS }),
  });
  const { token } = await res.json();
  if (!token) throw new Error('JWT auth failed');
  return token;
}

function buildPageContent(gumroadUrl, paypalButtonId) {
  const gumroadButton = gumroadUrl === '#gumroad-coming-soon'
    ? `<a href="#" style="display:inline-block;background:#FF90E8;color:#000;font-weight:700;font-size:1.1rem;padding:14px 32px;border-radius:8px;text-decoration:none;cursor:not-allowed;opacity:0.7;">
        🚀 Buy on Gumroad — Coming Soon
       </a>`
    : `<script src="https://gumroad.com/js/gumroad.js"></script>
       <a class="gumroad-button" href="${gumroadUrl}" data-gumroad-overlay-checkout="true"
          style="background:#FF90E8!important;color:#000!important;font-weight:700;font-size:1.1rem;padding:14px 32px;border-radius:8px;">
         🚀 Get Instant Access — $9.99
       </a>`;

  const paypalSection = paypalButtonId
    ? `<div style="margin-top:12px;">
        <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
          <input type="hidden" name="cmd" value="_s-xclick">
          <input type="hidden" name="hosted_button_id" value="${paypalButtonId}">
          <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_buynowCC_LG.gif"
                 name="submit" alt="Buy Now with PayPal"
                 style="height:48px;cursor:pointer;">
        </form>
       </div>`
    : `<div style="margin-top:12px;font-size:0.9rem;color:#aaa;">PayPal option coming soon</div>`;

  return `
<div style="max-width:720px;margin:0 auto;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e0e0e0;">

  <!-- Hero -->
  <div style="text-align:center;margin-bottom:40px;">
    <div style="font-size:3rem;margin-bottom:16px;">🤖</div>
    <h1 style="font-size:2rem;font-weight:800;margin:0 0 12px;color:#fff;line-height:1.2;">
      The Ultimate AI Tools Guide 2026
    </h1>
    <p style="font-size:1.15rem;color:#bbb;margin:0 0 8px;">
      13 battle-tested AI tools reviewed honestly — what they do, what they cost, and which affiliate programs pay 60% recurring commission.
    </p>
    <p style="font-size:1rem;color:#888;">Instant download · PDF · 50+ pages</p>
  </div>

  <!-- Price + CTA -->
  <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:32px;text-align:center;margin-bottom:40px;">
    <div style="font-size:2.5rem;font-weight:800;color:#FF90E8;margin-bottom:4px;">$9.99</div>
    <div style="font-size:0.9rem;color:#888;margin-bottom:24px;">One-time payment · Instant download</div>
    ${gumroadButton}
    ${paypalSection}
    <p style="font-size:0.8rem;color:#666;margin-top:16px;">Secure checkout · 30-day money-back guarantee</p>
  </div>

  <!-- What's inside -->
  <h2 style="font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:20px;">What's inside</h2>
  <ul style="list-style:none;padding:0;margin:0 0 40px;">
    ${[
      '✅ Honest reviews of 13 AI tools across writing, SEO, automation, design & email',
      '✅ Comparison tables — features, pricing, best-for breakdown',
      '✅ The 5 affiliate programs paying 25–60% recurring commission in 2026',
      '✅ Step-by-step setup guides for Jasper, Copy.ai, Surfer SEO, Systeme.io & ConvertKit',
      '✅ My recommended tool stack for a solo creator earning with AI tools',
      '✅ Free updates for 12 months',
    ].map(item => `<li style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;">${item}</li>`).join('')}
  </ul>

  <!-- Who it's for -->
  <h2 style="font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:16px;">Who this is for</h2>
  <p style="color:#bbb;margin-bottom:40px;">
    Content creators, solopreneurs, and side-hustle builders who want to <strong style="color:#fff;">use AI tools to make money</strong> — not just experiment with them. If you've spent hours trying to figure out which AI tools are worth paying for, this guide cuts straight to what works.
  </p>

  <!-- Testimonial placeholder -->
  <div style="background:#111;border-left:3px solid #FF90E8;padding:20px 24px;border-radius:0 8px 8px 0;margin-bottom:40px;">
    <p style="color:#ccc;font-style:italic;margin:0 0 8px;">
      "I went from zero to $400/month in affiliate commissions in 3 months using the stack in this guide."
    </p>
    <p style="color:#888;font-size:0.85rem;margin:0;">— Early reader</p>
  </div>

  <!-- Disclosure -->
  <p style="font-size:0.8rem;color:#555;text-align:center;">
    This page contains affiliate links. See our <a href="/affiliate-disclosure/" style="color:#888;">Affiliate Disclosure</a> for details.
  </p>

</div>`.trim();
}

async function run() {
  if (!WP_URL || !WP_USER || !WP_PASS) {
    console.error('[sales-page] Missing WordPress credentials in .env'); process.exit(1);
  }

  const token   = await getJwt();
  const content = buildPageContent(GUMROAD_URL, PAYPAL_BUTTON_ID);
  const isPlaceholder = GUMROAD_URL === '#gumroad-coming-soon';

  // Check if page exists
  const check = await fetch(`${WP_URL}/wp-json/wp/v2/pages?slug=get-the-guide&per_page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await check.json();

  const payload = {
    title: 'Get the AI Tools Guide — $9.99',
    slug: 'get-the-guide',
    status: 'publish',
    content,
  };

  let page;
  if (existing.length > 0) {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages/${existing[0].id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    page = await res.json();
    console.log(`[sales-page] Updated existing page (ID ${page.id})`);
  } else {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    page = await res.json();
    console.log(`[sales-page] Created new page (ID ${page.id})`);
  }

  console.log(`[sales-page] Live at: ${WP_URL}/get-the-guide/`);
  if (isPlaceholder) {
    console.log('[sales-page] ⚠  Gumroad button is a placeholder.');
    console.log('[sales-page]    Once GUMROAD_PRODUCT_URL is set in .env, re-run this script to activate the buy button.');
  } else {
    console.log('[sales-page] ✅ Gumroad buy button is live.');
  }
}

run().catch(err => { console.error(err.message); process.exit(1); });
