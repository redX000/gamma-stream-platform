/**
 * api/index.js — Gamma Control Center data layer.
 *
 * All functions return Promises to match a real API shape.
 * To wire up a real backend, replace the mock returns with:
 *   const res = await fetch(`${BASE}/endpoint`, { headers: authHeaders() })
 *   return res.json()
 *
 * The BASE_URL and auth headers live at the bottom of this file.
 */

import { subDays, subMonths, format, eachDayOfInterval, parseISO } from 'date-fns'

// ── Config (swap for real backend) ───────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || null

// eslint-disable-next-line no-unused-vars
function authHeaders() {
  const token = sessionStorage.getItem('gcc_token')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rand(min, max)) }

function seed(n) {
  let x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

function seededRand(n, min, max) { return seed(n) * (max - min) + min }

function generateTimeSeries(days, baseValue, growth = 0.03, noise = 0.25) {
  return Array.from({ length: days }, (_, i) => {
    const trend = baseValue * Math.pow(1 + growth, i / days)
    const noiseVal = trend * noise * (seededRand(i * 7, -1, 1))
    return Math.max(0, trend + noiseVal)
  })
}

function buildDailyRevenue(days = 90) {
  const end = new Date()
  const start = subDays(end, days - 1)
  const dates = eachDayOfInterval({ start, end })
  const values = generateTimeSeries(days, 20, 0.05, 0.3)
  return dates.map((d, i) => ({
    date: format(d, 'yyyy-MM-dd'),
    label: format(d, 'MMM d'),
    revenue: +values[i].toFixed(2),
    profit: +(values[i] * (0.45 + seededRand(i * 3, -0.05, 0.05))).toFixed(2),
    affiliate: +(values[i] * seededRand(i * 11, 0.1, 0.35)).toFixed(2),
    organic: +(values[i] * seededRand(i * 13, 0.3, 0.5)).toFixed(2),
    paid: +(values[i] * seededRand(i * 17, 0.05, 0.2)).toFixed(2),
    direct: +(values[i] * seededRand(i * 19, 0.1, 0.25)).toFixed(2),
  }))
}

const DAILY_REVENUE = buildDailyRevenue(90)

function filterByRange(data, { start, end }) {
  const s = start instanceof Date ? format(start, 'yyyy-MM-dd') : start
  const e = end instanceof Date ? format(end, 'yyyy-MM-dd') : end
  return data.filter(d => d.date >= s && d.date <= e)
}

// ── KPI ───────────────────────────────────────────────────────────────────────

export async function getKPIs(dateRange) {
  await delay(200)
  const filtered = filterByRange(DAILY_REVENUE, dateRange)
  const prev = filterByRange(DAILY_REVENUE, {
    start: subDays(new Date(dateRange.start), filtered.length),
    end: subDays(new Date(dateRange.start), 1),
  })

  const sum = arr => arr.reduce((a, b) => a + b, 0)
  const revenue = sum(filtered.map(d => d.revenue))
  const prevRevenue = sum(prev.map(d => d.revenue))
  const profit = sum(filtered.map(d => d.profit))
  const prevProfit = sum(prev.map(d => d.profit))

  function sparkline(arr, key) {
    const last7 = arr.slice(-7)
    return last7.map(d => d[key])
  }

  const pct = (a, b) => b === 0 ? 0 : +((a - b) / b * 100).toFixed(1)

  return {
    revenue: { value: revenue, prev: prevRevenue, change: pct(revenue, prevRevenue), sparkline: sparkline(filtered, 'revenue') },
    profit: { value: profit, prev: prevProfit, change: pct(profit, prevProfit), sparkline: sparkline(filtered, 'profit') },
    activeAffiliates: { value: 8, prev: 6, change: 33.3, sparkline: [4, 5, 5, 6, 7, 7, 8] },
    subscribers: { value: 247, prev: 198, change: 24.7, sparkline: [180, 195, 205, 215, 228, 239, 247] },
    conversionRate: { value: 3.2, prev: 2.8, change: 14.3, sparkline: [2.1, 2.4, 2.7, 2.9, 3.0, 3.1, 3.2] },
    churnRate: { value: 1.8, prev: 2.4, change: -25.0, sparkline: [3.1, 2.8, 2.5, 2.2, 2.0, 1.9, 1.8] },
    mrr: { value: 1284, prev: 1047, change: 22.6, sparkline: [820, 920, 980, 1050, 1120, 1200, 1284] },
  }
}

// ── Revenue charts ────────────────────────────────────────────────────────────

export async function getRevenue(dateRange) {
  await delay(250)
  return filterByRange(DAILY_REVENUE, dateRange)
}

export async function getCostBreakdown(dateRange) {
  await delay(180)
  const filtered = filterByRange(DAILY_REVENUE, dateRange)
  const totalRevenue = filtered.reduce((a, d) => a + d.revenue, 0)
  return [
    { name: 'Affiliate commissions', value: +(totalRevenue * 0.28).toFixed(2), color: '#8b5cf6' },
    { name: 'Infrastructure',        value: +(totalRevenue * 0.08).toFixed(2), color: '#38bdf8' },
    { name: 'Paid ads',              value: +(totalRevenue * 0.12).toFixed(2), color: '#f59e0b' },
    { name: 'Tools & software',      value: +(totalRevenue * 0.05).toFixed(2), color: '#10b981' },
    { name: 'Other',                 value: +(totalRevenue * 0.02).toFixed(2), color: '#6b7280' },
  ]
}

// ── Affiliates ────────────────────────────────────────────────────────────────

const AFFILIATE_NAMES = [
  ['Jordan', 'Rivers',   'jordan.rivers@gmail.com'],
  ['Priya',  'Mehta',    'priya.mehta@outlook.com'],
  ['Carlos', 'Vega',     'carlos.vega@proton.me'],
  ['Aisha',  'Okafor',   'aisha.okafor@yahoo.com'],
  ['Lucas',  'Fonseca',  'l.fonseca@gmail.com'],
  ['Mei',    'Zhang',    'mei.zhang@hotmail.com'],
  ['Dmitri', 'Volkov',   'dvolkov@mail.ru'],
  ['Sophie', 'Laurent',  'sophie.l@gmail.com'],
  ['Omar',   'Hassan',   'omar.hassan@gmail.com'],
  ['Elena',  'Petrova',  'elena.petrova@gmail.com'],
  ['Kai',    'Nakamura', 'kai.n@icloud.com'],
  ['Fatima', 'Idris',    'f.idris@gmail.com'],
  ['Bruno',  'Costa',    'brunocosta@gmail.com'],
  ['Yui',    'Tanaka',   'yui.tanaka@gmail.com'],
  ['Andre',  'Dumont',   'a.dumont@orange.fr'],
]

const STATUSES = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'inactive', 'inactive', 'pending', 'pending', 'active', 'inactive', 'pending']

