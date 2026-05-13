import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Server, Zap, Play } from 'lucide-react'
import { getHealth, getWorkflowRuns } from '../../api'
import { Skeleton } from '../ui/Skeleton'

const SEV_CONFIG = {
  ok:   { Icon: CheckCircle2, color: 'text-g-green',  bg: 'bg-g-green-dim',  label: 'OK'   },
  warn: { Icon: AlertTriangle,color: 'text-g-yellow', bg: 'bg-g-yellow-dim', label: 'Warn' },
  err:  { Icon: XCircle,      color: 'text-g-red',    bg: 'bg-g-red-dim',    label: 'Error'},
  info: { Icon: Clock,        color: 'text-g-blue',   bg: 'bg-g-blue-dim',   label: 'Info' },
}

const WF_STATUS = {
  success: { dot: 'bg-g-green',  text: 'text-g-green',  label: 'Passed' },
  running: { dot: 'bg-g-blue',   text: 'text-g-blue',   label: 'Running' },
  failed:  { dot: 'bg-g-red',    text: 'text-g-red',    label: 'Failed'  },
  pending: { dot: 'bg-g-yellow', text: 'text-g-yellow', label: 'Pending' },
}

export default function HealthAlerts() {
  const [health, setHealth]       = useState(null)
  const [workflows, setWorkflows] = useState(null)

  useEffect(() => {
    getHealth().then(setHealth)
    getWorkflowRuns().then(setWorkflows)
  }, [])

  const okCount   = health?.services.filter(s => s.status === 'ok').length   ?? 0
  const warnCount = health?.services.filter(s => s.status !== 'ok').length   ?? 0
  const alertWarnCount = health?.alerts.filter(a => a.severity === 'warn').length ?? 0

  return (
    <section>
      <h2 className="section-title">Health & Alerts</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Services */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-g-text-dim" />
              <h3 className="text-sm font-semibold text-g-text">Services</h3>
            </div>
            {health && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-g-green font-medium">{okCount} OK</span>
                {warnCount > 0 && <span className="text-g-yellow font-medium">{warnCount} warn</span>}
              </div>
            )}
          </div>
          {!health ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {health.services.map(svc => {
                const cfg = SEV_CONFIG[svc.status] ?? SEV_CONFIG.warn
                const { Icon } = cfg
                return (
                  <div key={svc.name} className={`flex items-start gap-3 p-2.5 rounded-lg ${cfg.bg}`}>
                    <Icon size={14} className={`mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-g-text truncate">{svc.name}</div>
                      {svc.note ? (
                        <div className="text-xs text-g-text-dim">{svc.note}</div>
                      ) : (
                        <div className="text-xs text-g-text-dim">
                          {svc.uptime && `Uptime ${svc.uptime}`}
                          {svc.latency && svc.latency !== '—' && ` · ${svc.latency}`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-g-text-dim" />
              <h3 className="text-sm font-semibold text-g-text">Alerts</h3>
            </div>
            {health && alertWarnCount > 0 && (
              <span className="badge bg-g-yellow-dim text-g-yellow">{alertWarnCount} action needed</span>
            )}
          </div>
          {!health ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {health.alerts.map(alert => {
                const cfg = SEV_CONFIG[alert.severity] ?? SEV_CONFIG.info
                const { Icon } = cfg
                return (
                  <div key={alert.id} className={`p-3 rounded-lg border border-transparent ${cfg.bg}`}>
                    <div className="flex items-start gap-2">
                      <Icon size={13} className={`mt-0.5 flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-g-text mb-0.5">{alert.title}</div>
                        <p className="text-xs text-g-text-dim leading-relaxed">{alert.body}</p>
                        <div className="text-xs text-g-text-faint mt-1">{alert.time}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Workflow runs */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-g-text-dim" />
            <h3 className="text-sm font-semibold text-g-text">GitHub Actions</h3>
          </div>
          {!workflows ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map(wf => {
                const cfg = WF_STATUS[wf.status] ?? WF_STATUS.pending
                return (
                  <div key={wf.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-g-surface hover:bg-g-border/30 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${wf.status === 'running' ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-g-text truncate">{wf.name}</div>
                      <div className="text-xs text-g-text-faint">{wf.lastRun} · {wf.duration}</div>
                    </div>
                    <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                    <Play size={10} className="text-g-text-faint hover:text-g-purple cursor-pointer" title="Trigger" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
