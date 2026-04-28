/**
 * @fileoverview Comprehensive WordPress site upgrade for GammaCash.online.
 * Transforms the site into a dark-themed, professional affiliate blog.
 *
 * What this script does (all via WordPress REST API + JWT auth):
 *   1. Saves full dark-theme CSS to scripts/theme.css for global injection
 *   2. Tries to inject CSS globally (block theme global-styles or custom_css)
 *   3. Creates/updates the full homepage (hero, posts grid, categories, footer, etc.)
 *   4. Updates site settings (tagline, front page, blog page)
 *   5. Creates/updates primary navigation menu
 *   6. Creates supporting pages (Blog, Top Picks, Affiliate Disclosure)
 *
 * Usage:
 *   node scripts/site-upgrade.js
 *
 * Requires env: WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_PASSWORD
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.WORDPRESS_URL?.replace(/\/$/, '') || 'https://gammacash.online';

const SOCIAL = {
  youtube:   'https://youtube.com/@gammacash',
  tiktok:    'https://tiktok.com/@gammacash',
  instagram: 'https://instagram.com/gammacash',
  pinterest: 'https://pinterest.com/gammacash',
  twitter:   'https://x.com/gammacash',
};

// ─────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────

let _token = null;

async function getToken() {
  if (_token) return _token;
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${BASE_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.WORDPRESS_USERNAME,
      password: process.env.WORDPRESS_PASSWORD,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`JWT auth failed ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`);
  _token = data.token;
  return _token;
}

async function wp(endpoint, method = 'GET', body = null, { ignoreError = false } = {}) {
  const { default: fetch } = await import('node-fetch');
  const token = await getToken();
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}/wp-json${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.text();
    if (ignoreError) return null;
    throw new Error(`WP API ${res.status} on ${method} ${endpoint}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// Dark Theme CSS
// ─────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
/* ============================================================
   GammaCash Dark Theme — paste into WP Customizer > Additional CSS
   or Appearance > Customize > Additional CSS
   ============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

:root {
  --gc-bg:        #0a0a0a;
  --gc-bg2:       #111111;
  --gc-card:      #141414;
  --gc-accent:    #00ff88;
  --gc-hover:     #00cc6a;
  --gc-white:     #ffffff;
  --gc-muted:     #a0a0a0;
  --gc-border:    rgba(255,255,255,0.08);
  --gc-font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --gc-font-head: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --gc-radius:    12px;
  --gc-glow:      0 0 20px rgba(0,255,136,0.25);
  --gc-glow-lg:   0 0 40px rgba(0,255,136,0.5);
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  background-color: var(--gc-bg) !important;
  color: var(--gc-muted) !important;
  font-family: var(--gc-font-body) !important;
  line-height: 1.75 !important;
}

h1, h2, h3, h4, h5, h6,
.entry-title, .page-title, .site-title {
  color: var(--gc-white) !important;
  font-family: var(--gc-font-head) !important;
  font-weight: 700;
  line-height: 1.2;
}

a { color: var(--gc-accent) !important; text-decoration: none; transition: color .2s; }
a:hover { color: var(--gc-hover) !important; }
p { color: var(--gc-muted) !important; }

/* Header */
.site-header, header, #masthead, .wp-block-template-part[data-area="header"] {
  background: rgba(10,10,10,0.97) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gc-border);
  position: sticky !important;
  top: 0 !important;
  z-index: 1000 !important;
}

/* Logo */
.site-title a, .site-title, .custom-logo-link img,
.wp-block-site-title a {
  font-family: var(--gc-font-head) !important;
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  color: var(--gc-white) !important;
}

/* Navigation */
.main-navigation a, .nav-links a, nav ul li a,
.wp-block-navigation a {
  color: var(--gc-white) !important;
  font-family: var(--gc-font-body) !important;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  transition: all .2s;
}
.main-navigation a:hover, .nav-links a:hover, nav ul li a:hover,
.wp-block-navigation a:hover {
  color: var(--gc-accent) !important;
  background: rgba(0,255,136,0.07);
}

/* Main content */
.site-main, main, #main, #content,
.wp-site-blocks, .wp-block-group {
  background-color: var(--gc-bg) !important;
}

/* Post / article cards */
.post, article.hentry, .entry, .blog article, .archive article {
  background: var(--gc-card) !important;
  border: 1px solid var(--gc-border) !important;
  border-radius: var(--gc-radius) !important;
  padding: 24px !important;
  margin-bottom: 24px !important;
  transition: border-color .3s, transform .2s, box-shadow .3s;
}
.post:hover, article.hentry:hover, .entry:hover {
  border-color: var(--gc-accent) !important;
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0,255,136,0.08) !important;
}

/* Sidebar widgets */
.widget, aside, .sidebar, .widget-area {
  background: var(--gc-card) !important;
  border: 1px solid var(--gc-border) !important;
  border-radius: var(--gc-radius) !important;
  padding: 20px !important;
  margin-bottom: 20px !important;
  color: var(--gc-muted) !important;
}
.widget-title { color: var(--gc-white) !important; font-weight: 700; }

/* Footer */
.site-footer, footer, #colophon, .wp-block-template-part[data-area="footer"] {
  background: #050505 !important;
  border-top: 1px solid var(--gc-border) !important;
  color: var(--gc-muted) !important;
}

/* Buttons */
.wp-block-button__link, .wp-block-button a,
button:not(.gc-share-btn), input[type="submit"], .btn, .button {
  background: var(--gc-accent) !important;
  color: #000 !important;
  border: none !important;
  border-radius: 50px !important;
  padding: 12px 28px !important;
  font-weight: 700 !important;
  font-family: var(--gc-font-body) !important;
  box-shadow: var(--gc-glow);
  cursor: pointer;
  transition: all .3s;
}
.wp-block-button__link:hover, .wp-block-button a:hover,
button:not(.gc-share-btn):hover, input[type="submit"]:hover, .btn:hover {
  background: var(--gc-hover) !important;
  box-shadow: var(--gc-glow-lg) !important;
  transform: translateY(-2px);
  color: #000 !important;
}

