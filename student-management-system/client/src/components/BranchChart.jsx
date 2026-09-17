import { formatPercent } from '../utils/format.js';

// Horizontal bars: how many students are in each branch (share of all students)
export default function BranchChart({ branches, totalStudents }) {
  if (branches.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No students yet.</p>;
  }

  return (
    <ul className="space-y-3.5">
      {branches.map(({ branch, count }) => {
        const share = totalStudents ? (count / totalStudents) * 100 : 0;
        return (
          <li key={branch} title={`${branch}: ${count} students (${formatPercent(share)})`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{branch}</span>
              <span className="shrink-0 text-slate-900 tabular-nums">
                <span className="font-medium">{count}</span>
                <span className="ml-1.5 text-xs text-slate-500">{formatPercent(share)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-r bg-brand-50">
              <div
                className="h-full rounded-r bg-brand-600 transition-[width] duration-500"
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
