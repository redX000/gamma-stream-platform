import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell, Sector
} from 'recharts'
import { getRevenue, getCostBreakdown } from '../../api'
import { ChartSkeleton } from '../ui/Skeleton'

// ── Shared chart theme ────────────────────────────────────────────────────────

const AXIS_STYLE = { fontSize: 11, fill: '#4b5563' }
const GRID_STYLE = { stroke: '#1c1c30', strokeDasharray: '3 3' }

function CustomTooltip({ active, payload, label, prefix = '$' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-g-card border border-g-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-g-text-dim mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-g-text-dim capitalize">{p.name}:</span>
          <span className="text-g-text font-medium">{prefix}{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function ChartTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-g-text">{children}</h3>
      {right}
    </div>
  )
}

// ── Revenue vs Profit line chart ──────────────────────────────────────────────

function RevenueLineChart({ data }) {
  const thinned = data.filter((_, i) => data.length <= 30 || i % Math.ceil(data.length / 30) === 0)
  return (
    <div className="card">
      <ChartTitle>Revenue vs Profit</ChartTitle>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={thinned} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={v => `$${v.toFixed(0)}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Revenue" />
          <Line type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} dot={false} name="Profit"  />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Revenue breakdown stacked bar ─────────────────────────────────────────────

function RevenueBreakdownChart({ data }) {
  const thinned = data.filter((_, i) => data.length <= 30 || i % Math.ceil(data.length / 14) === 0)
  return (
    <div className="card">
      <ChartTitle>Revenue by Source</ChartTitle>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={thinned} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={v => `$${v.toFixed(0)}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="organic"   stackId="a" fill="#10b981" name="Organic"   radius={[0,0,0,0]} />
          <Bar dataKey="affiliate" stackId="a" fill="#8b5cf6" name="Affiliate" radius={[0,0,0,0]} />
          <Bar dataKey="paid"      stackId="a" fill="#f59e0b" name="Paid Ads"  radius={[0,0,0,0]} />
          <Bar dataKey="direct"    stackId="a" fill="#38bdf8" name="Direct"    radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Cumulative profit area chart ──────────────────────────────────────────────

function CumulativeProfitChart({ data }) {
  let cum = 0
  const thinned = data
    .filter((_, i) => data.length <= 30 || i % Math.ceil(data.length / 30) === 0)
    .map(d => { cum += d.profit; return { ...d, cumProfit: +cum.toFixed(2) } })

  return (
    <div className="card">
      <ChartTitle>Cumulative Profit</ChartTitle>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={thinned} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={v => `$${v.toFixed(0)}`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="cumProfit" stroke="#10b981" strokeWidth={2}
                fill="url(#profitGrad)" name="Cumulative Profit" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Cost breakdown donut ──────────────────────────────────────────────────────

function ActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight={600}>
        ${value.toFixed(0)}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4}
              startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

function CostBreakdownChart({ costs }) {
  const [active, setActive] = useState(0)
  if (!costs) return <ChartSkeleton />
  return (
    <div className="card">
      <ChartTitle>Cost Breakdown</ChartTitle>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={costs}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              dataKey="value"
              activeIndex={active}
              activeShape={ActiveShape}
              onMouseEnter={(_, i) => setActive(i)}
            >
              {costs.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 min-w-[160px]">
          {costs.map(c => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
              <span className="text-g-text-dim flex-1">{c.name}</span>
              <span className="text-g-text font-medium tabular-nums">${c.value.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function RevenueCharts({ dateRange }) {
  const [data, setData]   = useState(null)
  const [costs, setCosts] = useState(null)

  useEffect(() => {
    setData(null); setCosts(null)
    getRevenue(dateRange).then(setData)
    getCostBreakdown(dateRange).then(setCosts)
  }, [dateRange])

  return (
    <section>
      <h2 className="section-title">Revenue & Profit</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data ? <RevenueLineChart data={data} />     : <ChartSkeleton />}
        {data ? <RevenueBreakdownChart data={data} /> : <ChartSkeleton />}
        {data ? <CumulativeProfitChart data={data} /> : <ChartSkeleton />}
        <CostBreakdownChart costs={costs} />
      </div>
    </section>
  )
}
