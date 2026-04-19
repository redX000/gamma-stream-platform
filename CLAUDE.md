# Gamma Stream Platform — Claude Code Master Blueprint

## Project Overview
Gamma Stream is a fully autonomous AI-powered affiliate income platform targeting the AI & SaaS tools niche.
It generates revenue through multiple stacked streams: affiliate commissions, display ads, email marketing,
digital products, brand sponsorships, and YouTube content — all running autonomously with minimal human input.

## Revenue Stack (Build in this order)
1. **Affiliate commissions** — Core, built first, Day 1
2. **Display ads (AdSense)** — Add to informational pages at Month 3
3. **Email list & automation** — Start capturing from Day 1, monetize Month 4
4. **Digital products** — AI-generated guides/toolkits, launch at Month 6
5. **Brand sponsorships** — Pitch brands at Month 8
6. **YouTube Shorts pipeline** — Run parallel from Month 3

## Tech Stack
- **Site**: WordPress (or static Next.js site if preferred)
- **Content pipeline**: Node.js scripts using Anthropic Claude API
- **Email**: ConvertKit (free up to 1,000 subscribers)
- **Scheduling**: GitHub Actions (cron jobs for automation)
- **Analytics**: Google Analytics 4 + custom dashboard
- **Affiliate tracking**: Pretty Links (WordPress plugin)
- **Deployment**: Vercel (free tier) or Netlify

## Project Structure
```
gamma-stream-platform/
├── CLAUDE.md                  ← You are here (master instructions)
├── README.md                  ← Public-facing project docs
├── docs/
│   ├── architecture.md        ← Full system design
│   ├── setup-guide.md         ← Step-by-step deployment
│   ├── monetization.md        ← Affiliate programs & revenue details
│   ├── content-strategy.md    ← SEO & content plan
│   └── scaling-roadmap.md     ← Month-by-month growth plan
├── content-pipeline/
│   ├── generator.js           ← Main AI content generation script
│   ├── scheduler.js           ← Content scheduling logic
│   ├── seo-optimizer.js       ← Keyword research & SEO automation
│   ├── publisher.js           ← Auto-publish to WordPress via API
│   └── templates/             ← Article templates by type
│       ├── review.md
│       ├── comparison.md
│       ├── top-list.md
│       └── tutorial.md
├── automation/
│   ├── email-sequences/       ← ConvertKit email automation scripts
│   │   ├── welcome.md
│   │   ├── nurture.md
│   │   └── promo.md
│   ├── social-poster.js       ← Auto-post to Pinterest/Reddit
│   ├── affiliate-tracker.js   ← Track & report affiliate performance
│   └── lead-magnet/           ← Digital product assets
│       └── ai-tools-guide.md
├── analytics/
│   ├── dashboard.js           ← Revenue tracking dashboard
│   ├── reports/               ← Auto-generated weekly reports
│   └── kpis.md                ← KPI definitions & targets
├── site/
│   ├── config/                ← WordPress/site configuration
│   ├── theme/                 ← Custom theme settings
│   └── plugins.md             ← Required plugins list
└── .github/
    └── workflows/
        ├── content-generation.yml   ← Daily content creation
        ├── social-posting.yml       ← Daily social automation
        ├── analytics-report.yml     ← Weekly revenue report
        └── claude-review.yml        ← Claude Code PR review
```

## Claude Code Rules (ALWAYS follow these)

### Git Workflow
- NEVER push directly to `main`
- Always create feature branches: `feature/[description]`
- Write clear, descriptive commit messages
- Open a PR for every change
- Tag releases with semantic versioning: `v1.0.0`, `v1.1.0` etc.

### Code Standards
- All JavaScript uses ES modules (`import/export`)
- Every file must have a JSDoc header comment explaining its purpose
- All API keys loaded from `.env` — NEVER hardcode secrets
- Add error handling to every async function
- Write console logs for every major operation (for debugging)

### Documentation Rules
- Every new file gets a corresponding entry in `docs/`
- Update `README.md` whenever a new feature is added
- All functions must have inline comments explaining logic
- Keep a `CHANGELOG.md` updated with every PR

