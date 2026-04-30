// Injects GammaCash dark theme CSS into WordPress globally via the REST API, with three fallback strategies.

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  // Step 1: Read theme.css from disk
  const cssPath = path.join(__dirname, 'theme.css');
  let cssContent;
  try {
    cssContent = await fs.readFile(cssPath, 'utf8');
    console.log(`[inject-theme-css] Read theme.css (${cssContent.length} chars)`);
  } catch (err) {
    console.error(`[inject-theme-css] ERROR: Could not read scripts/theme.css — ${err.message}`);
    process.exit(1);
  }

  // Step 2: Get the active theme slug
  let themeSlug;
  try {
    const themes = await wp('/wp/v2/themes?status=active');
    themeSlug = themes?.[0]?.stylesheet || themes?.[0]?.template;
    if (!themeSlug) throw new Error('No active theme slug found in response');
    console.log(`[inject-theme-css] Active theme slug: ${themeSlug}`);
  } catch (err) {
    console.error(`[inject-theme-css] ERROR: Could not fetch active theme — ${err.message}`);
    process.exit(1);
  }

  // Attempt A: FSE block theme — global styles
  let attemptASuccess = false;
  try {
    console.log('[inject-theme-css] Attempt A: FSE global styles...');
    const gs = await wp(`/wp/v2/global-styles/themes/${themeSlug}`, 'GET', null, { ignoreError: true });
    if (gs && gs.id) {
      await wp(`/wp/v2/global-styles/${gs.id}`, 'PUT', {
        settings: gs.settings,
        styles: { ...(gs.styles || {}), css: cssContent },
      });
      console.log(`[inject-theme-css] SUCCESS (Attempt A): Injected via FSE global styles (ID: ${gs.id})`);
      attemptASuccess = true;
    } else {
      console.log('[inject-theme-css] Attempt A: Theme does not appear to be an FSE block theme — skipping.');
    }
  } catch (err) {
    console.log(`[inject-theme-css] Attempt A failed: ${err.message}`);
  }

  if (attemptASuccess) return;

  // Attempt B: Classic theme — custom_css post type
  let attemptBSuccess = false;
  try {
    console.log('[inject-theme-css] Attempt B: Classic theme custom_css...');
    const existing = await wp(`/wp/v2/custom_css/${themeSlug}`, 'PUT', { css: cssContent, stylesheet: themeSlug }, { ignoreError: true });
    if (existing && existing.id) {
      console.log(`[inject-theme-css] SUCCESS (Attempt B): Updated existing custom_css post for theme "${themeSlug}"`);
      attemptBSuccess = true;
    } else {
      // 404 or null — create a new one
      const created = await wp('/wp/v2/custom_css', 'POST', { css: cssContent, stylesheet: themeSlug, status: 'publish' }, { ignoreError: true });
      if (created && created.id) {
        console.log(`[inject-theme-css] SUCCESS (Attempt B): Created new custom_css post for theme "${themeSlug}"`);
        attemptBSuccess = true;
      } else {
        console.log('[inject-theme-css] Attempt B: custom_css endpoint not available.');
      }
    }
  } catch (err) {
    console.log(`[inject-theme-css] Attempt B failed: ${err.message}`);
  }

  if (attemptBSuccess) return;

  // Attempt C: Install "Simple Custom CSS and JS" plugin as fallback
  try {
    console.log('[inject-theme-css] Attempt C: Installing "Simple Custom CSS and JS" plugin...');
    const plugin = await wp('/wp/v2/plugins', 'POST', { slug: 'custom-css-js', status: 'active' }, { ignoreError: true });
    if (plugin && (plugin.status === 'active' || plugin.plugin)) {
      console.log('[inject-theme-css] Plugin installed/active. Creating CSS snippet via ch_custom_css...');
      const snippet = await wp('/wp/v2/ch_custom_css', 'POST', {
        title: 'GammaCash Dark Theme',
        content: cssContent,
        status: 'publish',
      }, { ignoreError: true });
      if (snippet && snippet.id) {
        console.log(`[inject-theme-css] SUCCESS (Attempt C): CSS snippet created via Simple Custom CSS and JS plugin (ID: ${snippet.id})`);
        return;
      } else {
        console.log('[inject-theme-css] Attempt C: Plugin installed but could not create snippet — you may need to add the CSS manually in the plugin UI.');
        return;
      }
    } else {
      console.log('[inject-theme-css] Attempt C: Could not install plugin automatically.');
    }
  } catch (err) {
    console.log(`[inject-theme-css] Attempt C failed: ${err.message}`);
  }

  // All attempts failed — print manual instructions
  console.log('\n[inject-theme-css] ──────────────────────────────────────────────');
  console.log('[inject-theme-css] All automatic injection attempts failed.');
  console.log('[inject-theme-css] MANUAL STEPS:');
  console.log('  1. Log in to WordPress Admin');
  console.log('  2. Go to Appearance → Customize → Additional CSS');
  console.log('  3. Paste the contents of scripts/theme.css');
  console.log('  4. Click Publish');
  console.log('  OR install "Simple Custom CSS and JS" plugin and paste the CSS there.');
  console.log('[inject-theme-css] ──────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error(`[inject-theme-css] Fatal error: ${err.message}`);
  process.exit(1);
});
