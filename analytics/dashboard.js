/**
 * @fileoverview Analytics dashboard for Gamma Stream Platform.
 * Aggregates data from four sources into a single revenue + performance view:
 *   1. Google Analytics 4 (BetaAnalyticsDataClient) — sessions, pageviews, new users
 *   2. ConvertKit API v3 — email subscriber count and recent growth
 *   3. WordPress REST API — latest published articles and total post count
 *   4. Local affiliate commission ledger (automation/commissions.json)
 *
 * Default mode: prints a formatted console summary.
 * --report mode: saves a timestamped JSON report to analytics/reports/.
 * --weekly flag: computes 7-day windows for all metrics (used by GitHub Actions cron).
 *
 * Usage:
 *   node analytics/dashboard.js                   # Live console summary
 *   node analytics/dashboard.js --report          # Console + save JSON report
 *   node analytics/dashboard.js --report --weekly # Weekly report mode
 *
 * Requires .env: GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_KEY_PATH (or GA4_SERVICE_ACCOUNT_JSON),
 *   CONVERTKIT_API_KEY, WORDPRESS_URL, NOTIFICATION_EMAIL, SMTP_* (for --report email)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, 'reports');
const LEDGER_FILE = path.join(__dirname, '..', 'automation', 'commissions.json');

// ─── KPI targets from CLAUDE.md (used to compute progress %) ───────────────
const KPI_TARGETS = {
  month1:  { articles: 12, emailSubs: 50,   revenue: 50 },
  month3:  { articles: 36, emailSubs: 200,  revenue: 200 },
  month6:  { articles: 72, emailSubs: 800,  revenue: 800 },
  month9:  { articles: 108, emailSubs: 2000, revenue: 2500 },
  month12: { articles: 144, emailSubs: 5000, revenue: 8000 },
};

/**
 * Format a date range string for API queries.
 * @param {number} daysBack - Number of days back from today
 * @returns {{ startDate: string, endDate: string }} YYYY-MM-DD strings
 */
function getDateRange(daysBack) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

/**
 * Pull session, pageview, and new-user metrics from Google Analytics 4.
 * Uses the @google-analytics/data BetaAnalyticsDataClient (OAuth2 service account).
 * Falls back gracefully with zeros if the SDK is not installed or credentials are missing.
 *
 * @param {number} [daysBack=7] - Lookback window in days
 * @returns {Promise<Object>} sessions, pageviews, newUsers, topPages[]
 */
async function fetchGA4Data(daysBack = 7) {
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!propertyId) {
    console.warn('[dashboard] GA4_PROPERTY_ID not set — skipping GA4 fetch');
    return { sessions: 0, pageviews: 0, newUsers: 0, topPages: [], source: 'skipped' };
  }

  console.log(`[dashboard] Fetching GA4 data (last ${daysBack} days)...`);

  let BetaAnalyticsDataClient;
  try {
    const mod = await import('@google-analytics/data');
    BetaAnalyticsDataClient = mod.BetaAnalyticsDataClient;
  } catch {
    console.warn('[dashboard] @google-analytics/data not installed — run: npm install @google-analytics/data');
    return { sessions: 0, pageviews: 0, newUsers: 0, topPages: [], source: 'sdk-missing' };
  }

  // Support either a file path or an inlined JSON string (for GitHub Actions secrets)
  let clientOptions = {};
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    clientOptions.credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GA4_SERVICE_ACCOUNT_KEY_PATH) {
    clientOptions.keyFilename = process.env.GA4_SERVICE_ACCOUNT_KEY_PATH;
  } else {
    console.warn('[dashboard] No GA4 credentials set (GA4_SERVICE_ACCOUNT_JSON or GA4_SERVICE_ACCOUNT_KEY_PATH)');
    return { sessions: 0, pageviews: 0, newUsers: 0, topPages: [], source: 'no-credentials' };
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient(clientOptions);
    const { startDate, endDate } = getDateRange(daysBack);

    // Primary metrics report
    const [metricsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'newUsers' },
      ],
    });

    const row = metricsResponse.rows?.[0]?.metricValues || [];
    const sessions = parseInt(row[0]?.value || '0', 10);
    const pageviews = parseInt(row[1]?.value || '0', 10);
    const newUsers = parseInt(row[2]?.value || '0', 10);

    // Top 5 pages by pageviews
    const [pagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 5,
    });

    const topPages = (pagesResponse.rows || []).map((r) => ({
      path: r.dimensionValues[0].value,
      title: r.dimensionValues[1].value,
      pageviews: parseInt(r.metricValues[0].value, 10),
    }));

    console.log(`[dashboard] GA4: ${sessions} sessions, ${pageviews} pageviews, ${newUsers} new users`);
    return { sessions, pageviews, newUsers, topPages, source: 'ga4', startDate, endDate };
  } catch (err) {
    console.error(`[dashboard] GA4 fetch failed: ${err.message}`);
    return { sessions: 0, pageviews: 0, newUsers: 0, topPages: [], source: 'error', error: err.message };
  }
}

