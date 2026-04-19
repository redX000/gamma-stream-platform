# Changelog

All notable changes to the Gamma Stream Platform are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — Phase 2: Content Pipeline

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

## [1.0.0] — 2026-04-19 — Phase 1: Foundation

### Added
- `CLAUDE.md` — Master blueprint and Claude Code operating manual
- `README.md` — Public-facing project documentation with revenue stack, tech stack, and KPI targets
- `architecture.md` — Full system design document
- `monetization.md` — Affiliate programs, commission rates, and revenue strategy
- `setup-guide.md` — Step-by-step deployment instructions
- `scaling-roadmap.md` — Month-by-month growth plan through Month 12