/* Affiliate button */
.affiliate-btn {
  display: inline-block;
  background: var(--gc-accent);
  color: #000 !important;
  border-radius: 50px;
  padding: 12px 24px;
  font-weight: 700;
  box-shadow: var(--gc-glow);
  transition: all .3s;
  text-decoration: none !important;
}
.affiliate-btn:hover {
  background: var(--gc-hover);
  color: #000 !important;
  box-shadow: var(--gc-glow-lg);
  transform: translateY(-2px);
}

/* Blockquote */
blockquote, .wp-block-quote {
  border-left: 4px solid var(--gc-accent) !important;
  background: var(--gc-card) !important;
  color: var(--gc-muted) !important;
  padding: 16px 20px !important;
  margin: 24px 0 !important;
  border-radius: 0 8px 8px 0 !important;
}

/* Tables */
table { width: 100%; border-collapse: collapse; margin: 24px 0; }
table th { background: var(--gc-accent) !important; color: #000 !important; font-weight: 700; padding: 12px 16px; text-align: left; }
table td { padding: 12px 16px; border-bottom: 1px solid var(--gc-border); color: var(--gc-muted); }
table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
table tr:hover td { background: rgba(0,255,136,0.04); }

/* Form inputs */
input, textarea, select {
  background: var(--gc-card) !important;
  border: 1px solid var(--gc-border) !important;
  color: var(--gc-white) !important;
  border-radius: 8px;
  padding: 10px 14px;
  font-family: var(--gc-font-body);
}
input:focus, textarea:focus, select:focus {
  border-color: var(--gc-accent) !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(0,255,136,0.15) !important;
}

/* Reading progress */
#gc-progress {
  position: fixed; top: 0; left: 0; width: 0%; height: 3px;
  background: linear-gradient(90deg, var(--gc-accent), var(--gc-hover));
  z-index: 9999; transition: width .1s linear;
}

/* TOC */
.gc-toc {
  background: var(--gc-card); border: 1px solid var(--gc-border);
  border-left: 3px solid var(--gc-accent); border-radius: 8px;
  padding: 20px; margin: 28px 0;
}
.gc-toc-title { color: var(--gc-accent) !important; font-size:.8rem; text-transform:uppercase; letter-spacing:.1em; margin:0 0 12px; }
.gc-toc ol { margin:0; padding-left:20px; }
.gc-toc li { margin: 5px 0; }
.gc-toc a { color: var(--gc-muted) !important; font-size:.9rem; }
.gc-toc a:hover { color: var(--gc-accent) !important; }

/* Social proof popup */
#gc-social-proof {
  position: fixed; bottom: 24px; left: 24px;
  background: var(--gc-card); border: 1px solid var(--gc-border);
  border-left: 3px solid var(--gc-accent); border-radius: 10px;
  padding: 14px 18px; max-width: 300px; z-index: 9998;
  box-shadow: 0 8px 32px rgba(0,0,0,.6); display: none;
  animation: gc-slidein .4s ease;
}
@keyframes gc-slidein { from { transform: translateX(-110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
#gc-social-proof p { color: var(--gc-muted); font-size: .83rem; margin: 0; }
#gc-social-proof strong { color: var(--gc-white); }

/* Author box */
.gc-author {
  display: flex; gap: 16px; align-items: flex-start;
  background: var(--gc-card); border: 1px solid var(--gc-border);
  border-radius: var(--gc-radius); padding: 24px; margin: 40px 0;
}
.gc-author-avatar {
  width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--gc-accent), #005c35);
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
}
.gc-author-name { color: var(--gc-white) !important; font-weight: 700; margin: 0 0 6px; }
.gc-author-bio { color: var(--gc-muted); font-size: .875rem; margin: 0; }

/* Share buttons */
.gc-share { display: flex; gap: 10px; flex-wrap: wrap; margin: 32px 0; align-items: center; }
.gc-share-label { color: var(--gc-muted); font-size: .85rem; }
.gc-share-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px; font-size: .82rem; font-weight: 600;
  text-decoration: none !important; border: 1px solid var(--gc-border);
  color: var(--gc-muted) !important; background: var(--gc-card);
  transition: all .2s; cursor: pointer;
}
.gc-share-btn:hover { border-color: var(--gc-accent); color: var(--gc-accent) !important; }

/* Section wrapper */
.gc-section { padding: 64px 24px; max-width: 1200px; margin: 0 auto; }
.gc-section-title { font-size: clamp(1.5rem,3vw,2rem) !important; font-weight: 800 !important; color: var(--gc-white) !important; text-align: center; margin-bottom: 8px !important; }
.gc-section-sub { text-align: center; color: var(--gc-muted); margin-bottom: 40px !important; }

/* Posts grid */
.gc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px,1fr)); gap: 24px; }
.gc-card {
  background: var(--gc-card); border: 1px solid var(--gc-border);
  border-radius: var(--gc-radius); padding: 24px;
  transition: all .3s; display: flex; flex-direction: column;
}
.gc-card:hover { border-color: var(--gc-accent); transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,255,136,.09); }
.gc-card-tag { font-size: .75rem; color: var(--gc-accent); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
.gc-card h3 { font-size: 1.05rem !important; margin: 0 0 10px !important; }
.gc-card h3 a { color: var(--gc-white) !important; }
.gc-card h3 a:hover { color: var(--gc-accent) !important; }
.gc-card-excerpt { color: var(--gc-muted); font-size: .875rem; line-height: 1.65; flex: 1; }
.gc-card-footer { margin-top: 16px; }
.gc-read-more { color: var(--gc-accent) !important; font-weight: 600; font-size: .85rem; }

/* Categories */
.gc-cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 16px; max-width: 900px; margin: 0 auto; }
.gc-cat {
  background: var(--gc-card); border: 1px solid var(--gc-border);
  border-radius: var(--gc-radius); padding: 24px 16px; text-align: center;
  text-decoration: none !important; transition: all .3s;
}
.gc-cat:hover { border-color: var(--gc-accent); background: rgba(0,255,136,.04); }
.gc-cat-icon { font-size: 2rem; display: block; margin-bottom: 10px; }
.gc-cat-name { color: var(--gc-white) !important; font-weight: 600; font-size: .875rem; }

