# Gamma Stream Platform

> Fully autonomous AI-powered affiliate income platform — AI & SaaS tools niche

[![System Status](https://img.shields.io/badge/System%20Status-LIVE-brightgreen)](https://github.com/redX000/gamma-stream-platform)
[![Version](https://img.shields.io/badge/version-3.1.0-blue)](CHANGELOG.md)
[![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](https://github.com/features/actions)
[![Built with Claude Code](https://img.shields.io/badge/Built%20with-HUNGER-orange)](HUNGER)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## What is Gamma Stream?

Gamma Stream is a fully autonomous online income system built with Claude Code. It combines multiple stacked revenue streams into a single self-running platform targeting the AI & SaaS tools niche — one of the highest-commission affiliate markets in 2026.

Once deployed, the system runs daily without manual input:
- Generates and publishes SEO-optimized content automatically (Mon/Wed/Fri)
- Posts to Reddit and Pinterest daily after each article publishes
- Captures email subscribers via lead magnet and runs automated sequences
- Tracks affiliate revenue across all programs in a local ledger
- Reports weekly KPIs and earnings to your inbox every Monday
- Monitors AdSense readiness and subscriber milestones — emails you exactly when to act
- Rebuilds a live analytics dashboard daily at `/live-dashboard/` (GA4 + revenue + KPIs)
- Maintains a polished dark-theme site with compact header, gradient site title, and working nav dropdowns

---

## Build Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 — Foundation | Project structure, docs, .env, README | ✅ Complete |
| Phase 2 — Content Pipeline | generator.js, templates, seo-optimizer.js, publisher.js, scheduler.js | ✅ Complete |
| Phase 3 — Automation | social-poster.js, email sequences, affiliate-tracker.js, lead magnet | ✅ Complete |
| Phase 4 — Analytics | dashboard.js, earnings-report.js, kpis.md, weekly report pipeline | ✅ Complete |
| Phase 5 — GitHub Actions CI/CD | 11 workflows — content, video, social, analytics, monitoring, dashboard | ✅ Complete |
| Phase 6 — Passive Income Streams | AppSumo, AdSense, SparkLoop, Paved/Beehiiv — scaffolded + monitored | ✅ Complete |
| Phase 7 — Live Web Dashboard | Dark-theme analytics dashboard at /live-dashboard/, rebuilt daily | ✅ Complete |
| Phase 8 — Site Header & Visual Fixes | Compact header, gradient title, dark submenu dropdowns via FSE CSS injection | ✅ Complete |

---

## Revenue Streams

| Stream | Activate When | Est. Monthly (Month 12) |
|---|---|---|
| Affiliate commissions (13 programs) | Day 1 — `/deals` page live | $500–$5,000 |
| AppSumo affiliate (up to $150/sale) | Now — instant approval | $100–$1,000 |
| Display ads (Google AdSense) | 10+ published posts (~May 2026) | $200–$2,000 |
| Email list — SparkLoop referrals | 500 subscribers | $50–$500 |
| Email list — Paved sponsorships | 1,000 subscribers | $100–$1,200 |
| Email list — Beehiiv Boosts | 1,000 subscribers | $50–$300 |
| Digital products (Gumroad) | Month 3 — $9.99/guide | $300–$3,000 |
| YouTube Shorts | Month 3 | $200–$2,000 |
| **Total potential** | | **$1,500–$15,000/mo** |

---

## Monitoring — Threshold Automations

The platform watches two critical milestones and emails you exactly when to act:

| Threshold | Workflow | Action Required |
|---|---|---|
| 10 published posts | `adsense-readiness-check` (daily) | Apply at google.com/adsense |
| 500 ConvertKit subscribers | `subscriber-milestone` (daily) | Apply at sparkloop.app |
| 1,000 ConvertKit subscribers | `subscriber-milestone` (daily) | Apply at paved.com + beehiiv.com |

No manual monitoring needed — the system notifies you at the right time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Content Generation | Claude API (claude-sonnet-4-6) with prompt caching |
| SEO Optimization | Claude Haiku (titles/meta) + Surfer SEO integration |
| Site | WordPress REST API (JWT auth) |
| Email | ConvertKit API v3 |
| CI/CD | GitHub Actions (10 cron workflows) |
| Analytics | Google Analytics 4 + BetaAnalyticsDataClient |
| Affiliate Tracking | Local JSON ledger + /go/* WP redirect pages |
| Deals Page | AppSumo RSS feed → /deals WP page (auto-updated) |
| Newsletter Monetization | SparkLoop Upscribe + Paved + Beehiiv Boosts |
| Hosting | Hostinger WordPress (gammacash.online) |
| Social Automation | snoowrap (Reddit) + Pinterest API v5 |
| Video Pipeline | msedge-tts + Pexels + YouTube Data API v3 |
| Notifications | nodemailer (SMTP via Hostinger) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))
- GitHub account with this repo forked or cloned

### 1 — Clone and install

```bash
git clone https://github.com/redX000/gamma-stream-platform.git
cd gamma-stream-platform
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Open .env and fill in your keys — only ANTHROPIC_API_KEY needed to run locally
```

### 3 — Test the content pipeline (no WordPress needed)

```bash
# Dry run — generates one article, SEO-scores it, skips WordPress publish
node content-pipeline/scheduler.js --dry-run --force

# Generate a single article
node content-pipeline/generator.js review "best Jasper AI review" "Jasper AI"
```

### 4 — Set up GitHub Actions (full automation)

Add these as **GitHub Secrets** (repo Settings → Secrets → Actions).
See `.env.example` for the full annotated list and where to get each key.

**Minimum required secrets to go live:**

```
ANTHROPIC_API_KEY        WORDPRESS_URL            WORDPRESS_USERNAME
WORDPRESS_PASSWORD       NOTIFICATION_EMAIL       SMTP_HOST / PORT / USER / PASS
GA4_MEASUREMENT_ID       GA4_SERVICE_ACCOUNT_JSON YOUTUBE_REFRESH_TOKEN
PEXELS_API_KEY
```

Once secrets are set, all workflows activate automatically on their schedules.

---

## All Commands

### Content Pipeline

```bash
npm run schedule                                      # Run pipeline (Mon/Wed/Fri)
npm run schedule:dry                                  # Dry run — no publish
node content-pipeline/scheduler.js --force            # Run today regardless of day
node content-pipeline/scheduler.js --dry-run --force  # Dry run, force

# Manual article generation
node content-pipeline/generator.js review      "best Jasper AI review"    "Jasper AI"
node content-pipeline/generator.js comparison  "Jasper AI vs Copy.ai"     "Jasper AI" "Copy.ai"
node content-pipeline/generator.js tutorial    "how to use Surfer SEO"    "Surfer SEO"
node content-pipeline/generator.js top-list    "best AI writing tools"    "Jasper AI"

# SEO tools
npm run seo -- titles "Jasper AI" "best Jasper AI review"
npm run seo -- meta "best Jasper AI review" "article content here"
```

### Affiliate & Deals

```bash
npm run redirects                                     # Create /go/* redirect pages
npm run redirects:update                              # Update existing redirect URLs
npm run redirects:dry                                 # Preview only

npm run deals:update                                  # Rebuild /deals page with AppSumo links
npm run deals:dry                                     # Preview /deals page output

node automation/affiliate-tracker.js add jasper-ai 49.75   # Log a commission
node automation/affiliate-tracker.js summary               # All-time totals
npm run tracker:report                                      # Email weekly report
```

### Automation

```bash
npm run social -- --platform all        # Post to Reddit + Pinterest
npm run gumroad:paid                    # Publish AI Tools guide to Gumroad at $9.99
npm run gumroad:dry                     # Preview without publishing
npm run convertkit                      # Create ConvertKit form + WP landing page
npm run site-upgrade                    # Apply dark theme CSS + global JS site-wide
npm run rebuild-homepage                # Rebuild homepage with live post cards + stats
```

### Analytics

```bash
npm run dashboard                       # Live console snapshot
npm run dashboard:report                # Console + save JSON + email
npm run dashboard:web                   # Build + upload live web dashboard to /live-dashboard/
npm run earnings:email                  # Combined revenue report (all streams)
npm run health-check                    # Full platform health check
npm run adsense-check                   # Manual AdSense readiness check
```

### Site Design

```bash
npm run fix-header                      # Fix header height, site title gradient, submenu dark bg
npm run inject-css                      # Inject full dark theme CSS globally (FSE → custom_css fallback)
npm run site-upgrade                    # Dark theme CSS + global JS injection
npm run rebuild-homepage                # Rebuild homepage with live post cards + stats
npm run install-plugins                 # Install Rank Math SEO + Wordfence + LiteSpeed Cache
npm run activate-adsense                # Inject AdSense auto-ads snippet + install plugins
```

---

## GitHub Actions Workflows (11 total)

| Workflow | Schedule | Purpose |
|---|---|---|
| `content-generation.yml` | Daily 06:00 UTC | Generate + publish article (Mon/Wed/Fri active) |
| `social-posting.yml` | Daily 09:00 UTC | Post to Reddit + Pinterest |
| `analytics-report.yml` | Monday 08:00 UTC | Weekly dashboard + email + commit JSON report |
| `claude-review.yml` | Every PR | Security, quality, CLAUDE.md compliance review |
| `trend-detection.yml` | Daily 05:00 UTC | Detect trending AI topics for content queue |
| `voiceover-generator.yml` | Sundays 07:00 UTC | Generate TTS voiceovers for video queue |
| `video-assembler.yml` | workflow_dispatch | Assemble + upload Shorts and long-form videos |
| `master-orchestrator.yml` | Sundays 10:00 UTC | Full weekly pipeline run |
| `adsense-readiness-check.yml` | Daily 07:00 UTC | Email notification when 10-post AdSense threshold met |
| `subscriber-milestone.yml` | Daily 08:00 UTC | Email at 500 subs (SparkLoop) + 1,000 subs (Paved) |
| `dashboard-update.yml` | Daily 10:30 UTC | Rebuild + upload live analytics dashboard to /live-dashboard/ |

---

## Project Structure

```
gamma-stream-platform/
├── CLAUDE.md                                  ← Claude Code master instructions
├── README.md                                  ← This file
├── CHECKLIST.md                               ← Master task checklist (single source of truth)
├── package.json                               ← v3.0.0, all scripts + deps
├── .env.example                               ← Template for all environment variables
│
├── content-pipeline/                          ← AI content engine
│   ├── generator.js                           ← Claude sonnet-4-6 article generator
│   ├── seo-optimizer.js                       ← SEO score + title/meta generation
│   ├── publisher.js                           ← WordPress REST API publisher
│   ├── scheduler.js                           ← Mon/Wed/Fri pipeline runner
│   └── templates/                             ← review.md, comparison.md, top-list.md, tutorial.md
│
├── automation/                                ← Automation layer
│   ├── social-poster.js                       ← Reddit + Pinterest
│   ├── affiliate-tracker.js                   ← Commission ledger + HTML email reports
│   ├── convertkit-setup.js                    ← CK form + WP sidebar + /free-guide page
│   ├── appsumo-deals-fetcher.js               ← Builds /deals page from AppSumo deals
│   ├── gumroad-publisher.js                   ← AI Tools guide → Gumroad $9.99
│   ├── voiceover-generator.js                 ← TTS via msedge-tts
│   ├── youtube-publisher.js                   ← YouTube Data API v3 uploader
│   ├── trend-detector.js                      ← Trending topic detector
│   ├── email-sequences/                       ← welcome.md, nurture.md, promo.md
│   └── lead-magnet/ai-tools-guide.md
│
├── analytics/                                 ← Analytics + reporting
│   ├── dashboard.js                           ← GA4 + ConvertKit + WP + ledger dashboard
│   ├── earnings-report.js                     ← Combined revenue report (all streams)
│   └── reports/                               ← Auto-generated weekly JSON reports
│
├── scripts/                                   ← One-shot setup + maintenance scripts
│   ├── create-redirects.js                    ← /go/* affiliate redirect pages
│   ├── rebuild-homepage.js                    ← Rebuild homepage with live post cards
│   ├── site-upgrade.js                        ← Dark theme CSS + global JS injection
│   ├── inject-theme-css.js                    ← Injects dark theme CSS (FSE → custom_css → plugin)
│   ├── install-plugins.js                     ← Installs Rank Math, Wordfence, LiteSpeed Cache
│   ├── activate-adsense.js                    ← Injects AdSense auto-ads snippet + installs plugins
│   ├── fix-header.js                          ← Compact header, gradient title, dark submenu via FSE
│   ├── build-dashboard.js                     ← Builds + uploads dark-theme analytics dashboard
│   ├── sparkloop-widget.html                  ← Upscribe embed (paste to /newsletter-confirmed)
│   ├── adsense-checker.js                     ← Manual AdSense readiness check
│   ├── health-check.js                        ← Full platform health check
│   └── create-sales-page.js                   ← /get-the-guide Gumroad sales page
│
├── docs/                                      ← Documentation
│   ├── content-strategy.md                    ← 50 keywords, 3-month calendar, SEO rules
│   ├── adsense-readiness.md                   ← AdSense preflight checklist + Payoneer routing
│   └── newsletter-sponsorships.md             ← SparkLoop + Paved + Beehiiv activation guide
│
├── templates/
│   └── sponsored-email.md                     ← FTC-compliant sponsored newsletter template
│
└── .github/workflows/                         ← CI/CD (10 workflows)
    ├── content-generation.yml
    ├── social-posting.yml
    ├── analytics-report.yml
    ├── claude-review.yml
    ├── trend-detection.yml
    ├── voiceover-generator.yml
    ├── video-assembler.yml
    ├── master-orchestrator.yml
    ├── adsense-readiness-check.yml             ← Notifies at 10 posts
    ├── subscriber-milestone.yml               ← Notifies at 500 + 1,000 subs
    └── dashboard-update.yml                   ← Rebuilds live dashboard daily at 10:30 UTC
```

---

## KPI Targets

| Month | Articles | Email Subscribers | Monthly Revenue | Traffic |
|---|---|---|---|---|
| 1 | 12 | 50 | $0–$50 | 500–1,000 |
| 3 | 36 | 200 | $50–$200 | 4,000–8,000 |
| 6 | 72 | 800 | $300–$800 | 18,000–35,000 |
| 9 | 108 | 2,000 | $800–$2,500 | 45,000–80,000 |
| 12 | 144 | 5,000 | $2,500–$8,000 | 90,000–150,000 |

---

## Documentation

| Doc | Description |
|---|---|
| [CHECKLIST.md](CHECKLIST.md) | Master task checklist — single source of truth |
| [docs/adsense-readiness.md](docs/adsense-readiness.md) | AdSense preflight checklist + Payoneer payout routing |
| [docs/newsletter-sponsorships.md](docs/newsletter-sponsorships.md) | SparkLoop + Paved + Beehiiv Boosts activation guide |
| [templates/sponsored-email.md](templates/sponsored-email.md) | FTC-compliant sponsored email template + rate card |
| [docs/content-strategy.md](docs/content-strategy.md) | 50 keywords, 3-month calendar, SEO rules |
| [analytics/kpis.md](analytics/kpis.md) | KPI definitions, targets, recovery actions |

---

## License

MIT — see [LICENSE](LICENSE)

---

*Gamma Stream Platform v3.1.0 — BUILT WITH THE DREAM OF BEING RICH*
