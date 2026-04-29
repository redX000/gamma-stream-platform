# Gamma Stream Platform — Master Checklist

> **Single source of truth.** Check a box the moment a task is done.
> Update STATUS.md after every session. Commit both files together.
> Last updated: 2026-04-29 (session 2)

---

## Phase A — Critical Fixes & Infrastructure

### A1. Video Pipeline
- [x] `automation/video-assembler.py` — exists and working; added graceful gradient fallback when PEXELS_API_KEY absent
- [x] Get `PEXELS_API_KEY` ✅ done 2026-04-28
- [x] Get `YOUTUBE_REFRESH_TOKEN` ✅ done 2026-04-28 — ran scripts/youtube-auth.js
- [x] Add `YOUTUBE_CLIENT_ID` to GitHub Secrets ✅ done 2026-04-27
- [x] Add `YOUTUBE_CLIENT_SECRET` to GitHub Secrets ✅ done 2026-04-27
- [x] Add `YOUTUBE_REFRESH_TOKEN` to GitHub Secrets ✅ done 2026-04-28
- [x] Add `PEXELS_API_KEY` to GitHub Secrets ✅ done 2026-04-28
- [x] Manually trigger `video-assembler.yml` workflow once to verify end-to-end ✅ done 2026-04-29

### A2. GA4 Analytics
- [x] Add `GA4_MEASUREMENT_ID = G-6DJVSLX7WX` to GitHub Secrets ✅ done 2026-04-27
- [x] Add `GA4_API_SECRET` to GitHub Secrets ✅ done 2026-04-28
- [x] Add `GA4_PROPERTY_ID` to GitHub Secrets ✅ done 2026-04-28
- [x] Add `GA4_SERVICE_ACCOUNT_JSON` to GitHub Secrets ✅ done 2026-04-28

### A3. WordPress Required Pages (AdSense prerequisite)
- [x] Run `node scripts/adsense-checker.js` to auto-create Privacy Policy, About, Contact pages ✅ done 2026-04-27
  - ~~Note: Privacy Policy created at `/privacy-policy-2/` (slug conflict)~~ — Fixed via API 2026-04-29, now at `/privacy-policy/`
  - Requires: `WORDPRESS_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_PASSWORD` in local `.env`

### A4. Email — Update NOTIFICATION_EMAIL
- [x] Update `NOTIFICATION_EMAIL` GitHub Secret → `gammacash.platform@gmail.com` ✅ done 2026-04-29
- [ ] Optionally migrate WordPress admin email to `gammacash.platform@gmail.com`
  - WordPress Admin → Users → Profile → Email → Update

---

## Phase B — Affiliate Revenue (highest ROI)

### B1. Join Affiliate Programs
- [ ] **Copy.ai** (45% recurring) — apply at https://copy.ai/affiliate
- [ ] **Systeme.io** (60% recurring) — apply at https://systeme.io/affiliate
- [ ] **ConvertKit** (30% recurring) — apply at https://convertkit.com/affiliate
- [ ] **Jasper AI** (25% recurring) — apply at https://jasper.ai/affiliate
- [ ] **Surfer SEO** (25% recurring) — apply at https://surferseo.com/affiliate
- [ ] **Zapier** (20–25% recurring) — apply at https://zapier.com/affiliate
- [ ] **Scalenut** (30% lifetime) — apply at https://scalenut.com/affiliate
- [ ] **Notion AI** (20% per sale) — apply at https://notion.so/affiliate

### B2. Affiliate Redirect Pages ✅ infrastructure done 2026-04-29
> Pages created via `scripts/create-redirects.js`. Currently showing placeholder.
> **When you get an affiliate URL**: edit `REDIRECTS` in `scripts/create-redirects.js`, then run `npm run redirects:update`.
- [x] `/go/jasper` — created (placeholder) ✅
- [x] `/go/copyai` — created (placeholder) ✅
- [x] `/go/surfer-seo` — created (placeholder) ✅
- [x] `/go/convertkit` — created (placeholder) ✅
- [x] `/go/writesonic` — created (placeholder) ✅
- [x] `/go/grammarly` — created (placeholder) ✅
- [x] `/go/canva` — created (placeholder) ✅
- [x] `/go/chatgpt-plus` — created (placeholder) ✅
- [x] `/go/midjourney` — created (placeholder) ✅
- [x] `/go/systeme-io` — created (placeholder) ✅
- [x] `/go/zapier` — created (placeholder) ✅
- [x] `/go/scalenut` — created (placeholder) ✅
- [x] `/go/notion` — created (placeholder) ✅
- [ ] **ACTION**: Update redirect URLs once affiliate programs are approved (npm run redirects:update)