/* Trust grid */
.gc-trust { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 24px; max-width: 840px; margin: 0 auto; }
.gc-trust-card { background: var(--gc-card); border: 1px solid var(--gc-border); border-radius: var(--gc-radius); padding: 28px 24px; text-align: center; }
.gc-trust-icon { font-size: 2.5rem; margin-bottom: 16px; display: block; }
.gc-trust-card h3 { font-size: 1rem !important; color: var(--gc-white) !important; margin-bottom: 8px !important; }
.gc-trust-card p { font-size: .875rem; margin: 0; }

/* Newsletter */
.gc-newsletter {
  background: linear-gradient(135deg, var(--gc-card), rgba(0,255,136,.04));
  border: 1px solid rgba(0,255,136,.15); border-radius: 16px;
  padding: 52px 32px; text-align: center; max-width: 620px; margin: 0 auto;
}
.gc-newsletter h2 { font-size: 1.75rem !important; color: var(--gc-white) !important; margin-bottom: 12px !important; }
.gc-newsletter-form { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }
.gc-newsletter-form input[type="email"] {
  flex: 1; min-width: 240px; background: var(--gc-bg) !important;
  border: 1px solid var(--gc-border) !important; color: var(--gc-white) !important;
  padding: 12px 20px; border-radius: 50px; font-family: var(--gc-font-body); font-size: .95rem;
}
.gc-nl-btn {
  background: var(--gc-accent); color: #000 !important; border: none;
  border-radius: 50px; padding: 12px 28px; font-weight: 700; cursor: pointer;
  font-family: var(--gc-font-body); box-shadow: var(--gc-glow); transition: all .3s;
}
.gc-nl-btn:hover { background: var(--gc-hover); box-shadow: var(--gc-glow-lg); }

