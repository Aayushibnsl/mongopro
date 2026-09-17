import { TriangleAlert } from 'lucide-react';

import { formatPercent, getAttendanceStatus } from '../utils/format.js';

// A small progress bar + percentage. Low attendance also gets a "Low" label,
// so the meaning never depends on colour alone.
export default function AttendanceBadge({ percentage, barWidth = 'w-16' }) {
  if (percentage == null) {
    return <span className="text-sm text-slate-400">No records</span>;
  }

  const status = getAttendanceStatus(percentage);
  const isLow = status.key === 'low';

  return (
    <div
      className="flex items-center gap-2.5"
      title={`${formatPercent(percentage)} – ${status.label} attendance`}
    >
      <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${barWidth}`}>
        <div
          className={`h-full rounded-full ${status.barClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-medium tabular-nums ${isLow ? 'text-red-700' : 'text-slate-900'}`}>
        {formatPercent(percentage)}
      </span>
      {isLow && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-600/15 ring-inset">
          <TriangleAlert className="h-3 w-3" />
          Low
        </span>
      )}
    </div>
  );
}