### B3. AdSense Application
- [ ] Verify site has 10+ published posts (`node scripts/adsense-checker.js` shows count)
- [ ] Apply at https://www.google.com/adsense/start/
  - Site URL: https://gammacash.online
  - Content language: English
- [ ] Wait for AdSense approval (1–14 days)
- [ ] Add AdSense script to WordPress (via Appearance → Theme Editor or a plugin)

---

## Phase C — Email List & ConvertKit

### C1. ConvertKit Setup
- [ ] Get `CONVERTKIT_API_KEY` from https://app.convertkit.com/account/edit → API → Secret API Key
- [ ] Add `CONVERTKIT_API_KEY` to GitHub Secrets
- [ ] Create a Form in ConvertKit called "Gamma Stream Newsletter"
- [ ] Create a Sequence called "Gamma Stream Welcome" with emails from `automation/email-sequences/`
  - Upload `welcome.md` content (5 emails, 7 days)
  - Upload `nurture.md` content (4 weekly emails)
  - Upload `promo.md` content (3 promo templates)

### C2. WordPress Opt-in Integration
- [ ] Get ConvertKit Form embed code from ConvertKit → Forms → your form → Embed
- [ ] Add form to WordPress sidebar (Appearance → Widgets → Sidebar → Custom HTML)
- [ ] Add form after every post (ConvertKit WordPress plugin OR theme functions.php)
- [ ] Create a lead magnet landing page on WordPress linking to `automation/lead-magnet/ai-tools-guide.md`

### C3. Pinterest Social (pending approval)
- [ ] Wait for Pinterest Standard Access approval (applied 2026-04-27)
- [ ] Once approved: `node scripts/pinterest-auth.js` → follow browser OAuth flow
- [ ] Add `PINTEREST_APP_ID` to GitHub Secrets
- [ ] Add `PINTEREST_APP_SECRET` to GitHub Secrets
- [ ] Add `PINTEREST_REFRESH_TOKEN` to GitHub Secrets (from pinterest-auth.js output)
- [ ] Add `PINTEREST_BOARD_ID` to GitHub Secrets (from pinterest-auth.js output)

---

## Phase D — Content Expansion

### D1. Video Script Generator ✅ done 2026-04-28
- [x] Build `content-pipeline/video-script-generator.js` ✅
- [x] Add npm script: `"video-script": "node content-pipeline/video-script-generator.js"` ✅
- [x] Wire into `content-generation.yml` ✅

### D2. Medium Auto-Publisher ✅ done 2026-04-28
- [ ] Create Medium Integration Token at https://medium.com/me/settings → Integration tokens
- [ ] Add `MEDIUM_INTEGRATION_TOKEN` to GitHub Secrets
- [x] Build `automation/medium-publisher.js` ✅
- [x] Add step to `content-generation.yml` workflow ✅

### D3. Gumroad Digital Product Generator ✅ done 2026-04-29
- [ ] Create Gumroad account at https://gumroad.com
- [ ] Get `GUMROAD_ACCESS_TOKEN` from Gumroad → Settings → Advanced → Application
- [ ] Add `GUMROAD_ACCESS_TOKEN` to GitHub Secrets
- [x] Build `automation/gumroad-publisher.js` ✅ — generates AI Tools guide via Claude, uploads to Gumroad, injects WP CTAs
  - Run free: `node automation/gumroad-publisher.js`
  - Run paid ($9.99): `node automation/gumroad-publisher.js --paid`
  - Dry run: `node automation/gumroad-publisher.js --dry-run`

### D4. Master Orchestrator Workflow ✅ done 2026-04-28
- [x] Create `.github/workflows/master-orchestrator.yml` ✅
- [x] Tested with `workflow_dispatch` ✅

### D5. Earnings Dashboard Upgrade ✅ done 2026-04-29
- [x] Build `analytics/earnings-report.js` ✅ — dedicated revenue report
  - Combines: affiliate ledger + Gumroad live API + YouTube GA4 estimate + Medium estimate
  - Outputs HTML email + JSON snapshot
  - Run: `node analytics/earnings-report.js --email --save`

---

## Phase E — Platform Polish

