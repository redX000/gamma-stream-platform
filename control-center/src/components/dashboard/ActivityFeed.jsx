import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus, ShoppingCart, Link2, XCircle, RefreshCcw, AlertTriangle, Activity
} from 'lucide-react'
import { getLiveActivity, getNewActivity } from '../../api'

const TYPE_CONFIG = {
  signup:     { Icon: UserPlus,      label: 'Signup',      dot: 'bg-g-green',  ring: 'bg-g-green-dim',  text: 'text-g-green'  },
  sale:       { Icon: ShoppingCart,  label: 'Sale',        dot: 'bg-g-purple', ring: 'bg-g-purple-faint',text: 'text-g-purple' },
  conversion: { Icon: Link2,         label: 'Conversion',  dot: 'bg-g-blue',   ring: 'bg-g-blue-dim',   text: 'text-g-blue'   },
  cancel:     { Icon: XCircle,       label: 'Cancelled',   dot: 'bg-g-red',    ring: 'bg-g-red-dim',    text: 'text-g-red'    },
  refund:     { Icon: RefreshCcw,    label: 'Refund',      dot: 'bg-g-yellow', ring: 'bg-g-yellow-dim', text: 'text-g-yellow' },
  alert:      { Icon: AlertTriangle, label: 'Alert',       dot: 'bg-g-yellow', ring: 'bg-g-yellow-dim', text: 'text-g-yellow' },
}

function TimeAgo({ ts }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    function update() {
      setLabel(formatDistanceToNow(new Date(ts), { addSuffix: true }))
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [ts])
  return <span className="text-xs text-g-text-faint whitespace-nowrap">{label}</span>
}

function FeedItem({ event, isNew }) {
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.alert
  const { Icon } = cfg
  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-g-border/50 last:border-0
                     ${isNew ? 'animate-slide-up' : ''}`}>
      <div className={`mt-0.5 w-7 h-7 rounded-lg ${cfg.ring} flex-shrink-0 flex items-center justify-center`}>
        <Icon size={13} className={cfg.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-semibold ${cfg.text}`}>{event.label}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
          <TimeAgo ts={event.timestamp} />
        </div>
        <p className="text-sm text-g-text truncate">{event.detail}</p>
      </div>
    </div>
  )
}

const FILTER_OPTIONS = [
  { key: 'all',        label: 'All'         },
  { key: 'signup',     label: 'Signups'     },
  { key: 'sale',       label: 'Sales'       },
  { key: 'conversion', label: 'Conversions' },
  { key: 'cancel',     label: 'Cancels'     },
  { key: 'alert',      label: 'Alerts'      },
]

export default function ActivityFeed({ autoRefresh }) {
  const [events,    setEvents]    = useState([])
  const [filter,    setFilter]    = useState('all')
  const [newIds,    setNewIds]    = useState(new Set())
  const [loading,   setLoading]   = useState(true)
  const [paused,    setPaused]    = useState(false)
  const feedRef = useRef(null)

  useEffect(() => {
    getLiveActivity().then(data => {
      setEvents(data)
      setLoading(false)
    })
  }, [])

  // Simulate new live events when autoRefresh is on
  useEffect(() => {
    if (!autoRefresh || paused) return
    const id = setInterval(async () => {
      const ev = await getNewActivity()
      setEvents(prev => [ev, ...prev].slice(0, 100))
      setNewIds(prev => new Set([...prev, ev.id]))
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(ev.id); return n }), 2000)
    }, 8000)
    return () => clearInterval(id)
  }, [autoRefresh, paused])

  const shown = filter === 'all' ? events : events.filter(e => e.type === filter)

  return (
    <section>
      <h2 className="section-title">Live Activity</h2>
      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-g-border">
          <div className="flex items-center gap-1.5 mr-2">
            <Activity size={14} className="text-g-purple" />
            <span className="text-xs font-semibold text-g-text">Feed</span>
            {autoRefresh && !paused && (
              <span className="w-1.5 h-1.5 rounded-full bg-g-green animate-pulse-slow" />
            )}
          </div>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-g-purple text-white'
                  : 'text-g-text-dim hover:text-g-text hover:bg-g-border'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => setPaused(p => !p)}
              className="btn-ghost text-xs"
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        </div>

        {/* Feed */}
        <div ref={feedRef} className="h-[420px] overflow-y-auto px-4">
          {loading ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-g-border flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-g-border rounded w-1/3" />
                    <div className="h-3 bg-g-border rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-g-text-faint">
              No events to show
            </div>
          ) : (
            shown.map(ev => (
              <FeedItem key={ev.id} event={ev} isNew={newIds.has(ev.id)} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-g-border bg-g-surface/50 flex items-center justify-between">
          <span className="text-xs text-g-text-faint">{shown.length} events</span>
          {autoRefresh && !paused && (
            <span className="text-xs text-g-text-faint">Live — new events streaming</span>
          )}
        </div>
      </div>
    </section>
  )
}
