import { useEffect, useState, useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { getAffiliates } from '../../api'
import { TableSkeleton, ChartSkeleton } from '../ui/Skeleton'

const STATUS_STYLE = {
  active:   'bg-g-green-dim text-g-green',
  inactive: 'bg-g-border text-g-text-faint',
  pending:  'bg-g-yellow-dim text-g-yellow',
}

const COLS = [
  { key: 'name',       label: 'Affiliate',          width: 'min-w-[140px]' },
  { key: 'status',     label: 'Status',              width: 'min-w-[80px]'  },
  { key: 'joined',     label: 'Joined',              width: 'min-w-[90px]'  },
  { key: 'clicks',     label: 'Clicks',              width: 'min-w-[70px]', align: 'right' },
  { key: 'conversions',label: 'Conversions',         width: 'min-w-[90px]', align: 'right' },
  { key: 'convRate',   label: 'CVR',                 width: 'min-w-[60px]', align: 'right' },
  { key: 'revenue',    label: 'Revenue',             width: 'min-w-[80px]', align: 'right' },
  { key: 'owed',       label: 'Commission Owed',     width: 'min-w-[110px]',align: 'right' },
  { key: 'lastActivity',label: 'Last Active',        width: 'min-w-[110px]' },
]

function SortIcon({ col, sortKey, dir }) {
  if (sortKey !== col) return <ChevronsUpDown size={12} className="text-g-text-faint" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-g-purple" />
    : <ChevronDown size={12} className="text-g-purple" />
}

const AXIS_STYLE   = { fontSize: 11, fill: '#4b5563' }
const GRID_STYLE   = { stroke: '#1c1c30', strokeDasharray: '3 3' }
const ACOLORS      = ['#8b5cf6', '#10b981', '#38bdf8', '#f59e0b', '#f43f5e']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-g-card border border-g-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-g-text-dim mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-g-text-dim">{p.name}:</span>
          <span className="text-g-text font-medium">${Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AffiliatesTable({ dateRange }) {
  const [affiliates, setAffiliates] = useState(null)
  const [query,      setQuery]      = useState('')
  const [sortKey,    setSortKey]    = useState('revenue')
  const [sortDir,    setSortDir]    = useState('desc')
  const [page,       setPage]       = useState(0)
  const PAGE_SIZE = 8

  useEffect(() => {
    setAffiliates(null)
    getAffiliates(dateRange).then(setAffiliates)
  }, [dateRange])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(0)
  }

  const filtered = useMemo(() => {
    if (!affiliates) return []
    const q = query.toLowerCase()
    return affiliates
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.id.includes(q))
      .sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [affiliates, query, sortKey, sortDir])

  const paged    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const maxPage  = Math.ceil(filtered.length / PAGE_SIZE) - 1
  const top5     = affiliates ? [...affiliates].sort((a,b) => b.revenue - a.revenue).slice(0,5) : []

  // Performance over time — fake per-affiliate sparklines using seeded data
  const perfData = useMemo(() => {
    if (!top5.length) return []
    return Array.from({ length: 8 }, (_, week) => {
      const row = { week: `W${week + 1}` }
      top5.forEach((a, i) => {
        row[a.name.split(' ')[0]] = +(a.revenue * (0.4 + (week / 8) * 0.6) * (0.8 + Math.sin(i + week) * 0.2)).toFixed(2)
      })
      return row
    })
  }, [top5.map(a => a.id).join()])

  if (!affiliates) {
    return (
      <section>
        <h2 className="section-title">Affiliates</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ChartSkeleton /> <ChartSkeleton />
        </div>
        <TableSkeleton rows={8} />
      </section>
    )
  }

  return (
    <section>
      <h2 className="section-title">Affiliates</h2>

      {/* Top affiliate charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top 5 by revenue */}
        <div className="card">
          <h3 className="text-sm font-semibold text-g-text mb-4">Top 5 by Revenue</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_STYLE} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} tickFormatter={v => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }}
                     tickFormatter={n => n.split(' ')[0]} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" radius={[0,4,4,0]}>
                {top5.map((_, i) => (
                  <Cell key={i} fill={ACOLORS[i % ACOLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance over time */}
        <div className="card">
          <h3 className="text-sm font-semibold text-g-text mb-4">Top Affiliate Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={perfData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="week" tick={AXIS_STYLE} />
              <YAxis tick={AXIS_STYLE} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              {top5.map((a, i) => (
                <Line key={a.id} type="monotone" dataKey={a.name.split(' ')[0]}
                      stroke={ACOLORS[i % ACOLORS.length]} strokeWidth={1.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-g-border">
          <Search size={14} className="text-g-text-faint flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0) }}
            placeholder="Search affiliates…"
            className="flex-1 bg-transparent text-sm text-g-text placeholder-g-text-faint
                       focus:outline-none"
          />
          <span className="text-xs text-g-text-faint">{filtered.length} results</span>
        </div>

        {/* Scrollable table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-g-border">
                {COLS.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-left ${col.align === 'right' ? 'text-right' : ''} ${col.width} text-xs font-medium text-g-text-faint cursor-pointer hover:text-g-text-dim select-none`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id} className="border-b border-g-border/50 hover:bg-g-border/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-g-text text-sm">{a.name}</div>
                      <div className="text-xs text-g-text-faint">{a.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-g-text-dim">{a.joined}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-g-text-dim">{a.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-g-text-dim">{a.conversions}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-g-text-dim">{a.convRate}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-g-text font-medium">${a.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={a.owed > 0 ? 'text-g-yellow font-medium' : 'text-g-text-faint'}>
                      ${a.owed.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-g-text-faint">{a.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-g-border">
            <span className="text-xs text-g-text-faint">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="btn-ghost text-xs disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page === maxPage}
                      className="btn-ghost text-xs disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