/* Social links */
.gc-socials { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.gc-social-link {
  display: flex; align-items: center; gap: 8px;
  background: var(--gc-card); border: 1px solid var(--gc-border);
  color: var(--gc-muted) !important; padding: 10px 20px;
  border-radius: 10px; font-size: .875rem; font-weight: 500;
  text-decoration: none !important; transition: all .3s;
}
.gc-social-link:hover { border-color: var(--gc-accent); color: var(--gc-accent) !important; background: rgba(0,255,136,.05); }

/* Top announcement bar */
.gc-topbar {
  background: linear-gradient(90deg, rgba(0,255,136,.08), rgba(0,255,136,.04), rgba(0,255,136,.08));
  border-bottom: 1px solid rgba(0,255,136,.18);
  padding: 8px 20px; text-align: center; font-size: .83rem; color: var(--gc-muted);
}
.gc-topbar a { color: var(--gc-accent) !important; font-weight: 600; }

/* Hero */
.gc-hero {
  background: linear-gradient(145deg, #0a0a0a 0%, #0b1a10 60%, #0a0a0a 100%);
  padding: 100px 24px 80px; text-align: center; position: relative; overflow: hidden;
}
.gc-hero::before {
  content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%);
  width: 700px; height: 700px;
  background: radial-gradient(ellipse, rgba(0,255,136,.07) 0%, transparent 65%);
  pointer-events: none;
}
.gc-hero h1 {
  font-size: clamp(2rem,5vw,3.5rem) !important; font-weight: 800 !important;
  color: var(--gc-white) !important; margin-bottom: 20px; line-height: 1.1;
}
.gc-hero h1 span { color: var(--gc-accent); }
.gc-hero-sub { font-size: 1.1rem; color: var(--gc-muted) !important; max-width: 580px; margin: 0 auto 32px; }
.gc-hero-btn {
  display: inline-block; background: var(--gc-accent); color: #000 !important;
  padding: 15px 36px; border-radius: 50px; font-weight: 700; font-size: 1rem;
  text-decoration: none !important; box-shadow: 0 0 32px rgba(0,255,136,.35); transition: all .3s;
}
.gc-hero-btn:hover { background: var(--gc-hover); box-shadow: var(--gc-glow-lg); transform: translateY(-2px); color: #000 !important; }

/* Stats bar */
.gc-stats { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; padding: 24px 20px; background: var(--gc-bg2); border-bottom: 1px solid var(--gc-border); }
.gc-stat { text-align: center; }
.gc-stat-num { display: block; font-size: 1.5rem; font-family: var(--gc-font-head); font-weight: 700; color: var(--gc-accent); }
.gc-stat-label { font-size: .8rem; color: var(--gc-muted); }

/* YouTube widget */
.gc-yt-widget { background: var(--gc-card); border: 1px solid var(--gc-border); border-radius: var(--gc-radius); padding: 20px; text-align: center; }
.gc-yt-widget h4 { color: var(--gc-white) !important; font-size: .95rem; margin-bottom: 12px; }
.gc-yt-placeholder { background: rgba(255,255,255,.03); border: 1px dashed var(--gc-border); border-radius: 8px; padding: 20px; color: var(--gc-muted); font-size: .82rem; margin-bottom: 16px; }
.gc-yt-btn { display: inline-block; background: #ff0000; color: #fff !important; padding: 9px 20px; border-radius: 8px; font-weight: 700; font-size: .875rem; text-decoration: none !important; }

/* Footer */
.gc-footer { background: #050505; border-top: 1px solid var(--gc-border); padding: 60px 40px 28px; }
.gc-footer-inner { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 40px; max-width: 1100px; margin: 0 auto 40px; }
.gc-footer-logo { font-family: var(--gc-font-head); font-size: 1.4rem; font-weight: 800; color: var(--gc-white); margin-bottom: 10px; }
.gc-footer-logo span { color: var(--gc-accent); }
.gc-footer-desc { color: var(--gc-muted); font-size: .83rem; line-height: 1.7; }
.gc-footer h4 { color: var(--gc-white) !important; font-weight: 700; font-size: .78rem; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 14px; }
.gc-footer ul { list-style: none; padding: 0; margin: 0; }
.gc-footer li { margin-bottom: 8px; }
.gc-footer li a { color: var(--gc-muted) !important; font-size: .83rem; text-decoration: none !important; transition: color .2s; }
.gc-footer li a:hover { color: var(--gc-accent) !important; }
.gc-footer-social { display: flex; flex-direction: column; gap: 8px; }
.gc-footer-social a { color: var(--gc-muted) !important; font-size: .83rem; text-decoration: none !important; padding: 6px 12px; border: 1px solid var(--gc-border); border-radius: 6px; transition: all .2s; display: inline-block; }
.gc-footer-social a:hover { color: var(--gc-accent) !important; border-color: var(--gc-accent); box-shadow: 0 0 12px rgba(0,255,136,.2); }
.gc-footer-bottom { border-top: 1px solid var(--gc-border); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; max-width: 1100px; margin: 0 auto; }
.gc-footer-bottom p { color: var(--gc-muted); font-size: .78rem; margin: 0; }
.gc-footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
.gc-footer-links a { color: var(--gc-muted) !important; font-size: .78rem; text-decoration: none !important; }
.gc-footer-links a:hover { color: var(--gc-accent) !important; }

/* Scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--gc-bg2); }
::-webkit-scrollbar-thumb { background: rgba(0,255,136,.25); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--gc-accent); }

/* Mobile */
@media (max-width: 768px) {
  .gc-hero { padding: 64px 20px 48px; }
  .gc-stats { gap: 24px; }
  .gc-grid { grid-template-columns: 1fr; }
  .gc-cats { grid-template-columns: repeat(2,1fr); }
  .gc-trust { grid-template-columns: 1fr; }
  .gc-footer-inner { grid-template-columns: 1fr; }
  .gc-footer { padding: 40px 20px 24px; }
  .gc-footer-bottom { flex-direction: column; text-align: center; }
  .gc-footer-links { justify-content: center; }
  #gc-social-proof { left: 12px; right: 12px; max-width: none; bottom: 16px; }
  .gc-newsletter { padding: 36px 20px; }
}
`;

// ─────────────────────────────────────────────────────────────────
// Global JS
// ─────────────────────────────────────────────────────────────────

const GLOBAL_JS = `
(function() {
  // Reading progress bar
  var bar = document.createElement('div');
  bar.id = 'gc-progress';
  document.body.prepend(bar);
  window.addEventListener('scroll', function() {
    var d = document.documentElement;
    var h = d.scrollHeight - d.clientHeight;
    bar.style.width = h > 0 ? (((d.scrollTop || document.body.scrollTop) / h) * 100) + '%' : '0%';
  }, { passive: true });

  // Social proof popups
  var msgs = [
    'Someone from <strong>London</strong> just signed up for Jasper AI ✅',
    'New review published: <strong>Best AI Video Tools 2026</strong> 🔥',
    'Someone from <strong>New York</strong> started using Copy.ai ✅',
    'Someone from <strong>Sydney</strong> tried Surfer SEO ✅',
    '<strong>500+ readers</strong> this week on GammaCash! 🎉',
    'Someone from <strong>Toronto</strong> signed up for ConvertKit ✅',
    'New comparison: <strong>Jasper AI vs Copy.ai 2026</strong> 🆚',
  ];
  var popup = document.createElement('div');
  popup.id = 'gc-social-proof';
  popup.innerHTML = '<p class="gc-sp-text"></p>';
  document.body.appendChild(popup);
  var txt = popup.querySelector('.gc-sp-text');
  function showProof() {
    txt.innerHTML = msgs[Math.floor(Math.random() * msgs.length)];
    popup.style.display = 'block';
    popup.style.animation = 'none';
    popup.offsetHeight;
    popup.style.animation = '';
    setTimeout(function() { popup.style.display = 'none'; }, 5500);
  }
  setTimeout(showProof, 6000);
  setInterval(showProof, 30000);

  // Auto TOC on single posts
  var content = document.querySelector('.entry-content, .wp-block-post-content');
  var isSingle = document.body.classList.contains('single') || document.body.classList.contains('single-post');
  if (isSingle && content) {
    var hs = content.querySelectorAll('h2, h3');
    if (hs.length >= 3) {
      var toc = document.createElement('div');
      toc.className = 'gc-toc';
      var ol = document.createElement('ol');
      hs.forEach(function(h, i) {
        h.id = 'gc-h' + i;
        var li = document.createElement('li');
        li.innerHTML = '<a href="#gc-h' + i + '">' + h.textContent + '</a>';
        ol.appendChild(li);
      });
      toc.innerHTML = '<p class="gc-toc-title">📋 Table of Contents</p>';
      toc.appendChild(ol);
      content.insertBefore(toc, content.firstChild);
    }

    // Author box
    var author = document.createElement('div');
    author.className = 'gc-author';
    author.innerHTML = '<div class="gc-author-avatar">🤖</div><div><p class="gc-author-name">GammaCash AI Research Team</p><p class="gc-author-bio">We test and review AI tools so you don\'t have to. Every recommendation is based on real testing, honest analysis, and a genuine focus on what actually makes money online.</p></div>';
    content.appendChild(author);

    // Share buttons
    var shareBox = document.createElement('div');
    shareBox.className = 'gc-share';
    var u = encodeURIComponent(location.href);
    var t = encodeURIComponent(document.title);
    shareBox.innerHTML = '<span class="gc-share-label">Share:</span>' +
      '<a class="gc-share-btn" href="https://twitter.com/intent/tweet?url=' + u + '&text=' + t + '" target="_blank" rel="noopener">🐦 Twitter/X</a>' +
      '<a class="gc-share-btn" href="https://pinterest.com/pin/create/button/?url=' + u + '&description=' + t + '" target="_blank" rel="noopener">📌 Pinterest</a>' +
      '<button class="gc-share-btn" onclick="navigator.clipboard.writeText(location.href).then(function(){this.textContent=\'✅ Copied!\'}.bind(this))">🔗 Copy Link</button>';
    content.appendChild(shareBox);

    // Follow us
    var follow = document.createElement('div');
    follow.style.cssText = 'background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:24px;margin:24px 0;text-align:center;';
    follow.innerHTML = '<p style="color:#a0a0a0;margin:0 0 16px;font-size:.9rem">Follow us for more AI tool reviews:</p><div class="gc-socials">' +
      '<a href="https://youtube.com/@gammacash" target="_blank" rel="noopener" class="gc-social-link">▶ YouTube</a>' +
      '<a href="https://tiktok.com/@gammacash" target="_blank" rel="noopener" class="gc-social-link">🎵 TikTok</a>' +
      '<a href="https://pinterest.com/gammacash" target="_blank" rel="noopener" class="gc-social-link">📌 Pinterest</a>' +
      '<a href="https://x.com/gammacash" target="_blank" rel="noopener" class="gc-social-link">🐦 X</a>' +
      '<a href="https://instagram.com/gammacash" target="_blank" rel="noopener" class="gc-social-link">📸 Instagram</a>' +
      '</div>';
    content.appendChild(follow);
  }

  // Lazy loading
  document.querySelectorAll('img').forEach(function(img) { if (!img.loading) img.loading = 'lazy'; });
})();
`;

// ─────────────────────────────────────────────────────────────────
// Homepage HTML builder
// ─────────────────────────────────────────────────────────────────

function buildHomepageContent(posts) {
  const postCardsHTML = posts.length
    ? posts.map(p => {
        const title = p.title?.rendered || 'Article';
        const excerpt = (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').slice(0, 120) + '...';
        const link = p.link || '#';
        return `<div class="gc-card">
          <div class="gc-card-tag">AI Tools</div>
          <h3><a href="${link}">${title}</a></h3>
          <p class="gc-card-excerpt">${excerpt}</p>
          <div class="gc-card-footer"><a class="gc-read-more" href="${link}">Read More →</a></div>
        </div>`;
      }).join('\n')
    : `<div class="gc-card"><h3 style="color:#fff">Reviews coming soon...</h3><p class="gc-card-excerpt">Our AI research team is currently testing the top AI tools. Check back soon for honest reviews.</p></div>`;

  return `<!-- wp:html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${GLOBAL_CSS}</style>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Announcement bar -->
<div class="gc-topbar">
  🔥 New AI tool reviews every week — <a href="${SOCIAL.youtube}" target="_blank" rel="noopener">Follow us on YouTube</a> &amp; <a href="${SOCIAL.tiktok}" target="_blank" rel="noopener">TikTok</a> for video breakdowns!
</div>

<!-- Hero -->
<section class="gc-hero">
  <h1>Find the Best AI Tools That<br><span>Actually Make Money</span></h1>
  <p class="gc-hero-sub">Honest reviews, real comparisons, and proven tools to grow your income online — tested by our AI research team.</p>
  <a href="/blog" class="gc-hero-btn">Explore AI Tools →</a>
</section>

<!-- Stats bar -->
<div class="gc-stats">
  <div class="gc-stat"><span class="gc-stat-num">10+</span><span class="gc-stat-label">Reviews Published</span></div>
  <div class="gc-stat"><span class="gc-stat-num">8+</span><span class="gc-stat-label">Tools Tested</span></div>
  <div class="gc-stat"><span class="gc-stat-num">100%</span><span class="gc-stat-label">Honest Analysis</span></div>
  <div class="gc-stat"><span class="gc-stat-num">Weekly</span><span class="gc-stat-label">Updated</span></div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Latest reviews -->
<div class="gc-section">
  <h2 class="gc-section-title">Latest AI Tool Reviews</h2>
  <p class="gc-section-sub">In-depth reviews of the tools that are actually worth your money</p>
  <div class="gc-grid" id="gc-posts-grid">
    ${postCardsHTML}
  </div>
  <div style="text-align:center;margin-top:36px">
    <a href="/blog" class="gc-hero-btn">View All Reviews →</a>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Categories -->
<div style="background:var(--gc-bg2);padding:60px 24px;border-top:1px solid var(--gc-border);border-bottom:1px solid var(--gc-border)">
  <div style="max-width:1200px;margin:0 auto">
    <h2 class="gc-section-title">Browse by Category</h2>
    <p class="gc-section-sub">Find the perfect AI tool for your goals</p>
    <div class="gc-cats">
      <a href="/category/ai-writing-tools" class="gc-cat"><span class="gc-cat-icon">🤖</span><span class="gc-cat-name">AI Writing Tools</span></a>
      <a href="/category/ai-image-tools" class="gc-cat"><span class="gc-cat-icon">🎨</span><span class="gc-cat-name">AI Image Tools</span></a>
      <a href="/category/ai-seo-tools" class="gc-cat"><span class="gc-cat-icon">📈</span><span class="gc-cat-name">AI SEO Tools</span></a>
      <a href="/category/ai-video-tools" class="gc-cat"><span class="gc-cat-icon">🎥</span><span class="gc-cat-name">AI Video Tools</span></a>
      <a href="/category/make-money-online" class="gc-cat"><span class="gc-cat-icon">💰</span><span class="gc-cat-name">Make Money Online</span></a>
    </div>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Why Trust Us -->
<div class="gc-section" style="max-width:1200px">
  <h2 class="gc-section-title">Why Trust GammaCash?</h2>
  <p class="gc-section-sub">We do the hard work so you can make smarter decisions</p>
  <div class="gc-trust">
    <div class="gc-trust-card">
      <span class="gc-trust-icon">🔬</span>
      <h3>Real Testing</h3>
      <p>Every tool we review is actually tested by our team — no copy-paste manufacturer claims.</p>
    </div>
    <div class="gc-trust-card">
      <span class="gc-trust-icon">💯</span>
      <h3>100% Honest</h3>
      <p>We include pros AND cons. If a tool isn't worth it, we'll tell you — even if we're affiliates.</p>
    </div>
    <div class="gc-trust-card">
      <span class="gc-trust-icon">🔄</span>
      <h3>Always Updated</h3>
      <p>AI tools change fast. Our reviews are updated weekly to reflect the latest features and pricing.</p>
    </div>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Newsletter -->
<div style="background:var(--gc-bg2);padding:60px 24px;border-top:1px solid var(--gc-border);border-bottom:1px solid var(--gc-border)">
  <div class="gc-newsletter">
    <h2>🎁 Get Our Free AI Tools Guide</h2>
    <p>Join 500+ readers getting weekly AI tool reviews, money-making tips, and exclusive deals straight to their inbox.</p>
    <form class="gc-newsletter-form" onsubmit="event.preventDefault();this.innerHTML='<p style=\'color:#00ff88;font-weight:700\'>✅ You\'re on the list! Check your inbox.</p>'">
      <input type="email" placeholder="Enter your email address" required>
      <button type="submit" class="gc-nl-btn">Get Free Guide →</button>
    </form>
    <p style="font-size:.75rem;margin-top:12px;color:#666">No spam, ever. Unsubscribe anytime.</p>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Social media -->
<div class="gc-section" style="text-align:center;max-width:900px">
  <h2 class="gc-section-title">Follow GammaCash</h2>
  <p class="gc-section-sub">Get daily AI tool tips, video reviews, and behind-the-scenes content</p>
  <div class="gc-socials">
    <a href="${SOCIAL.youtube}" target="_blank" rel="noopener" class="gc-social-link"><span class="gc-social-icon">▶</span> YouTube</a>
    <a href="${SOCIAL.tiktok}" target="_blank" rel="noopener" class="gc-social-link"><span class="gc-social-icon">🎵</span> TikTok</a>
    <a href="${SOCIAL.instagram}" target="_blank" rel="noopener" class="gc-social-link"><span class="gc-social-icon">📸</span> Instagram</a>
    <a href="${SOCIAL.pinterest}" target="_blank" rel="noopener" class="gc-social-link"><span class="gc-social-icon">📌</span> Pinterest</a>
    <a href="${SOCIAL.twitter}" target="_blank" rel="noopener" class="gc-social-link"><span class="gc-social-icon">🐦</span> Twitter/X</a>
  </div>

  <!-- YouTube channel widget -->
  <div class="gc-yt-widget" style="max-width:400px;margin:40px auto 0">
    <h4>🎥 Latest from YouTube</h4>
    <div class="gc-yt-placeholder">📹 Videos launching soon — subscribe so you don't miss them!</div>
    <a href="${SOCIAL.youtube}" target="_blank" rel="noopener" class="gc-yt-btn">▶ Subscribe on YouTube</a>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<!-- Footer -->
<footer class="gc-footer">
  <div class="gc-footer-inner">
    <div>
      <div class="gc-footer-logo">⚡Gamma<span>Cash</span></div>
      <p class="gc-footer-desc">AI tools reviews, comparisons and make money online guides. Built with AI, powered by results.</p>
    </div>
    <div>
      <h4>Quick Links</h4>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/blog">All Reviews</a></li>
        <li><a href="/top-picks">🔥 Top Picks</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <h4>AI Tool Categories</h4>
      <ul>
        <li><a href="/category/ai-writing-tools">AI Writing Tools</a></li>
        <li><a href="/category/ai-image-tools">AI Image Tools</a></li>
        <li><a href="/category/ai-seo-tools">AI SEO Tools</a></li>
        <li><a href="/category/ai-video-tools">AI Video Tools</a></li>
        <li><a href="/category/make-money-online">Make Money Online</a></li>
      </ul>
    </div>
    <div>
      <h4>Follow Us</h4>
      <div class="gc-footer-social">
        <a href="${SOCIAL.youtube}" target="_blank" rel="noopener">▶ YouTube</a>
        <a href="${SOCIAL.tiktok}" target="_blank" rel="noopener">🎵 TikTok</a>
        <a href="${SOCIAL.instagram}" target="_blank" rel="noopener">📸 Instagram</a>
        <a href="${SOCIAL.pinterest}" target="_blank" rel="noopener">📌 Pinterest</a>
        <a href="${SOCIAL.twitter}" target="_blank" rel="noopener">🐦 Twitter/X</a>
      </div>
    </div>
  </div>
  <div class="gc-footer-bottom">
    <p>© 2026 GammaCash.online — Built with AI, Powered by Results</p>
    <div class="gc-footer-links">
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="/affiliate-disclosure">Affiliate Disclosure</a>
    </div>
  </div>
</footer>
<!-- /wp:html -->

<!-- wp:html -->
<script>${GLOBAL_JS}</script>
<!-- /wp:html -->`;
}

// ─────────────────────────────────────────────────────────────────
// Page helpers
// ─────────────────────────────────────────────────────────────────

async function upsertPage(slug, title, content, opts = {}) {
  const pages = await wp(`/wp/v2/pages?slug=${slug}&per_page=1`);
  const body = { title, content, status: 'publish', ...opts };
  if (pages && pages.length > 0) {
    const updated = await wp(`/wp/v2/pages/${pages[0].id}`, 'POST', body);
    return { action: 'updated', id: updated.id, slug, link: updated.link };
  }
  const created = await wp('/wp/v2/pages', 'POST', body);
  return { action: 'created', id: created.id, slug, link: created.link };
}

// ─────────────────────────────────────────────────────────────────
// Menu helpers
// ─────────────────────────────────────────────────────────────────

async function upsertMenu(name) {
  const menus = await wp('/wp/v2/menus', 'GET', null, { ignoreError: true });
  if (!menus) return null;
  const existing = menus.find(m => m.name === name || m.slug === name.toLowerCase().replace(/\s+/g, '-'));
  if (existing) return existing;
  return wp('/wp/v2/menus', 'POST', { name, auto_add: false });
}

async function addMenuItem(menuId, item) {
  return wp('/wp/v2/menu-items', 'POST', { menus: menuId, status: 'publish', ...item });
}

async function assignMenuToLocation(menuId, locationSlug) {
  const locs = await wp('/wp/v2/menu-locations', 'GET', null, { ignoreError: true });
  if (!locs) return false;
  const loc = Object.values(locs).find(l => l.name?.toLowerCase().includes('primary') || l.name?.toLowerCase().includes('main'));
  if (!loc) return false;
  await wp(`/wp/v2/menu-locations/${loc.name}`, 'POST', { menu: menuId }, { ignoreError: true });
  return true;
}

// ─────────────────────────────────────────────────────────────────
// Try to inject CSS globally
// ─────────────────────────────────────────────────────────────────

async function tryInjectGlobalCSS(css) {
  const results = [];

  // Attempt 1: global-styles endpoint (block themes / FSE)
  try {
    const themes = await wp('/wp/v2/themes?status=active', 'GET', null, { ignoreError: true });
    if (themes && themes.length > 0) {
      const themeSlug = themes[0].stylesheet;
      const gsTheme = await wp(`/wp/v2/global-styles/themes/${themeSlug}`, 'GET', null, { ignoreError: true });
      if (gsTheme && gsTheme.id) {
        const gs = await wp(`/wp/v2/global-styles/${gsTheme.id}`, 'GET', null, { ignoreError: true });
        if (gs) {
          const updated = await wp(`/wp/v2/global-styles/${gsTheme.id}`, 'PUT', {
            settings: gs.settings || {},
            styles: { ...(gs.styles || {}), css },
          }, { ignoreError: true });
          if (updated) {
            results.push('✅ Global CSS injected via FSE global-styles API (block theme detected)');
          }
        }
      }
    }
  } catch (_) {}

  if (results.length === 0) {
    results.push('⚠️  Global CSS could not be auto-injected (classic theme — see manual step below)');
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 GammaCash Site Upgrade — Starting...\n');
  const report = [];

  // ── 1. Save CSS file ──
  const cssPath = path.join(__dirname, 'theme.css');
  await fs.writeFile(cssPath, GLOBAL_CSS, 'utf-8');
  report.push(`✅ CSS saved → scripts/theme.css (${GLOBAL_CSS.length} chars)`);
  console.log('[1/8] CSS file saved');

  // ── 2. Try global CSS injection ──
  console.log('[2/8] Trying global CSS injection...');
  const cssResults = await tryInjectGlobalCSS(GLOBAL_CSS);
  report.push(...cssResults);

  // ── 3. Fetch latest posts for homepage ──
  console.log('[3/8] Fetching latest posts...');
  const posts = await wp('/wp/v2/posts?status=publish&per_page=6&_fields=id,title,excerpt,link').catch(() => []);
  report.push(`✅ Fetched ${posts.length} posts for homepage grid`);

  // ── 4. Create / update homepage ──
  console.log('[4/8] Building homepage...');
  const homeContent = buildHomepageContent(posts);
  const homePage = await upsertPage('homepage', '⚡GammaCash — AI Tools That Make Money', homeContent);
  report.push(`✅ Homepage ${homePage.action}: ${homePage.link}`);
  console.log(`[4/8] Homepage ${homePage.action} (ID ${homePage.id})`);

  // ── 5. Create Blog page (posts listing) ──
  console.log('[5/8] Creating supporting pages...');
  const blogPage = await upsertPage('blog', 'AI Tools Reviews', '<!-- wp:html --><style>.gc-page-header{padding:60px 24px;text-align:center;background:var(--gc-bg2,#111);border-bottom:1px solid rgba(255,255,255,.08)}.gc-page-header h1{color:#fff!important;font-family:\'Space Grotesk\',sans-serif!important;font-weight:800!important}</style><div class="gc-page-header"><h1>All AI Tool Reviews</h1><p style="color:#a0a0a0">Honest, in-depth reviews of the AI tools that actually make money</p></div><!-- /wp:html -->');
  report.push(`✅ Blog page ${blogPage.action}: ${blogPage.link}`);

  // Top Picks page
  const topPicksContent = `<!-- wp:html -->
<style>.gc-top-picks{max-width:900px;margin:0 auto;padding:60px 24px}.gc-top-picks h1{color:#fff!important;font-family:'Space Grotesk',sans-serif!important;font-weight:800!important;text-align:center;margin-bottom:8px}.gc-top-card{background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:24px;margin-bottom:20px;display:flex;align-items:center;gap:20px;transition:border-color .3s}.gc-top-card:hover{border-color:#00ff88}.gc-top-num{font-size:2rem;font-weight:800;color:#00ff88;font-family:'Space Grotesk',sans-serif;min-width:48px;text-align:center}.gc-top-card h3{color:#fff!important;margin:0 0 6px!important}.gc-top-card p{color:#a0a0a0;font-size:.875rem;margin:0 0 12px}.affiliate-btn{display:inline-block;background:#00ff88;color:#000!important;border-radius:50px;padding:10px 22px;font-weight:700;font-size:.875rem;text-decoration:none!important;box-shadow:0 0 20px rgba(0,255,136,.25);transition:all .3s}.affiliate-btn:hover{background:#00cc6a;box-shadow:0 0 35px rgba(0,255,136,.5)}</style>
<div class="gc-top-picks">
  <h1>🔥 Top AI Tool Picks</h1>
  <p style="text-align:center;color:#a0a0a0;margin-bottom:40px">The tools our team uses daily and recommends most</p>
  <div class="gc-top-card"><div class="gc-top-num">#1</div><div><h3>Jasper AI — Best for Long-Form Content</h3><p>The most powerful AI writing tool for blog posts, ads, and marketing copy. 25% recurring commission.</p><a href="/go/jasper" class="affiliate-btn">👉 Try Jasper AI Free →</a></div></div>
  <div class="gc-top-card"><div class="gc-top-num">#2</div><div><h3>Copy.ai — Best Value for Money</h3><p>Fastest AI copywriter for short-form content. Incredible 45% recurring affiliate commission.</p><a href="/go/copyai" class="affiliate-btn">👉 Try Copy.ai Free →</a></div></div>
  <div class="gc-top-card"><div class="gc-top-num">#3</div><div><h3>Systeme.io — Best All-in-One Platform</h3><p>Build funnels, email lists, and sell products. 60% recurring commission — highest in the niche.</p><a href="/go/systeme-io" class="affiliate-btn">👉 Try Systeme.io Free →</a></div></div>
  <div class="gc-top-card"><div class="gc-top-num">#4</div><div><h3>Surfer SEO — Best for SEO Optimization</h3><p>Write content that ranks. Real-time SEO scoring and keyword research in one tool.</p><a href="/go/surfer-seo" class="affiliate-btn">👉 Try Surfer SEO →</a></div></div>
  <div class="gc-top-card"><div class="gc-top-num">#5</div><div><h3>ConvertKit — Best Email Marketing</h3><p>Build your email list and automate sequences. Used by the top content creators worldwide.</p><a href="/go/convertkit" class="affiliate-btn">👉 Try ConvertKit Free →</a></div></div>
</div>
<!-- /wp:html -->`;
  const topPicksPage = await upsertPage('top-picks', '🔥 Top AI Tool Picks', topPicksContent);
  report.push(`✅ Top Picks page ${topPicksPage.action}: ${topPicksPage.link}`);

  // Affiliate Disclosure page
  const disclosurePage = await upsertPage('affiliate-disclosure', 'Affiliate Disclosure', `<!-- wp:html -->
<div style="max-width:800px;margin:60px auto;padding:0 24px">
<h1 style="color:#fff;font-family:'Space Grotesk',sans-serif;font-weight:800">Affiliate Disclosure</h1>
<p style="color:#a0a0a0"><strong style="color:#fff">Last updated: April 2026</strong></p>
<p style="color:#a0a0a0">GammaCash.online participates in various affiliate programs. This means we may earn a commission when you click on links to products or services on this site and make a purchase — at no additional cost to you.</p>
<p style="color:#a0a0a0">We only recommend products and services that we genuinely believe in and have tested ourselves. Our editorial opinions are never influenced by affiliate relationships.</p>
<p style="color:#a0a0a0">Affiliate programs we may participate in include: Jasper AI, Copy.ai, Surfer SEO, ConvertKit, Systeme.io, and others. This disclosure is in compliance with the FTC's guidelines on endorsements and testimonials.</p>
<p style="color:#a0a0a0">If you have any questions, <a href="/contact" style="color:#00ff88">contact us here</a>.</p>
</div>
<!-- /wp:html -->`);
  report.push(`✅ Affiliate Disclosure page ${disclosurePage.action}: ${disclosurePage.link}`);
  console.log('[5/8] Supporting pages done');

  // ── 6. Site settings ──
  console.log('[6/8] Updating site settings...');
  await wp('/wp/v2/settings', 'POST', {
    title: 'GammaCash — AI Tools That Make Money',
    description: 'GammaCash — AI tools reviews, comparisons and make money online guides. Honest reviews, real results.',
    show_on_front: 'page',
    page_on_front: homePage.id,
    page_for_posts: blogPage.id,
  });
  report.push('✅ Site settings updated (tagline, front page → homepage, posts page → /blog)');
  console.log('[6/8] Site settings updated');

  // ── 7. Navigation menu ──
  console.log('[7/8] Setting up navigation menu...');
  const menu = await upsertMenu('Primary Navigation').catch(() => null);
  if (menu && menu.id) {
    const menuItems = [
      { title: 'Home', url: BASE_URL + '/', menu_order: 1 },
      { title: 'AI Tools Reviews', url: BASE_URL + '/blog', menu_order: 2 },
      { title: 'Make Money Online', url: BASE_URL + '/category/make-money-online', menu_order: 3 },
      { title: 'YouTube', url: SOCIAL.youtube, menu_order: 4 },
      { title: 'TikTok', url: SOCIAL.tiktok, menu_order: 5 },
      { title: '🔥 Top Picks', url: BASE_URL + '/top-picks', menu_order: 6 },
    ];
    for (const item of menuItems) {
      await addMenuItem(menu.id, { title: item.title, url: item.url, type: 'custom', object: 'custom', menu_order: item.menu_order }).catch(() => {});
    }
    await assignMenuToLocation(menu.id, 'primary');
    report.push(`✅ Navigation menu created (${menuItems.length} items)`);
    console.log('[7/8] Menu created');
  } else {
    report.push('⚠️  Navigation menu API not available — create manually in WP Admin → Appearance → Menus');
    console.log('[7/8] Menu API not available');
  }

  // ── 8. Done ──
  console.log('[8/8] Saving CSS file for global injection...\n');

  // Print report
  console.log('═══════════════════════════════════════════════════════');
  console.log('  GammaCash Site Upgrade — Complete');
  console.log('═══════════════════════════════════════════════════════\n');
  report.forEach(r => console.log('  ' + r));

  console.log('\n───────────────────────────────────────────────────────');
  console.log('  REQUIRED MANUAL STEP (2 minutes):');
  console.log('  For the dark theme to appear on ALL pages (posts, archives, etc.):');
  console.log('  1. Go to: https://gammacash.online/wp-admin/customize.php');
  console.log('  2. Click "Additional CSS" in the left panel');
  console.log('  3. Paste the contents of: scripts/theme.css');
  console.log('  4. Click "Publish"');
  console.log('  ─── OR ───');
  console.log('  Install "Simple Custom CSS and JS" plugin, create new CSS snippet,');
  console.log('  paste contents of scripts/theme.css, save & activate.');
  console.log('───────────────────────────────────────────────────────\n');
  console.log('  Site: https://gammacash.online');
  console.log('  WP Admin: https://gammacash.online/wp-admin');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
