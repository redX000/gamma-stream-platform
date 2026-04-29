/**
 * @fileoverview Gumroad digital product generator and publisher for Gamma Stream Platform.
 * Uses Claude API to generate a "10 Best AI Tools" guide, uploads to Gumroad as a
 * free lead-magnet PDF (or paid product), and links back from WordPress posts.
 *
 * Usage:
 *   node automation/gumroad-publisher.js              # Generate + publish free guide
 *   node automation/gumroad-publisher.js --paid       # Publish at $9.99
 *   node automation/gumroad-publisher.js --dry-run    # Generate only, no upload
 *
 * Requires .env: ANTHROPIC_API_KEY, GUMROAD_ACCESS_TOKEN,
 *   WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_PASSWORD (for link injection)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'automation', 'lead-magnet');
const LOG_FILE = path.join(__dirname, '..', 'analytics', 'gumroad-products.json');

const PRODUCT_CATALOG = [
  {
    slug: 'ai-tools-guide',
    title: '10 Best AI Tools to 10x Your Productivity in 2025',
    subtitle: 'The ultimate cheat sheet for marketers, creators, and solopreneurs',
    price: 0,
    tags: ['ai tools', 'productivity', 'solopreneur', 'marketing'],
    prompt: `Write a comprehensive, high-value guide titled "10 Best AI Tools to 10x Your Productivity in 2025".

Format as professional HTML with inline styles (suitable for a PDF export or web page).
Include:
1. Introduction — why AI tools matter now (150 words)
2. Ten AI tools, each section containing:
   - Tool name + tagline
   - What it does (2–3 sentences)
   - Best use case (1–2 sentences)
   - Pricing (free tier + paid)
   - Quick tip for getting the most out of it
   Tools to cover: Jasper AI, Surfer SEO, Copy.ai, Notion AI, Zapier, ConvertKit,
   Scalenut, Canva AI, ChatGPT Plus, Claude AI
3. Comparison table (Name | Best For | Free Tier | Starting Price)
4. How to stack these tools together (workflow section, 200 words)
5. Call to action — "Get the full review on GammaCash.online"

Style: Confident, actionable, no fluff. Use H2/H3 headings.
Include affiliate-ready phrases like "start free at [tool]" naturally.
Target length: 2,500–3,000 words.
Return ONLY the HTML content (no markdown, no code fences).`,
  },
  {
    slug: 'ai-income-blueprint',
    title: 'AI Income Blueprint: 7 Ways to Make Money with AI in 2025',
    subtitle: 'From $0 to your first $1,000 using AI tools (no coding required)',
    price: 0,
    tags: ['ai income', 'make money online', 'affiliate marketing', 'passive income'],
    prompt: `Write a comprehensive guide titled "AI Income Blueprint: 7 Ways to Make Money with AI in 2025".

Format as professional HTML with inline styles.
Include:
1. Introduction — the AI income opportunity (150 words)
2. Seven income methods, each with:
   - Method name + expected monthly income range
   - How it works (3–4 sentences)
   - Step-by-step quick-start (numbered list, 5 steps)
   - Tools needed (with links to affiliates where natural)
   - Realistic timeline to first dollar
   Methods: AI Content Agency, Affiliate Marketing with AI, AI-Powered YouTube,
   AI Product Creation, Prompt Engineering, AI Social Media Management, AI Consulting
3. The 30-day action plan (week-by-week breakdown)
4. Income stack calculator section (how to combine methods)
5. Call to action — "More strategies at GammaCash.online"

Style: Motivational but realistic, data-backed, actionable. No hype.
Target length: 2,500–3,000 words.
Return ONLY the HTML content (no markdown, no code fences).`,
  },
];

/**
 * Generate guide content using Claude API with prompt caching.
 * @param {Object} product - Product config from PRODUCT_CATALOG
 * @returns {Promise<string>} HTML content
 */
