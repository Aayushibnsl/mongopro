/*
 * Column chart — counts across ordered bands (CGPA ranges, semesters).
 *
 * One series in the accent colour. Values are labelled directly on each cap, so
 * the chart carries no gridlines and no y-axis: direct labels before gridlines.
 */
export default function ColumnChart({ bands, emptyMessage = 'No data yet.', formatValue = (v) => v }) {
  const total = bands.reduce((sum, band) => sum + band.count, 0);

  if (bands.length === 0 || total === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  const maxCount = Math.max(...bands.map((band) => band.count), 1);

  return (
    <div>
      {/* Plot area. The top padding reserves room for the cap labels. */}
      <div className="flex h-44 items-end gap-2 border-b border-slate-200 pt-7">
        {bands.map((band) => (
          <div
            key={band.label}
            className="group flex h-full flex-1 items-end justify-center"
            tabIndex={0}
            title={`${band.label}: ${formatValue(band.count)}`}
          >
            <div
              className="relative w-full max-w-6 rounded-t-[4px] bg-brand-600 transition-[height] duration-500 ease-out group-hover:bg-brand-700 group-focus:bg-brand-700"
              style={{ height: `${band.count === 0 ? 0 : Math.max((band.count / maxCount) * 100, 2)}%` }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[13px] font-semibold text-slate-900">
                {formatValue(band.count)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex gap-2">
        {bands.map((band) => (
          <span key={band.label} className="flex-1 text-center text-[11px] leading-tight text-slate-500">
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}
