import { getAttendanceStatus, formatPercent } from '../../utils/format.js';

/*
 * A single percentage with a severity fill. Used wherever one attendance figure
 * is the whole story — the number is the chart, the bar is the context.
 *
 * `threshold` draws a hairline marker at the institutional requirement so the
 * reader can see the value against the rule rather than against an empty track.
 */
export default function Meter({ value, threshold, label, size = 'md' }) {
  const status = getAttendanceStatus(value);
  const height = size === 'lg' ? 'h-3' : 'h-2.5';

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        {label && <span className="text-[13px] text-slate-600">{label}</span>}
        <span className="flex items-baseline gap-2">
          <span className={`font-semibold text-slate-900 ${size === 'lg' ? 'text-2xl' : 'text-sm'}`}>
            {formatPercent(value)}
          </span>
          <span className={`badge ${status.badge}`}>{status.label}</span>
        </span>
      </div>

      <div className={`relative w-full overflow-hidden rounded-[4px] bg-slate-100 ${height}`}>
        <div
          className={`h-full rounded-r-[4px] transition-[width] duration-500 ease-out ${status.fill}`}
          style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
        />
        {threshold != null && (
          <span
            className="absolute inset-y-0 w-px bg-slate-900/25"
            style={{ left: `${threshold}%` }}
            title={`Requirement: ${threshold}%`}
            aria-hidden="true"
          />
        )}
      </div>

      {threshold != null && (
        <p className="mt-1.5 text-[11px] text-slate-400">Institutional requirement: {threshold}%</p>
      )}
    </div>
  );
}