async function generateGuideContent(product) {
  const client = new Anthropic();

  console.log(`[gumroad] Generating "${product.title}" via Claude...`);

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: `You are a professional content writer for GammaCash.online, an AI tools review and affiliate marketing blog.
Write high-quality, authoritative content that provides genuine value to readers.
Your content naturally incorporates affiliate product mentions without being salesy.
Always include a canonical link back to https://gammacash.online at the end.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: product.prompt }],
  });

  const content = msg.content[0]?.text || '';
  console.log(`[gumroad] Generated ${content.length} chars (${Math.round(content.length / 5)} words approx)`);
  return content;
}

/**
 * Save generated HTML guide to the lead-magnet directory.
 * @param {Object} product - Product config
 * @param {string} htmlContent - Generated HTML
 * @returns {Promise<string>} Saved file path
 */
async function saveGuideFile(product, htmlContent) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, serif;
      font-size: 16px;
      line-height: 1.7;
      color: #1a1a2e;
      background: #fff;
      max-width: 780px;
      margin: 0 auto;
      padding: 48px 32px;
    }
    h1 { font-size: 2.2em; font-weight: 800; color: #0f172a; margin-bottom: 0.3em; }
    h2 { font-size: 1.5em; font-weight: 700; color: #1e3a5f; margin: 1.8em 0 0.6em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
    h3 { font-size: 1.15em; font-weight: 600; color: #0f172a; margin: 1.2em 0 0.4em; }
    p { margin-bottom: 1em; }
    ul, ol { padding-left: 1.6em; margin-bottom: 1em; }
    li { margin-bottom: 0.4em; }
    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.9em; }
    th { background: #1e3a5f; color: #fff; padding: 10px 14px; text-align: left; }
    td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .brand { color: #3b82f6; font-weight: 700; }
    .cta {
      background: linear-gradient(135deg, #1e3a5f, #3b82f6);
      color: #fff;
      text-align: center;
      padding: 32px;
      border-radius: 12px;
      margin-top: 2.5em;
    }
    .cta a { color: #fff; font-weight: 700; text-decoration: underline; }
    .footer {
      margin-top: 3em;
      padding-top: 1.5em;
      border-top: 1px solid #e2e8f0;
      font-size: 0.8em;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
${htmlContent}
<div class="cta">
  <p style="font-size:1.1em;font-weight:700;margin-bottom:0.5em;">${product.subtitle}</p>
  <p>Get more AI tool reviews, tutorials, and income strategies at<br>
  <a href="https://gammacash.online">GammaCash.online</a></p>
</div>
<div class="footer">
  <p>© 2025 GammaCash.online — Free to share with attribution.<br>
  Affiliate Disclosure: This guide contains affiliate links. We may earn a commission at no extra cost to you.</p>
</div>
</body>
</html>`;

  const filename = `${product.slug}.html`;
  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filePath, fullHtml, 'utf-8');
  console.log(`[gumroad] Guide saved: ${filePath}`);
  return filePath;
}

/**
 * Upload a product to Gumroad via the Gumroad API v2.
 * Creates a new product if it doesn't exist in the log, otherwise updates.
 * @param {Object} product - Product config
 * @param {string} filePath - Path to the HTML guide file
 * @param {boolean} paid - If true, set price to product.paidPrice ($9.99)
 * @returns {Promise<Object>} Gumroad product response
 */
async function publishToGumroad(product, filePath, paid = false) {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) throw new Error('GUMROAD_ACCESS_TOKEN not set in .env');

  const { default: fetch } = await import('node-fetch');
  const FormData = (await import('form-data')).default;

  const price = paid ? 999 : 0; // Gumroad uses cents
  const priceLabel = paid ? '$9.99' : 'Free';

  console.log(`[gumroad] Uploading "${product.title}" at ${priceLabel}...`);

  // Read existing log to check if product already exists
  let log = { products: [] };
  try {
    log = JSON.parse(await fs.readFile(LOG_FILE, 'utf-8'));
  } catch {
    // First run
  }

  const existing = log.products.find((p) => p.slug === product.slug);

  const form = new FormData();
  form.append('name', product.title);
  form.append('description', product.subtitle);
  form.append('price', price);
  form.append('tags[]', ...product.tags);
  form.append('published', 'true');

  // Attach the HTML file as the product content file
  const fileBuffer = await fs.readFile(filePath);
  form.append('file', fileBuffer, {
    filename: `${product.slug}.html`,
    contentType: 'text/html',
  });

  let url, method;
  if (existing?.gumroadId) {
    url = `https://api.gumroad.com/v2/products/${existing.gumroadId}`;
    method = 'PUT';
  } else {
    url = 'https://api.gumroad.com/v2/products';
    method = 'POST';
  }

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gumroad API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(`Gumroad error: ${data.message}`);

  const gumroadProduct = data.product;
  console.log(`[gumroad] Published! URL: ${gumroadProduct.short_url}`);

  // Update log
  const entry = {
    slug: product.slug,
    title: product.title,
    gumroadId: gumroadProduct.id,
    gumroadUrl: gumroadProduct.short_url,
    price: priceLabel,
    publishedAt: new Date().toISOString(),
    localFile: filePath,
  };

  if (existing) {
    Object.assign(existing, entry);
  } else {
    log.products.push(entry);
  }

  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.writeFile(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');

  return gumroadProduct;
}