### Environment Variables (use `.env`)
```
ANTHROPIC_API_KEY=          # Claude API for content generation
WORDPRESS_URL=              # Your site URL
WORDPRESS_USERNAME=         # WP admin username
WORDPRESS_APP_PASSWORD=     # WP application password
CONVERTKIT_API_KEY=         # Email automation
GA4_MEASUREMENT_ID=         # Analytics
REDDIT_CLIENT_ID=           # Reddit posting
REDDIT_SECRET=              # Reddit posting
PINTEREST_ACCESS_TOKEN=     # Pinterest automation
```

### Security Rules
- `.env` is in `.gitignore` — never commit it
- `.env.example` (with blank values) IS committed as a template
- No `rm -rf` commands
- No direct database commands without backup first

## Build Order for Claude Code
When building this project, follow this exact sequence:

1. **Phase 1 — Foundation** (Do first)
   - Set up project structure & git repo
   - Create all documentation files
   - Set up `.env.example` and `.gitignore`
   - Create `README.md`

2. **Phase 2 — Content Pipeline** (Core engine)
   - Build `content-pipeline/generator.js`
   - Build article templates
   - Build `content-pipeline/seo-optimizer.js`
   - Build `content-pipeline/publisher.js`
   - Build `content-pipeline/scheduler.js`

3. **Phase 3 — Automation**
   - Build `automation/social-poster.js`
   - Build email sequences in `automation/email-sequences/`
   - Build `automation/affiliate-tracker.js`
   - Create lead magnet in `automation/lead-magnet/`

4. **Phase 4 — Analytics**
   - Build `analytics/dashboard.js`
   - Set up weekly report automation

5. **Phase 5 — GitHub Actions CI/CD**
   - Set up all workflow `.yml` files
   - Connect Claude Code GitHub Action for PR reviews
   - Test all cron jobs

## Key Affiliate Programs to Integrate
| Program | Commission | Sign-up URL |
|---|---|---|
| Jasper AI | 25% recurring | jasper.ai/affiliate |
| Surfer SEO | 25% recurring | surferseo.com/affiliate |
| Copy.ai | 45% recurring | copy.ai/affiliate |
| Notion AI | 20% per sale | notion.so/affiliate |
| Zapier | 20-25% recurring | zapier.com/affiliate |
| ConvertKit | 30% recurring | convertkit.com/affiliate |
| Scalenut | 30% lifetime | scalenut.com/affiliate |
| Systeme.io | 60% recurring | systeme.io/affiliate |

## Content Strategy
- **Primary keyword targets**: "best AI tools for [audience]", "AI tool reviews", "AI vs AI comparisons"
- **Content types**: Reviews (40%), Comparisons (30%), Tutorials (20%), Listicles (10%)
- **Publishing frequency**: 3 articles/week (automated)
- **Target word count**: 1,500–2,500 words per article
- **SEO target**: Low-competition, high-intent keywords first

## Monthly KPI Targets
| Month | Articles | Email Subs | Monthly Revenue |
|---|---|---|---|
| 1 | 12 | 50 | $0–$50 |
| 3 | 36 | 200 | $50–$200 |
| 6 | 72 | 800 | $300–$800 |
| 9 | 108 | 2,000 | $800–$2,500 |
| 12 | 144 | 5,000 | $2,500–$8,000 |

## CI/CD — GitHub Actions Cron Schedule
- `content-generation.yml` — runs daily at 06:00 UTC
- `social-posting.yml` — runs daily at 09:00 UTC
- `analytics-report.yml` — runs every Monday at 08:00 UTC
- `claude-review.yml` — triggers on every PR

## How to Use This File
When you open Claude Code in the terminal and navigate to this project directory,
Claude Code reads this `CLAUDE.md` automatically and uses it as your operating manual.

To start building, simply run:
```bash
claude
```
Then tell Claude Code what to build next, e.g.:
> "Build Phase 1 — Foundation. Set up the full project structure, all docs, .gitignore, .env.example, and push to GitHub."