/**
 * Fetch email subscriber stats from the ConvertKit API v3.
 * Returns total subscriber count, active count, and 7-day new subscribers.
 *
 * @returns {Promise<Object>} total, active, unconfirmed, unsubscribed, newThisWeek
 */
async function fetchConvertKitStats() {
  const apiKey = process.env.CONVERTKIT_API_KEY;

  if (!apiKey) {
    console.warn('[dashboard] CONVERTKIT_API_KEY not set — skipping ConvertKit fetch');
    return { total: 0, active: 0, newThisWeek: 0, source: 'skipped' };
  }

  console.log('[dashboard] Fetching ConvertKit subscriber stats...');

  try {
    const { default: fetch } = await import('node-fetch');

    // ConvertKit v3 — subscriber counts by status
    const res = await fetch(
      `https://api.convertkit.com/v3/subscribers?api_secret=${apiKey}&per_page=1`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) throw new Error(`ConvertKit API ${res.status}`);
    const data = await res.json();
    const total = data.total_subscribers || 0;

    // Active subscribers specifically
    const activeRes = await fetch(
      `https://api.convertkit.com/v3/subscribers?api_secret=${apiKey}&per_page=1&sort_field=created_at&sort_order=desc`,
      { headers: { Accept: 'application/json' } }
    );
    const activeData = await activeRes.json();

    // New this week: subscribers created in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const newRes = await fetch(
      `https://api.convertkit.com/v3/subscribers?api_secret=${apiKey}&per_page=1&created_after=${weekAgoStr}`,
      { headers: { Accept: 'application/json' } }
    );
    const newData = await newRes.json();
    const newThisWeek = newData.total_subscribers || 0;

    console.log(`[dashboard] ConvertKit: ${total} total subscribers, ${newThisWeek} new this week`);
    return { total, active: activeData.total_subscribers || total, newThisWeek, source: 'convertkit' };
  } catch (err) {
    console.error(`[dashboard] ConvertKit fetch failed: ${err.message}`);
    return { total: 0, active: 0, newThisWeek: 0, source: 'error', error: err.message };
  }
}

/**
 * Fetch article stats from the WordPress REST API.
 * Returns total published post count and the 5 most recent articles.
 *
 * @returns {Promise<Object>} totalPosts, recentPosts[], postsThisWeek
 */
