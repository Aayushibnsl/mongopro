import { formatPercent, getAttendanceStatus } from '../utils/format.js';

/*
 * A compact attendance reading: a thin bar, the percentage, and — when the
 * student is below the requirement — a written "At risk" label, so the state is
 * never communicated by colour alone.
 */
export default function AttendanceBadge({ percentage, barWidth = 'w-16', showLabel = true }) {
  if (percentage == null) {
    return <span className="text-sm text-slate-400">Not tracked</span>;
  }

  const status = getAttendanceStatus(percentage);

  return (
    <div className="flex items-center gap-2.5" title={`${formatPercent(percentage)} — ${status.label}`}>
      <div className={`h-1.5 shrink-0 overflow-hidden rounded-full bg-slate-100 ${barWidth}`}>
        <div
          className={`h-full rounded-r-full ${status.fill}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-900 tabular-nums">{formatPercent(percentage)}</span>
      {showLabel && status.key === 'low' && <span className="badge badge-critical">At risk</span>}
    </div>
  );
}
