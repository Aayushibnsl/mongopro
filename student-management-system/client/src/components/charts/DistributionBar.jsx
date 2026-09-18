import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';

import { formatPercent } from '../../utils/format.js';

/*
 * Part-to-whole across three attendance states.
 *
 * These are status colours, not series colours, so each one ships with an icon
 * and a written label in the legend below — the colour never carries the meaning
 * on its own. Segments are separated by a 2px gap in the surface colour.
 */
const BAND_STYLES = {
  good: { icon: CircleCheck, fill: 'bg-status-good', ink: 'text-status-good' },
  average: { icon: CircleAlert, fill: 'bg-status-warning', ink: 'text-amber-600' },
  low: { icon: TriangleAlert, fill: 'bg-status-critical', ink: 'text-status-critical' },
};

export default function DistributionBar({ bands, total, emptyMessage = 'No attendance records yet.' }) {
  if (!total) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[4px]">
        {bands
          .filter((band) => band.count > 0)
          .map((band) => (
            <div
              key={band.key}
              className={`${BAND_STYLES[band.key].fill} first:rounded-l-[4px] last:rounded-r-[4px] transition-[width] duration-500 ease-out`}
              style={{ width: `${(band.count / total) * 100}%` }}
              title={`${band.label}: ${band.count} of ${total} records`}
            />
          ))}
      </div>

      <ul className="mt-5 space-y-3">
        {bands.map((band) => {
          const { icon: Icon, ink } = BAND_STYLES[band.key];
          return (
            <li key={band.key} className="flex items-center gap-3">
              <Icon className={`h-4 w-4 shrink-0 ${ink}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-900">{band.label}</p>
                <p className="text-[11px] text-slate-500">{band.range}</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-[13px] font-semibold text-slate-900">{band.count}</p>
                <p className="text-[11px] text-slate-500">{formatPercent((band.count / total) * 100, 0)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