/**
 * Inject the Gumroad product link into recent WordPress posts as a CTA block.
 * Fetches the 5 most recent posts and appends a lead-magnet CTA if not already present.
 * @param {Object} gumroadProduct - Gumroad product response
 * @returns {Promise<number>} Number of posts updated
 */
async function injectWordPressLinks(gumroadProduct) {
  const wpUrl = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  const wpUser = process.env.WORDPRESS_USERNAME;
  const wpPass = process.env.WORDPRESS_PASSWORD;

  if (!wpUrl || !wpUser || !wpPass) {
    console.warn('[gumroad] WordPress credentials not set — skipping link injection');
    return 0;
  }

  const { default: fetch } = await import('node-fetch');
  const base64Auth = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');

  // Fetch JWT token
  let token;
  try {
    const tokenRes = await fetch(`${wpUrl}/wp-json/jwt-auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: wpUser, password: wpPass }),
    });
    const tokenData = await tokenRes.json();
    token = tokenData.token;
  } catch {
    console.warn('[gumroad] JWT auth failed — skipping WP link injection');
    return 0;
  }

  const authHeader = token ? `Bearer ${token}` : `Basic ${base64Auth}`;

  console.log('[gumroad] Injecting Gumroad link into recent WordPress posts...');

  const postsRes = await fetch(
    `${wpUrl}/wp-json/wp/v2/posts?per_page=5&status=publish&orderby=date&order=desc`,
    { headers: { Authorization: authHeader } }
  );
  if (!postsRes.ok) {
    console.warn(`[gumroad] Could not fetch WP posts: ${postsRes.status}`);
    return 0;
  }

  const posts = await postsRes.json();
  const ctaBlock = `\n\n<!-- Gamma CTA -->\n<div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:12px;padding:24px;margin:2em 0;text-align:center;">
<strong style="font-size:1.1em;">🎁 Free Resource: Get Our AI Tools Guide</strong><br>
Download the free guide → <strong>${gumroadProduct.name}</strong><br>
<a href="${gumroadProduct.short_url}" style="display:inline-block;margin-top:12px;background:#3b82f6;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;">Download Free →</a>
</div>\n<!-- /Gamma CTA -->`;

  let updated = 0;
  for (const post of posts) {
    const content = post.content?.rendered || '';
    if (content.includes('Gamma CTA')) continue; // Already injected

    const newContent = content + ctaBlock;
    const updateRes = await fetch(`${wpUrl}/wp-json/wp/v2/posts/${post.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ content: newContent }),
    });

    if (updateRes.ok) {
      updated++;
      console.log(`[gumroad] Injected CTA into post ${post.id}: "${post.title.rendered.slice(0, 40)}"`);
    }
  }

  console.log(`[gumroad] Updated ${updated} posts with Gumroad CTA`);
  return updated;
}

/**
 * Main — generate, save, optionally publish, optionally inject WP links.
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isPaid = args.includes('--paid');
  const productIndex = parseInt(args.find((a) => a.startsWith('--product='))?.split('=')[1] || '0', 10);

  const product = PRODUCT_CATALOG[productIndex] || PRODUCT_CATALOG[0];

  console.log(`\n[gumroad] === Gumroad Publisher ===`);
  console.log(`[gumroad] Product: "${product.title}"`);
  console.log(`[gumroad] Mode: ${isDryRun ? 'Dry Run (no upload)' : isPaid ? 'Paid ($9.99)' : 'Free (lead magnet)'}\n`);

  // Step 1: Generate content
  const htmlContent = await generateGuideContent(product);

  // Step 2: Save locally
  const filePath = await saveGuideFile(product, htmlContent);

  if (isDryRun) {
    console.log(`\n[gumroad] Dry run complete. File at: ${filePath}`);
    return;
  }

  // Step 3: Publish to Gumroad
  const gumroadProduct = await publishToGumroad(product, filePath, isPaid);

  // Step 4: Inject WP links
  await injectWordPressLinks(gumroadProduct);

  console.log(`\n[gumroad] === Done ===`);
  console.log(`[gumroad] Product URL: ${gumroadProduct.short_url}`);
  console.log(`[gumroad] Add GUMROAD_ACCESS_TOKEN to GitHub Secrets to automate this workflow.`);
}

main().catch((err) => {
  console.error(`[gumroad] Fatal: ${err.message}`);
  process.exit(1);
});
