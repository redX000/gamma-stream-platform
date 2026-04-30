// Installs and activates essential WordPress plugins (Rank Math SEO, Wordfence, LiteSpeed Cache) via the WP REST API.

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.WORDPRESS_URL?.replace(/\/$/, '') || 'https://gammacash.online';

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
  if (!res.ok || !data.token) throw new Error(`JWT auth failed ${res.status}: ${data.message}`);
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
    throw new Error(`WP API ${res.status} on ${method} ${endpoint}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

const PLUGINS = [
  {
    slug: 'rank-math-seo',
    label: 'Rank Math SEO',
    note: 'Run the Setup Wizard at: https://gammacash.online/wp-admin/admin.php?page=rank-math-wizard',
  },
  {
    slug: 'wordfence',
    label: 'Wordfence Security',
    note: 'Complete security setup at: https://gammacash.online/wp-admin/admin.php?page=Wordfence',
  },
  {
    slug: 'litespeed-cache',
    label: 'LiteSpeed Cache',
    note: 'Enable LSWS on Hostinger for full caching benefit',
  },
];

async function isPluginActive(slug) {
  try {
    // WP plugins endpoint uses plugin param in format "plugin-slug/plugin-slug"
    const results = await wp(`/wp/v2/plugins?search=${encodeURIComponent(slug)}`, 'GET', null, { ignoreError: true });
    if (!Array.isArray(results)) return false;
    return results.some(p => p.status === 'active' && (p.plugin?.startsWith(slug) || p.textdomain === slug));
  } catch {
    return false;
  }
}

async function installPlugin(slug) {
  return wp('/wp/v2/plugins', 'POST', { slug, status: 'active' });
}

async function main() {
  console.log('[install-plugins] Starting plugin installation...\n');

  const installed = [];
  const skipped = [];
  const failed = [];

  for (const plugin of PLUGINS) {
    console.log(`[install-plugins] Checking: ${plugin.label} (${plugin.slug})...`);

    const active = await isPluginActive(plugin.slug);
    if (active) {
      console.log(`[install-plugins] SKIPPED: ${plugin.label} is already active.`);
      skipped.push(plugin);
      continue;
    }

    console.log(`[install-plugins] Installing: ${plugin.label}...`);
    try {
      const result = await installPlugin(plugin.slug);
      if (result && (result.status === 'active' || result.plugin)) {
        console.log(`[install-plugins] INSTALLED: ${plugin.label} — now active.`);
        installed.push(plugin);
      } else {
        console.log(`[install-plugins] WARNING: ${plugin.label} installed but status unclear. Check WP Admin.`);
        installed.push(plugin);
      }
    } catch (err) {
      console.log(`[install-plugins] FAILED: ${plugin.label} — ${err.message}`);
      console.log(`[install-plugins] NOTE: Some plugins require extra setup after installation.`);
      failed.push({ ...plugin, error: err.message });
    }
  }

  // Summary
  console.log('\n[install-plugins] ─────────────── SUMMARY ───────────────');

  if (installed.length > 0) {
    console.log('\n  INSTALLED:');
    for (const p of installed) {
      console.log(`    ✓ ${p.label}`);
    }
  }

  if (skipped.length > 0) {
    console.log('\n  ALREADY ACTIVE (skipped):');
    for (const p of skipped) {
      console.log(`    - ${p.label}`);
    }
  }

  if (failed.length > 0) {
    console.log('\n  FAILED:');
    for (const p of failed) {
      console.log(`    ✗ ${p.label}: ${p.error}`);
    }
  }

  console.log('\n  NEXT STEPS:');
  for (const p of [...installed, ...skipped]) {
    console.log(`    [${p.label}] ${p.note}`);
  }

  console.log('[install-plugins] ────────────────────────────────────────\n');
}

main().catch(err => {
  console.error(`[install-plugins] Fatal error: ${err.message}`);
  process.exit(1);
});
