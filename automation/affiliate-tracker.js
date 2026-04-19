/**
 * @fileoverview Affiliate commission tracker for Gamma Stream Platform.
 * Maintains a local JSON ledger of commissions per affiliate program,
 * generates a weekly HTML revenue summary, and emails it via SMTP.
 *
 * All 8 affiliate programs from CLAUDE.md are tracked:
 *   Jasper AI, Surfer SEO, Copy.ai, Notion AI, Zapier,
 *   ConvertKit, Scalenut, Systeme.io
 *
 * Usage:
 *   node affiliate-tracker.js report           # Generate + email weekly report
 *   node affiliate-tracker.js add <program> <amount> [date]  # Log a commission
 *   node affiliate-tracker.js list             # Print all commissions
 *   node affiliate-tracker.js summary          # Print summary table to console
 *
 * Requires .env: NOTIFICATION_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_FILE = path.join(__dirname, 'commissions.json');

// Affiliate program metadata — used in reports and validation
const AFFILIATE_PROGRAMS = {
  'jasper-ai':    { name: 'Jasper AI',    commission: '25% recurring', url: 'jasper.ai/affiliate' },
  'surfer-seo':   { name: 'Surfer SEO',   commission: '25% recurring', url: 'surferseo.com/affiliate' },
  'copy-ai':      { name: 'Copy.ai',      commission: '45% recurring', url: 'copy.ai/affiliate' },
  'notion-ai':    { name: 'Notion AI',    commission: '20% per sale',  url: 'notion.so/affiliate' },
  'zapier':       { name: 'Zapier',       commission: '20-25% recurring', url: 'zapier.com/affiliate' },
  'convertkit':   { name: 'ConvertKit',   commission: '30% recurring', url: 'convertkit.com/affiliate' },
  'scalenut':     { name: 'Scalenut',     commission: '30% lifetime',  url: 'scalenut.com/affiliate' },
  'systeme-io':   { name: 'Systeme.io',   commission: '60% recurring', url: 'systeme.io/affiliate' },
};

/**
 * Load the commission ledger from disk.
 * Returns an empty ledger if no file exists yet.
 * @returns {Promise<Object>} Ledger: { entries: [], createdAt }
 */
async function loadLedger() {
  try {
    const raw = await fs.readFile(LEDGER_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.log('[tracker] No ledger found — starting fresh');
    return { entries: [], createdAt: new Date().toISOString() };
  }
}

/**
 * Save the commission ledger to disk.
 * @param {Object} ledger - Ledger object
 */
async function saveLedger(ledger) {
  await fs.writeFile(LEDGER_FILE, JSON.stringify(ledger, null, 2), 'utf-8');
  console.log(`[tracker] Ledger saved (${ledger.entries.length} entries)`);
}

/**
 * Add a commission entry to the ledger.
 * @param {string} program - Program key (e.g., 'jasper-ai')
 * @param {number} amount - Commission amount in USD
 * @param {string} [date] - ISO date string (defaults to today)
 * @returns {Promise<Object>} The created entry
 */
export async function addCommission(program, amount, date = null) {
  const programKey = program.toLowerCase().replace(/\s+/g, '-');

  if (!AFFILIATE_PROGRAMS[programKey]) {
    throw new Error(`Unknown program "${program}". Valid keys: ${Object.keys(AFFILIATE_PROGRAMS).join(', ')}`);
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new Error(`Invalid amount "${amount}" — must be a positive number`);
  }

  const entry = {
    id: Date.now().toString(),
    program: programKey,
    programName: AFFILIATE_PROGRAMS[programKey].name,
    amount: parsedAmount,
    date: date || new Date().toISOString().split('T')[0],
    addedAt: new Date().toISOString(),
  };

  const ledger = await loadLedger();
  ledger.entries.push(entry);
  await saveLedger(ledger);

  console.log(`[tracker] Added: ${entry.programName} +$${parsedAmount.toFixed(2)} on ${entry.date}`);
  return entry;
}

/**
 * Aggregate commission data for a given date range.
 * @param {Object[]} entries - Ledger entries
 * @param {Date} from - Start date (inclusive)
 * @param {Date} to - End date (inclusive)
 * @returns {Object} totals by program, grand total, entry count
 */
function aggregateEntries(entries, from, to) {
  // Filter entries within the date range
  const inRange = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });

  const byProgram = {};
  let grandTotal = 0;

  for (const [key, meta] of Object.entries(AFFILIATE_PROGRAMS)) {
    const programEntries = inRange.filter((e) => e.program === key);
    const total = programEntries.reduce((sum, e) => sum + e.amount, 0);
    byProgram[key] = {
      name: meta.name,
      commission: meta.commission,
      total,
      entryCount: programEntries.length,
    };
    grandTotal += total;
  }

  return { byProgram, grandTotal, entryCount: inRange.length, from, to };
}

/**
 * Generate an HTML email report for the given aggregation.
 * @param {Object} agg - Aggregation result from aggregateEntries()
 * @param {string} [period='Weekly'] - Report period label
 * @returns {string} HTML string
 */
