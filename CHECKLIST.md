# Gamma Stream Platform — Master Checklist

> **Single source of truth.** Check a box the moment a task is done.
> Update STATUS.md after every session. Commit both files together.
> Last updated: 2026-04-30 (session 7)

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
- [x] Fix `set -e` bash bug in all 3 push retry loops in `video-assembler.yml` ✅ done 2026-04-29
- [x] Add push retry loop to `content-generation.yml` ✅ done 2026-04-29
- [x] All 6 workflows green: 19 passed · 0 failed ✅ done 2026-04-29

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
- [x] Delete default "Hello world!" post (15 words, was blocking AdSense word-count check) ✅ done 2026-04-29

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
- [x] `/go/appsumo` — created (placeholder) ✅ done 2026-04-30
- [x] `/go/appsumo-deals` — created (placeholder) ✅ done 2026-04-30
- [ ] **ACTION**: Update redirect URLs once affiliate programs are approved (npm run redirects:update)

### B3. AdSense Application
- [ ] Wait for email from `adsense-readiness-check` workflow — fires automatically when 10+ posts AND all required pages exist
  - Current: **3 posts** (Hello World deleted 2026-04-29) — need 7 more, ETA ~2026-05-14
  - Workflow runs daily at 07:00 UTC — no manual monitoring needed
- [ ] After notification: Apply at https://www.google.com/adsense/start/
  - Use Moroccan operator's Google account. Site URL: https://gammacash.online
- [ ] Wait for AdSense approval (1–14 days)
- [ ] Add `ADSENSE_PUBLISHER_ID=ca-pub-XXXX` to .env + GitHub Secrets
- [ ] Add AdSense auto-ads tag via WP Site Kit plugin (easiest) or FSE footer template
- [ ] Payout: Payoneer USD — select "International wire" in AdSense Payments, use Payoneer virtual account details
- [ ] See full guide: `docs/adsense-readiness.md`

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
- [x] `scripts/inject-theme-css.js` built ✅ done 2026-04-30 — auto-injects via FSE global-styles → custom_css → plugin fallback
- [ ] Run: `npm run inject-css` — injects dark theme to ALL pages (posts, archives, inner pages)

### E2. SEO Improvements ✅ automated 2026-04-30
- [x] `scripts/install-plugins.js` built — installs Rank Math SEO, Wordfence, LiteSpeed Cache via WP REST API
- [ ] Run: `npm run install-plugins` — installs all 3 plugins in one command
- [ ] After Rank Math install: run Setup Wizard at https://gammacash.online/wp-admin/admin.php?page=rank-math-wizard
- [ ] Submit sitemap to Google Search Console: https://search.google.com/search-console → Sitemaps → `sitemap.xml`
- [ ] Submit to Bing Webmaster Tools: https://www.bing.com/webmasters

