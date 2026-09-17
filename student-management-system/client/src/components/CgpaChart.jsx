// Column chart: number of students in each CGPA range
export default function CgpaChart({ bands }) {
  const maxCount = Math.max(...bands.map((band) => band.count), 1);

  return (
    <div>
      {/* Plot area – the extra top padding leaves room for the value labels */}
      <div className="flex h-60 items-end gap-2 border-b border-slate-200 pt-7">
        {bands.map((band) => (
          <div
            key={band.label}
            className="flex h-full flex-1 items-end justify-center"
            title={`CGPA ${band.label}: ${band.count} students`}
          >
            <div
              className="relative w-6 rounded-t bg-brand-600 transition-[height] duration-500"
              style={{ height: `${(band.count / maxCount) * 100}%` }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium text-slate-900 tabular-nums">
                {band.count}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {bands.map((band) => (
          <span key={band.label} className="flex-1 text-center text-xs text-slate-500 tabular-nums">
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}
