# 🚀 Gamma Stream Platform

> Fully autonomous AI-powered affiliate income platform — AI & SaaS tools niche

[![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](https://github.com/features/actions)
[![Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-orange)](https://claude.ai/code)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## What is Gamma Stream?

Gamma Stream is a fully autonomous online income system built with Claude Code. It combines multiple revenue streams into a single self-running platform targeting the AI & SaaS tools niche — one of the highest-commission affiliate markets in 2026.

Once deployed, the system runs daily without manual input:
- ✅ Generates and publishes SEO content automatically
- ✅ Posts to Reddit and Pinterest daily
- ✅ Sends email sequences to subscribers
- ✅ Tracks affiliate revenue across all programs
- ✅ Reports weekly KPIs to your inbox

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
| Content Generation | Claude API (claude-sonnet-4-6) |
| Site | WordPress / Next.js |
| Email | ConvertKit |
| CI/CD | GitHub Actions |
| Analytics | Google Analytics 4 |
| Affiliate Tracking | Pretty Links |
| Hosting | Vercel / Netlify (free tier) |
| Automation | Node.js scripts |

---

## Quick Start

### Prerequisites
- Node.js 18+
- GitHub account (connected)
- Claude Code installed (`claude` in terminal)
- Anthropic API key

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/gamma-stream-platform.git
cd gamma-stream-platform

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your API keys in .env

# 4. Test the content pipeline (dry run — no WordPress required)
node content-pipeline/scheduler.js --dry-run --force

# 5. Generate a single article manually
node content-pipeline/generator.js review "best Jasper AI review" "Jasper AI"
```

### Content Pipeline Commands

```bash
# Run full pipeline (publishes if today is Mon/Wed/Fri)
npm run schedule

# Dry run — generate + SEO score, no WordPress publish
npm run schedule:dry

# Force run today regardless of day
node content-pipeline/scheduler.js --force

# Generate SEO title options for a keyword
npm run seo -- titles "Jasper AI" "best Jasper AI review"
```

---

## Project Structure

```
gamma-stream-platform/
├── CLAUDE.md                        ← Claude Code master instructions
├── README.md                        ← This file
├── CHANGELOG.md                     ← Version history
├── package.json                     ← Node.js dependencies
├── .env.example                     ← Environment variable template
├── docs/                            ← Full documentation
├── content-pipeline/                ← AI content generation engine (Phase 2)
│   ├── generator.js                 ← Claude API article generator
│   ├── seo-optimizer.js             ← SEO scoring and title generation
│   ├── publisher.js                 ← WordPress REST API publisher
│   ├── scheduler.js                 ← Daily cron pipeline runner
│   └── templates/                   ← Article templates by type
│       ├── review.md
│       ├── comparison.md
│       ├── top-list.md
│       └── tutorial.md
├── automation/                      ← Social, email & affiliate automation
├── analytics/                       ← Revenue tracking & reporting
├── site/                            ← Site configuration
└── .github/workflows/               ← GitHub Actions CI/CD
```

---

## Documentation

| Doc | Description |
|---|---|
| [Architecture](docs/architecture.md) | Full system design |
| [Setup Guide](docs/setup-guide.md) | Step-by-step deployment |
| [Monetization](docs/monetization.md) | Affiliate programs & revenue |
| [Content Strategy](docs/content-strategy.md) | SEO & content plan |
| [Scaling Roadmap](docs/scaling-roadmap.md) | Month-by-month growth |

---

## GitHub Actions Automation

| Workflow | Schedule | Purpose |
|---|---|---|
| `content-generation.yml` | Daily 06:00 UTC | Generate & publish articles |
| `social-posting.yml` | Daily 09:00 UTC | Post to Reddit & Pinterest |
| `analytics-report.yml` | Monday 08:00 UTC | Weekly revenue report |
| `claude-review.yml` | On every PR | AI code review |

---

## KPI Targets

| Month | Articles Published | Email Subscribers | Monthly Revenue |
|---|---|---|---|
| 1 | 12 | 50 | $0–$50 |
| 3 | 36 | 200 | $50–$200 |
| 6 | 72 | 800 | $300–$800 |
| 9 | 108 | 2,000 | $800–$2,500 |
| 12 | 144 | 5,000 | $2,500–$8,000 |

---

## Contributing

This project is built and maintained using Claude Code. All changes go through PRs — Claude Code reviews every PR automatically via GitHub Actions.

```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Make changes using Claude Code
claude

# Push and open PR
git push origin feature/your-feature-name
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built with ❤️ using [Claude Code](https://claude.ai/code) by Anthropic*