async function fetchWordPressStats() {
  const wpUrl = process.env.WORDPRESS_URL?.replace(/\/$/, '');

  if (!wpUrl) {
    console.warn('[dashboard] WORDPRESS_URL not set — skipping WordPress fetch');
    return { totalPosts: 0, recentPosts: [], postsThisWeek: 0, source: 'skipped' };
  }

  console.log('[dashboard] Fetching WordPress article stats...');

  try {
    const { default: fetch } = await import('node-fetch');

    // Fetch total count via HEAD request (X-WP-Total header)
    const countRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?per_page=1&status=publish`,
      { headers: { Accept: 'application/json' } }
    );
    if (!countRes.ok) throw new Error(`WordPress API ${countRes.status}`);
    const totalPosts = parseInt(countRes.headers.get('X-WP-Total') || '0', 10);

    // Fetch 5 most recent posts with full metadata
    const recentRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?per_page=5&status=publish&orderby=date&order=desc&_fields=id,title,link,date,meta`,
      { headers: { Accept: 'application/json' } }
    );
    const recentPosts = (await recentRes.json()).map((p) => ({
      id: p.id,
      title: p.title.rendered.replace(/&#8211;/g, '—').replace(/&amp;/g, '&'),
      url: p.link,
      date: p.date?.split('T')[0] || 'unknown',
    }));

    // Posts published in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();
    const weekRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?per_page=1&status=publish&after=${weekAgoStr}`,
      { headers: { Accept: 'application/json' } }
    );
    const postsThisWeek = parseInt(weekRes.headers.get('X-WP-Total') || '0', 10);

    console.log(`[dashboard] WordPress: ${totalPosts} total posts, ${postsThisWeek} this week`);
    return { totalPosts, recentPosts, postsThisWeek, source: 'wordpress' };
  } catch (err) {
    console.error(`[dashboard] WordPress fetch failed: ${err.message}`);
    return { totalPosts: 0, recentPosts: [], postsThisWeek: 0, source: 'error', error: err.message };
  }
}

/**
 * Load and aggregate revenue from the local affiliate commission ledger.
 * Computes totals for the current week, current month, and all-time.
 *
 * @returns {Promise<Object>} weekly, monthly, allTime totals and per-program breakdown
 */
async function fetchRevenueData() {
  console.log('[dashboard] Loading affiliate commission ledger...');

  let ledger;
  try {
    const raw = await fs.readFile(LEDGER_FILE, 'utf-8');
    ledger = JSON.parse(raw);
  } catch {
    console.warn('[dashboard] No commission ledger found — revenue will show $0');
    return { weekly: 0, monthly: 0, allTime: 0, byProgram: {}, entryCount: 0, source: 'no-ledger' };
  }

  const now = new Date();

  // Week boundary: last 7 days
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Month boundary: first day of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekly = 0;
  let monthly = 0;
  let allTime = 0;
  const byProgram = {};

  for (const entry of ledger.entries || []) {
    const d = new Date(entry.date);
    const amount = parseFloat(entry.amount) || 0;

    allTime += amount;
    if (d >= monthStart) monthly += amount;
    if (d >= weekStart) weekly += amount;

    // Accumulate per-program
    if (!byProgram[entry.program]) {
      byProgram[entry.program] = { name: entry.programName, total: 0, count: 0 };
    }
    byProgram[entry.program].total += amount;
    byProgram[entry.program].count += 1;
  }

  console.log(`[dashboard] Revenue — weekly: $${weekly.toFixed(2)}, monthly: $${monthly.toFixed(2)}, all-time: $${allTime.toFixed(2)}`);
  return {
    weekly: parseFloat(weekly.toFixed(2)),
    monthly: parseFloat(monthly.toFixed(2)),
    allTime: parseFloat(allTime.toFixed(2)),
    byProgram,
    entryCount: ledger.entries?.length || 0,
    source: 'ledger',
  };
}

/**
 * Determine which KPI milestone is nearest and compute progress percentages.
 * @param {Object} data - Aggregated dashboard data
 * @returns {Object} nearestMilestone, progress percentages, status flags
 */
function computeKpiProgress(data) {
  const articles = data.wordpress.totalPosts;
  const subs = data.convertkit.total;
  const revenue = data.revenue.monthly;

  // Find the nearest upcoming KPI milestone
  const milestones = Object.entries(KPI_TARGETS);
  let nearest = milestones[milestones.length - 1];
  for (const [label, targets] of milestones) {
    if (articles < targets.articles || subs < targets.emailSubs || revenue < targets.revenue) {
      nearest = [label, targets];
      break;
    }
  }

  const [milestoneLabel, milestoneTargets] = nearest;

  return {
    milestone: milestoneLabel,
    targets: milestoneTargets,
    progress: {
      articles: milestoneTargets.articles > 0
        ? Math.min(100, Math.round((articles / milestoneTargets.articles) * 100))
        : 100,
      emailSubs: milestoneTargets.emailSubs > 0
        ? Math.min(100, Math.round((subs / milestoneTargets.emailSubs) * 100))
        : 100,
      revenue: milestoneTargets.revenue > 0
        ? Math.min(100, Math.round((revenue / milestoneTargets.revenue) * 100))
        : 100,
    },
    status: {
      articlesOnTrack: articles >= milestoneTargets.articles * 0.8,
      subsOnTrack: subs >= milestoneTargets.emailSubs * 0.8,
      revenueOnTrack: revenue >= milestoneTargets.revenue * 0.8,
    },
  };
}

/**
 * Render the dashboard as a formatted string for console output.
 * @param {Object} data - Full aggregated data object
 * @returns {string} Formatted multi-line string
 */
function renderConsole(data) {
  const kpi = computeKpiProgress(data);
  const ts = new Date(data.generatedAt).toLocaleString();
  const bar = (pct) => {
    const filled = Math.round(pct / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${pct}%`;
  };

  const lines = [
    '',
    '╔══════════════════════════════════════════════════════╗',
    '║        GAMMA STREAM PLATFORM — ANALYTICS DASHBOARD   ║',
    `║  Generated: ${ts.padEnd(39)}║`,
    '╚══════════════════════════════════════════════════════╝',
    '',

    '── TRAFFIC (GA4) ─────────────────────────────────────',
    `  Sessions (7d):    ${String(data.ga4.sessions).padStart(8)}`,
    `  Pageviews (7d):   ${String(data.ga4.pageviews).padStart(8)}`,
    `  New Users (7d):   ${String(data.ga4.newUsers).padStart(8)}`,
  ];

  if (data.ga4.topPages?.length) {
    lines.push('  Top Pages:');
    data.ga4.topPages.forEach((p, i) => {
      lines.push(`    ${i + 1}. ${p.title.slice(0, 40).padEnd(40)} ${String(p.pageviews).padStart(6)} views`);
    });
  }

  lines.push(
    '',
    '── EMAIL (CONVERTKIT) ────────────────────────────────',
    `  Total Subscribers: ${String(data.convertkit.total).padStart(7)}`,
    `  New This Week:     ${String(data.convertkit.newThisWeek).padStart(7)}`,
    '',
    '── CONTENT (WORDPRESS) ───────────────────────────────',
    `  Total Posts:       ${String(data.wordpress.totalPosts).padStart(7)}`,
    `  Published This Wk: ${String(data.wordpress.postsThisWeek).padStart(7)}`,
  );

  if (data.wordpress.recentPosts?.length) {
    lines.push('  Recent Articles:');
    data.wordpress.recentPosts.slice(0, 3).forEach((p) => {
      lines.push(`    • [${p.date}] ${p.title.slice(0, 45)}`);
    });
  }

  lines.push(
    '',
    '── REVENUE (AFFILIATE LEDGER) ────────────────────────',
    `  This Week:         $${String(data.revenue.weekly.toFixed(2)).padStart(9)}`,
    `  This Month:        $${String(data.revenue.monthly.toFixed(2)).padStart(9)}`,
    `  All-Time:          $${String(data.revenue.allTime.toFixed(2)).padStart(9)}`,
  );

  const topPrograms = Object.values(data.revenue.byProgram)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);
  if (topPrograms.length) {
    lines.push('  By Program (all-time):');
    topPrograms.forEach((p) => {
      lines.push(`    • ${p.name.padEnd(18)} $${p.total.toFixed(2)}`);
    });
  }

  lines.push(
    '',
    `── KPI PROGRESS — Next Milestone: ${kpi.milestone.toUpperCase()} ──────────────`,
    `  Articles  [${bar(kpi.progress.articles)}]  ${data.wordpress.totalPosts}/${kpi.targets.articles}`,
    `  Email     [${bar(kpi.progress.emailSubs)}]  ${data.convertkit.total}/${kpi.targets.emailSubs}`,
    `  Revenue   [${bar(kpi.progress.revenue)}]  $${data.revenue.monthly.toFixed(0)}/$${kpi.targets.revenue}`,
    '',
    `  Articles on track: ${kpi.status.articlesOnTrack ? '✓' : '✗ BEHIND'}`,
    `  Email on track:    ${kpi.status.subsOnTrack ? '✓' : '✗ BEHIND'}`,
    `  Revenue on track:  ${kpi.status.revenueOnTrack ? '✓' : '✗ BEHIND'}`,
    '',
    '──────────────────────────────────────────────────────',
    '',
  );

  return lines.join('\n');
}

