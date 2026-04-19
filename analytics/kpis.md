# Gamma Stream Platform — KPI Definitions & Targets

> This document defines every tracked KPI, its month-by-month target, how to measure it, and the recovery action to take when a KPI is underperforming.

---

## KPI Dashboard

Run the live dashboard at any time:

```bash
node analytics/dashboard.js               # Console snapshot
node analytics/dashboard.js --report      # Console + save JSON
node analytics/dashboard.js --report --weekly   # Full weekly report + email
```

---

## Monthly KPI Targets

| Month | Articles Published | Email Subscribers | Monthly Revenue | Monthly Traffic |
|-------|-------------------|------------------|----------------|----------------|
| 1     | 12                | 50               | $0–$50         | 500–1,000      |
| 2     | 24                | 100              | $20–$100       | 1,500–3,000    |
| 3     | 36                | 200              | $50–$200       | 4,000–8,000    |
| 4     | 48                | 400              | $100–$400      | 8,000–15,000   |
| 5     | 60                | 600              | $200–$600      | 12,000–22,000  |
| 6     | 72                | 800              | $300–$800      | 18,000–35,000  |
| 7     | 84                | 1,200            | $500–$1,200    | 25,000–50,000  |
| 8     | 96                | 1,600            | $600–$1,800    | 35,000–65,000  |
| 9     | 108               | 2,000            | $800–$2,500    | 45,000–80,000  |
| 10    | 120               | 3,000            | $1,200–$3,500  | 55,000–100,000 |
| 11    | 132               | 4,000            | $1,800–$5,500  | 70,000–120,000 |
| 12    | 144               | 5,000            | $2,500–$8,000  | 90,000–150,000 |

**Publishing cadence required:** 3 articles/week (Mon/Wed/Fri via `scheduler.js`)

---

## KPI Definitions

### 1. Articles Published

**What it measures:** Total number of posts with `status: publish` in WordPress.

**How to measure:**
- Dashboard: `data.wordpress.totalPosts`
- Manual: WordPress Admin → Posts → Published
- API: `GET /wp/v2/posts?status=publish` → `X-WP-Total` header

**Target:** 3 per week (12/month) from Month 1 onwards. No ramp-up — the pipeline runs from Day 1.

**What "on track" means:** ≥80% of monthly target by the 3rd week of the month.

**Recovery actions if behind:**
1. Check `content-pipeline/queue.json` — if `index` hasn't advanced, the scheduler isn't running
2. Verify GitHub Actions `content-generation.yml` is enabled and the cron job fired
3. Run `node content-pipeline/scheduler.js --force` manually to catch up
4. If WordPress credentials are failing, check `WORDPRESS_APP_PASSWORD` in `.env`
5. If SEO scores are too low (drafts piling up), lower `MIN_PUBLISH_SCORE` in `scheduler.js` temporarily from 50 to 40

---

### 2. Email Subscribers

**What it measures:** Active (confirmed) subscriber count in ConvertKit.

**How to measure:**
- Dashboard: `data.convertkit.total` and `data.convertkit.newThisWeek`
- Manual: ConvertKit → Subscribers
- API: `GET /v3/subscribers?api_secret=KEY` → `total_subscribers`

**Target:** 50 by end of Month 1. Growth compounds through organic search + lead magnet.

**Growth levers (in priority order):**
1. Lead magnet conversion rate — "The Ultimate AI Tools Guide 2026" should convert 2–4% of visitors
2. In-article opt-in forms — every article should have an embedded ConvertKit form
3. Exit-intent popup — deploy on high-traffic pages after Month 2
4. Reddit/Pinterest traffic driving to lead magnet page

**Recovery actions if behind:**
1. Check that the ConvertKit embed code is live on the WordPress site
2. Check lead magnet landing page — is it indexed by Google?
3. Increase posting frequency on Reddit (2–3 posts/week vs 1)
4. A/B test the lead magnet headline — try value-first ("Save 10 hours/week") vs. content-first ("The Ultimate Guide")
5. If < 20 subs by end of Month 1: manually post to 5 relevant Facebook groups and link to the lead magnet

---

### 3. Monthly Revenue

**What it measures:** Total affiliate commissions earned in the calendar month across all 8 programs.

**How to measure:**
- Dashboard: `data.revenue.monthly`
- Manual: `node automation/affiliate-tracker.js summary`
- Source: Affiliate dashboards (Jasper, Surfer, Copy.ai, etc.) — log commissions with `affiliate-tracker.js add`

**Revenue ramp expectation:** Revenue lags traffic by 6–8 weeks due to Google's sandbox period. Month 1 revenue is typically $0–$50 even with consistent publishing.

**Top earning programs (target mix):**

| Program | Target % of Revenue | Why |
|---------|--------------------|----|
| Jasper AI (25% recurring) | 30–35% | Highest retention, used by agencies |
| Surfer SEO (25% recurring) | 20–25% | Sticky tool, high LTV |
| Systeme.io (60% recurring) | 20–25% | Highest commission rate |
| Copy.ai (45% recurring) | 15–20% | Easiest conversion (free plan) |
| Others | 10–15% | Zapier, ConvertKit, Notion, Scalenut |

