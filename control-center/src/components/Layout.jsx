import { useState } from 'react'
import { Zap, RefreshCw, LogOut, Bell, Menu, X } from 'lucide-react'
import DateRangePicker from './ui/DateRangePicker'
import { logout } from '../api'

export default function Layout({ children, dateRange, onDateRangeChange, autoRefresh, onAutoRefreshChange, onLogout, lastRefreshed }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-g-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-g-bg/90 backdrop-blur border-b border-g-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-g-purple-faint border border-g-purple/30 flex items-center justify-center">
              <Zap size={15} className="text-g-purple" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-g-text">Gamma</span>
              <span className="text-sm font-semibold text-g-purple ml-1">Control Center</span>
            </div>
          </div>

          {/* Date picker — hidden on mobile */}
          <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
            <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="hidden lg:block text-xs text-g-text-faint">
                Updated {lastRefreshed}
              </span>
            )}

            {/* Auto-refresh toggle */}
            <button
              onClick={() => onAutoRefreshChange(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ON — click to stop' : 'Auto-refresh OFF'}
              className={`btn-ghost gap-1.5 text-xs ${autoRefresh ? 'text-g-green' : ''}`}
            >
              <RefreshCw size={14} className={autoRefresh ? 'animate-spin [animation-duration:3s]' : ''} />
              <span className="hidden sm:inline">{autoRefresh ? '30s' : 'Refresh'}</span>
            </button>

            <button className="btn-ghost relative">
              <Bell size={15} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-g-red rounded-full" />
            </button>

            <button onClick={handleLogout} className="btn-ghost text-g-text-dim">
              <LogOut size={15} />
            </button>

            {/* Mobile menu */}
            <button className="md:hidden btn-ghost" onClick={() => setMobileMenuOpen(o => !o)}>
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile date picker */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-g-border bg-g-bg">
            <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
          </div>
        )}
      </header>

      {/* Page title */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <h1 className="text-xl font-semibold text-g-text">
          Gamma Stream Control Center
        </h1>
        <p className="text-sm text-g-text-faint mt-0.5">Admin dashboard — private</p>
      </div>

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-12 space-y-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
