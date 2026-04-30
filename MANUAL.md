# Gamma Stream — Your Manual Steps

> Everything else is automated. This file is ONLY what requires a human.
> Last updated: 2026-04-29

---

## STEP 1 — Family member (Morocco side)
Do these first — everything below unblocks once Payoneer exists.

- [ ] **Create Payoneer account** → payoneer.com (use Moroccan ID + address)
- [ ] **Register as auto-entrepreneur** → ae.gov.ma (free, online)
- [ ] **Create Gumroad account** → gumroad.com (family member's email)
  - In Gumroad: Settings → Payouts → connect Payoneer
- [ ] **Create ConvertKit account** (free) → app.convertkit.com (family member's email)
  - Go to: Settings → API → copy **Secret API Key**

---

## STEP 2 — API keys (you, once family member has accounts)

### ConvertKit
1. Paste the Secret API Key into local `.env` as `CONVERTKIT_API_KEY=...`
2. Add to GitHub Secrets: github.com/redX000/gamma-stream-platform/settings/secrets/actions
3. Run: `npm run convertkit`
   - Creates the form, sidebar widget, and /free-guide page automatically
   - Copy the **Form ID** it prints → add as `CONVERTKIT_FORM_ID` in GitHub Secrets

### Gumroad
1. In Gumroad: Settings → Advanced → Application → create access token
2. Paste into `.env` as `GUMROAD_ACCESS_TOKEN=...`
3. Add to GitHub Secrets
4. Run: `npm run gumroad:paid`
   - Generates and uploads the AI Tools guide at $9.99
   - Copy the **product URL** it prints
5. Add to `.env` as `GUMROAD_PRODUCT_URL=https://...gumroad.com/l/...`
6. Run: `npm run sales-page`
   - Activates the buy button on gammacash.online/get-the-guide/

---

## STEP 3 — Affiliate program applications (all free to join)
Apply to all six today — approvals take 1–7 days.

| Priority | Program | Commission | Apply at |
|---|---|---|---|
| ⭐⭐⭐ | **Systeme.io** | 60% recurring | systeme.io/affiliate |
| ⭐⭐⭐ | **Copy.ai** | 45% recurring | copy.ai/affiliate |
| ⭐⭐ | **ConvertKit** | 30% recurring | convertkit.com/affiliate |
| ⭐⭐ | **Jasper AI** | 25% recurring | jasper.ai/affiliate |
| ⭐⭐ | **Surfer SEO** | 25% recurring | surferseo.com/affiliate |
| ⭐ | **Scalenut** | 30% lifetime | scalenut.com/affiliate |

**Use Payoneer** (Payoneer virtual USD bank details) as the payout method on all six.

**After approval:** open `scripts/create-redirects.js`, paste each real affiliate URL into the `REDIRECTS` map, then run: `npm run redirects:update`

---

## STEP 4 — Pinterest (waiting on approval)
Applied: 2026-04-27. Expected: within 7 days.

Once approved:
1. Run: `node scripts/pinterest-auth.js`
2. Follow the browser OAuth flow
3. Add these 4 secrets to GitHub Secrets:
   - `PINTEREST_APP_ID`
   - `PINTEREST_APP_SECRET`
   - `PINTEREST_REFRESH_TOKEN`
   - `PINTEREST_BOARD_ID`

---

## STEP 5 — WordPress automation (run these commands)

### Dark theme (now automated)
```bash
npm run inject-css
```
Tries 3 injection strategies (FSE global-styles → custom_css → plugin fallback).
If it prints "MANUAL STEPS", paste `scripts/theme.css` into WP Customizer → Additional CSS.

### Plugins: Rank Math SEO, Wordfence, LiteSpeed Cache (now automated)
```bash
npm run install-plugins
```
Installs all 3 via WP REST API. Then:
- Rank Math: https://gammacash.online/wp-admin/admin.php?page=rank-math-wizard
- Wordfence: https://gammacash.online/wp-admin/admin.php?page=Wordfence

### Hero animations
1. Open `scripts/hero-motion.js`, copy everything
2. Go to: WP Admin → Code Snippets → Add New
3. Paste → set to **Run everywhere** → Save + Activate

---

## STEP 6 — SEO (manual browser steps, takes 10 min)

### Google Search Console
1. Go to: https://search.google.com/search-console
2. Add property → Domain → `gammacash.online`
3. Verify via Namecheap DNS TXT record (Namecheap shows instructions)
4. Once verified: Sitemaps → Add sitemap → type `sitemap.xml` → Submit

### Bing Webmaster Tools
1. Go to: https://www.bing.com/webmasters
2. Add site → `https://gammacash.online`
3. Auto-verify via Search Console (if already verified there)
4. Sitemaps → Submit → `https://gammacash.online/sitemap.xml`

---

## STEP 7 — AdSense (do NOT apply before 10 posts)

Current posts: **3** (Hello World deleted) — pipeline auto-publishes Mon/Wed/Fri.
**Estimated ready: ~2026-05-14** — `adsense-readiness-check` workflow emails you automatically.

1. Wait for the automated email from `adsense-readiness-check` workflow (~2026-05-14)
2. Apply at: https://www.google.com/adsense/start/ (use Moroccan operator's Google account)
   - Site URL: https://gammacash.online
   - Language: English
3. Wait 1–14 days for approval
4. Once approved: add `ADSENSE_PUBLISHER_ID=ca-pub-XXXX` to `.env` + GitHub Secrets
5. Run: `npm run activate-adsense` — auto-installs plugins and injects the AdSense snippet

---

## STEP 8 — Cloudflare (optional, defer if unsure)
Only do this if you're comfortable changing nameservers.
Risk: 24–48h propagation window where site may be intermittently unavailable.

1. Sign up: cloudflare.com (free plan)
2. Add site → scan DNS → verify all records match Hostinger
3. Change Namecheap nameservers to Cloudflare's
4. Enable: Auto Minify, Brotli, Browser Cache TTL → 4h
5. Verify SSL is active after propagation

---

## Quick status check (run anytime)
```bash
npm run health-check
```

---

## GitHub Secrets still needed
| Secret | Unblocks | How to activate |
|---|---|---|
| `CONVERTKIT_API_KEY` | Email list | Family member creates ConvertKit → `npm run convertkit` |
| `CONVERTKIT_FORM_ID` | Analytics report subscriber count | Output of `npm run convertkit` |
| `GUMROAD_ACCESS_TOKEN` | Digital product sales | Family member creates Gumroad → `npm run gumroad:paid` |
| `ADSENSE_PUBLISHER_ID` | Display ad revenue | Wait for `adsense-readiness-check` email → apply → `npm run activate-adsense` |
| `APPSUMO_AFFILIATE_ID` | AppSumo commissions | Sign up at appsumo.com/affiliates → `npm run deals:update` |
| `PINTEREST_APP_ID` | Auto-pinning (pending approval) | After Pinterest approval → `node scripts/pinterest-auth.js` |
| `PINTEREST_APP_SECRET` | Auto-pinning | Same as above |
| `PINTEREST_REFRESH_TOKEN` | Auto-pinning | Output of `pinterest-auth.js` |
| `PINTEREST_BOARD_ID` | Auto-pinning | Output of `pinterest-auth.js` |
| `MEDIUM_INTEGRATION_TOKEN` | Medium cross-posting | Create at medium.com/me/settings → Integration tokens |
