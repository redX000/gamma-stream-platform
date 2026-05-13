import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts'
import { Globe, Clock, Eye, Monitor } from 'lucide-react'
import { getTraffic } from '../../api'
import { ChartSkeleton, Skeleton } from '../ui/Skeleton'

const AXIS_STYLE = { fontSize: 11, fill: '#4b5563' }
const GRID_STYLE = { stroke: '#1c1c30', strokeDasharray: '3 3' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-g-card border border-g-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-g-text-dim mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-g-text-dim capitalize">{p.name}:</span>
          <span className="text-g-text font-medium">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ Icon, label, value, sub }) {
  return (
    <div className="card-sm flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-g-blue-dim flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-g-blue" />
      </div>
      <div>
        <div className="text-lg font-semibold text-g-text tabular-nums">{value}</div>
        <div className="text-xs text-g-text-faint">{label}</div>
        {sub && <div className="text-xs text-g-text-dim">{sub}</div>}
      </div>
    </div>
  )
}

function SourceDonut({ sources }) {
  const [active, setActive] = useState(null)
  const highlighted = active !== null ? sources[active] : null
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-g-text mb-4">Traffic Sources</h3>
      <div className="flex items-center gap-4">
        <div className="relative">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={sources}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                dataKey="value"
                onMouseEnter={(_, i) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {sources.map((s, i) => (
                  <Cell
                    key={i}
                    fill={s.color}
                    opacity={active === null || active === i ? 1 : 0.4}
                    stroke="transparent"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {highlighted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-base font-semibold text-g-text">{highlighted.value}%</div>
                <div className="text-[10px] text-g-text-faint">{highlighted.name.split(' ')[0]}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-g-text-dim">{s.name}</span>
              <span className="tabular-nums text-g-text font-medium">{s.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GeoList({ geography }) {
  const max = Math.max(...geography.map(g => g.sessions))
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={15} className="text-g-text-dim" />
        <h3 className="text-sm font-semibold text-g-text">Top Countries</h3>
      </div>
      <div className="space-y-2.5">
        {geography.map((g, i) => (
          <div key={g.code} className="flex items-center gap-2">
            <span className="text-base w-6 text-center">{g.flag}</span>
            <span className="text-xs text-g-text-dim w-24 truncate">{g.country}</span>
            <div className="flex-1 bg-g-border rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-g-purple transition-all"
                style={{ width: `${(g.sessions / max) * 100}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-g-text font-medium w-12 text-right">
              {g.sessions.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TrafficEngagement({ dateRange }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    setData(null)
    getTraffic(dateRange).then(setData)
  }, [dateRange])

  if (!data) {
    return (
      <section>
        <h2 className="section-title">Traffic & Engagement</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <ChartSkeleton />
        </div>
      </section>
    )
  }

  const thinned = data.pageViewsChart.filter((_, i) =>
    data.pageViewsChart.length <= 30 || i % Math.ceil(data.pageViewsChart.length / 20) === 0
  )

  return (
    <section>
      <h2 className="section-title">Traffic & Engagement</h2>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard Icon={Monitor} label="Active Sessions"       value={data.activeSessions}                sub="right now" />
        <StatCard Icon={Clock}   label="Avg Session Duration"  value={data.avgSessionDuration}             sub="per visitor" />
        <StatCard Icon={Eye}     label="Page Views"            value={data.pageViews.toLocaleString()}     sub="in period" />
        <StatCard Icon={Globe}   label="Countries"             value={data.geography.length}               sub="top sources" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Page views area chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-g-text mb-4">Page Views & Sessions</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={thinned} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="date" tick={AXIS_STYLE} interval="preserveStartEnd" />
              <YAxis tick={AXIS_STYLE} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="views"    stroke="#8b5cf6" fill="url(#viewGrad)" strokeWidth={1.5} name="Views"    />
              <Area type="monotone" dataKey="sessions" stroke="#38bdf8" fill="url(#sessGrad)" strokeWidth={1.5} name="Sessions" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Source donut */}
        <SourceDonut sources={data.sources} />
      </div>

      {/* Geography */}
      <GeoList geography={data.geography} />
    </section>
  )
}
