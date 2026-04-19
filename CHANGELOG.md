# Changelog

All notable changes to the Gamma Stream Platform are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — Phase 4: Analytics

### Added
- `analytics/dashboard.js` — Unified analytics dashboard; fetches data from GA4 (BetaAnalyticsDataClient), ConvertKit API v3, WordPress REST API, and local affiliate ledger in parallel; renders formatted console summary with KPI progress bars; `--report` flag saves timestamped JSON to `analytics/reports/`; `--weekly` flag emails full HTML report via nodemailer; graceful fallback for each data source when credentials are absent
- `analytics/kpis.md` — Full KPI reference: month-by-month targets (articles, traffic, email, revenue) through Month 12; measurement instructions and data sources for each KPI; recovery actions and decision tree for underperforming metrics; reporting cadence guide
- `analytics/reports/.gitkeep` — Placeholder to track the auto-generated reports directory in git

### Changed
- `package.json` — Bumped to v1.3.0; added `@google-analytics/data` dependency; added `dashboard` and `dashboard:report` npm scripts
- `.env.example` — Added `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_KEY_PATH`, `GA4_SERVICE_ACCOUNT_JSON` (for GitHub Actions inline credentials)

---

## [1.2.0] — Phase 3: Automation

### Added
- `automation/social-poster.js` — Posts latest WordPress article to Reddit (via snoowrap) and Pinterest (via API v5); `--platform reddit|pinterest|all` flag; graceful partial failure (one platform failing doesn't block the other)
- `automation/email-sequences/welcome.md` — 5-email, 7-day welcome sequence: lead magnet delivery, quick-win tip, tool introduction, case study, and engagement ask; all emails include FTC-compliant affiliate disclosures
- `automation/email-sequences/nurture.md` — 4 weekly value emails: productivity workflow breakdown, free tool stack, 6-month income case study with real numbers, and phased AI tools budget guide
- `automation/email-sequences/promo.md` — 3 promotional email templates: flash sale announcement, new tool launch review, and limited bonus offer with FTC disclosures
- `automation/affiliate-tracker.js` — Commission ledger (local JSON); tracks all 8 affiliate programs from CLAUDE.md; weekly HTML email reports via nodemailer; CLI commands: `add`, `list`, `summary`, `report`
- `automation/lead-magnet/ai-tools-guide.md` — "The Ultimate AI Tools Guide 2026": 10 sections covering writing, SEO, automation, email, design, video, research, business tools, affiliate program rankings, and phased budget strategy; affiliate link placeholders throughout

### Changed
- `package.json` — Bumped to v1.2.0; added `snoowrap`, `nodemailer` dependencies; added `social`, `tracker`, `tracker:report` npm scripts
- `.env.example` — Added Reddit OAuth vars (`REDDIT_USERNAME`, `REDDIT_PASSWORD`, `REDDIT_USER_AGENT`), `PINTEREST_BOARD_ID`, and SMTP email vars (`NOTIFICATION_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

---

## [1.1.0] — Phase 2: Content Pipeline


### Added
- `content-pipeline/generator.js` — Claude API article generator with prompt caching; supports review, comparison, top-list, and tutorial content types; saves articles with YAML front matter
- `content-pipeline/seo-optimizer.js` — SEO scoring engine (0–100), keyword density analysis, Claude Haiku-powered title and meta description generation
- `content-pipeline/publisher.js` — WordPress REST API client; handles post creation, category/tag resolution, Yoast SEO meta fields, and markdown-to-HTML conversion
- `content-pipeline/scheduler.js` — Daily pipeline runner; rotating 20-keyword queue, Mon/Wed/Fri publish schedule, dry-run and force modes, auto-draft on low SEO score
- `content-pipeline/templates/review.md` — Full review article template with pricing table, pros/cons, and CTA structure
- `content-pipeline/templates/comparison.md` — Head-to-head comparison template with feature matrix and per-category winners
- `content-pipeline/templates/top-list.md` — Ranked list template with quick comparison table and buying guide
- `content-pipeline/templates/tutorial.md` — Step-by-step tutorial template with prerequisites, worked example, and troubleshooting table
- `package.json` — Node.js project config with ES module support; scripts for `generate`, `schedule`, `schedule:dry`, `seo`
- `.gitignore` — Excludes `.env`, `node_modules/`, generated articles, queue state, and logs
- `.env.example` — Template for all required environment variables (API keys, WordPress, email, analytics)

### Changed
- `README.md` — Added content pipeline commands, updated project structure tree to reflect Phase 2 files

---

## [1.0.0] — Phase 1: Foundation

### Added
- `CLAUDE.md` — Master blueprint and Claude Code operating manual
- `README.md` — Public-facing project documentation with revenue stack, tech stack, and KPI targets
- `architecture.md` — Full system design document
- `monetization.md` — Affiliate programs, commission rates, and revenue strategy
- `setup-guide.md` — Step-by-step deployment instructions
- `scaling-roadmap.md` — Month-by-month growth plan through Month 12
