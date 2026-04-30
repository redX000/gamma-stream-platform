// Builds and uploads a live analytics dashboard to WordPress as a private page at /live-dashboard.

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.WORDPRESS_URL?.replace(/\/$/, '') || 'https://gammacash.online';
const LEDGER_FILE = path.join(__dirname, '..', 'automation', 'commissions.json');
const DASHBOARD_SLUG = 'live-dashboard';

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _token = null;

async function getToken() {
  if (_token) return _token;
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${BASE_URL}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.WORDPRESS_USERNAME, password: process.env.WORDPRESS_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`JWT auth failed: ${data.message}`);
  _token = data.token;
  return _token;
}

async function wp(endpoint, method = 'GET', body = null, { ignoreError = false } = {}) {
  const { default: fetch } = await import('node-fetch');
  const token = await getToken();
  const opts = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}/wp-json${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.text();
    if (ignoreError) return null;
    throw new Error(`WP API ${res.status} ${method} ${endpoint}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchGA4(daysBack = 7) {
  if (!process.env.GA4_PROPERTY_ID || !process.env.GA4_SERVICE_ACCOUNT_JSON) {
    return { sessions: 0, pageviews: 0, newUsers: 0, topPages: [], source: 'skipped' };
  }
  try {
    const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
    const client = new BetaAnalyticsDataClient({ credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON) });
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];

    const [[metrics], [pages]] = await Promise.all([
      client.runReport({
        property: `properties/${process.env.GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'newUsers' }],
      }),
      client.runReport({
        property: `properties/${process.env.GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 5,
      }),
    ]);

    const row = metrics.rows?.[0]?.metricValues || [];
    return {
      sessions: parseInt(row[0]?.value || '0', 10),
      pageviews: parseInt(row[1]?.value || '0', 10),
      newUsers: parseInt(row[2]?.value || '0', 10),
      topPages: (pages.rows || []).map(r => ({
        path: r.dimensionValues[0].value,
        title: r.dimensionValues[1].value,
        views: parseInt(r.metricValues[0].value, 10),
      })),
      source: 'ga4',
    };
  } catch (err) {
    console.warn(`[dashboard] GA4 error: ${err.message}`);
    return { sessions: 0, pageviews: 0, newUsers: 0, topPages: [], source: 'error' };
  }
}

async function fetchConvertKit() {
  if (!process.env.CONVERTKIT_API_KEY) {
    return { total: 0, newThisWeek: 0, source: 'skipped' };
  }
  try {
    const { default: fetch } = await import('node-fetch');
    const key = process.env.CONVERTKIT_API_KEY;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const [total, recent] = await Promise.all([
      fetch(`https://api.convertkit.com/v3/subscribers?api_secret=${key}&per_page=1`).then(r => r.json()),
      fetch(`https://api.convertkit.com/v3/subscribers?api_secret=${key}&per_page=1&created_after=${weekAgo}`).then(r => r.json()),
    ]);
    return {
      total: total.total_subscribers || 0,
      newThisWeek: recent.total_subscribers || 0,
      source: 'convertkit',
    };
  } catch (err) {
    console.warn(`[dashboard] ConvertKit error: ${err.message}`);
    return { total: 0, newThisWeek: 0, source: 'error' };
  }
}