/**
 * Save a JSON report to analytics/reports/ with a timestamped filename.
 * @param {Object} data - Full dashboard data
 * @returns {Promise<string>} Path to saved file
 */
async function saveReport(data) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  const ts = new Date(data.generatedAt)
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const filename = `report-${ts}.json`;
  const filePath = path.join(REPORTS_DIR, filename);

  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[dashboard] Report saved: ${filePath}`);
  return filePath;
}

/**
 * Send the weekly report as an HTML email via nodemailer.
 * @param {Object} data - Full dashboard data
 * @param {string} reportPath - Path to saved JSON report
 * @returns {Promise<void>}
 */
async function sendEmailReport(data, reportPath) {
  const to = process.env.NOTIFICATION_EMAIL;
  if (!to) {
    console.warn('[dashboard] NOTIFICATION_EMAIL not set — skipping email send');
    return;
  }

  console.log(`[dashboard] Sending weekly email report to ${to}...`);

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    throw new Error('nodemailer not installed — run: npm install nodemailer');
  }

  const kpi = computeKpiProgress(data);
  const statusIcon = (ok) => ok ? '✅' : '⚠️';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:32px;color:#fff;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#7dd3fc;margin-bottom:8px;">Gamma Stream Platform</div>
    <h1 style="margin:0;font-size:22px;font-weight:700;">Weekly Analytics Report</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${new Date(data.generatedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <!-- Revenue highlight -->
  <div style="display:flex;background:#f0fdf4;border-bottom:1px solid #dcfce7;">
    <div style="flex:1;padding:20px;text-align:center;border-right:1px solid #dcfce7;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">This Week</div>
      <div style="font-size:28px;font-weight:800;color:#16a34a;">$${data.revenue.weekly.toFixed(2)}</div>
    </div>
    <div style="flex:1;padding:20px;text-align:center;border-right:1px solid #dcfce7;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">This Month</div>
      <div style="font-size:28px;font-weight:800;color:#0f172a;">$${data.revenue.monthly.toFixed(2)}</div>
    </div>
    <div style="flex:1;padding:20px;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">All-Time</div>
      <div style="font-size:28px;font-weight:800;color:#0f172a;">$${data.revenue.allTime.toFixed(2)}</div>
    </div>
  </div>

  <!-- Metrics grid -->
  <div style="padding:24px 28px;">
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#374151;">Key Metrics (Last 7 Days)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#f8fafc;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Metric</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;">Value</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;">Status</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px;">GA4 Sessions</td>
        <td style="padding:10px 12px;text-align:right;">${data.ga4.sessions.toLocaleString()}</td>
        <td style="padding:10px 12px;text-align:right;">${data.ga4.source === 'ga4' ? '✅' : '⚠️ No data'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px;">Pageviews</td>
        <td style="padding:10px 12px;text-align:right;">${data.ga4.pageviews.toLocaleString()}</td>
        <td style="padding:10px 12px;text-align:right;"></td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px;">Email Subscribers</td>
        <td style="padding:10px 12px;text-align:right;">${data.convertkit.total.toLocaleString()}</td>
        <td style="padding:10px 12px;text-align:right;">+${data.convertkit.newThisWeek} this week</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px;">Articles Published</td>
        <td style="padding:10px 12px;text-align:right;">${data.wordpress.totalPosts.toLocaleString()} total</td>
        <td style="padding:10px 12px;text-align:right;">+${data.wordpress.postsThisWeek} this week</td>
      </tr>
    </table>

    <!-- KPI milestone -->
    <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#374151;">KPI Progress — Next Milestone: ${kpi.milestone.toUpperCase()}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr>
        <td style="padding:8px 0;width:120px;color:#6b7280;">Articles</td>
        <td style="padding:8px 8px;">
          <div style="background:#e2e8f0;border-radius:4px;height:8px;">
            <div style="background:#3b82f6;height:8px;border-radius:4px;width:${kpi.progress.articles}%;"></div>
          </div>
        </td>
        <td style="padding:8px 0;text-align:right;width:80px;font-size:12px;color:#6b7280;">${data.wordpress.totalPosts}/${kpi.targets.articles} ${statusIcon(kpi.status.articlesOnTrack)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Email Subs</td>
        <td style="padding:8px 8px;">
          <div style="background:#e2e8f0;border-radius:4px;height:8px;">
            <div style="background:#8b5cf6;height:8px;border-radius:4px;width:${kpi.progress.emailSubs}%;"></div>
          </div>
        </td>
        <td style="padding:8px 0;text-align:right;font-size:12px;color:#6b7280;">${data.convertkit.total}/${kpi.targets.emailSubs} ${statusIcon(kpi.status.subsOnTrack)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Revenue</td>
        <td style="padding:8px 8px;">
          <div style="background:#e2e8f0;border-radius:4px;height:8px;">
            <div style="background:#16a34a;height:8px;border-radius:4px;width:${kpi.progress.revenue}%;"></div>
          </div>
        </td>
        <td style="padding:8px 0;text-align:right;font-size:12px;color:#6b7280;">$${data.revenue.monthly.toFixed(0)}/$${kpi.targets.revenue} ${statusIcon(kpi.status.revenueOnTrack)}</td>
      </tr>
    </table>

    ${data.ga4.topPages?.length ? `
    <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#374151;">Top Pages This Week</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${data.ga4.topPages.map((p, i) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 12px;color:#6b7280;">${i + 1}</td>
        <td style="padding:8px 4px;">${p.title.slice(0, 45)}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;">${p.pageviews.toLocaleString()}</td>
      </tr>`).join('')}
    </table>` : ''}
  </div>

  <!-- Footer -->
  <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      Generated by Gamma Stream analytics/dashboard.js — report saved to ${reportPath || 'analytics/reports/'}<br>
      Run manually: <code>node analytics/dashboard.js --report --weekly</code>
    </p>
  </div>