function generateHtmlReport(agg, period = 'Weekly') {
  const fromStr = agg.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const toStr = agg.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const rows = Object.values(agg.byProgram)
    .sort((a, b) => b.total - a.total)
    .map(
      (p) => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px 12px;font-weight:500;">${p.name}</td>
        <td style="padding:10px 12px;color:#666;font-size:13px;">${p.commission}</td>
        <td style="padding:10px 12px;text-align:right;">${p.entryCount}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;color:${p.total > 0 ? '#16a34a' : '#999'};">
          $${p.total.toFixed(2)}
        </td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Gamma Stream — ${period} Revenue Report</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px;color:#fff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px;">
        Gamma Stream Platform
      </div>
      <h1 style="margin:0;font-size:24px;font-weight:700;">${period} Revenue Report</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">${fromStr} — ${toStr}</p>
    </div>

    <!-- Summary card -->
    <div style="padding:32px;background:#f0fdf4;border-bottom:2px solid #dcfce7;">
      <div style="font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Total Revenue This Period</div>
      <div style="font-size:48px;font-weight:800;color:#16a34a;margin:8px 0;">$${agg.grandTotal.toFixed(2)}</div>
      <div style="font-size:13px;color:#666;">${agg.entryCount} commission${agg.entryCount !== 1 ? 's' : ''} logged across ${Object.values(agg.byProgram).filter((p) => p.total > 0).length} program${Object.values(agg.byProgram).filter((p) => p.total > 0).length !== 1 ? 's' : ''}</div>
    </div>

    <!-- Breakdown table -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1e293b;">Breakdown by Program</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;color:#475569;font-weight:600;">Program</th>
            <th style="padding:10px 12px;text-align:left;color:#475569;font-weight:600;">Commission</th>
            <th style="padding:10px 12px;text-align:right;color:#475569;font-weight:600;">Entries</th>
            <th style="padding:10px 12px;text-align:right;color:#475569;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f8fafc;">
            <td colspan="3" style="padding:12px;font-weight:700;color:#1e293b;">Grand Total</td>
            <td style="padding:12px;text-align:right;font-weight:800;color:#16a34a;font-size:16px;">$${agg.grandTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Generated automatically by Gamma Stream Platform on ${new Date().toLocaleString()}.
        Log commissions with: <code>node affiliate-tracker.js add &lt;program&gt; &lt;amount&gt;</code>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send the HTML report via SMTP using nodemailer.
 * @param {string} html - HTML email content
 * @param {string} subject - Email subject line
 * @returns {Promise<void>}
 */
async function sendReport(html, subject) {
  const to = process.env.NOTIFICATION_EMAIL;
  if (!to) throw new Error('NOTIFICATION_EMAIL is not set in .env');
  if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST is not set in .env');

  console.log(`[tracker] Sending report to ${to} via ${process.env.SMTP_HOST}...`);

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    throw new Error('nodemailer not installed. Run: npm install nodemailer');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Gamma Stream" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`[tracker] Report sent to ${to}`);
}

/**
 * Generate and optionally email the weekly revenue report.
 * @param {boolean} [sendEmail=true] - Whether to send the email
 * @returns {Promise<Object>} Report data (aggregation + html)
 */
export async function generateWeeklyReport(sendEmail = true) {
  console.log('[tracker] Generating weekly revenue report...');

  const ledger = await loadLedger();

  // Last 7 days
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);

  const agg = aggregateEntries(ledger.entries, from, to);

  console.log(`[tracker] Weekly total: $${agg.grandTotal.toFixed(2)} (${agg.entryCount} entries)`);

  // Console summary table
  console.log('\n--- Weekly Revenue Summary ---');
  for (const [, p] of Object.entries(agg.byProgram)) {
    if (p.total > 0) {
      console.log(`  ${p.name.padEnd(15)} $${p.total.toFixed(2)}`);
    }
  }
  console.log(`  ${'TOTAL'.padEnd(15)} $${agg.grandTotal.toFixed(2)}\n`);

  const fromStr = from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const toStr = to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject = `Gamma Stream Weekly Revenue — $${agg.grandTotal.toFixed(2)} (${fromStr}–${toStr})`;
  const html = generateHtmlReport(agg, 'Weekly');

  if (sendEmail) {
    try {
      await sendReport(html, subject);
    } catch (err) {
      console.error(`[tracker] Email failed (non-fatal): ${err.message}`);
    }
  }

  return { agg, html, subject };
}

/**
 * Print a console summary of all-time totals.
 * @returns {Promise<void>}
 */
export async function printSummary() {
  const ledger = await loadLedger();
  const to = new Date();
  const from = new Date('2020-01-01'); // All-time
  const agg = aggregateEntries(ledger.entries, from, to);

  console.log('\n=== All-Time Affiliate Revenue ===');
  for (const [, p] of Object.values(agg.byProgram)
    .sort((a, b) => b.total - a.total)
    .map((p) => [p.name, p])) {
    const bar = '█'.repeat(Math.max(0, Math.round(p.total / 10)));
    console.log(`  ${p.name.padEnd(15)} $${p.total.toFixed(2).padStart(8)}  ${bar}`);
  }
  console.log(`\n  ${'TOTAL'.padEnd(15)} $${agg.grandTotal.toFixed(2)}`);
  console.log(`  ${ledger.entries.length} total entries\n`);
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , cmd, ...args] = process.argv;

  const commands = {
    report:  () => generateWeeklyReport(true),
    add:     () => {
      const [program, amount, date] = args;
      if (!program || !amount) {
        console.error('Usage: node affiliate-tracker.js add <program-key> <amount> [YYYY-MM-DD]');
        console.error('Programs:', Object.keys(AFFILIATE_PROGRAMS).join(', '));
        process.exit(1);
      }
      return addCommission(program, amount, date);
    },
    list:    async () => {
      const ledger = await loadLedger();
      console.table(ledger.entries.map((e) => ({
        Date: e.date, Program: e.programName, Amount: `$${e.amount.toFixed(2)}`,
      })));
    },
    summary: () => printSummary(),
  };

  const handler = commands[cmd];
  if (!handler) {
    console.error('Usage: node affiliate-tracker.js <report|add|list|summary>');
    process.exit(1);
  }

  handler()
    .then(() => console.log('[tracker] Done'))
    .catch((err) => {
      console.error(`[tracker] Fatal: ${err.message}`);
      process.exit(1);
    });
}
