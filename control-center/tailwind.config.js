/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        g: {
          bg:           '#090912',
          surface:      '#0f0f1c',
          card:         '#141425',
          border:       '#1c1c30',
          'border-hi':  '#2a2a45',
          purple:       '#8b5cf6',
          'purple-dim': '#6d28d9',
          'purple-faint':'rgba(139,92,246,0.12)',
          text:         '#e2e8f0',
          'text-dim':   '#94a3b8',
          'text-faint': '#4b5563',
          green:        '#10b981',
          'green-dim':  'rgba(16,185,129,0.12)',
          red:          '#f43f5e',
          'red-dim':    'rgba(244,63,94,0.12)',
          yellow:       '#f59e0b',
          'yellow-dim': 'rgba(245,158,11,0.12)',
          blue:         '#38bdf8',
          'blue-dim':   'rgba(56,189,248,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