</div>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const weekStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  await transporter.sendMail({
    from: `"Gamma Stream" <${process.env.SMTP_USER}>`,
    to,
    subject: `Gamma Stream Weekly Report — $${data.revenue.weekly.toFixed(2)} revenue | ${data.ga4.sessions} sessions | ${weekStr}`,
    html,
  });

  console.log(`[dashboard] Email report sent to ${to}`);
}

/**
 * Main entry point — fetches all data sources, renders console output,
 * and optionally saves + emails the report.
 *
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.report=false] - Save JSON report to analytics/reports/
 * @param {boolean} [opts.weekly=false] - Weekly mode (email report is sent)
 * @param {number} [opts.daysBack=7] - Lookback window for GA4 and WP queries
 * @returns {Promise<Object>} Full dashboard data object
 */
export async function runDashboard({ report = false, weekly = false, daysBack = 7 } = {}) {
  console.log(`[dashboard] Starting — report: ${report}, weekly: ${weekly}, daysBack: ${daysBack}`);

  // Fetch all four data sources in parallel to minimize wall-clock time
  const [ga4, convertkit, wordpress, revenue] = await Promise.all([
    fetchGA4Data(daysBack),
    fetchConvertKitStats(),
    fetchWordPressStats(),
    fetchRevenueData(),
  ]);

  const data = {
    generatedAt: new Date().toISOString(),
    daysBack,
    ga4,
    convertkit,
    wordpress,
    revenue,
    kpi: computeKpiProgress({ ga4, convertkit, wordpress, revenue }),
  };

  // Always render console output
  console.log(renderConsole(data));

  let reportPath = null;

  if (report) {
    reportPath = await saveReport(data);
  }

  if (weekly || (report && process.env.NOTIFICATION_EMAIL)) {
    try {
      await sendEmailReport(data, reportPath);
    } catch (err) {
      console.error(`[dashboard] Email send failed (non-fatal): ${err.message}`);
    }
  }

  return data;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isReport = process.argv.includes('--report');
  const isWeekly = process.argv.includes('--weekly');

  runDashboard({ report: isReport, weekly: isWeekly })
    .then(() => console.log('[dashboard] Done'))
    .catch((err) => {
      console.error(`[dashboard] Fatal: ${err.message}`);
      process.exit(1);
    });
}
