import { Link } from 'react-router-dom';
import { ArrowRight, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

/*
 * One derived observation about the academic data.
 *
 * Severity is carried by an icon and the wording, not by colour alone, and every
 * card states the figure it was drawn from so the reader can check it.
 */
const SEVERITY = {
  critical: { icon: TriangleAlert, ink: 'text-status-critical', wash: 'bg-red-50 ring-red-100' },
  warning: { icon: CircleAlert, ink: 'text-amber-600', wash: 'bg-amber-50 ring-amber-100' },
  good: { icon: CircleCheck, ink: 'text-status-good', wash: 'bg-emerald-50 ring-emerald-100' },
  neutral: { icon: Info, ink: 'text-brand-600', wash: 'bg-brand-50 ring-brand-100' },
};

export default function InsightCard({ insight, compact = false }) {
  const { icon: Icon, ink, wash } = SEVERITY[insight.severity] ?? SEVERITY.neutral;

  return (
    <article className={`flex gap-3.5 ${compact ? '' : 'card card-hover p-5'}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${wash}`}
      >
        <Icon className={`h-4 w-4 ${ink}`} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[13px] leading-snug font-semibold text-slate-900">{insight.title}</h3>
          {insight.metric && !compact && (
            <span className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{insight.metric}</span>
          )}
        </div>

        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{insight.detail}</p>

        {insight.link && (
          <Link
            to={insight.link.to}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            {insight.link.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}
