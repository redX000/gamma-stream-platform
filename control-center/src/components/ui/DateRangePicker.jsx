import { subDays, subMonths, format } from 'date-fns'
import { CalendarRange } from 'lucide-react'

const PRESETS = [
  { label: '7d',  start: () => subDays(new Date(), 6) },
  { label: '30d', start: () => subDays(new Date(), 29) },
  { label: '90d', start: () => subDays(new Date(), 89) },
  { label: '1y',  start: () => subMonths(new Date(), 12) },
]

export default function DateRangePicker({ value, onChange }) {
  const endLabel   = format(new Date(value.end), 'MMM d')
  const startLabel = format(new Date(value.start), 'MMM d, yyyy')

  function isActive(preset) {
    return format(preset.start(), 'yyyy-MM-dd') === format(new Date(value.start), 'yyyy-MM-dd')
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-g-card border border-g-border rounded-lg p-0.5">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => onChange({ start: p.start(), end: new Date() })}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              isActive(p)
                ? 'bg-g-purple text-white'
                : 'text-g-text-dim hover:text-g-text hover:bg-g-border'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-g-card border border-g-border rounded-lg text-xs text-g-text-dim">
        <CalendarRange size={13} />
        <span>{startLabel} — {endLabel}</span>
      </div>
    </div>
  )
}
