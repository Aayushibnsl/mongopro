import { RefreshCw, Sparkles } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import InsightCard from '../components/InsightCard.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { formatRelative } from '../utils/format.js';

const GROUPS = [
  {
    key: 'attention',
    title: 'Requires attention',
    subtitle: 'Where the data suggests action is needed',
    severities: ['critical', 'warning'],
  },
  {
    key: 'observations',
    title: 'Observations',
    subtitle: 'Context on the current state of your records',
    severities: ['neutral'],
  },
  {
    key: 'positive',
    title: 'Positive signals',
    subtitle: 'What is going well',
    severities: ['good'],
  },
];

export default function Insights() {
  const { data, loading, refreshing, error, refresh } = useAnalytics();

  const header = (
    <PageHeader
      title="Insights"
      description="Patterns drawn from your students, courses and attendance records."
      actions={
        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing || loading}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Recalculate
        </button>
      }
    />
  );

  if (error && !data) {
    return (
      <>
        {header}
        <div className="card">
          <ErrorState title="Could not generate insights" message={error} onRetry={refresh} />
        </div>
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        {header}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card flex gap-3.5 p-5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  const { insights, generatedAt } = data;

  return (
    <>
      {header}

      {/* How these are produced — stated plainly, so nothing is overclaimed */}
      <div className="card mb-6 flex items-start gap-3.5 bg-brand-50/40 p-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-slate-900">Data-driven insights</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Each observation below is calculated directly from the records currently stored on the platform
            using a fixed rule set — attendance thresholds, grade bands and course averages. Nothing is
            predicted or estimated, so a rule with no supporting data simply produces no insight.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">Last calculated {formatRelative(generatedAt)}</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title="Not enough data for insights yet"
            description="Add students, courses and attendance records and observations will appear here automatically."
          />
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          {GROUPS.map((group) => {
            const groupInsights = insights.filter((insight) => group.severities.includes(insight.severity));
            if (groupInsights.length === 0) return null;

            return (
              <SectionCard key={group.key} title={group.title} subtitle={group.subtitle}>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                  {groupInsights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} compact />
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </>
  );
}
