/**
 * @fileoverview Dedicated earnings report for Gamma Stream Platform.
 * Combines all revenue streams into a single HTML email + JSON snapshot:
 *   1. Affiliate commissions — local ledger (automation/commissions.json)
 *   2. Gumroad sales — live API fetch (api.gumroad.com/v2/sales)
 *   3. YouTube estimated earnings — GA4 views × $3 RPM / 1000
 *   4. Medium estimated earnings — estimated reads × $0.01
 *   5. AdSense placeholder (manual until AdSense approved)
 *
 * Usage:
 *   node analytics/earnings-report.js             # Console summary
 *   node analytics/earnings-report.js --email     # Console + send HTML email
 *   node analytics/earnings-report.js --save      # Console + save JSON snapshot
 *
 * Requires .env: GUMROAD_ACCESS_TOKEN, NOTIFICATION_EMAIL, SMTP_*
 *   Optional: MEDIUM_INTEGRATION_TOKEN, GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_FILE = path.join(__dirname, '..', 'automation', 'commissions.json');
const GUMROAD_LOG = path.join(__dirname, 'gumroad-products.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

// YouTube RPM estimate: $3 per 1,000 views (conservative for AI/SaaS niche)
const YOUTUBE_RPM = 3;
// Medium partner program estimate: ~$0.01 per read (rough average)
const MEDIUM_RATE_PER_READ = 0.01;

/**
 * Load affiliate commission ledger and aggregate revenue.
 * @returns {Promise<Object>} Affiliate revenue breakdown
 */
async function fetchAffiliateRevenue() {
  let ledger = { entries: [] };
  try {
    ledger = JSON.parse(await fs.readFile(LEDGER_FILE, 'utf-8'));
  } catch {
    console.warn('[earnings] No affiliate ledger found — showing $0');
  }

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekly = 0, monthly = 0, allTime = 0;
  const byProgram = {};

  for (const entry of ledger.entries || []) {
    const d = new Date(entry.date);
    const amount = parseFloat(entry.amount) || 0;
    allTime += amount;
    if (d >= monthStart) monthly += amount;
    if (d >= weekStart) weekly += amount;
    if (!byProgram[entry.program]) {
      byProgram[entry.program] = { name: entry.programName || entry.program, total: 0, count: 0 };
    }
    byProgram[entry.program].total += amount;
    byProgram[entry.program].count++;
  }

  return {
    source: 'affiliate-ledger',
    weekly: +weekly.toFixed(2),
    monthly: +monthly.toFixed(2),
    allTime: +allTime.toFixed(2),
    byProgram,
    entryCount: ledger.entries?.length || 0,
  };
}

/**
 * Fetch Gumroad sales from the Gumroad API v2.
 * @returns {Promise<Object>} Gumroad revenue breakdown
 */
