/**
 * @fileoverview One-time script to inject the GA4 gtag.js snippet into WordPress.
 *
 * Tries injection methods in order until one succeeds:
 *   1. WPCode plugin REST API (best — if plugin is installed)
 *   2. Insert Headers and Footers / Code Snippets plugin namespaces
 *   3. WordPress Sidebars API — adds HTML widget to any header sidebar
 *
 * Usage:
 *   node scripts/install-ga4-tag.js
 *
 * Env vars (from .env or shell):
 *   WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_PASSWORD
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const WP_URL       = (process.env.WORDPRESS_URL || '').replace(/\/$/, '');
const WP_USER      = process.env.WORDPRESS_USERNAME;
const WP_PASS      = process.env.WORDPRESS_PASSWORD || process.env.WORDPRESS_APP_PASSWORD;

if (!WP_URL || !WP_USER || !WP_PASS) {
  console.error('❌  Set WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD.');
  process.exit(1);
}

const GTAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6DJVSLX7WX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-6DJVSLX7WX');
</script>`;

async function getToken() {
  const r = await axios.post(`${WP_URL}/wp-json/jwt-auth/v1/token`, {
    username: WP_USER,
    password: WP_PASS,
  });
  return r.data.token;
}

// ── Method 1: WPCode plugin ────────────────────────────────────────────────────

async function tryWPCode(auth, namespaces) {
  if (!namespaces.includes('wpcode/v1')) return false;
  console.log('  WPCode plugin detected.');
  try {
    // Check if snippet already exists
    const list = await axios.get(`${WP_URL}/wp-json/wpcode/v1/snippets`, auth);
    const existing = (list.data?.snippets || list.data || []).find(
      (s) => s.title === 'Google Analytics GA4',
    );
    if (existing) {
      console.log(`  Snippet already exists (id=${existing.id}) — updating.`);
      await axios.post(`${WP_URL}/wp-json/wpcode/v1/snippets/${existing.id}`, {
        code: GTAG, active: true,
      }, auth);
    } else {
      const res = await axios.post(`${WP_URL}/wp-json/wpcode/v1/snippets`, {
        title: 'Google Analytics GA4',
        code: GTAG,
        type: 'html',
        location: 'site_wide_header',
        active: true,
      }, auth);
      console.log(`  Created snippet id=${res.data?.id ?? '?'}.`);
    }
    return true;
  } catch (e) {
    console.log(`  WPCode attempt failed: ${e.response?.data?.message ?? e.message}`);
    return false;
  }
}

// ── Method 2: wp/v2/settings ───────────────────────────────────────────────────

async function trySettings(auth) {
  try {
    const res = await axios.get(`${WP_URL}/wp-json/wp/v2/settings`, auth);
    const keys = Object.keys(res.data);
    const headerKey = keys.find((k) => /head.*script|script.*head|header_code/i.test(k));
    if (!headerKey) {
      console.log(`  wp/v2/settings has no header-script field (fields: ${keys.slice(0, 8).join(', ')}…)`);
      return false;
    }
    await axios.post(`${WP_URL}/wp-json/wp/v2/settings`, { [headerKey]: GTAG }, auth);
    console.log(`  Updated setting: ${headerKey}`);
    return true;
  } catch (e) {
    console.log(`  Settings API: ${e.response?.data?.message ?? e.message}`);
    return false;
  }
}

// ── Method 3: Sidebars / widgets ──────────────────────────────────────────────

async function trySidebars(auth) {
  try {
    const res = await axios.get(`${WP_URL}/wp-json/wp/v2/sidebars`, auth);
    const sidebars = res.data || [];
    console.log(`  Sidebars: ${sidebars.map((s) => s.id).join(', ')}`);

    const target = sidebars.find(
      (s) => s.status === 'active' &&
             (s.id.toLowerCase().includes('header') || s.name.toLowerCase().includes('header')),
    );
    if (!target) {
      console.log('  No active header sidebar found.');
      return false;
    }

    // Add a custom HTML widget
    const widget = await axios.post(`${WP_URL}/wp-json/wp/v2/widgets`, {
      id_base: 'text',
      sidebar: target.id,
      instance: { raw: { title: 'GA4', text: GTAG, filter: false, visual: false } },
    }, auth);
    console.log(`  Widget added to sidebar "${target.id}" (widget id=${widget.data?.id ?? '?'}).`);
    return true;
  } catch (e) {
    console.log(`  Sidebars API: ${e.response?.data?.message ?? e.message}`);
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nConnecting to ${WP_URL}…`);
  const token = await getToken();
  console.log('JWT token obtained.\n');

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const root = await axios.get(`${WP_URL}/wp-json/`);
  const namespaces = root.data.namespaces || [];
  console.log(`REST namespaces: ${namespaces.join(', ')}\n`);

  console.log('Trying method 1 — WPCode plugin:');
  if (await tryWPCode(auth, namespaces)) {
    console.log('\n✅  GA4 tag installed via WPCode. Tag is live on all pages.');
    return;
  }

  console.log('\nTrying method 2 — wp/v2/settings:');
  if (await trySettings(auth)) {
    console.log('\n✅  GA4 tag installed via WordPress settings.');
    return;
  }

  console.log('\nTrying method 3 — header sidebar widget:');
  if (await trySidebars(auth)) {
    console.log('\n✅  GA4 tag installed as a header widget.');
    return;
  }

  console.log(`
⚠️  Could not auto-inject the GA4 tag via REST API.
    Your WordPress setup doesn't expose a header-script endpoint.

    Quickest fix — install one of these free plugins:
      • WPCode (formerly Insert Headers and Footers)
        → WordPress Admin → Plugins → Add New → search "WPCode"
      • Insert Headers and Footers by WPBeginner

    Then run this script again, or paste the tag manually:
      WordPress Admin → WPCode → Header & Footer → Header Scripts
  `);
  process.exit(1);
}

main().catch((err) => {
  console.error('\n❌  Fatal:', err.response?.data ?? err.message);
  process.exit(1);
});
