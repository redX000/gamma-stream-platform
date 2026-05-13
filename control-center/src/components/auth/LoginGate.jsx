import { useState } from 'react'
import { Lock, Eye, EyeOff, Zap } from 'lucide-react'
import { login } from '../../api'

export default function LoginGate({ onLogin }) {
  const [user, setUser]     = useState('')
  const [pass, setPass]     = useState('')
  const [showPass, setShow] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (login(user, pass)) {
        onLogin()
      } else {
        setError('Invalid credentials.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen bg-g-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-g-purple-faint border border-g-purple/30 flex items-center justify-center">
            <Zap size={20} className="text-g-purple" />
          </div>
          <div>
            <div className="text-sm font-semibold text-g-text">Gamma Stream</div>
            <div className="text-xs text-g-text-faint">Control Center</div>
          </div>
        </div>

        {/* Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={16} className="text-g-text-dim" />
            <span className="text-sm font-medium text-g-text-dim">Admin access only</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-g-text-dim mb-1.5">Username</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                autoComplete="username"
                className="w-full bg-g-surface border border-g-border rounded-lg px-3 py-2
                           text-sm text-g-text placeholder-g-text-faint
                           focus:outline-none focus:border-g-purple transition-colors"
                placeholder="lisa"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-g-text-dim mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-g-surface border border-g-border rounded-lg px-3 py-2 pr-10
                             text-sm text-g-text placeholder-g-text-faint
                             focus:outline-none focus:border-g-purple transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-g-text-faint hover:text-g-text-dim transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-g-red bg-g-red-dim px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-2.5 text-sm font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-g-text-faint mt-4">
          Private — authorised personnel only
        </p>
      </div>
    </div>
  )
}
