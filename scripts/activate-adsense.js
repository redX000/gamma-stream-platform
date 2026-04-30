// Activates Google AdSense auto-ads on the WordPress site by injecting the publisher snippet via available REST API methods.

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

async function main() {
  // Step 1: Validate ADSENSE_PUBLISHER_ID
  const publisherId = process.env.ADSENSE_PUBLISHER_ID;
  if (!publisherId) {
    console.error('[activate-adsense] ERROR: ADSENSE_PUBLISHER_ID environment variable is not set.');
    console.error('[activate-adsense] To fix:');
    console.error('  1. Find your Publisher ID in Google AdSense → Account → Account information');
    console.error('  2. It looks like: ca-pub-XXXXXXXXXXXXXXXX');
    console.error('  3. Add to your .env file: ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXXXX');
    console.error('  4. Re-run: node scripts/activate-adsense.js');
    process.exit(1);
  }

  // Step 2: Build the AdSense auto-ads snippet
  const adsenseSnippet = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}" crossorigin="anonymous"></script>`;
  console.log(`[activate-adsense] Publisher ID: ${publisherId}`);
  console.log(`[activate-adsense] AdSense snippet built.`);

  const injectionResults = {
    headerFooterPlugin: false,
    headerFooterSettings: false,
    siteKitPlugin: false,
  };

  // Attempt A: Install "Insert Headers and Footers" plugin and inject via settings
  try {
    console.log('[activate-adsense] Attempt A: Installing "Insert Headers and Footers" plugin...');
    const plugin = await wp('/wp/v2/plugins', 'POST', { slug: 'insert-headers-and-footers', status: 'active' }, { ignoreError: true });

    if (plugin && (plugin.status === 'active' || plugin.plugin)) {
      console.log('[activate-adsense] "Insert Headers and Footers" plugin installed/active.');
      injectionResults.headerFooterPlugin = true;

      // Try updating the WP settings option exposed by the plugin
      try {
        console.log('[activate-adsense] Attempting to update hf_script_header setting via /wp/v2/settings...');
        const settingsResult = await wp('/wp/v2/settings', 'POST', { hf_script_header: adsenseSnippet }, { ignoreError: true });
        if (settingsResult && settingsResult.hf_script_header !== undefined) {
          console.log('[activate-adsense] SUCCESS: AdSense snippet injected into page <head> via Insert Headers and Footers settings API.');
          injectionResults.headerFooterSettings = true;
        } else {
          console.log('[activate-adsense] NOTE: Plugin installed, but settings API did not return hf_script_header.');
          console.log('[activate-adsense] You will need to paste the snippet manually (see final instructions below).');
        }
      } catch (settingsErr) {
        console.log(`[activate-adsense] Settings API attempt failed: ${settingsErr.message}`);
        console.log('[activate-adsense] Plugin is active — paste the snippet manually (see below).');
      }
    } else {
      console.log('[activate-adsense] Could not install Insert Headers and Footers automatically.');
    }
  } catch (err) {
    console.log(`[activate-adsense] Attempt A (plugin install) failed: ${err.message}`);
  }

  // Attempt B: Install Google Site Kit
  try {
    console.log('[activate-adsense] Attempt B: Installing Google Site Kit plugin...');
    const siteKit = await wp('/wp/v2/plugins', 'POST', { slug: 'google-site-kit', status: 'active' }, { ignoreError: true });

    if (siteKit && (siteKit.status === 'active' || siteKit.plugin)) {
      console.log('[activate-adsense] Google Site Kit installed/active.');
      console.log('[activate-adsense] Complete Site Kit setup at: https://gammacash.online/wp-admin/admin.php?page=googlesitekit-dashboard');
      console.log('[activate-adsense] Then connect AdSense via Site Kit → AdSense → Connect Service.');
      injectionResults.siteKitPlugin = true;
    } else {
      console.log('[activate-adsense] Could not install Google Site Kit automatically.');
    }
  } catch (err) {
    console.log(`[activate-adsense] Attempt B (Site Kit) failed: ${err.message}`);
  }

  // Attempt C: FSE global styles note (informational — AdSense scripts cannot be injected via CSS global styles)
  console.log('[activate-adsense] NOTE (FSE themes): The WP global-styles API only supports CSS, not <script> tags.');
  console.log('[activate-adsense] For FSE block themes, use a custom HTML block in the Site Editor header template part.');

  // Final output — always print the snippet and instructions
  console.log('\n[activate-adsense] ─────────────── ADSENSE SNIPPET ───────────────');
  console.log('\n  ' + adsenseSnippet + '\n');
  console.log('[activate-adsense] ────────────────────────────────────────────────');

  if (!injectionResults.headerFooterSettings) {
    console.log('\n[activate-adsense] MANUAL FALLBACK INSTRUCTIONS:');
    console.log('  If auto-injection did not work, go to:');
    console.log('  WordPress Admin → Settings → Insert Headers and Footers');
    console.log('  → Scripts in Header → paste the snippet above → Save.');
    console.log('\n  ALTERNATIVE:');
    console.log('  WordPress Admin → Appearance → Theme File Editor (or Customizer)');
    console.log('  → header.php → paste the snippet just before </head>');
  }

  console.log('\n[activate-adsense] ─────────────── SUMMARY ────────────────────────');
  console.log(`  Insert Headers and Footers plugin: ${injectionResults.headerFooterPlugin ? 'Installed' : 'Not installed'}`);
  console.log(`  Snippet auto-injected via settings: ${injectionResults.headerFooterSettings ? 'YES' : 'NO — manual step needed'}`);
  console.log(`  Google Site Kit plugin: ${injectionResults.siteKitPlugin ? 'Installed — connect AdSense in Site Kit dashboard' : 'Not installed'}`);
  console.log('[activate-adsense] ─────────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error(`[activate-adsense] Fatal error: ${err.message}`);
  process.exit(1);
});