async function fetchGumroadRevenue() {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) {
    console.warn('[earnings] GUMROAD_ACCESS_TOKEN not set — skipping Gumroad');
    return { source: 'skipped', weekly: 0, monthly: 0, allTime: 0, salesCount: 0, products: [] };
  }

  const { default: fetch } = await import('node-fetch');

  console.log('[earnings] Fetching Gumroad sales...');
  try {
    const res = await fetch('https://api.gumroad.com/v2/sales', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Gumroad API ${res.status}`);
    const data = await res.json();
    const sales = data.sales || [];

    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let weekly = 0, monthly = 0, allTime = 0;
    const byProduct = {};

    for (const sale of sales) {
      const amount = (sale.price || 0) / 100; // Gumroad sends cents
      const d = new Date(sale.created_at);
      allTime += amount;
      if (d >= monthStart) monthly += amount;
      if (d >= weekStart) weekly += amount;
      const pid = sale.product_id;
      if (!byProduct[pid]) {
        byProduct[pid] = { name: sale.product_name, total: 0, count: 0 };
      }
      byProduct[pid].total += amount;
      byProduct[pid].count++;
    }

    console.log(`[earnings] Gumroad: ${sales.length} sales, $${allTime.toFixed(2)} all-time`);
    return {
      source: 'gumroad',
      weekly: +weekly.toFixed(2),
      monthly: +monthly.toFixed(2),
      allTime: +allTime.toFixed(2),
      salesCount: sales.length,
      products: Object.values(byProduct).sort((a, b) => b.total - a.total),
    };
  } catch (err) {
    console.error(`[earnings] Gumroad fetch failed: ${err.message}`);
    return { source: 'error', weekly: 0, monthly: 0, allTime: 0, salesCount: 0, products: [] };
  }
}

/**
 * Estimate YouTube earnings from GA4 pageviews on /youtube/* pages.
 * Uses $3 RPM as a conservative AI/SaaS niche estimate.
 * @returns {Promise<Object>} YouTube estimated revenue
 */
async function estimateYouTubeEarnings() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    console.warn('[earnings] GA4_PROPERTY_ID not set — skipping YouTube estimate');
    return { source: 'skipped', estimatedMonthly: 0, estimatedAllTime: 0, views: 0 };
  }

  let BetaAnalyticsDataClient;
  try {
    const mod = await import('@google-analytics/data');
    BetaAnalyticsDataClient = mod.BetaAnalyticsDataClient;
  } catch {
    return { source: 'sdk-missing', estimatedMonthly: 0, estimatedAllTime: 0, views: 0 };
  }

  let clientOptions = {};
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    clientOptions.credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
  } else {
    return { source: 'no-credentials', estimatedMonthly: 0, estimatedAllTime: 0, views: 0 };
  }

  try {
    const client = new BetaAnalyticsDataClient(clientOptions);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: monthStart, endDate: today }],
      metrics: [{ name: 'screenPageViews' }],
    });

    const views = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const estimatedMonthly = +(views * YOUTUBE_RPM / 1000).toFixed(2);

    console.log(`[earnings] YouTube estimate: ${views} views → $${estimatedMonthly} (RPM $${YOUTUBE_RPM})`);
    return { source: 'ga4-estimate', estimatedMonthly, estimatedAllTime: estimatedMonthly, views, rpm: YOUTUBE_RPM };
  } catch (err) {
    console.error(`[earnings] YouTube estimate failed: ${err.message}`);
    return { source: 'error', estimatedMonthly: 0, estimatedAllTime: 0, views: 0 };
  }
}

/**
 * Estimate Medium earnings from the Medium API.
 * Medium API doesn't expose earnings; we estimate from story read counts.
 * @returns {Promise<Object>} Medium estimated revenue
 */
async function estimateMediumEarnings() {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN;
  if (!token) {
    console.warn('[earnings] MEDIUM_INTEGRATION_TOKEN not set — skipping Medium estimate');
    return { source: 'skipped', estimatedMonthly: 0, reads: 0, stories: 0 };
  }

  const { default: fetch } = await import('node-fetch');

  try {
    const meRes = await fetch('https://api.medium.com/v1/me', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!meRes.ok) throw new Error(`Medium API ${meRes.status}`);
    const me = (await meRes.json()).data;

    const pubRes = await fetch(`https://api.medium.com/v1/users/${me.id}/publications`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const pubs = pubRes.ok ? (await pubRes.json()).data || [] : [];

    // Medium doesn't provide read counts via public API — use story count as proxy
    const storiesRes = await fetch(`https://api.medium.com/v1/users/${me.id}/publications`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Estimate: 50 reads per story × $0.01 per read (conservative)
    const storyCount = pubs.length || 0;
    const estimatedReads = storyCount * 50;
    const estimatedMonthly = +(estimatedReads * MEDIUM_RATE_PER_READ).toFixed(2);

    console.log(`[earnings] Medium estimate: ${storyCount} stories → ~${estimatedReads} reads → $${estimatedMonthly}`);
    return { source: 'medium-estimate', estimatedMonthly, reads: estimatedReads, stories: storyCount };
  } catch (err) {
    console.error(`[earnings] Medium estimate failed: ${err.message}`);
    return { source: 'error', estimatedMonthly: 0, reads: 0, stories: 0 };
  }
}

/**
 * Render a console summary of the combined earnings report.
 * @param {Object} data - Aggregated earnings data
 * @returns {string} Formatted multi-line string
 */
function renderConsole(data) {
  const { totals, affiliate, gumroad, youtube, medium } = data;
  const lines = [
    '',
    '╔══════════════════════════════════════════════════════╗',
    '║        GAMMA STREAM — EARNINGS REPORT                ║',
    `║  ${new Date(data.generatedAt).toLocaleString().padEnd(51)}║`,
    '╚══════════════════════════════════════════════════════╝',
    '',
    '── COMBINED REVENUE ──────────────────────────────────',
    `  This Week:    $${String(totals.weekly.toFixed(2)).padStart(10)}`,
    `  This Month:   $${String(totals.monthly.toFixed(2)).padStart(10)}`,
    `  All-Time:     $${String(totals.allTime.toFixed(2)).padStart(10)}`,
    '',
    '── BY STREAM ─────────────────────────────────────────',
    `  Affiliate:    $${String(affiliate.monthly.toFixed(2)).padStart(8)}  /mo  (all-time: $${affiliate.allTime.toFixed(2)})`,
    `  Gumroad:      $${String(gumroad.monthly.toFixed(2)).padStart(8)}  /mo  (${gumroad.salesCount} sales)`,
    `  YouTube est:  $${String(youtube.estimatedMonthly.toFixed(2)).padStart(8)}  /mo  (${youtube.views?.toLocaleString() || 0} views × $${YOUTUBE_RPM} RPM)`,
    `  Medium est:   $${String(medium.estimatedMonthly.toFixed(2)).padStart(8)}  /mo  (${medium.stories} stories)`,
    `  AdSense:      $${String((0).toFixed(2)).padStart(8)}  /mo  (pending approval)`,
  ];

  if (Object.keys(affiliate.byProgram).length) {
    lines.push('', '── AFFILIATE BREAKDOWN ───────────────────────────────');
    Object.values(affiliate.byProgram)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .forEach((p) => {
        lines.push(`  ${p.name.padEnd(22)} $${p.total.toFixed(2).padStart(8)}  (${p.count} sales)`);
      });
  }

  if (gumroad.products?.length) {
    lines.push('', '── GUMROAD PRODUCTS ──────────────────────────────────');
    gumroad.products.slice(0, 4).forEach((p) => {
      lines.push(`  ${p.name.slice(0, 30).padEnd(30)} $${p.total.toFixed(2)}  (${p.count} sales)`);
    });
  }

  lines.push('', '──────────────────────────────────────────────────────', '');
  return lines.join('\n');
}

/**
 * Build and send the HTML earnings report email.
 * @param {Object} data - Aggregated earnings data
 * @returns {Promise<void>}
 */
async function sendEmailReport(data) {
  const to = process.env.NOTIFICATION_EMAIL;
  if (!to) {
    console.warn('[earnings] NOTIFICATION_EMAIL not set — skipping email');
    return;
  }

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    throw new Error('nodemailer not installed');
  }

  const { totals, affiliate, gumroad, youtube, medium } = data;

  const streamRow = (label, monthly, note = '') => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 12px;">${label}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:600;">$${monthly.toFixed(2)}</td>
      <td style="padding:10px 12px;text-align:right;color:#94a3b8;font-size:12px;">${note}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:32px;color:#fff;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#7dd3fc;margin-bottom:8px;">Gamma Stream Platform</div>
    <h1 style="margin:0;font-size:22px;font-weight:700;">Earnings Report</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${new Date(data.generatedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div style="display:flex;background:#f0fdf4;border-bottom:1px solid #dcfce7;">
    <div style="flex:1;padding:20px;text-align:center;border-right:1px solid #dcfce7;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">This Week</div>
      <div style="font-size:28px;font-weight:800;color:#16a34a;">$${totals.weekly.toFixed(2)}</div>
    </div>
    <div style="flex:1;padding:20px;text-align:center;border-right:1px solid #dcfce7;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">This Month</div>
      <div style="font-size:28px;font-weight:800;color:#0f172a;">$${totals.monthly.toFixed(2)}</div>
    </div>
    <div style="flex:1;padding:20px;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">All-Time</div>
      <div style="font-size:28px;font-weight:800;color:#0f172a;">$${totals.allTime.toFixed(2)}</div>
    </div>
  </div>

  <div style="padding:24px 28px;">
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#374151;">Revenue by Stream (This Month)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#f8fafc;">
        <td style="padding:10px 12px;font-weight:600;">Stream</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;">Monthly</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;">Notes</td>
      </tr>
      ${streamRow('Affiliate Commissions', affiliate.monthly, `${affiliate.entryCount} total entries`)}
      ${streamRow('Gumroad Products', gumroad.monthly, `${gumroad.salesCount} sales`)}
      ${streamRow('YouTube (estimated)', youtube.estimatedMonthly, `${(youtube.views || 0).toLocaleString()} views × $${YOUTUBE_RPM} RPM`)}
      ${streamRow('Medium (estimated)', medium.estimatedMonthly, `${medium.stories} stories`)}
      ${streamRow('AdSense', 0, 'Pending approval')}
    </table>

    ${Object.keys(affiliate.byProgram).length ? `
    <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#374151;">Top Affiliate Programs</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${Object.values(affiliate.byProgram).sort((a, b) => b.total - a.total).slice(0, 5).map((p) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 12px;">${p.name}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;">$${p.total.toFixed(2)}</td>
        <td style="padding:8px 12px;text-align:right;color:#94a3b8;">${p.count} sales</td>
      </tr>`).join('')}
    </table>` : ''}

    ${gumroad.products?.length ? `
    <h2 style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#374151;">Gumroad Products</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${gumroad.products.slice(0, 4).map((p) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 12px;">${p.name.slice(0, 40)}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;">$${p.total.toFixed(2)}</td>
        <td style="padding:8px 12px;text-align:right;color:#94a3b8;">${p.count} sales</td>
      </tr>`).join('')}
    </table>` : ''}
  </div>

  <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      Generated by Gamma Stream analytics/earnings-report.js<br>
      Run manually: <code>node analytics/earnings-report.js --email</code>
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

  await transporter.sendMail({
    from: `"Gamma Stream" <${process.env.SMTP_USER}>`,
    to,
    subject: `Earnings Report — $${totals.monthly.toFixed(2)} this month | ${new Date().toLocaleDateString()}`,
    html,
  });

  console.log(`[earnings] Email sent to ${to}`);
}

