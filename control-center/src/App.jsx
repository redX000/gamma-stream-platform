import { useState, useEffect, useCallback } from 'react'
import { subDays, format } from 'date-fns'
import { isAuthenticated } from './api'
import LoginGate          from './components/auth/LoginGate'
import Layout             from './components/Layout'
import KPICards           from './components/dashboard/KPICards'
import RevenueCharts      from './components/dashboard/RevenueCharts'
import AffiliatesTable    from './components/dashboard/AffiliatesTable'
import ActivityFeed       from './components/dashboard/ActivityFeed'
import TrafficEngagement  from './components/dashboard/TrafficEngagement'
import HealthAlerts       from './components/dashboard/HealthAlerts'

const DEFAULT_RANGE = {
  start: subDays(new Date(), 29),
  end:   new Date(),
}

export default function App() {
  const [authed,       setAuthed]       = useState(isAuthenticated)
  const [dateRange,    setDateRange]    = useState(DEFAULT_RANGE)
  const [autoRefresh,  setAutoRefresh]  = useState(false)
  const [refreshKey,   setRefreshKey]   = useState(0)
  const [lastRefreshed,setLastRefreshed]= useState(null)

  // Auto-refresh: rebuild all data components every 30s
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      setRefreshKey(k => k + 1)
      setLastRefreshed(format(new Date(), 'HH:mm:ss'))
    }, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const rangeKey = `${format(dateRange.start,'yyyy-MM-dd')}_${format(dateRange.end,'yyyy-MM-dd')}_${refreshKey}`

  if (!authed) {
    return <LoginGate onLogin={() => setAuthed(true)} />
  }

  return (
    <Layout
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      autoRefresh={autoRefresh}
      onAutoRefreshChange={setAutoRefresh}
      onLogout={() => setAuthed(false)}
      lastRefreshed={lastRefreshed}
    >
      <KPICards          key={`kpi_${rangeKey}`}    dateRange={dateRange} />
      <RevenueCharts     key={`rev_${rangeKey}`}    dateRange={dateRange} />
      <AffiliatesTable   key={`aff_${rangeKey}`}    dateRange={dateRange} />
      <ActivityFeed      autoRefresh={autoRefresh} />
      <TrafficEngagement key={`trf_${rangeKey}`}    dateRange={dateRange} />
      <HealthAlerts      key={`hlt_${refreshKey}`} />
    </Layout>
  )
}
