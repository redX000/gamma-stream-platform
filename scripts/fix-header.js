// Fixes WordPress site header height, site title font, and submenu dropdown visibility via FSE global-styles API.

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.WORDPRESS_URL?.replace(/\/$/, '') || 'https://gammacash.online';

const MARKER_START = '/* GC-HEADER-FIX-V1-START */';
const MARKER_END   = '/* GC-HEADER-FIX-V1-END */';

const HEADER_CSS = `
${MARKER_START}
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Audiowide&display=swap');

/* ── Header compact ─────────────────────────────────────────── */
.site-header,
.wp-block-template-part[data-type="header"],
header.site-header {
  padding: 12px 24px !important;
  min-height: auto !important;
}

.site-title,
.wp-block-site-title a,
.wp-block-site-title {
  font-size: clamp(18px, 2vw, 24px) !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Orbitron', 'Audiowide', var(--gc-font-head, system-ui), sans-serif !important;
  font-weight: 700 !important;
  background: linear-gradient(90deg, #00ff88 0%, #00d4ff 50%, #00ff88 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  letter-spacing: 1px !important;
}

.wp-block-navigation {
  font-size: 14px !important;
  gap: 16px !important;
}

.wp-block-navigation__container {
  flex-wrap: nowrap !important;
  gap: 4px !important;
}

.wp-block-navigation-item__content {
  padding: 6px 10px !important;
  font-size: 13px !important;
}

@media (max-width: 768px) {
  .site-header,
  .wp-block-template-part[data-type="header"] {
    max-height: 120px !important;
  }
  .wp-block-navigation {
    font-size: 12px !important;
    gap: 8px !important;
  }
  .wp-block-navigation-item__content {
    padding: 4px 8px !important;
  }
}

/* ── Submenu dropdown ─────────────────────────────────────────── */
.wp-block-navigation__submenu-container,
.wp-block-navigation .has-child .wp-block-navigation__submenu-container {
  background-color: #0a0a0a !important;
  border: 1px solid #00ff88 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 20px rgba(0, 255, 136, 0.2) !important;
  padding: 8px !important;
}

.wp-block-navigation__submenu-container .wp-block-navigation-item__content,
.wp-block-navigation__submenu-container a {
  color: #ffffff !important;
  padding: 8px 16px !important;
  border-radius: 4px !important;
  display: block !important;
  transition: background 0.2s ease !important;
  background: transparent !important;
}

.wp-block-navigation__submenu-container .wp-block-navigation-item__content:hover,
.wp-block-navigation__submenu-container a:hover {
  background-color: rgba(0, 255, 136, 0.15) !important;
  color: #00ff88 !important;
}
${MARKER_END}`;

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _token = null;

async function getToken() {
  if (_token) return _token;
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${BASE_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.WORDPRESS_USERNAME, password: process.env.WORDPRESS_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`JWT auth failed: ${data.message}`);
  _token = data.token;
  return _token;
}

async function wp(endpoint, method = 'GET', body = null, { ignoreError = false } = {}) {
  const { default: fetch } = await import('node-fetch');
  const token = await getToken();
  const opts = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}/wp-json${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.text();
    if (ignoreError) return null;
    throw new Error(`WP API ${res.status} ${method} ${endpoint}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Find the wp_global_styles post ID ────────────────────────────────────────
// WordPress stores user global-styles customisations as a CPT post.
// The themes endpoint doesn't expose the numeric ID, so we scan low IDs to find it.
// Uses direct sequential fetch (not the wp() wrapper) to avoid token-race issues.

async function findGlobalStylesId() {
  const { default: fetch } = await import('node-fetch');
  const token = await getToken();
  const H = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  for (let id = 1; id <= 40; id++) {
    const r = await fetch(`${BASE_URL}/wp-json/wp/v2/global-styles/${id}`, { headers: H });
    if (!r.ok) continue;
    const d = await r.json().catch(() => null);
    if (d && typeof d === 'object' && 'styles' in d) return id;
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[fix-header] Locating global-styles post...');
  const gsId = await findGlobalStylesId();

  if (!gsId) {
    console.error('[fix-header] Could not find global-styles post via scan (IDs 1–25).');
    console.error('[fix-header] MANUAL FALLBACK: paste the CSS below into WP Admin → Appearance → Customize → Additional CSS\n');
    console.log(HEADER_CSS);
    process.exit(1);
  }

  console.log(`[fix-header] Global-styles ID: ${gsId}`);
  const gs = await wp(`/wp/v2/global-styles/${gsId}`);
  let currentCss = gs.styles?.css || '';

  // Remove any previous version of this fix so the update is idempotent
  const markerRegex = new RegExp(
    `${MARKER_START.replace(/\//g, '\\/').replace(/\*/g, '\\*')}[\\s\\S]*?${MARKER_END.replace(/\//g, '\\/').replace(/\*/g, '\\*')}`,
    'g'
  );
  const stripped = currentCss.replace(markerRegex, '').trimEnd();
  const newCss = stripped + '\n\n' + HEADER_CSS.trim();

  const wasPresent = currentCss.includes(MARKER_START);
  console.log(`[fix-header] ${wasPresent ? 'Updating' : 'Injecting'} header + submenu CSS (${newCss.length} chars total)...`);

  await wp(`/wp/v2/global-styles/${gsId}`, 'PUT', {
    settings: gs.settings || {},
    styles: { ...(gs.styles || {}), css: newCss },
  });

  console.log('[fix-header] ✅ Done!');
  console.log(`[fix-header] Verify: ${BASE_URL}/`);
}

main().catch(err => {
  console.error(`[fix-header] Fatal: ${err.message}`);
  process.exit(1);
});