/**
 * Main — aggregate all streams, render report, optionally email or save.
 */
async function main() {
  const args = process.argv.slice(2);
  const doEmail = args.includes('--email');
  const doSave = args.includes('--save');

  console.log('\n[earnings] === Gamma Stream Earnings Report ===\n');

  const [affiliate, gumroad, youtube, medium] = await Promise.all([
    fetchAffiliateRevenue(),
    fetchGumroadRevenue(),
    estimateYouTubeEarnings(),
    estimateMediumEarnings(),
  ]);

  // Combine totals across all streams
  const totals = {
    weekly: +(affiliate.weekly + gumroad.weekly).toFixed(2),
    monthly: +(affiliate.monthly + gumroad.monthly + youtube.estimatedMonthly + medium.estimatedMonthly).toFixed(2),
    allTime: +(affiliate.allTime + gumroad.allTime).toFixed(2),
  };

  const data = {
    generatedAt: new Date().toISOString(),
    totals,
    affiliate,
    gumroad,
    youtube,
    medium,
    adsense: { source: 'pending', monthly: 0 },
  };

  console.log(renderConsole(data));

  if (doSave) {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outPath = path.join(REPORTS_DIR, `earnings-${ts}.json`);
    await fs.writeFile(outPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[earnings] Saved: ${outPath}`);
  }

  if (doEmail) {
    await sendEmailReport(data);
  }

  return data;
}

main().catch((err) => {
  console.error(`[earnings] Fatal: ${err.message}`);
  process.exit(1);
});
