/*
 * Skeleton placeholders. These mirror the shape of the real content so the
 * layout does not jump when data arrives.
 */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-2.5 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex gap-4 border-b border-slate-100 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 border-b border-slate-50 px-4 py-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className={index === 0 ? 'h-8 flex-1' : 'h-3.5 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className = 'h-44' }) {
  return (
    <div className={`flex items-end gap-2 ${className}`} role="status" aria-label="Loading chart">
      {[60, 85, 45, 72, 55].map((height, index) => (
        <div key={index} className="flex-1">
          <Skeleton className="w-full rounded-t-[4px]" />
          <div className="skeleton rounded-t-[4px]" style={{ height: `${height}%`, minHeight: 20 }} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index}>
          <div className="mb-2 flex justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-[4px]" />
        </div>
      ))}
    </div>
  );
}