export async function getAffiliates(dateRange) {
  await delay(300)
  return AFFILIATE_NAMES.map(([ first, last, email ], i) => {
    const clicks     = randInt(50, 2400) + i * seededRand(i * 31, 10, 80)
    const cvr        = seededRand(i * 5, 0.018, 0.07)
    const conversions = Math.floor(clicks * cvr)
    const revenue    = +(conversions * seededRand(i * 7, 12, 95)).toFixed(2)
    const commission = +(revenue * 0.30).toFixed(2)
    const paid       = i < 8 ? +(commission * seededRand(i * 13, 0.4, 1.0)).toFixed(2) : 0
    const joinedDaysAgo = randInt(10, 180)
    return {
      id:           `AFF-${String(i + 1).padStart(3, '0')}`,
      name:         `${first} ${last}`,
      email,
      status:       STATUSES[i],
      joined:       format(subDays(new Date(), joinedDaysAgo), 'yyyy-MM-dd'),
      clicks:       Math.floor(clicks),
      conversions,
      convRate:     +(conversions / Math.max(clicks, 1) * 100).toFixed(1),
      revenue,
      commission,
      paid,
      owed:         +(commission - paid).toFixed(2),
      lastActivity: format(subDays(new Date(), randInt(0, 14)), 'yyyy-MM-dd HH:mm'),
    }
  })
}