### E1. WordPress Design Upgrade ✅ done 2026-04-27
- [x] Dark theme CSS generated → `scripts/theme.css` (18 KB)
- [x] Homepage created — hero, stats, posts grid, categories, trust section, newsletter, social, footer
- [x] Blog page created at `/ai-tools-reviews/` (set as posts listing page)
- [x] Top Picks page created at `/top-picks/` with affiliate buttons
- [x] Affiliate Disclosure page created at `/affiliate-disclosure/`
- [x] Navigation menu created — Home | AI Tools Reviews | Make Money Online | YouTube | TikTok | 🔥 Top Picks
- [x] Site tagline updated, front page set to homepage
- [x] Reading progress bar, social proof popups, auto-TOC, author box, share buttons (via JS)
- [ ] **MANUAL STEP REQUIRED** — Paste `scripts/theme.css` into WordPress Customizer → Additional CSS
  - Go to: https://gammacash.online/wp-admin/customize.php → Additional CSS → paste → Publish
  - This makes the dark theme apply to ALL pages (posts, archives, etc.)
  - Without this step: homepage has the theme, other pages use the default WordPress theme

### E2. SEO Improvements
- [ ] Install Rank Math or verify Yoast SEO is properly configured
- [ ] Submit sitemap to Google Search Console: https://search.google.com/search-console
  - Sitemap URL: https://gammacash.online/sitemap_xml
- [ ] Submit to Bing Webmaster Tools: https://www.bing.com/webmasters
- [ ] Set up internal linking between published posts (pillar + cluster structure)

### E3. Performance & Security
- [ ] Install WP Rocket or W3 Total Cache plugin for caching
- [ ] Enable Hostinger's LiteSpeed cache
- [ ] Add Cloudflare (free plan) for CDN + DDoS protection
- [ ] Verify SSL certificate is active (https://gammacash.online)
- [ ] Install Wordfence Security plugin

---

## Ongoing / Maintenance

- [ ] Every Monday: check analytics-report.yml email — review KPIs
- [ ] Every time a commission is earned: `node automation/affiliate-tracker.js add <program> <amount>`
- [ ] When Pinterest approves app (expect 1–7 days): complete Phase C3 above
- [ ] When AdSense approves: add ad units to WordPress
- [ ] When ConvertKit subscriber count hits 1,000: upgrade plan + build promo sequences
- [ ] Re-run `node scripts/pinterest-auth.js` before refresh token expires (365 days from issue)
- [ ] Re-run `node scripts/youtube-auth.js` if `YOUTUBE_REFRESH_TOKEN` stops working (rare)

---

## Secrets Reference Table

| Secret | Status | Source |
|--------|--------|--------|
| `ANTHROPIC_API_KEY` | ✅ Set | Anthropic Console |
| `WORDPRESS_URL` | ✅ Set | https://gammacash.online |
| `WORDPRESS_USERNAME` | ✅ Set | WP admin email |
| `WORDPRESS_PASSWORD` | ✅ Set | WP admin password |
| `NOTIFICATION_EMAIL` | ✅ Set (needs update) | → change to gammacash.platform@gmail.com |
| `SMTP_HOST` | ✅ Set | smtp.hostinger.com |
| `SMTP_PORT` | ✅ Set | 587 |
| `SMTP_USER` | ✅ Set | noreply@gammacash.online |
| `SMTP_PASS` | ✅ Set | Hostinger email password |
| `GA4_MEASUREMENT_ID` | ✅ Set | G-6DJVSLX7WX |
| `GA4_API_SECRET` | ❌ Needed | GA4 → Data Streams → MP API secrets |
| `GA4_PROPERTY_ID` | ❌ Needed | GA4 → Property Settings |
| `GA4_SERVICE_ACCOUNT_JSON` | ❌ Needed | Google Cloud → IAM → Service Account |
| `CONVERTKIT_API_KEY` | ❌ Needed | ConvertKit → Settings → API |
| `PINTEREST_APP_ID` | ❌ Pending | Pinterest app approval |
| `PINTEREST_APP_SECRET` | ❌ Pending | Pinterest app approval |
| `PINTEREST_REFRESH_TOKEN` | ❌ Pending | Run pinterest-auth.js after approval |
| `PINTEREST_BOARD_ID` | ❌ Pending | Run pinterest-auth.js after approval |
| `YOUTUBE_CLIENT_ID` | ✅ Set | Google Cloud Console |
| `YOUTUBE_CLIENT_SECRET` | ✅ Set | Google Cloud Console |
| `YOUTUBE_REFRESH_TOKEN` | ❌ Needed | Run scripts/youtube-auth.js |
| `PEXELS_API_KEY` | ❌ Needed | https://www.pexels.com/api/ |
| `REDDIT_*` (5 secrets) | ❌ Skipped | Reddit permanently blocked |
