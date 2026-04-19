# Gamma Stream Platform — System Architecture

## Overview

Gamma Stream is a multi-layered autonomous income system. Each layer is independently functional and adds incremental revenue on top of the previous one.

```
┌─────────────────────────────────────────────────────────┐
│                    TRAFFIC SOURCES                       │
│  SEO (Google) │ Reddit │ Pinterest │ YouTube │ Paid Ads │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   CONTENT LAYER                          │
│         AI-generated articles, reviews, guides           │
│              (Claude API via content-pipeline)           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  MONETIZATION LAYER                      │
│  Affiliate Links │ Display Ads │ Email List │ Products   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   AUTOMATION LAYER                       │
│    GitHub Actions │ Cron Jobs │ API Integrations         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   ANALYTICS LAYER                        │
│       Revenue Dashboard │ KPI Reports │ Alerts           │
└─────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Content Pipeline (`/content-pipeline`)

The engine that powers everything. Runs daily via GitHub Actions.

**Flow:**
```
Keyword Research → Article Generation (Claude API) → SEO Optimization → WordPress Publish
```

**Key files:**
- `generator.js` — Calls Claude API to write articles from templates
- `seo-optimizer.js` — Injects keywords, meta tags, internal links
- `publisher.js` — Posts to WordPress via REST API
- `scheduler.js` — Queues and paces content publishing

**Article types and frequency:**
- Reviews (2x/week): "Jasper AI Review 2026 — Is It Worth It?"
- Comparisons (2x/week): "Jasper vs Copy.ai — Which AI Writer Wins?"
- Tutorials (1x/week): "How to Use Notion AI for Small Business"
- Listicles (1x/week): "10 Best AI Tools for Freelancers in 2026"

---

### 2. Automation Layer (`/automation`)

Handles everything that runs on a schedule.

**Social Poster (`social-poster.js`)**
- Reddit: Posts helpful content in relevant subreddits (r/artificial, r/SaaS, r/blogging)
- Pinterest: Creates and pins visual content with affiliate links
- Runs daily at 09:00 UTC via GitHub Actions

**Email Sequences (`/email-sequences`)**
- Welcome sequence (5 emails over 7 days)
- Nurture sequence (weekly value emails)
- Promotional emails (product launches, affiliate promos)
- Managed via ConvertKit API

**Affiliate Tracker (`affiliate-tracker.js`)**
- Polls affiliate dashboards for commission data
- Aggregates into unified revenue report
- Sends weekly summary email

**Lead Magnet (`/lead-magnet`)**
- "The Ultimate AI Tools Toolkit 2026" — free PDF
- Captures email addresses in exchange
- Auto-delivered via ConvertKit on signup

---

### 3. Analytics Layer (`/analytics`)

**Dashboard (`dashboard.js`)**
- Real-time revenue across all streams
- Traffic sources breakdown
- Email subscriber growth
- Top-performing articles

**Weekly Report (`analytics-report.yml`)**
- Auto-runs every Monday
- Emails KPI summary
- Flags underperforming content

---

### 4. GitHub Actions CI/CD (`/.github/workflows`)

| Workflow | Trigger | What it does |
|---|---|---|
| `content-generation.yml` | Daily cron | Runs generator.js, publishes articles |
| `social-posting.yml` | Daily cron | Posts to Reddit & Pinterest |
| `analytics-report.yml` | Weekly cron | Generates & emails revenue report |
| `claude-review.yml` | PR opened | Claude Code reviews every PR |

---

## Data Flow Diagram

```
[GitHub Actions Cron]
        │
        ▼
[content-pipeline/generator.js]
        │  (calls Anthropic API)
        ▼
[Claude API] ──► [Article Generated]
        │
        ▼
[content-pipeline/seo-optimizer.js]
        │  (keyword injection, meta tags)
        ▼
[content-pipeline/publisher.js]
        │  (WordPress REST API)
        ▼
[Live Article on Site]
        │
        ├──► [Affiliate Links] ──► [Commission Revenue]
        ├──► [Display Ads]     ──► [Ad Revenue]
        └──► [Email Capture]   ──► [List Growth]
                    │
                    ▼
            [ConvertKit Sequence]
                    │
                    ├──► [Affiliate Promos] ──► [Commission Revenue]
                    └──► [Product Sales]   ──► [Digital Product Revenue]
```

---

## Scaling Architecture

### Phase 1: Single Site (Months 1–3)
- 1 niche site
- 1 content pipeline
- Basic affiliate links
- Manual ad setup

### Phase 2: Expanded (Months 4–6)
- Add email automation
- Add social posting
- Add display ads
- Launch lead magnet

### Phase 3: Multi-Site (Months 7–12)
- Clone pipeline for 2nd niche site
- Launch digital product
- Add YouTube Shorts pipeline
- Begin sponsorship outreach

### Phase 4: Empire (Month 12+)
- 3–5 niche sites
- Negotiated affiliate rates
- Mediavine display ads
- Recurring sponsorship contracts
- Micro-SaaS tool (optional)

---

## Security Architecture

- All secrets in GitHub Secrets (never in code)
- `.env` gitignored locally
- Claude Code limited to pre-approved bash commands
- All Claude Code commits are branch-only (never direct to main)
- Human approval required before merging to main
