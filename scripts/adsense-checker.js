/**
 * @fileoverview Google AdSense readiness checker for Gamma Stream Platform.
 * Verifies gammacash.online meets AdSense eligibility requirements and
 * auto-publishes any missing required pages (Privacy Policy, About, Contact)
 * via the WordPress REST API using JWT authentication.
 *
 * Checks:
 *   ✔ At least 10 published posts
 *   ✔ Every post is at least 500 words
 *   ✔ Privacy Policy page exists (auto-creates if missing)
 *   ✔ About page exists (auto-creates if missing)
 *   ✔ Contact page exists (auto-creates if missing)
 *
 * Requires env: WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_PASSWORD
 *
 * Usage:
 *   node scripts/adsense-checker.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// ─────────────────────────────────────────────────────────────────
// WordPress JWT auth — self-contained, same pattern as publisher.js
// ─────────────────────────────────────────────────────────────────

let _cachedToken = null;

async function getJwtToken() {
  if (_cachedToken) return _cachedToken;

  const user = process.env.WORDPRESS_USERNAME;
  const pass = process.env.WORDPRESS_PASSWORD;
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');

  if (!user || !pass) throw new Error('WORDPRESS_USERNAME and WORDPRESS_PASSWORD must be set');
  if (!base) throw new Error('WORDPRESS_URL must be set');

  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${base}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    const hint =
      res.status === 403 ? ' — JWT plugin may not be active or .htaccess missing Authorization passthrough' :
      res.status === 401 ? ' — wrong username/password' : '';
    throw new Error(`JWT auth failed ${res.status}${hint}: ${data.message || JSON.stringify(data).slice(0, 150)}`);
  }

  _cachedToken = data.token;
  return _cachedToken;
}

async function wpRequest(endpoint, method = 'GET', body = null) {
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  const token = await getJwtToken();
  const { default: fetch } = await import('node-fetch');

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${base}/wp-json${endpoint}`, options);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WordPress API ${res.status} on ${endpoint}: ${errText.slice(0, 250)}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(html) {
  return stripHtml(html).split(' ').filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────────────────────────

const MIN_POSTS = 10;
const MIN_WORDS = 500;

async function checkPosts() {
  // Fetch up to 100 published posts — enough to verify count + word floors
  const posts = await wpRequest(
    `/wp/v2/posts?status=publish&per_page=100&_fields=id,title,content,link`
  );

  const wordCounts = posts.map((p) => ({
    id: p.id,
    title: stripHtml(p.title?.rendered || '').slice(0, 80),
    words: countWords(p.content?.rendered || ''),
    url: p.link,
  }));

  const belowMin = wordCounts.filter((p) => p.words < MIN_WORDS);
  const avg = wordCounts.length
    ? Math.round(wordCounts.reduce((s, p) => s + p.words, 0) / wordCounts.length)
    : 0;

  return {
    count: posts.length,
    countOk: posts.length >= MIN_POSTS,
    wordCounts,
    avg,
    belowMin,
    wordCountOk: belowMin.length === 0,
  };
}

async function findPage(slug, titleKeywords = []) {
  // Exact slug match (most reliable)
  const bySlug = await wpRequest(
    `/wp/v2/pages?slug=${encodeURIComponent(slug)}&per_page=5`
  ).catch(() => []);
  if (bySlug.length > 0) return bySlug[0];

  // Fuzzy fallback via search keyword
  for (const kw of titleKeywords) {
    const results = await wpRequest(
      `/wp/v2/pages?search=${encodeURIComponent(kw)}&per_page=10`
    ).catch(() => []);
    const match = results.find((p) =>
      stripHtml(p.title?.rendered || '').toLowerCase().includes(kw.toLowerCase())
    );
    if (match) return match;
  }

  return null;
}

async function checkAndCreatePage(slug, title, content, titleKeywords) {
  process.stdout.write(`[checker] Checking "${title}" page... `);

  const existing = await findPage(slug, titleKeywords);
  if (existing) {
    console.log('found.');
    return { title, existed: true, url: existing.link };
  }

  console.log('not found — creating...');
  const page = await wpRequest('/wp/v2/pages', 'POST', {
    title,
    content,
    slug,
    status: 'publish',
  });

  console.log(`[checker] "${title}" published → ${page.link}`);
  return { title, existed: false, url: page.link };
}

// ─────────────────────────────────────────────────────────────────
// Page content templates
// ─────────────────────────────────────────────────────────────────

const SITE_URL     = (process.env.WORDPRESS_URL || 'https://gammacash.online').replace(/\/$/, '');
const CONTACT_EMAIL = 'contact@gammacash.online';
const TODAY = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

function privacyPolicyContent() {
  return `<p><em>Last updated: ${TODAY}</em></p>

<p>Welcome to <strong>GammaCash</strong> (${SITE_URL}). This Privacy Policy explains how we collect, use, and protect information when you visit our website. By using our site, you agree to the terms described below.</p>

<h2>1. Information We Collect</h2>
<p>We do not require you to create an account or submit personal information to read our content. The following data may be collected automatically:</p>
<ul>
  <li><strong>Usage data</strong> — pages visited, session duration, referring URLs, and browser/device type, collected via Google Analytics 4.</li>
  <li><strong>Cookies</strong> — small files stored on your device to improve site functionality, analyze traffic, and serve relevant advertisements via Google AdSense.</li>
  <li><strong>IP address</strong> — collected by our hosting provider and analytics tools; not stored or used to identify individuals.</li>
</ul>

<h2>2. Affiliate Disclosure</h2>
<p>GammaCash participates in affiliate marketing programs. Some links on this site are affiliate links — if you click a link and make a purchase, we may earn a commission at <strong>no additional cost to you</strong>. Affiliate relationships never influence our editorial opinions. If a tool is not worth it, we say so.</p>

<h2>3. Advertising — Google AdSense</h2>
<p>We use Google AdSense to display advertisements. Google and its partners use cookies to serve ads based on your interests and prior visits to this and other websites.</p>
<ul>
  <li>Opt out of personalized ads: <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</li>
  <li>Opt out via industry tools: <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>.</li>
</ul>

<h2>4. Analytics — Google Analytics 4</h2>
<p>We use Google Analytics 4 to understand how visitors interact with our content. Data is aggregated and anonymized.</p>
<ul>
  <li>Opt out: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Add-on</a>.</li>
  <li>Learn more: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
</ul>

<h2>5. Cookies</h2>
<ul>
  <li><strong>Essential cookies</strong> — required for the site to function.</li>
  <li><strong>Analytics cookies</strong> — help us understand site usage (Google Analytics).</li>
  <li><strong>Advertising cookies</strong> — used by Google AdSense to serve relevant ads.</li>
</ul>
<p>You can manage or disable cookies in your browser settings. Disabling certain cookies may affect site functionality.</p>

<h2>6. Third-Party Links</h2>
<p>Our content contains links to third-party websites. We are not responsible for their privacy practices. We encourage you to review the privacy policies of any external sites you visit.</p>

<h2>7. Children's Privacy</h2>
<p>Our site is not directed at children under 13. We do not knowingly collect personal information from minors. If you believe a child has provided us information, contact us and we will delete it promptly.</p>

<h2>8. Your Rights</h2>
<p>Depending on your location, you may have the right to access, correct, delete, or restrict processing of your personal data. To exercise any of these rights, contact us at <strong>${CONTACT_EMAIL}</strong>.</p>

<h2>9. Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. Changes will be posted on this page with a new "Last updated" date.</p>

<h2>10. Contact</h2>
<p>Questions about this policy? Contact us at:<br><strong><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></strong></p>`;
}

function aboutContent() {
  return `<p>Welcome to <strong>GammaCash</strong> — your independent guide to AI tools and SaaS software.</p>

<h2>What We Do</h2>
<p>We publish honest, in-depth reviews, head-to-head comparisons, and practical tutorials on the AI-powered tools that are reshaping how creators, marketers, and entrepreneurs work. From AI writing assistants and SEO platforms to design tools and email automation software — if it's worth your time and money, we cover it.</p>

<h2>Our Mission</h2>
<p>The AI tools market is noisy. New products launch daily, and it's hard to know what actually delivers. Our mission is to cut through the hype and give you clear, honest, data-driven guidance — so you can make smarter software decisions without wasting money on tools that don't perform.</p>

<h2>What You'll Find Here</h2>
<ul>
  <li><strong>Tool Reviews</strong> — deep dives into individual AI tools covering features, pricing, real-world performance, and who they're best suited for.</li>
  <li><strong>Comparisons</strong> — side-by-side breakdowns of competing tools so you can pick the right fit.</li>
  <li><strong>Tutorials</strong> — step-by-step guides for getting the most out of the tools you already use.</li>
  <li><strong>Top Lists</strong> — curated picks for specific use cases, budgets, and audiences.</li>
</ul>

<h2>Affiliate Disclosure</h2>
<p>Some links on this site are affiliate links. If you purchase a product through one of our links, we may earn a small commission at no extra cost to you. This is how we keep the content free. We never let affiliate relationships influence our opinions — if a tool falls short, we'll tell you.</p>

<h2>Get in Touch</h2>
<p>Have a question, want to suggest a tool for review, or interested in working together? We'd love to hear from you.</p>
<p><strong><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></strong></p>`;
}

function contactContent() {
  return `<p>Have a question, suggestion, or business inquiry? We're here to help.</p>

<h2>Email Us</h2>
<p>The best way to reach us:</p>
<p><strong><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></strong></p>

<h2>What to Include</h2>
<ul>
  <li>A clear subject line describing your inquiry</li>
  <li>Any relevant context or details</li>
  <li>A link to the page or tool you're asking about, if applicable</li>
</ul>

<h2>Response Time</h2>
<p>We aim to respond to all inquiries within <strong>2–3 business days</strong>.</p>

<h2>Business &amp; Partnership Inquiries</h2>
<p>Interested in a sponsored review, brand partnership, or advertising opportunity? Email us with the subject line <strong>"Partnership Inquiry"</strong> and include your company name, product, and a brief overview of what you have in mind.</p>

<h2>Tool Suggestions</h2>
<p>Know an AI tool or SaaS product we haven't covered? We love reader recommendations. Send us the tool name and a note on why our audience would find it useful.</p>`;
}

// ─────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────

async function runAdsenseChecker() {
  const divider = '═'.repeat(54);
  console.log(`\n${divider}`);
  console.log('  Google AdSense Readiness Checker');
  console.log(`  Site: ${SITE_URL}`);
  console.log(divider);

  if (!process.env.WORDPRESS_URL || !process.env.WORDPRESS_USERNAME || !process.env.WORDPRESS_PASSWORD) {
    console.error('\n❌ Missing env vars. Set WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_PASSWORD in .env\n');
    process.exit(1);
  }

  const lines = [];
  let allPass = true;

  // ── Posts ──────────────────────────────────────────────────────
  console.log('\n[checker] Fetching published posts...');
  const posts = await checkPosts();

  if (posts.countOk) {
    lines.push(`✅  Published posts: ${posts.count} (required: ${MIN_POSTS})`);
  } else {
    allPass = false;
    lines.push(`❌  Published posts: ${posts.count} — need ${MIN_POSTS - posts.count} more before applying`);
  }

  if (posts.wordCountOk) {
    lines.push(`✅  Word counts: all ${posts.count} post(s) ≥ ${MIN_WORDS} words (avg: ${posts.avg})`);
  } else {
    allPass = false;
    lines.push(`❌  Word counts: ${posts.belowMin.length} post(s) under ${MIN_WORDS} words (avg: ${posts.avg})`);
    for (const p of posts.belowMin.slice(0, 6)) {
      lines.push(`      • ${p.words} words — "${p.title}"`);
    }
    if (posts.belowMin.length > 6) {
      lines.push(`      • … and ${posts.belowMin.length - 6} more`);
    }
  }

  // ── Required pages ─────────────────────────────────────────────
  const pageConfigs = [
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content: privacyPolicyContent(),
      keywords: ['privacy policy', 'privacy'],
    },
    {
      slug: 'about',
      title: 'About',
      content: aboutContent(),
      keywords: ['about', 'about us', 'about gammacash'],
    },
    {
      slug: 'contact',
      title: 'Contact',
      content: contactContent(),
      keywords: ['contact', 'contact us'],
    },
  ];

  for (const cfg of pageConfigs) {
    const result = await checkAndCreatePage(cfg.slug, cfg.title, cfg.content, cfg.keywords);
    if (result.existed) {
      lines.push(`✅  ${cfg.title} page: exists — ${result.url}`);
    } else {
      lines.push(`🆕  ${cfg.title} page: created — ${result.url}`);
    }
  }

  // ── Results ────────────────────────────────────────────────────
  console.log(`\n${divider}`);
  console.log('  Results');
  console.log(divider);
  for (const line of lines) console.log(line);

  console.log(`\n${divider}`);
  if (allPass) {
    console.log('  ✅  SITE IS READY — apply for AdSense:');
    console.log('      https://www.google.com/adsense/start/');
  } else {
    console.log('  ❌  NOT READY — fix the issues above, then re-run:');
    console.log('      node scripts/adsense-checker.js');
  }
  console.log(`${divider}\n`);

  process.exit(allPass ? 0 : 1);
}

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAdsenseChecker().catch((err) => {
    console.error(`\n[checker] Fatal: ${err.message}\n`);
    process.exit(1);
  });
}
