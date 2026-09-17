import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';

import { formatPercent } from '../utils/format.js';

const BAND_STYLES = {
  good: { icon: CircleCheck, iconClass: 'text-status-good', barClass: 'bg-status-good' },
  average: { icon: CircleAlert, iconClass: 'text-amber-500', barClass: 'bg-status-warning' },
  low: { icon: TriangleAlert, iconClass: 'text-status-critical', barClass: 'bg-status-critical' },
};

// One stacked bar (good / average / low) plus a legend with the exact numbers
export default function AttendanceOverview({ bands, totalRecords }) {
  if (!totalRecords) {
    return <p className="py-10 text-center text-sm text-slate-500">No attendance records yet.</p>;
  }

  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded">
        {bands
          .filter((band) => band.count > 0)
          .map((band) => (
            <div
              key={band.key}
              className={`${BAND_STYLES[band.key].barClass} transition-[width] duration-500`}
              style={{ width: `${(band.count / totalRecords) * 100}%` }}
              title={`${band.label}: ${band.count} records`}
            />
          ))}
      </div>

      <ul className="mt-5 space-y-3">
        {bands.map((band) => {
          const { icon: Icon, iconClass } = BAND_STYLES[band.key];
          return (
            <li key={band.key} className="flex items-center gap-3">
              <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{band.label}</p>
                <p className="text-xs text-slate-500">{band.range}</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-sm font-medium text-slate-900">{band.count}</p>
                <p className="text-xs text-slate-500">{formatPercent((band.count / totalRecords) * 100)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
