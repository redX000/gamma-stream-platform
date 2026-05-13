export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-g-border animate-pulse rounded-lg ${className}`} />
  )
}

export function KPISkeleton() {
  return (
    <div className="card">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-16 mb-4" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className={`card ${height}`}>
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex items-end gap-2 h-3/4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${30 + Math.random() * 70}%` }} />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 8 }) {
  return (
    <div className="card">
      <Skeleton className="h-3 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