// ── Live activity feed ────────────────────────────────────────────────────────

const EVENT_TEMPLATES = [
  { type: 'signup',     label: 'New signup',          names: ['Alex K.', 'Maria L.', 'James T.', 'Priya S.', 'Chen W.', 'Sara M.', 'Tom B.'] },
  { type: 'sale',       label: 'New sale',            names: ['$9.99 — AI Tools Guide', '$29 — Pro bundle', '$49 — Annual plan', '$9.99 — AI Tools Guide'] },
  { type: 'conversion', label: 'Affiliate conversion', names: ['AFF-001 → $14.40', 'AFF-003 → $8.70', 'AFF-007 → $22.50', 'AFF-002 → $11.10'] },
  { type: 'cancel',     label: 'Cancellation',        names: ['User #2841', 'User #3102', 'User #1987'] },
  { type: 'refund',     label: 'Refund requested',    names: ['Order #8821 — $9.99', 'Order #9034 — $29.00'] },
  { type: 'alert',      label: 'System alert',        names: ['High traffic from organic — +340%', 'Affiliate spike: AFF-001', 'New affiliate application received'] },
]

function generateActivity(count = 40) {
  const events = []
  let t = new Date()
  for (let i = 0; i < count; i++) {
    t = subDays(t, rand(0, 0.05))
    t = new Date(t.getTime() - rand(60, 1800) * 1000)
    const template = EVENT_TEMPLATES[randInt(0, EVENT_TEMPLATES.length)]
    const detail   = template.names[randInt(0, template.names.length)]
    events.push({
      id:        `evt-${i}`,
      type:      template.type,
      label:     template.label,
      detail,
      timestamp: t.toISOString(),
    })
  }
  return events
}

const INITIAL_ACTIVITY = generateActivity(40)

export async function getLiveActivity() {
  await delay(150)
  return INITIAL_ACTIVITY
}

export async function getNewActivity() {
  await delay(100)
  const template = EVENT_TEMPLATES[randInt(0, EVENT_TEMPLATES.length)]
  const detail   = template.names[randInt(0, template.names.length)]
  return {
    id:        `evt-live-${Date.now()}`,
    type:      template.type,
    label:     template.label,
    detail,
    timestamp: new Date().toISOString(),
  }
}

// ── Traffic & engagement ──────────────────────────────────────────────────────

export async function getTraffic(dateRange) {
  await delay(220)
  const filtered = filterByRange(DAILY_REVENUE, dateRange)
  const days = filtered.length || 1
  const base = 380
  return {
    activeSessions: randInt(12, 48),
    avgSessionDuration: '3m 42s',
    pageViews: randInt(days * 40, days * 180),
    pageViewsChart: filtered.map(d => ({
      date: d.label,
      views: randInt(30, 240),
      sessions: randInt(15, 120),
    })),
    sources: [
      { name: 'Organic search', value: 38, color: '#10b981' },
      { name: 'Direct',         value: 22, color: '#8b5cf6' },
      { name: 'Affiliate',      value: 19, color: '#38bdf8' },
      { name: 'Social',         value: 13, color: '#f59e0b' },
      { name: 'Paid ads',       value:  8, color: '#f43f5e' },
    ],
    geography: [
      { country: 'United Kingdom', code: 'GB', sessions: 1240, flag: '🇬🇧' },
      { country: 'United States',  code: 'US', sessions:  980, flag: '🇺🇸' },
      { country: 'Morocco',        code: 'MA', sessions:  420, flag: '🇲🇦' },
      { country: 'France',         code: 'FR', sessions:  310, flag: '🇫🇷' },
      { country: 'Germany',        code: 'DE', sessions:  280, flag: '🇩🇪' },
      { country: 'Canada',         code: 'CA', sessions:  190, flag: '🇨🇦' },
      { country: 'Australia',      code: 'AU', sessions:  160, flag: '🇦🇺' },
      { country: 'India',          code: 'IN', sessions:  140, flag: '🇮🇳' },
      { country: 'Netherlands',    code: 'NL', sessions:   95, flag: '🇳🇱' },
      { country: 'Spain',          code: 'ES', sessions:   88, flag: '🇪🇸' },
    ],
  }
}

