# Gamma Stream Platform — Master Checklist

> **Single source of truth.** Check a box the moment a task is done.
> Update STATUS.md after every session. Commit both files together.
> Last updated: 2026-04-27

---

## Phase A — Critical Fixes & Infrastructure

### A1. Video Pipeline (broken workflow — fix first)
- [x] Write `automation/video-assembler.py` — assembles MP4s from voiceovers + Pexels stock footage
- [ ] Get `PEXELS_API_KEY` — free at https://www.pexels.com/api/ → add to GitHub Secrets
- [ ] Get `YOUTUBE_REFRESH_TOKEN` — run `node scripts/youtube-auth.js` locally, follow browser flow
- [x] Add `YOUTUBE_CLIENT_ID` to GitHub Secrets (value from local `.env`)
- [x] Add `YOUTUBE_CLIENT_SECRET` to GitHub Secrets (value from local `.env`)
- [ ] Add `YOUTUBE_REFRESH_TOKEN` to GitHub Secrets (after running youtube-auth.js)
- [ ] Add `PEXELS_API_KEY` to GitHub Secrets
- [ ] Manually trigger `video-assembler.yml` workflow once to verify end-to-end

### A2. GA4 Analytics
- [x] Add `GA4_MEASUREMENT_ID = G-6DJVSLX7WX` to GitHub Secrets
- [ ] Add `GA4_API_SECRET` to GitHub Secrets
  - Get from: GA4 → Admin → Data Streams → your stream → Measurement Protocol API secrets → Create
- [ ] Add `GA4_PROPERTY_ID` to GitHub Secrets
  - Get from: GA4 → Admin → Property Settings → Property ID (numeric, e.g. 123456789)
- [ ] Add `GA4_SERVICE_ACCOUNT_JSON` to GitHub Secrets
  - Get from: Google Cloud Console → IAM → Service Accounts → create account → JSON key → paste entire JSON

### A3. WordPress Required Pages (AdSense prerequisite)
- [x] Run `node scripts/adsense-checker.js` to auto-create Privacy Policy, About, Contact pages
  - Requires: `WORDPRESS_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_PASSWORD` in local `.env`

### A4. Email — Update NOTIFICATION_EMAIL
- [ ] Update `NOTIFICATION_EMAIL` GitHub Secret from personal email → `gammacash.platform@gmail.com`
  - Command: `gh secret set NOTIFICATION_EMAIL --body "gammacash.platform@gmail.com"`
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

### B2. Pretty Links Redirects (WordPress Admin → Pretty Links)
> Until approved: point to `#` placeholder. Replace with real URLs when approved.
- [ ] Create `/go/jasper` → your Jasper AI affiliate URL
- [ ] Create `/go/copyai` → your Copy.ai affiliate URL
- [ ] Create `/go/surfer-seo` → your Surfer SEO affiliate URL
- [ ] Create `/go/convertkit` → your ConvertKit affiliate URL
- [ ] Create `/go/writesonic` → your Writesonic affiliate URL
- [ ] Create `/go/grammarly` → your Grammarly affiliate URL
- [ ] Create `/go/canva` → your Canva affiliate URL
- [ ] Create `/go/chatgpt-plus` → your ChatGPT Plus affiliate URL
- [ ] Create `/go/midjourney` → your Midjourney affiliate URL
- [ ] Create `/go/systeme-io` → your Systeme.io affiliate URL

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

### D1. Video Script Generator
- [ ] Build `content-pipeline/video-script-generator.js`
  - Input: WordPress published article (fetch via REST API)
  - Output: `videos/scripts/YYYY-MM-DD-{slug}.json` with `shortScript`, `longScript`, `keywords`
  - Use Claude API to summarize article into 60-second and 5-minute scripts
- [ ] Add npm script: `"video-script": "node content-pipeline/video-script-generator.js"`
- [ ] Wire into `content-generation.yml`: add step after publish to auto-generate video script

### D2. Medium Auto-Publisher
- [ ] Create Medium Integration Token at https://medium.com/me/settings → Integration tokens
- [ ] Add `MEDIUM_INTEGRATION_TOKEN` to GitHub Secrets
- [ ] Build `automation/medium-publisher.js`
  - Fetch latest WordPress post via REST API
  - Cross-post to Medium via Medium API v1
  - Include canonical URL pointing back to gammacash.online (SEO-safe)
- [ ] Add step to `content-generation.yml` workflow to auto-post after WordPress publish

### D3. Gumroad Digital Product Generator
- [ ] Create Gumroad account at https://gumroad.com
- [ ] Get `GUMROAD_ACCESS_TOKEN` from Gumroad → Settings → Advanced → Application
- [ ] Add `GUMROAD_ACCESS_TOKEN` to GitHub Secrets
- [ ] Build `automation/gumroad-publisher.js`
  - Use Claude API to generate a "10 Best AI Tools" PDF guide
  - Upload to Gumroad via API at $0 (free) with email capture
  - Price: $0 (lead magnet) or $9.99 (paid)
- [ ] Link from WordPress posts and email sequences

### D4. Master Orchestrator Workflow
- [ ] Create `.github/workflows/master-orchestrator.yml`
  - Trigger: schedule (weekly Sunday 10:00 UTC) + workflow_dispatch
  - Steps: trend detect → generate content → video script → voiceover → video assemble → upload YouTube → post Medium → report
  - Timeout: 4 hours (max)
- [ ] Test with `workflow_dispatch` first before enabling schedule

### D5. Earnings Dashboard Upgrade
- [ ] Add Gumroad revenue to `analytics/dashboard.js`
  - Fetch `https://api.gumroad.com/v2/sales` with token
- [ ] Add YouTube earnings estimate to dashboard (views × $3 RPM estimate)
- [ ] Add Medium clap earnings estimate (reads × $0.01)
- [ ] Build `analytics/earnings-report.js` — dedicated revenue report
  - Combines: affiliate ledger + GA4 + ConvertKit + Gumroad + YouTube estimate
  - Outputs HTML email + JSON report

---

## Phase E — Platform Polish

### E1. WordPress Design Upgrade
- [ ] Install Kadence or Astra theme (fast, lightweight, SEO-friendly)
- [ ] Configure: set logo, colors (navy #0f172a / blue accent), typography
- [ ] Install Elementor or Kadence Blocks for page builder
- [ ] Design homepage: hero section + latest posts grid + opt-in form + featured tools
- [ ] Design single post template: reading progress bar + author box + related posts + CTA
- [ ] Add site-wide affiliate disclosure banner (FTC compliance)

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
