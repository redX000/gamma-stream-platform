import { useEffect, useState } from 'react'
import {
  DollarSign, TrendingUp, Users, UserCheck,
  Percent, TrendingDown, BarChart2
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line
} from 'recharts'
import { getKPIs, fmt$, fmtPct } from '../../api'
import { KPISkeleton } from '../ui/Skeleton'

const CARDS = [
  { key: 'revenue',         label: 'Total Revenue',   Icon: DollarSign,  format: v => fmt$(v),          unit: '' },
  { key: 'profit',          label: 'Net Profit',       Icon: TrendingUp,  format: v => fmt$(v),          unit: '' },
  { key: 'activeAffiliates',label: 'Active Affiliates',Icon: UserCheck,   format: v => v,                unit: '' },
  { key: 'subscribers',     label: 'Subscribers',      Icon: Users,       format: v => v.toLocaleString(),unit: '' },
  { key: 'conversionRate',  label: 'Conversion Rate',  Icon: Percent,     format: v => `${v.toFixed(1)}%`,unit: '' },
  { key: 'churnRate',       label: 'Churn Rate',       Icon: TrendingDown,format: v => `${v.toFixed(1)}%`,unit: '' },
  { key: 'mrr',             label: 'MRR',              Icon: BarChart2,   format: v => fmt$(v),          unit: '/mo' },
]

function SparkLine({ data, positive }) {
  const pts = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          dot={false}
          strokeWidth={1.5}
          stroke={positive ? '#10b981' : '#f43f5e'}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function KPICard({ label, Icon, data, format, unit }) {
  if (!data) return <KPISkeleton />
  const positive = data.change >= 0
  const isChurn  = label === 'Churn Rate'
  const good     = isChurn ? !positive : positive

  return (
    <div className="card hover:border-g-border-hi transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-g-purple-faint flex items-center justify-center">
            <Icon size={14} className="text-g-purple" />
          </div>
          <span className="text-xs font-medium text-g-text-dim">{label}</span>
        </div>
        <span className={`badge text-xs ${good ? 'bg-g-green-dim text-g-green' : 'bg-g-red-dim text-g-red'}`}>
          {fmtPct(data.change)}
        </span>
      </div>

      <div className="mb-1">
        <span className="text-2xl font-semibold text-g-text tabular-nums">
          {format(data.value)}
        </span>
        {unit && <span className="text-xs text-g-text-faint ml-1">{unit}</span>}
      </div>

      <p className="text-xs text-g-text-faint mb-3">
        vs prev period
      </p>

      <SparkLine data={data.sparkline} positive={good} />
    </div>
  )
}

export default function KPICards({ dateRange }) {
  const [kpis, setKPIs] = useState(null)

  useEffect(() => {
    setKPIs(null)
    getKPIs(dateRange).then(setKPIs)
  }, [dateRange])

  return (
    <section>
      <h2 className="section-title">Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {CARDS.map(({ key, label, Icon, format, unit }) => (
          <KPICard
            key={key}
            label={label}
            Icon={Icon}
            data={kpis?.[key]}
            format={format}
            unit={unit}
          />
        ))}
      </div>
    </section>
  )
}