**Recovery actions if behind:**
1. Check that affiliate links are correctly formatted — use Pretty Links to track click-through rates
2. If clicks are high but conversions are low: review CTA placement — CTAs should appear above the fold in reviews and at the end of comparisons
3. If traffic is too low for conversions: focus on content before monetization — revenue follows traffic by 6–8 weeks
4. Add comparison CTAs: "Still deciding? [Jasper vs Copy.ai →]" — comparison content converts 2–3x better than reviews alone
5. Consider a seasonal push: create a "Black Friday AI Tools Deals" roundup (published in October) — this article type consistently generates 5–10x normal revenue

---

### 4. Monthly Traffic (Google Analytics 4 Sessions)

**What it measures:** Total sessions (visits) to the WordPress site in the calendar month.

**How to measure:**
- Dashboard: `data.ga4.sessions` (7-day rolling)
- Manual: GA4 → Reports → Acquisition → Overview → Sessions
- Note: GA4 does not track monthly in the dashboard API — extrapolate from 7-day: `weeklyAvg × 4.3`

**Traffic growth model:**
- Months 1–2: Near zero. Google's sandbox — articles exist but don't rank yet.
- Month 3: First rankings appear. 10–30 articles indexed, 2–5 in positions 8–20.
- Month 4–6: Rankings stabilize. Compounding begins.
- Month 7+: Exponential phase if content quality and publishing cadence are maintained.

**Key traffic metric: Organic Search %**
- Target: ≥70% organic search by Month 6
- If < 50% organic at Month 6: content is not ranking — run a full Surfer SEO audit of the top 10 articles

**Recovery actions if behind:**
1. **Low impressions in GSC:** Submit sitemap to Google Search Console. Check that `WORDPRESS_URL/sitemap.xml` is live.
2. **Articles indexed but ranking 20+:** Run Surfer SEO audit on all articles. Reoptimize to hit 70+ SEO score.
3. **High bounce rate (>80%):** Articles may be ranking for the wrong intent. Check that title matches content exactly.
4. **No index growth in Month 2:** Ensure WordPress robots.txt is set to allow Googlebot. Check no `noindex` tags are set.
5. **Plateau at Month 4:** Switch content focus to longer-tail keywords — 4–5 word phrases have 50% less competition and higher conversion intent.

---

### 5. Weekly Cadence KPIs (Operational)

These are checked weekly via the automated report:

| Metric | Weekly Target | Alert Threshold |
|--------|--------------|----------------|
| Articles published | 3 | < 2 → investigate pipeline |
| Email opens | ≥ 25% open rate | < 20% → check deliverability |
| New subscribers | ≥ 5 | < 2 → check opt-in forms |
| Affiliate clicks | ≥ 50 | < 20 → check link placement |
| GA4 sessions | Growing week-over-week | >20% drop → check indexing |

---

## KPI Review Cadence

| Review Type | Frequency | Owner | Action |
|-------------|-----------|-------|--------|
| Pipeline check | Daily (automated) | GitHub Actions | Alert if scheduler fails |
| Traffic + subs | Weekly (automated) | `dashboard.js --weekly` | Email report to NOTIFICATION_EMAIL |
| Revenue review | Weekly (manual) | Affiliate dashboards | Log commissions to tracker |
| Full KPI review | Monthly | Founder | Adjust content strategy if 2+ KPIs are behind |
| Strategy pivot | Quarterly | Founder | Review top-performing content types and double down |

---

## Underperformance Decision Tree

```
Is publishing cadence on track? (3 articles/week)
├── NO → Fix pipeline first. Nothing else matters.
│         Check GitHub Actions cron, WordPress credentials, and API key.
└── YES → Is traffic growing week-over-week?
          ├── NO (Month 1–2) → Normal. Google sandbox. Keep publishing.
          ├── NO (Month 3+) → SEO audit needed. Run Surfer on all articles.
          │                   Check Search Console for crawl errors.
          └── YES → Are email subscribers growing?
                    ├── NO → Fix opt-in form placement. A/B test lead magnet.
                    └── YES → Is revenue growing?
                              ├── NO → Check affiliate link placement and CTAs.
                              │       Add comparison articles (highest converting type).
                              └── YES → Scale. Increase publishing to 5/week.
                                        Add a second niche site in Month 9.
```

---

## Reporting Artifacts

| Report | Location | Generated By | Frequency |
|--------|----------|-------------|-----------|
| Weekly JSON snapshot | `analytics/reports/report-YYYY-MM-DDTHH-MM-SS.json` | `dashboard.js --report` | Weekly (Monday 08:00 UTC via GitHub Actions) |
| Console summary | Terminal output | `dashboard.js` | On demand |
| Commission ledger | `automation/commissions.json` | `affiliate-tracker.js` | Continuous (manual entries) |
| Weekly email | Sent to `NOTIFICATION_EMAIL` | `dashboard.js --weekly` | Weekly |
