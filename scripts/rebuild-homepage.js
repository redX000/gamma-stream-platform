/**
 * @fileoverview Rebuilds the homepage with current posts, fixes stats,
 * and adds animation attributes (data-tilt, data-target, hero-cta-magnetic).
 * Also adds hero-motion.js to the footer template part for site-wide animations.
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.WORDPRESS_URL?.replace(/\/$/, '');
let _token = null;

async function getToken() {
  if (_token) return _token;
  const res = await fetch(`${BASE_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.WORDPRESS_USERNAME, password: process.env.WORDPRESS_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`JWT failed: ${JSON.stringify(data).slice(0, 200)}`);
  _token = data.token;
  return _token;
}

async function wp(endpoint, method = 'GET', body = null) {
  const token = await getToken();
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}/wp-json${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WP API ${res.status} ${method} ${endpoint}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  console.log('\n🚀 Rebuilding homepage + injecting hero-motion.js...\n');

  // 1. Fetch current published posts
  const posts = await wp('/wp/v2/posts?status=publish&per_page=6&orderby=date&order=desc&_fields=id,title,excerpt,link');
  console.log(`[1] ${posts.length} posts found`);

  const postCount = posts.length;

  // 2. Build post cards
  const postCardsHTML = posts.map(p => {
    const title = p.title?.rendered || 'Article';
    const excerpt = (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').replace(/\[&hellip;\]/g, '').trim().slice(0, 130) + '…';
    return `<div class="gc-card" data-tilt>
      <div class="gc-card-tag">AI Tools</div>
      <h3><a href="${p.link}">${title}</a></h3>
      <p class="gc-card-excerpt">${excerpt}</p>
      <div class="gc-card-footer"><a class="gc-read-more" href="${p.link}">Read More →</a></div>
    </div>`;
  }).join('\n');

  // 3. Build full homepage HTML
  const homepage = `<!-- wp:html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!-- /wp:html -->

<!-- wp:html -->
<div class="gc-topbar">
  🔥 New AI tool reviews every week — <a href="https://youtube.com/@gammacash" target="_blank" rel="noopener">Subscribe on YouTube</a> &amp; never miss a review!
</div>

<section class="gc-hero">
  <h1>Find the Best AI Tools That<br><span>Actually Make Money</span></h1>
  <p class="gc-hero-sub">Honest reviews, real comparisons, and proven tools to grow your income online — tested by our AI research team.</p>
  <a href="/blog" class="gc-hero-btn hero-cta-magnetic">Explore AI Tools →</a>
</section>

<div class="gc-stats">
  <div class="gc-stat">
    <span class="gc-stat-num" data-target="${postCount}" data-suffix="+">${postCount}+</span>
    <span class="gc-stat-label">Reviews Published</span>
  </div>
  <div class="gc-stat">
    <span class="gc-stat-num" data-target="8" data-suffix="+">8+</span>
    <span class="gc-stat-label">Tools Tested</span>
  </div>
  <div class="gc-stat">
    <span class="gc-stat-num">100%</span>
    <span class="gc-stat-label">Honest Analysis</span>
  </div>
  <div class="gc-stat">
    <span class="gc-stat-num">Weekly</span>
    <span class="gc-stat-label">Updated</span>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
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
<div class="gc-section" style="max-width:1200px">
  <h2 class="gc-section-title">Why Trust GammaCash?</h2>
  <p class="gc-section-sub">We do the hard work so you can make smarter decisions</p>
  <div class="gc-trust">
    <div class="gc-trust-card" data-tilt>
      <span class="gc-trust-icon">🔬</span>
      <h3>Real Testing</h3>
      <p>Every tool we review is actually tested by our team — no copy-paste manufacturer claims.</p>
    </div>
    <div class="gc-trust-card" data-tilt>
      <span class="gc-trust-icon">💯</span>
      <h3>100% Honest</h3>
      <p>We include pros AND cons. If a tool isn't worth it, we'll tell you — even if we're affiliates.</p>
    </div>
    <div class="gc-trust-card" data-tilt>
      <span class="gc-trust-icon">🔄</span>
      <h3>Always Updated</h3>
      <p>AI tools change fast. Our reviews are updated weekly to reflect the latest features and pricing.</p>
    </div>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<div style="background:var(--gc-bg2);padding:60px 24px;border-top:1px solid var(--gc-border);border-bottom:1px solid var(--gc-border)">
  <div class="gc-newsletter">
    <h2>🎁 Get Our Free AI Tools Guide</h2>
    <p>Join readers getting weekly AI tool reviews, money-making tips, and exclusive deals straight to their inbox.</p>
    <form class="gc-newsletter-form" onsubmit="event.preventDefault();this.innerHTML='<p style=\\'color:#00ff88;font-weight:700\\'>✅ You\\'re on the list! Check your inbox.</p>'">
      <input type="email" placeholder="Enter your email address" required>
      <button type="submit" class="gc-nl-btn">Get Free Guide →</button>
    </form>
    <p style="font-size:.75rem;margin-top:12px;color:#666">No spam, ever. Unsubscribe anytime.</p>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
<div class="gc-section" style="text-align:center;max-width:900px">
  <h2 class="gc-section-title">Follow GammaCash</h2>
  <p class="gc-section-sub">Daily AI tool tips, video reviews, and behind-the-scenes content</p>
  <div class="gc-socials">
    <a href="https://youtube.com/@gammacash" target="_blank" rel="noopener" class="gc-social-link">▶ YouTube</a>
    <a href="https://tiktok.com/@gammacash" target="_blank" rel="noopener" class="gc-social-link">🎵 TikTok</a>
    <a href="https://instagram.com/gammacash" target="_blank" rel="noopener" class="gc-social-link">📸 Instagram</a>
    <a href="https://pinterest.com/gammacash" target="_blank" rel="noopener" class="gc-social-link">📌 Pinterest</a>
    <a href="https://x.com/gammacash" target="_blank" rel="noopener" class="gc-social-link">🐦 Twitter/X</a>
  </div>
</div>
<!-- /wp:html -->

<!-- wp:html -->
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
      <h4>Categories</h4>
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
        <a href="https://youtube.com/@gammacash" target="_blank" rel="noopener">▶ YouTube</a>
        <a href="https://tiktok.com/@gammacash" target="_blank" rel="noopener">🎵 TikTok</a>
        <a href="https://instagram.com/gammacash" target="_blank" rel="noopener">📸 Instagram</a>
        <a href="https://pinterest.com/gammacash" target="_blank" rel="noopener">📌 Pinterest</a>
        <a href="https://x.com/gammacash" target="_blank" rel="noopener">🐦 Twitter/X</a>
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
<!-- /wp:html -->`;

  // 4. Find the homepage via site settings (page_on_front)
  const settings = await wp('/wp/v2/settings');
  let homeId = settings.page_on_front;
  if (!homeId) {
    // Fallback: search by title
    const pages = await wp('/wp/v2/pages?per_page=100&_fields=id,title,slug');
    const hp = pages.find(p => p.title?.rendered?.includes('GammaCash') || p.slug?.includes('gammacash'));
    if (!hp) throw new Error('homepage page not found');
    homeId = hp.id;
  }
  console.log(`[2] Homepage id: ${homeId}`);
  const updated = await wp(`/wp/v2/pages/${homeId}`, 'POST', { content: homepage, status: 'publish' });
  console.log(`[2] Homepage updated → ${updated.link}`);

  // 5. Add hero-motion.js to footer template part
  const heroMotion = await fs.readFile(path.join(__dirname, 'hero-motion.js'), 'utf-8');
  const footer = await wp('/wp/v2/template-parts/twentytwentyfive//footer');

  if (footer.content?.raw?.includes('hero-cta-magnetic')) {
    console.log('[3] hero-motion.js already in footer — skipping');
  } else {
    const heroBlock = `\n\n<!-- wp:html -->\n<script>\n${heroMotion}\n</script>\n<!-- /wp:html -->`;
    await wp('/wp/v2/template-parts/twentytwentyfive//footer', 'POST', {
      content: footer.content.raw + heroBlock,
    });
    console.log('[3] hero-motion.js added to footer template');
  }

  console.log('\n✅ Done!\n');
  console.log('  Homepage:  ' + updated.link);
  console.log('  Dark theme: globally injected via FSE global-styles (ID 6)');
  console.log('  Global JS:  reading progress + TOC + share buttons in footer template');
  console.log('  Hero motion: magnetic CTA + card tilt + counters in footer template');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
