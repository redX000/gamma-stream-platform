# 🚀 Gamma Stream Platform

> Fully autonomous AI-powered affiliate income platform — AI & SaaS tools niche
EVERYTHING AND MORE
[![System Status](https://img.shields.io/badge/System%20Status-LIVE-brightgreen)](https://github.com/redX000/gamma-stream-platform)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](CHANGELOG.md)
[![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](https://github.com/features/actions)
[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-orange)](https://claude.ai/code)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## What is Gamma Stream?

Gamma Stream is a fully autonomous online income system built with Claude Code. It combines multiple revenue streams into a single self-running platform targeting the AI & SaaS tools niche — one of the highest-commission affiliate markets in 2026.

Once deployed, the system runs daily without manual input:
- ✅ Generates and publishes SEO-optimized content automatically (Mon/Wed/Fri)
- ✅ Posts to Reddit and Pinterest daily after each article publishes
- ✅ Captures email subscribers via lead magnet and runs automated sequences
- ✅ Tracks affiliate revenue across all 8 programs in a local ledger
- ✅ Reports weekly KPIs to your inbox every Monday

---

## Build Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 — Foundation | Project structure, docs, .env, README | ✅ Complete |
| Phase 2 — Content Pipeline | generator.js, templates, seo-optimizer.js, publisher.js, scheduler.js | ✅ Complete |
| Phase 3 — Automation | social-poster.js, email sequences, affiliate-tracker.js, lead magnet | ✅ Complete |
| Phase 4 — Analytics | dashboard.js, kpis.md, weekly report pipeline | ✅ Complete |
| Phase 5 — GitHub Actions CI/CD | content-generation.yml, social-posting.yml, analytics-report.yml, claude-review.yml | ✅ Complete |

---

## Revenue Streams

| Stream | Status | Est. Monthly (Month 12) |
|---|---|---|
| Affiliate commissions | 🟢 Active from Day 1 | $500–$5,000 |
| Display ads (AdSense → Mediavine) | 🟡 Month 3 | $200–$2,000 |
| Email marketing | 🟢 Active from Day 1 | $500–$2,000 |
| Digital products | 🟡 Month 6 | $300–$3,000 |
| Brand sponsorships | 🟡 Month 8 | $500–$3,000 |
| YouTube Shorts | 🟡 Month 3 | $200–$2,000 |
| **Total potential** | | **$2,200–$17,000/mo** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Content Generation | Claude API (claude-sonnet-4-6) with prompt caching |
| SEO Optimization | Claude Haiku (titles/meta) + Surfer SEO integration |
| Site | WordPress REST API |
| Email | ConvertKit API v3 |
| CI/CD | GitHub Actions (4 cron workflows) |
| Analytics | Google Analytics 4 + BetaAnalyticsDataClient |
| Affiliate Tracking | Local JSON ledger + Pretty Links (WP plugin) |
| Hosting | Vercel / Netlify (free tier) |
| Social Automation | snoowrap (Reddit) + Pinterest API v5 |
| Notifications | nodemailer (SMTP) |

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

# Generate a single article to see the output
node content-pipeline/generator.js review "best Jasper AI review" "Jasper AI"

# View the generated file
ls content-pipeline/generated/
```

### 4 — Set up GitHub Actions (full automation)

Add these as **GitHub Secrets** (repo Settings → Secrets → Actions):

```
ANTHROPIC_API_KEY          # Required — content generation + Claude PR review
WORDPRESS_URL              # Your WordPress site URL
WORDPRESS_USERNAME         # WP admin username
WORDPRESS_APP_PASSWORD     # WP application password
CONVERTKIT_API_KEY         # ConvertKit API secret key
GA4_PROPERTY_ID            # GA4 numeric property ID
GA4_SERVICE_ACCOUNT_JSON   # GA4 service account key file contents (JSON string)
REDDIT_CLIENT_ID           # Reddit script-app client ID
REDDIT_SECRET              # Reddit app secret
REDDIT_USERNAME            # Reddit account username
REDDIT_PASSWORD            # Reddit account password
REDDIT_USER_AGENT          # e.g., GammaStream/1.0 by YOUR_USERNAME
PINTEREST_ACCESS_TOKEN     # Pinterest API access token
PINTEREST_BOARD_ID         # Pinterest board ID
NOTIFICATION_EMAIL         # Email for failure alerts + weekly reports
SMTP_HOST                  # e.g., smtp.gmail.com
SMTP_PORT                  # 587 (TLS) or 465 (SSL)
SMTP_USER                  # SMTP login email
SMTP_PASS                  # SMTP password or app password
```

Once secrets are set, all four workflows activate automatically on their schedules.
NOTE: You gotta do it manually!
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

### Automation

```bash
npm run social -- --platform all        # Post to Reddit + Pinterest
npm run social -- --platform reddit
npm run social -- --platform pinterest

node automation/affiliate-tracker.js add jasper-ai 49.75          # Log commission
node automation/affiliate-tracker.js add surfer-seo 29.00 2026-04-15
node automation/affiliate-tracker.js list                          # All entries
node automation/affiliate-tracker.js summary                       # All-time totals
npm run tracker:report                                             # Email weekly report
```

### Analytics

```bash
npm run dashboard                                    # Live console snapshot
npm run dashboard:report                             # Console + save JSON + email
node analytics/dashboard.js --report                 # Save JSON only
node analytics/dashboard.js --report --weekly        # Full weekly mode + email
```

---

## Project Structure

```
gamma-stream-platform/
├── CLAUDE.md                              ← Claude Code master instructions
├── README.md                              ← This file
├── CHANGELOG.md                           ← Full version history (v1.0.0 → v2.0.0)
├── package.json                           ← Node.js v2.0.0, all scripts + deps
├── .env.example                           ← Template for all 20 environment variables
├── .gitignore
│
├── content-pipeline/                      ← Phase 2 — AI content engine
│   ├── generator.js                       ← Claude sonnet-4-6 article generator
│   ├── seo-optimizer.js                   ← SEO score (0–100) + title/meta generation
│   ├── publisher.js                       ← WordPress REST API publisher
│   ├── scheduler.js                       ← Mon/Wed/Fri pipeline runner
│   └── templates/                         ← review.md, comparison.md, top-list.md, tutorial.md
│
├── automation/                            ← Phase 3 — Automation layer
│   ├── social-poster.js                   ← Reddit (snoowrap) + Pinterest (API v5)
│   ├── affiliate-tracker.js               ← Commission ledger + HTML email reports
│   ├── email-sequences/                   ← welcome.md, nurture.md, promo.md
│   └── lead-magnet/ai-tools-guide.md      ← "The Ultimate AI Tools Guide 2026"
│
├── analytics/                             ← Phase 4 — Analytics
│   ├── dashboard.js                       ← GA4 + ConvertKit + WP + ledger dashboard
│   ├── kpis.md                            ← KPI targets, measurements, recovery actions
│   └── reports/                           ← Auto-generated weekly JSON reports
│
├── docs/                                  ← Documentation
│   └── content-strategy.md               ← 50 keywords, 3-month calendar, SEO rules
│
├── architecture.md                        ← System design
├── monetization.md                        ← Affiliate programs and revenue strategy
├── scaling-roadmap.md                     ← Month-by-month growth plan
├── setup-guide.md                         ← Step-by-step deployment guide
│
└── .github/workflows/                     ← Phase 5 — CI/CD
    ├── content-generation.yml             ← Daily 06:00 UTC
    ├── social-posting.yml                 ← Daily 09:00 UTC
    ├── analytics-report.yml               ← Monday 08:00 UTC
    └── claude-review.yml                  ← On every PR
```

---

## GitHub Actions Cron Schedule

| Workflow | Trigger | Purpose |
|---|---|---|
| `content-generation.yml` | Daily 06:00 UTC | Generate + publish article (Mon/Wed/Fri active) |
| `social-posting.yml` | Daily 09:00 UTC | Post to Reddit and Pinterest in parallel |
| `analytics-report.yml` | Monday 08:00 UTC | Weekly dashboard + email + commit JSON report |
| `claude-review.yml` | Every PR | Security, quality, and CLAUDE.md compliance review |

All workflows support manual dispatch via **Actions → Select workflow → Run workflow**.

---

## KPI Targets

| Month | Articles | Email Subscribers | Monthly Revenue | Traffic |
|---|---|---|---|---|
| 1 | 12 | 50 | $0–$50 | 500–1,000 |
| 3 | 36 | 200 | $50–$200 | 4,000–8,000 |
| 6 | 72 | 800 | $300–$800 | 18,000–35,000 |
| 9 | 108 | 2,000 | $800–$2,500 | 45,000–80,000 |
| 12 | 144 | 5,000 | $2,500–$8,000 | 90,000–150,000 |

Full KPI definitions, measurement sources, and recovery actions: [analytics/kpis.md](analytics/kpis.md)

---

## Documentation

| Doc | Description |
|---|---|
| [Architecture](architecture.md) | Full system design and data flow |
| [Setup Guide](setup-guide.md) | Step-by-step deployment to production |
| [Monetization](monetization.md) | Affiliate programs, commission rates, revenue strategy |
| [Scaling Roadmap](scaling-roadmap.md) | Month-by-month growth plan through Month 12 |
| [Content Strategy](docs/content-strategy.md) | 50 keywords, 3-month calendar, SEO rules |
| [KPI Targets](analytics/kpis.md) | KPI definitions, targets, recovery actions |
| [Changelog](CHANGELOG.md) | Full version history v1.0.0 → v2.0.0 |

---

## Contributing

All changes go through feature branches and PRs. Claude Code reviews every PR automatically via `claude-review.yml`.

```bash
git checkout -b feature/your-feature-name
# make changes using Claude Code
git push origin feature/your-feature-name
# open PR → automated review runs within seconds
```

---

## License

MIT — see [LICENSE](LICENSE)

---

*MAKING MONEY IS THE ONLY WAY— Gamma Stream Platform v2.0.0*
