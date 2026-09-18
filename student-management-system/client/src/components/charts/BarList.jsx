/*
 * Horizontal bar list — magnitude across named categories.
 *
 * One series, so one colour: the accent. Bars only take a status colour when the
 * value itself means a state (attendance below the threshold), and that colour is
 * always accompanied by the "At risk" label so it never has to be read alone.
 */
export default function BarList({
  items,
  max,
  formatValue = (value) => value,
  emptyMessage = 'No data yet.',
  valueWidth = 'w-14',
}) {
  if (!items || items.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  // A shared scale keeps bar lengths comparable across rows
  const scale = max ?? Math.max(...items.map((item) => item.value ?? 0), 1);

  // A short list is centred in its panel rather than stranded at the top
  const layout = items.length <= 3 ? 'flex h-full flex-col justify-center gap-4' : 'space-y-3.5';

  return (
    <ul className={layout}>
      {items.map((item) => {
        const value = item.value ?? 0;
        const width = scale > 0 ? Math.max((value / scale) * 100, value > 0 ? 1.5 : 0) : 0;

        return (
          <li
            key={item.id}
            className="group relative"
            tabIndex={0}
            title={item.tooltip ?? `${item.label}: ${formatValue(value)}`}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-slate-700">{item.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {item.note && <span className="text-[11px] text-slate-400">{item.note}</span>}
                <span className={`text-right text-[13px] font-semibold text-slate-900 tabular-nums ${valueWidth}`}>
                  {item.value == null ? '—' : formatValue(value)}
                </span>
              </span>
            </div>

            {/* Track is a lighter step of the bar's own ramp */}
            <div className="h-2.5 w-full overflow-hidden rounded-[4px] bg-slate-100">
              <div
                className={`h-full rounded-r-[4px] transition-[width] duration-500 ease-out ${item.fill ?? 'bg-brand-600'}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
