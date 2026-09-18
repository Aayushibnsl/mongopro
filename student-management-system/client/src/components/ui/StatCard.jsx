/*
 * Stat tile: label · value · one contextual indicator · icon.
 * The value uses proportional figures (tabular-nums is reserved for columns).
 */
export default function StatCard({ label, value, indicator, indicatorTone = 'neutral', icon: Icon, loading }) {
  const toneClass = {
    neutral: 'text-slate-500',
    good: 'text-status-good',
    warning: 'text-amber-600',
    critical: 'text-status-critical',
  }[indicatorTone];

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
        <div className="skeleton mt-4 h-8 w-20" />
        <div className="skeleton mt-2.5 h-3 w-28" />
      </div>
    );
  }

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="mt-3 text-[28px] leading-none font-semibold tracking-tight text-slate-900">{value}</p>

      {indicator && <p className={`mt-2.5 text-xs ${toneClass}`}>{indicator}</p>}
    </div>
  );
}