### E3. Performance & Security ✅ automated 2026-04-30
- [x] `scripts/install-plugins.js` — also installs Wordfence + LiteSpeed Cache
- [ ] Run: `npm run install-plugins` (same command as E2 — installs all 3)
- [ ] After Wordfence install: complete security setup at https://gammacash.online/wp-admin/admin.php?page=Wordfence
- [ ] Enable Hostinger's LiteSpeed cache in hosting panel (automatic with LiteSpeed Cache plugin active)
- [ ] Verify SSL certificate is active (https://gammacash.online)

---

## Phase F — Passive Income Streams (session 4 — 2026-04-30)

### F1. AppSumo Affiliate ✅ scaffolded 2026-04-30
- [x] `automation/appsumo-deals-fetcher.js` — /deals page builder, dry-run support ✅
- [x] `/deals` page live at https://gammacash.online/deals/ (placeholder affiliate ID) ✅
- [x] `/go/appsumo` + `/go/appsumo-deals` redirect pages created ✅
- [x] `npm run deals:update` + `npm run deals:dry` scripts added ✅
- [ ] **ACTION NOW**: Sign up at appsumo.com/affiliates (instant approval, free)
  - Add `APPSUMO_AFFILIATE_ID=<id>` to `.env` + GitHub Secrets
  - Run `npm run redirects:update` → `npm run deals:update`
  - Commission: $10–$150 per sale. Payout: Payoneer USD.

### F2. Google AdSense ✅ scaffolded 2026-04-30
- [x] `.github/workflows/adsense-readiness-check.yml` — daily monitor, emails at 10 posts ✅
- [x] `docs/adsense-readiness.md` — full preflight checklist + Payoneer routing guide ✅
- [ ] Wait for email notification from `adsense-readiness-check` workflow (~2026-05-14)
- [ ] Apply at google.com/adsense in Moroccan operator's Google account
- [x] `scripts/activate-adsense.js` built ✅ done 2026-04-30 — installs Insert Headers & Footers + Site Kit, injects auto-ads snippet
- [ ] After approval: add `ADSENSE_PUBLISHER_ID=ca-pub-XXXX` to .env + GitHub Secrets
- [ ] Run: `npm run activate-adsense` — auto-installs plugins and injects the AdSense snippet

### F3. SparkLoop Upscribe ✅ scaffolded 2026-04-30
- [x] `scripts/sparkloop-widget.html` — Upscribe embed with SPARKLOOP_PARTNER_ID placeholder ✅
- [x] `.github/workflows/subscriber-milestone.yml` — notifies at 500 subs ✅
- [x] `automation/convertkit-setup.js` — SparkLoop activation instructions added to output ✅
- [ ] Wait for email notification from `subscriber-milestone` workflow (at 500 subs)
- [ ] Apply at sparkloop.app (free, 2–5 days approval)
- [ ] After approval: add `SPARKLOOP_API_KEY` + `SPARKLOOP_PARTNER_ID` to .env + GitHub Secrets
- [ ] Create /newsletter-confirmed WP page, paste sparkloop-widget.html, update ConvertKit redirect
- [ ] Revenue: $1–$5 per referral subscriber. Payout: PayPal Morocco → Payoneer USD.

### F4. Paved + Beehiiv Boosts ✅ scaffolded 2026-04-30
- [x] `docs/newsletter-sponsorships.md` — full activation guide for all 3 newsletter monetization layers ✅
- [x] `templates/sponsored-email.md` — FTC-compliant sponsored email template + rate card ✅
- [x] `.github/workflows/subscriber-milestone.yml` — also notifies at 1,000 subs ✅
- [ ] Wait for email notification from `subscriber-milestone` workflow (at 1,000 subs)
- [ ] Apply at paved.com (publishers tab) — CPM: $25–$60
- [ ] Apply at beehiiv.com → Grow → Boosts → Get Boosted
- [ ] Payout: Payoneer USD virtual account (US ACH from Paved)
- [ ] Revenue at 1,000 subs: $100–$240/mo from Paved; $1–$3/boost from Beehiiv

---

## Phase G — Live Web Dashboard ✅ done 2026-04-30

- [x] `scripts/build-dashboard.js` — full dark-theme analytics dashboard, uploads to WP as private page ✅
- [x] `.github/workflows/dashboard-update.yml` — rebuilds dashboard daily at 10:30 UTC (11th workflow) ✅
- [x] `npm run dashboard:web` script added ✅
- [x] Dashboard page ID 56 created at https://gammacash.online/?page_id=56 ✅
- Dashboard URL (WP admin login required): https://gammacash.online/live-dashboard/
- Shows: revenue cards, GA4 traffic, email list, content count, KPI progress bars, top pages, revenue by program, stream status checklist

---

## Phase H — Site Header & Visual Fixes ✅ done 2026-04-30 (session 7)

- [x] `scripts/fix-header.js` built — injects corrected CSS into FSE global-styles via WP REST API ✅
- [x] `npm run fix-header` script added ✅
- [x] **Header compactness** — `header.wp-block-template-part` with `padding:0 !important`, inner group padding override ✅
- [x] **Site title gradient** — `.wp-block-site-title a` → Orbitron font, green-to-cyan gradient ✅
- [x] **Navigation specificity** — `:root .wp-block-navigation` beats WP's own `:root :where(...)` rules ✅
- [x] **Submenu dark background** — `html body .wp-block-navigation__submenu-container` with `background:#000000 !important` ✅
- [x] **Submenu text** — white text, green border, hover highlight — fully visible ✅
- [x] WP `wp_strip_all_tags()` sanitiser guard added — strips any HTML-like patterns before PUT ✅
- [x] Idempotent V1/V2/V3 marker stripping — re-runs always produce a clean single injection ✅

**Key technical discoveries (saves future debugging):**
- WP global-styles post ID is **6** on this site — found via sequential scan 1–40
- `[data-type="header"]` attribute does NOT exist in TT5 rendered HTML — use `header.wp-block-template-part`
- Inner group div has inline `padding-top/bottom` — only `!important` in CSS overrides inline styles
- WP's own nav rules use `:root :where()` (zeroes specificity) — beat them with `:root .class` (higher specificity)
- WP REST API CSS validation uses `wp_strip_all_tags()` — ANY `<tag>` in CSS (even in comments) triggers 400 error
- Submenu white-bg fix required `html body` prefix selector chain to beat TT5 theme specificity

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
| `NOTIFICATION_EMAIL` | ✅ Set | gammacash.platform@gmail.com ✅ done 2026-04-29 |
| `SMTP_HOST` | ✅ Set | smtp.hostinger.com |
| `SMTP_PORT` | ✅ Set | 587 |
| `SMTP_USER` | ✅ Set | noreply@gammacash.online |
| `SMTP_PASS` | ✅ Set | Hostinger email password |
| `GA4_MEASUREMENT_ID` | ✅ Set | G-6DJVSLX7WX |
| `GA4_API_SECRET` | ✅ Set | ✅ done 2026-04-28 |
| `GA4_PROPERTY_ID` | ✅ Set | ✅ done 2026-04-28 |
| `GA4_SERVICE_ACCOUNT_JSON` | ✅ Set | ✅ done 2026-04-28 |
| `CONVERTKIT_API_KEY` | ❌ Needed | Family member creates ConvertKit account first |
| `CONVERTKIT_FORM_ID` | ❌ Needed | Output of `npm run convertkit` after API key set |
| `PINTEREST_APP_ID` | ❌ Pending | Pinterest app approval (applied 2026-04-27) |
| `PINTEREST_APP_SECRET` | ❌ Pending | Pinterest app approval |
| `PINTEREST_REFRESH_TOKEN` | ❌ Pending | Run pinterest-auth.js after approval |
| `PINTEREST_BOARD_ID` | ❌ Pending | Run pinterest-auth.js after approval |
| `YOUTUBE_CLIENT_ID` | ✅ Set | Google Cloud Console |
| `YOUTUBE_CLIENT_SECRET` | ✅ Set | Google Cloud Console |
| `YOUTUBE_REFRESH_TOKEN` | ✅ Set | ✅ done 2026-04-28 — ran scripts/youtube-auth.js |
| `PEXELS_API_KEY` | ✅ Set | ✅ done 2026-04-28 |
| `GUMROAD_ACCESS_TOKEN` | ❌ Needed | Family member creates Gumroad account first |
| `GUMROAD_PRODUCT_URL` | ❌ Needed | Output of `npm run gumroad:paid` after token set |
| `APPSUMO_AFFILIATE_ID` | ❌ Needed | appsumo.com/affiliates (instant approval) → run `npm run deals:update` |
| `ADSENSE_PUBLISHER_ID` | ❌ Pending | Apply when `adsense-readiness-check` emails (~2026-05-14) |
| `SPARKLOOP_API_KEY` | ❌ Pending | Apply at sparkloop.app when `subscriber-milestone` emails (500 subs) |
| `SPARKLOOP_PARTNER_ID` | ❌ Pending | Same as above — from SparkLoop Upscribe dashboard |
| `REDDIT_*` (5 secrets) | ❌ Skipped | Reddit permanently blocked |