// ── Health & alerts ───────────────────────────────────────────────────────────

export async function getHealth() {
  await delay(120)
  return {
    services: [
      { name: 'WordPress / gammacash.online', status: 'ok',   uptime: '99.94%', latency: '142ms' },
      { name: 'GitHub Actions',               status: 'ok',   uptime: '99.99%', latency: '—'     },
      { name: 'ConvertKit',                   status: 'warn', uptime: '—',      latency: '—',   note: 'API key not configured' },
      { name: 'Gumroad',                      status: 'warn', uptime: '—',      latency: '—',   note: 'Account not linked' },
      { name: 'Stripe / Payments',            status: 'warn', uptime: '—',      latency: '—',   note: 'Not connected yet' },
      { name: 'Pinterest API',                status: 'warn', uptime: '—',      latency: '—',   note: 'Approval pending' },
    ],
    alerts: [
      { id: 'a1', severity: 'info',  title: 'AdSense not yet applied',      body: 'You need 10 posts. Currently at 3. Expected: ~May 14.',         time: '2 days ago' },
      { id: 'a2', severity: 'info',  title: 'Pinterest approval pending',    body: 'Applied 2026-04-27. Typically takes 2–4 weeks.',               time: '13 days ago' },
      { id: 'a3', severity: 'warn',  title: 'ConvertKit not configured',     body: 'Family member needs to create account and provide API key.',   time: 'now' },
      { id: 'a4', severity: 'warn',  title: 'Gumroad product not published', body: 'Awaiting family member Gumroad account for payout setup.',     time: 'now' },
      { id: 'a5', severity: 'info',  title: 'AppSumo affiliate not linked',  body: 'Apply at appsumo.com/affiliates — instant approval.',          time: 'now' },
      { id: 'a6', severity: 'ok',    title: 'All 11 workflows green',        body: 'Last master orchestrator run succeeded.',                       time: '3 hours ago' },
    ],
  }
}

// ── Workflows ────────────────────────────────────────────────────────────────

export async function getWorkflowRuns() {
  await delay(200)
  const wfs = [
    'Trend Detection', 'Content Generation', 'Social Posting',
    'Analytics Report', 'Master Orchestrator', 'Dashboard Update',
  ]
  return wfs.map((name, i) => ({
    name,
    status: i < 5 ? 'success' : 'running',
    lastRun: format(subDays(new Date(), seededRand(i * 7, 0, 2)), "MMM d, HH:mm"),
    duration: `${randInt(30, 180)}s`,
  }))
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function login(user, pass) {
  const validUser = import.meta.env.VITE_ADMIN_USER
  const validPass = import.meta.env.VITE_ADMIN_PASS
  if (user === validUser && pass === validPass) {
    sessionStorage.setItem('gcc_auth', '1')
    return true
  }
  return false
}

export function logout() {
  sessionStorage.removeItem('gcc_auth')
}

export function isAuthenticated() {
  return sessionStorage.getItem('gcc_auth') === '1'
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function fmt$(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(2)}`
}

export function fmtPct(n, decimals = 1) {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}
