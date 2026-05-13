# Gamma Stream Control Center

Private admin dashboard for monitoring the Gamma Stream platform in real-time.

**Not for public access. Admin/Lisa access only.**

---

## Quick Start

```bash
cd control-center

# 1. Copy env and set credentials
copy .env.example .env   # Windows
# edit .env — set VITE_ADMIN_USER and VITE_ADMIN_PASS

# 2. Install
npm install

# 3. Run (opens at http://localhost:4000)
npm run dev
```

Default credentials (change these in `.env`):
- Username: `lisa`
- Password: `gamma_admin_2026`

---

## Sections

| Section | What it shows |
|---|---|
| KPI Cards | Revenue, profit, affiliates, subscribers, CVR, churn, MRR — each with % change and sparkline |
| Revenue & Profit | Line, stacked bar, cumulative area, cost donut charts |
| Affiliates | Sortable/searchable table + top-5 bar chart + trend lines |
| Live Activity | Real-time event feed (signups, sales, conversions, cancels, refunds, alerts) |
| Traffic & Engagement | Page views, sessions, traffic sources, top countries |
| Health & Alerts | Service status, platform alerts, GitHub Actions workflow runs |

---

## Features

- **Date range picker** — 7d / 30d / 90d / 1y presets, filters all sections
- **Auto-refresh** — toggle in header, refetches all data every 30s, new activity events stream live
- **Loading skeletons** — every section shows pixel-perfect skeletons while loading (no spinners)
- **Login gate** — session stored in sessionStorage; env vars for credentials
- **Responsive** — works on desktop and tablet (1280px+, 768px+)
- **Dark mode only** — deep navy/purple Stripe-adjacent aesthetic

---

## Wiring to a Real API

All data fetching is isolated in `src/api/index.js`. Each function is a named export:

| Function | Replace with |
|---|---|
| `getKPIs(dateRange)` | `GET /api/kpis?start=&end=` |
| `getRevenue(dateRange)` | `GET /api/revenue?start=&end=` |
| `getCostBreakdown(dateRange)` | `GET /api/costs?start=&end=` |
| `getAffiliates(dateRange)` | `GET /api/affiliates?start=&end=` |
| `getLiveActivity()` | `GET /api/activity` |
| `getNewActivity()` | WebSocket or SSE |
| `getTraffic(dateRange)` | `GET /api/traffic?start=&end=` |
| `getHealth()` | `GET /api/health` |
| `getWorkflowRuns()` | GitHub Actions API |

Set `VITE_API_BASE_URL` in `.env` and use `authHeaders()` from `api/index.js` for JWT auth.

---

## Tech Stack

- **React 18** + Vite 5
- **Tailwind CSS 3** (custom dark design tokens in `tailwind.config.js`)
- **Recharts 2** — Line, Bar, Area, Pie/Donut
- **lucide-react** — icons
- **date-fns 3** — date formatting

---

## Lisa Integration

Lisa can open this dashboard with voice commands:
- "Open the Gamma dashboard"
- "Open Gamma control center"
- "Pull up the Gamma dashboard"

The dashboard runs at `http://localhost:4000` when `npm run dev` is active.
To auto-start with Lisa, add to `start_app.bat` in the lisa-windows project.