async function fetchWordPressStats() {
  try {
    const { default: fetch } = await import('node-fetch');
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [countRes, recentRes, weekRes] = await Promise.all([
      fetch(`${BASE_URL}/wp-json/wp/v2/posts?per_page=1&status=publish`),
      fetch(`${BASE_URL}/wp-json/wp/v2/posts?per_page=5&status=publish&orderby=date&order=desc&_fields=id,title,link,date`),
      fetch(`${BASE_URL}/wp-json/wp/v2/posts?per_page=1&status=publish&after=${weekAgo}`),
    ]);
    const total = parseInt(countRes.headers.get('X-WP-Total') || '0', 10);
    const thisWeek = parseInt(weekRes.headers.get('X-WP-Total') || '0', 10);
    const recent = await recentRes.json();
    return {
      totalPosts: total,
      postsThisWeek: thisWeek,
      recentPosts: (Array.isArray(recent) ? recent : []).map(p => ({
        title: (p.title?.rendered || '').replace(/&#8211;/g, '—').replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''),
        url: p.link,
        date: (p.date || '').split('T')[0],
      })),
    };
  } catch (err) {
    console.warn(`[dashboard] WordPress error: ${err.message}`);
    return { totalPosts: 0, postsThisWeek: 0, recentPosts: [] };
  }
}

async function fetchRevenue() {
  let ledger = { entries: [] };
  try {
    ledger = JSON.parse(await fs.readFile(LEDGER_FILE, 'utf-8'));
  } catch { /* no ledger yet */ }

  const now = new Date();
  const weekStart = new Date(now - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let weekly = 0, monthly = 0, allTime = 0;
  const byProgram = {};

  for (const e of ledger.entries || []) {
    const d = new Date(e.date);
    const amt = parseFloat(e.amount) || 0;
    allTime += amt;
    if (d >= monthStart) monthly += amt;
    if (d >= weekStart) weekly += amt;
    const key = e.program || 'unknown';
    if (!byProgram[key]) byProgram[key] = { name: e.programName || key, total: 0, monthly: 0, count: 0 };
    byProgram[key].total += amt;
    byProgram[key].count++;
    if (d >= monthStart) byProgram[key].monthly += amt;
  }

  return {
    weekly: +weekly.toFixed(2),
    monthly: +monthly.toFixed(2),
    allTime: +allTime.toFixed(2),
    byProgram,
    entryCount: ledger.entries?.length || 0,
  };
}

// ─── Secrets / stream status ──────────────────────────────────────────────────

function getStatus() {
  const e = process.env;
  return [
    { label: 'Content Pipeline (Claude API)',  ok: !!e.ANTHROPIC_API_KEY,      note: 'Daily auto-publish Mon/Wed/Fri' },
    { label: 'Google Analytics 4',             ok: !!e.GA4_PROPERTY_ID,        note: 'Traffic tracking' },
    { label: 'YouTube pipeline',               ok: !!e.YOUTUBE_REFRESH_TOKEN,  note: 'Weekly Shorts + voiceovers' },
    { label: 'Pinterest auto-posting',         ok: !!e.PINTEREST_APP_ID,       note: 'Pending approval (applied 2026-04-27)' },
    { label: 'ConvertKit email list',          ok: !!e.CONVERTKIT_API_KEY,     note: 'Needs family member account' },
    { label: 'Gumroad digital product',        ok: !!e.GUMROAD_ACCESS_TOKEN,   note: 'Needs family member account' },
    { label: 'AppSumo affiliate',              ok: !!e.APPSUMO_AFFILIATE_ID,   note: 'Instant approval — appsumo.com/affiliates' },
    { label: 'Google AdSense',                 ok: !!e.ADSENSE_PUBLISHER_ID,   note: 'Apply at 10 posts (~2026-05-14)' },
    { label: 'SparkLoop Upscribe',             ok: !!e.SPARKLOOP_API_KEY,      note: 'Apply at 500 email subscribers' },
    { label: 'Medium cross-posting',           ok: !!e.MEDIUM_INTEGRATION_TOKEN, note: 'Create at medium.com/me/settings' },
  ];
}

// ─── KPI targets ──────────────────────────────────────────────────────────────

const KPI = [
  { label: 'Month 1',  articles: 12,  subs: 50,   revenue: 50 },
  { label: 'Month 3',  articles: 36,  subs: 200,  revenue: 200 },
  { label: 'Month 6',  articles: 72,  subs: 800,  revenue: 800 },
  { label: 'Month 9',  articles: 108, subs: 2000, revenue: 2500 },
  { label: 'Month 12', articles: 144, subs: 5000, revenue: 8000 },
];

function nearestMilestone(articles, subs, revenue) {
  for (const m of KPI) {
    if (articles < m.articles || subs < m.subs || revenue < m.revenue) return m;
  }
  return KPI[KPI.length - 1];
}

function pct(val, target) {
  return target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 100;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function fmt(n, prefix = '') {
  if (n === 0) return `${prefix}0`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`;
  return `${prefix}${n.toLocaleString()}`;
}

function money(n) {
  return n === 0 ? '$0.00' : `$${n.toFixed(2)}`;
}

function progressBar(val, total, color = 'var(--gc-accent)') {
  const p = pct(val, total);
  return `
    <div class="prog-wrap">
      <div class="prog-bar" style="width:${p}%;background:${color}"></div>
    </div>
    <div class="prog-label">${val.toLocaleString()} / ${total.toLocaleString()} <span class="prog-pct">${p}%</span></div>`;
}

function statusDot(ok) {
  return ok
    ? '<span class="dot dot-green"></span>'
    : '<span class="dot dot-amber"></span>';
}

function buildHtml(data) {
  const { ga4, ck, wp: wpData, revenue, generatedAt } = data;
  const milestone = nearestMilestone(wpData.totalPosts, ck.total, revenue.monthly);
  const status = getStatus();
  const ts = new Date(generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

  const adsenseReady = wpData.totalPosts >= 10;
  const adsensePct = pct(wpData.totalPosts, 10);

  const topPagesHtml = ga4.topPages.length
    ? ga4.topPages.map(p => `
      <tr>
        <td class="td-page">${p.title.slice(0, 40) || p.path}</td>
        <td class="td-path muted">${p.path.slice(0, 30)}</td>
        <td class="td-num">${p.views.toLocaleString()}</td>
      </tr>`).join('')
    : `<tr><td colspan="3" class="muted" style="padding:16px;text-align:center">No GA4 data yet — connect credentials to see top pages</td></tr>`;

  const programsHtml = Object.values(revenue.byProgram).length
    ? Object.values(revenue.byProgram)
        .sort((a, b) => b.total - a.total)
        .map(p => `
          <tr>
            <td>${p.name}</td>
            <td class="td-num accent">${money(p.total)}</td>
            <td class="td-num">${money(p.monthly)}</td>
            <td class="td-num muted">${p.count}</td>
          </tr>`).join('')
    : `<tr><td colspan="4" class="muted" style="padding:16px;text-align:center">No commissions recorded yet — add via: node automation/affiliate-tracker.js add &lt;program&gt; &lt;amount&gt;</td></tr>`;

  const recentPostsHtml = wpData.recentPosts.length
    ? wpData.recentPosts.map(p => `
        <div class="post-row">
          <span class="post-date">${p.date}</span>
          <a href="${p.url}" target="_blank" class="post-title">${p.title.slice(0, 55) || 'Untitled'}</a>
        </div>`).join('')
    : `<div class="muted" style="padding:8px 0">No posts published yet</div>`;

  const statusHtml = status.map(s => `
    <div class="status-row">
      ${statusDot(s.ok)}
      <div>
        <div class="status-label">${s.label}</div>
        <div class="status-note">${s.note}</div>
      </div>
    </div>`).join('');

  const activeCount = status.filter(s => s.ok).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>⚡ GammaCash — Live Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#0a0a0a;
  --bg2:#111;
  --card:#141414;
  --card2:#1a1a1a;
  --accent:#00ff88;
  --hover:#00cc6a;
  --white:#fff;
  --muted:#a0a0a0;
  --muted2:#666;
  --border:rgba(255,255,255,0.08);
  --border2:rgba(255,255,255,0.04);
  --glow:0 0 24px rgba(0,255,136,0.2);
  --glow-lg:0 0 48px rgba(0,255,136,0.35);
  --radius:12px;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-head:'Space Grotesk',-apple-system,sans-serif;
}

html,body{background:var(--bg);color:var(--muted);font-family:var(--font-body);font-size:14px;line-height:1.6;min-height:100vh}

a{color:var(--accent);text-decoration:none}
a:hover{color:var(--hover)}

/* ── Nav ── */
.nav{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 28px;
  background:rgba(10,10,10,0.97);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:100;
  backdrop-filter:blur(12px);
}
.nav-logo{font-family:var(--font-head);font-size:1.1rem;font-weight:800;color:var(--white)}
.nav-logo span{color:var(--accent)}
.nav-meta{font-size:12px;color:var(--muted2)}
.nav-ts{color:var(--muted);font-weight:500}
.nav-badge{
  display:inline-block;background:rgba(0,255,136,0.1);
  color:var(--accent);border:1px solid rgba(0,255,136,0.2);
  border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;
  margin-left:10px;
}

/* ── Layout ── */
.container{max-width:1300px;margin:0 auto;padding:28px 20px 60px}

/* ── Stat cards row ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}

.stat-card{
  background:var(--card);border:1px solid var(--border);
  border-radius:var(--radius);padding:22px 24px;
  transition:border-color .2s;
}
.stat-card:hover{border-color:rgba(0,255,136,0.2)}
.stat-card.accent-card{
  background:linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,255,136,0.03));
  border-color:rgba(0,255,136,0.25);
}
.stat-icon{font-size:1.4rem;margin-bottom:10px;display:block}
.stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:6px}
.stat-value{font-family:var(--font-head);font-size:1.9rem;font-weight:800;color:var(--white);line-height:1}
.stat-value.green{color:var(--accent)}
.stat-sub{font-size:12px;color:var(--muted2);margin-top:6px}
.stat-sub b{color:var(--muted)}

/* ── Section grid ── */
.section-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
.section-grid-2{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-bottom:24px}

.card{
  background:var(--card);border:1px solid var(--border);
  border-radius:var(--radius);padding:24px;
}
.card-title{
  font-family:var(--font-head);font-size:.8rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.1em;color:var(--muted2);
  margin-bottom:20px;
  display:flex;align-items:center;gap:8px;
}
.card-title::before{content:'';display:inline-block;width:3px;height:14px;background:var(--accent);border-radius:2px}

/* ── Metric rows ── */
.metric-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border2)}
.metric-row:last-child{border-bottom:none}
.metric-key{color:var(--muted)}
.metric-val{font-family:var(--font-head);font-weight:700;color:var(--white);font-size:.95rem}
.metric-val.accent{color:var(--accent)}

/* ── Progress bars ── */
.prog-item{margin-bottom:18px}
.prog-item:last-child{margin-bottom:0}
.prog-header{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px}
.prog-name{color:var(--muted)}
.prog-wrap{background:rgba(255,255,255,0.05);border-radius:4px;height:8px;overflow:hidden;margin-bottom:4px}
.prog-bar{height:100%;border-radius:4px;transition:width .6s ease;min-width:2px}
.prog-label{font-size:11px;color:var(--muted2)}
.prog-pct{color:var(--accent);font-weight:600}

/* ── KPI section ── */
.kpi-section{
  background:linear-gradient(135deg,rgba(0,255,136,0.04),transparent);
  border:1px solid rgba(0,255,136,0.12);
  border-radius:var(--radius);padding:28px;margin-bottom:24px;
}
.kpi-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.kpi-title{font-family:var(--font-head);font-size:1rem;font-weight:700;color:var(--white)}
.kpi-milestone{
  background:rgba(0,255,136,0.1);color:var(--accent);
  border:1px solid rgba(0,255,136,0.2);
  border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;
}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.kpi-item .prog-header{margin-bottom:8px}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:10px 12px;color:var(--muted2);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)}
td{padding:11px 12px;border-bottom:1px solid var(--border2);color:var(--muted)}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,0.02)}
.td-page{color:var(--white);font-weight:500;max-width:220px}
.td-path{font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.td-num{text-align:right;font-family:var(--font-head);font-weight:600;color:var(--white)}
.td-num.accent{color:var(--accent)}

/* ── Status list ── */
.status-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border2)}
.status-row:last-child{border-bottom:none}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
.dot-green{background:var(--accent);box-shadow:0 0 8px rgba(0,255,136,0.6)}
.dot-amber{background:#f59e0b;box-shadow:0 0 8px rgba(245,158,11,0.4)}
.status-label{color:var(--white);font-weight:500;font-size:13px}
.status-note{color:var(--muted2);font-size:11px;margin-top:2px}
.status-summary{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-size:13px;color:var(--muted);
}
.status-summary b{color:var(--accent);font-family:var(--font-head);font-size:1rem}

/* ── Recent posts ── */
.post-row{padding:9px 0;border-bottom:1px solid var(--border2)}
.post-row:last-child{border-bottom:none}
.post-date{font-size:11px;color:var(--muted2);margin-right:10px}
.post-title{color:var(--white);font-size:13px;font-weight:500}
.post-title:hover{color:var(--accent)}

/* ── AdSense bar ── */
.adsense-banner{
  background:${adsenseReady ? 'rgba(0,255,136,0.08)' : 'rgba(245,158,11,0.06)'};
  border:1px solid ${adsenseReady ? 'rgba(0,255,136,0.2)' : 'rgba(245,158,11,0.15)'};
  border-radius:10px;padding:14px 18px;margin-bottom:16px;
  display:flex;align-items:center;gap:12px;
}
.adsense-icon{font-size:1.5rem}
.adsense-text{font-size:13px}
.adsense-text b{color:${adsenseReady ? 'var(--accent)' : '#f59e0b'}}

/* ── Footer ── */
.footer{text-align:center;padding:24px;color:var(--muted2);font-size:12px;border-top:1px solid var(--border);margin-top:12px}
.footer a{color:var(--accent)}

/* ── Misc ── */
.accent{color:var(--accent)}
.muted{color:var(--muted2)}
.section-title{
  font-family:var(--font-head);font-size:.85rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.1em;
  color:var(--muted2);margin-bottom:16px;
  display:flex;align-items:center;gap:8px;
}
.section-title::before{content:'';display:inline-block;width:3px;height:14px;background:var(--accent);border-radius:2px}
.tag{display:inline-block;background:rgba(0,255,136,0.1);color:var(--accent);border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:6px}

@media(max-width:1100px){
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .section-grid{grid-template-columns:1fr 1fr}
  .kpi-grid{grid-template-columns:1fr}
}
@media(max-width:680px){
  .stats-grid{grid-template-columns:1fr 1fr}
  .section-grid,.section-grid-2{grid-template-columns:1fr}
  .nav{padding:12px 16px}
  .container{padding:16px 12px 40px}
}
</style>
</head>
<body>

<!-- Nav -->
<nav class="nav">
  <div class="nav-logo">⚡Gamma<span>Cash</span> <span class="nav-badge">Live Dashboard</span></div>
  <div class="nav-meta">Last updated: <span class="nav-ts">${ts}</span></div>
</nav>

<div class="container">

  <!-- ── Top stat cards ── -->
  <div class="stats-grid">
    <div class="stat-card accent-card">
      <span class="stat-icon">💰</span>
      <div class="stat-label">Revenue — This Week</div>
      <div class="stat-value green">${money(revenue.weekly)}</div>
      <div class="stat-sub">${revenue.entryCount} commission entries total</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">📅</span>
      <div class="stat-label">Revenue — This Month</div>
      <div class="stat-value">${money(revenue.monthly)}</div>
      <div class="stat-sub">All-time: <b>${money(revenue.allTime)}</b></div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">👁</span>
      <div class="stat-label">Sessions (7 days)</div>
      <div class="stat-value">${fmt(ga4.sessions)}</div>
      <div class="stat-sub">${fmt(ga4.pageviews)} pageviews &nbsp;·&nbsp; ${fmt(ga4.newUsers)} new</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">📬</span>
      <div class="stat-label">Email Subscribers</div>
      <div class="stat-value">${fmt(ck.total)}</div>
      <div class="stat-sub">+${ck.newThisWeek} this week</div>
    </div>
  </div>

  <!-- ── Three-column section ── -->
  <div class="section-grid">

    <!-- Traffic -->
    <div class="card">
      <div class="card-title">Traffic</div>
      <div class="metric-row"><span class="metric-key">Sessions (7d)</span><span class="metric-val">${ga4.sessions.toLocaleString()}</span></div>
      <div class="metric-row"><span class="metric-key">Pageviews (7d)</span><span class="metric-val">${ga4.pageviews.toLocaleString()}</span></div>
      <div class="metric-row"><span class="metric-key">New Users (7d)</span><span class="metric-val">${ga4.newUsers.toLocaleString()}</span></div>
      <div style="margin-top:20px">
        <div class="section-title" style="font-size:.7rem;margin-bottom:10px">Top Pages</div>
        ${ga4.topPages.length
          ? ga4.topPages.map(p => `<div class="post-row"><span class="post-date">${p.views} views</span><span class="post-title">${p.title.slice(0,42) || p.path}</span></div>`).join('')
          : `<div class="muted" style="font-size:12px;padding:8px 0">Connect GA4 credentials to see top pages</div>`
        }
      </div>
    </div>

    <!-- Content + AdSense -->
    <div class="card">
      <div class="card-title">Content</div>

      <div class="adsense-banner">
        <span class="adsense-icon">${adsenseReady ? '✅' : '⏳'}</span>
        <div class="adsense-text">
          <b>AdSense readiness: ${wpData.totalPosts}/10 posts</b><br>
          ${adsenseReady ? 'Ready to apply! Go to google.com/adsense' : `Need ${10 - wpData.totalPosts} more posts — auto-publishing Mon/Wed/Fri`}
        </div>
      </div>
      ${progressBar(wpData.totalPosts, 10, adsenseReady ? 'var(--accent)' : '#f59e0b')}

      <div class="metric-row" style="margin-top:16px"><span class="metric-key">Total posts</span><span class="metric-val">${wpData.totalPosts}</span></div>
      <div class="metric-row"><span class="metric-key">Published this week</span><span class="metric-val">${wpData.postsThisWeek}</span></div>

      <div style="margin-top:20px">
        <div class="section-title" style="font-size:.7rem;margin-bottom:10px">Recent Articles</div>
        ${recentPostsHtml}
      </div>
    </div>

    <!-- Email -->
    <div class="card">
      <div class="card-title">Email List</div>
      <div class="metric-row"><span class="metric-key">Total subscribers</span><span class="metric-val accent">${ck.total.toLocaleString()}</span></div>
      <div class="metric-row"><span class="metric-key">New this week</span><span class="metric-val">+${ck.newThisWeek}</span></div>

      <div style="margin-top:20px">
        <div class="prog-item">
          <div class="prog-header"><span class="prog-name">→ 500 subs (SparkLoop)</span></div>
          ${progressBar(ck.total, 500, '#8b5cf6')}
        </div>
        <div class="prog-item">
          <div class="prog-header"><span class="prog-name">→ 1,000 subs (Paved)</span></div>
          ${progressBar(ck.total, 1000, '#3b82f6')}
        </div>
      </div>

      ${!process.env.CONVERTKIT_API_KEY ? `
      <div style="margin-top:20px;padding:12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:8px;font-size:12px;color:#f59e0b">
        ⚠️ ConvertKit API key not set — list size will show 0. See MANUAL.md Step 2.
      </div>` : ''}
    </div>

  </div>

  <!-- ── KPI Progress ── -->
  <div class="kpi-section">
    <div class="kpi-header">
      <div class="kpi-title">KPI Progress</div>
      <div class="kpi-milestone">Next milestone: ${milestone.label.toUpperCase()}</div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-item">
        <div class="prog-header">
          <span class="prog-name" style="font-weight:600;color:var(--white)">Articles Published</span>
          <span style="font-size:12px;color:var(--muted2)">${wpData.totalPosts} / ${milestone.articles} target</span>
        </div>
        ${progressBar(wpData.totalPosts, milestone.articles, 'var(--accent)')}
      </div>
      <div class="kpi-item">
        <div class="prog-header">
          <span class="prog-name" style="font-weight:600;color:var(--white)">Email Subscribers</span>
          <span style="font-size:12px;color:var(--muted2)">${ck.total} / ${milestone.subs} target</span>
        </div>
        ${progressBar(ck.total, milestone.subs, '#8b5cf6')}
      </div>
      <div class="kpi-item">
        <div class="prog-header">
          <span class="prog-name" style="font-weight:600;color:var(--white)">Monthly Revenue</span>
          <span style="font-size:12px;color:var(--muted2)">${money(revenue.monthly)} / ${money(milestone.revenue)} target</span>
        </div>
        ${progressBar(revenue.monthly, milestone.revenue, '#3b82f6')}
      </div>
    </div>
  </div>

  <!-- ── Tables + Status ── -->
  <div class="section-grid-2">

    <!-- Revenue by program -->
    <div class="card">
      <div class="card-title">Revenue by Program</div>
      <table>
        <thead><tr><th>Program</th><th style="text-align:right">All-Time</th><th style="text-align:right">This Month</th><th style="text-align:right">Sales</th></tr></thead>
        <tbody>${programsHtml}</tbody>
      </table>

      ${ga4.topPages.length ? `
      <div style="margin-top:24px">
        <div class="card-title">Top Pages by Traffic</div>
        <table>
          <thead><tr><th>Page</th><th>Path</th><th style="text-align:right">Views (7d)</th></tr></thead>
          <tbody>${topPagesHtml}</tbody>
        </table>
      </div>` : ''}
    </div>

    <!-- Stream status -->
    <div class="card">
      <div class="card-title">Revenue Streams</div>
      <div class="status-summary">
        <b>${activeCount}</b> / ${status.length} streams active
      </div>
      ${statusHtml}
    </div>

  </div>

</div>

<div class="footer">
  Auto-updated daily by GitHub Actions &nbsp;·&nbsp;
  View repo: <a href="https://github.com/redX000/gamma-stream-platform" target="_blank">github.com/redX000/gamma-stream-platform</a> &nbsp;·&nbsp;
  WP Admin: <a href="${BASE_URL}/wp-admin" target="_blank">wp-admin</a>
  <br><br>⚡ GammaCash — AI Tools That Make Money
</div>

</body>
</html>`;
}

// ─── Upload to WordPress ──────────────────────────────────────────────────────

async function uploadDashboard(html) {
  // Must search both private and publish status — default search only returns publish.
  const [privPages, pubPages] = await Promise.all([
    wp(`/wp/v2/pages?slug=${DASHBOARD_SLUG}&status=private&per_page=1`, 'GET', null, { ignoreError: true }),
    wp(`/wp/v2/pages?slug=${DASHBOARD_SLUG}&per_page=1`, 'GET', null, { ignoreError: true }),
  ]);
  const existing = (privPages?.length ? privPages : null) ?? (pubPages?.length ? pubPages : null);

  const body = {
    title: '⚡ GammaCash — Live Dashboard',
    content: `<!-- wp:html -->${html}<!-- /wp:html -->`,
    status: 'private',
    slug: DASHBOARD_SLUG,
  };

  if (existing && existing.length > 0) {
    const updated = await wp(`/wp/v2/pages/${existing[0].id}`, 'POST', body);
    const link = `${BASE_URL}/?page_id=${updated.id}`;
    console.log(`[build-dashboard] Updated page ID ${updated.id} — view (admin login required): ${link}`);
    return { action: 'updated', id: updated.id, link };
  }

  const created = await wp('/wp/v2/pages', 'POST', body);
  const link = `${BASE_URL}/?page_id=${created.id}`;
  console.log(`[build-dashboard] Created page ID ${created.id} — view (admin login required): ${link}`);
  console.log(`[build-dashboard] Permalink (once WP flushes): ${BASE_URL}/${DASHBOARD_SLUG}/`);
  return { action: 'created', id: created.id, link };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[build-dashboard] Fetching data...');

  const [ga4, ck, wpData, revenue] = await Promise.all([
    fetchGA4(),
    fetchConvertKit(),
    fetchWordPressStats(),
    fetchRevenue(),
  ]);

  const data = { ga4, ck, wp: wpData, revenue, generatedAt: new Date().toISOString() };

  console.log(`[build-dashboard] GA4: ${ga4.sessions} sessions | CK: ${ck.total} subs | WP: ${wpData.totalPosts} posts | Revenue: ${money(revenue.allTime)}`);
  console.log('[build-dashboard] Building HTML...');
  const html = buildHtml(data);

  console.log('[build-dashboard] Uploading to WordPress...');
  const result = await uploadDashboard(html);

  console.log(`[build-dashboard] ${result.action} — ID: ${result.id}`);
  console.log(`[build-dashboard] View (must be logged in as WP admin): ${BASE_URL}/${DASHBOARD_SLUG}/`);
  console.log('[build-dashboard] Done.');
}

main().catch(err => {
  console.error(`[build-dashboard] Fatal: ${err.message}`);
  process.exit(1);
});
