import { CloudUpload, Database, RefreshCw, School } from 'lucide-react';

import { Spinner } from './LoadingState.jsx';

const STATUS_STYLES = {
  connected: {
    label: 'Connected',
    dot: 'bg-status-good',
    pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  },
  unavailable: {
    label: 'Unavailable',
    dot: 'bg-status-critical',
    pill: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  database_not_found: {
    label: 'Database not found',
    dot: 'bg-status-warning',
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  },
  not_configured: {
    label: 'Not configured',
    dot: 'bg-slate-400',
    pill: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  },
  checking: {
    label: 'Checking...',
    dot: 'bg-slate-300',
    pill: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
};

function DatabaseRow({ icon: Icon, title, database, state }) {
  const style = STATUS_STYLES[state?.status] ?? STATUS_STYLES.checking;
  const showMessage = state && state.status !== 'connected';

  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-xs text-slate-500">{state?.database ?? database}</p>
        {showMessage && <p className="mt-1 text-xs text-slate-500">{state.message}</p>}
      </div>
    </div>
  );
}

/**
 * Shows whether the primary and professor databases are connected.
 * Only database names are shown – never connection strings or passwords.
 */
export default function DatabaseStatus({ status, error, refreshing, syncing, onRefresh, onSyncAll }) {
  const canSync = status?.primary.status === 'connected' && status?.sir.status === 'connected';

  return (
    <section className="card p-5" aria-label="Database connections">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-5 sm:grid-cols-2">
          <DatabaseRow
            icon={Database}
            title="Primary database"
            database="student_management"
            state={status?.primary}
          />
          <DatabaseRow icon={School} title="Professor database" database="PCEA24CY002" state={status?.sir} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSyncAll}
            disabled={!canSync || syncing}
            title={
              canSync ? 'Copy every record to the professor database' : 'Both databases must be connected'
            }
          >
            {syncing ? <Spinner /> : <CloudUpload className="h-4 w-4" />}
            Sync all to professor DB
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
