import { useCallback, useEffect, useState } from 'react';
import { Archive, CloudUpload, Database, RefreshCw, ShieldCheck } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Spinner } from '../components/LoadingState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { getSystemStatus, syncAllRecords } from '../services/systemService.js';
import { getErrorMessage } from '../services/api.js';
import { APP_NAME, LOW_ATTENDANCE_THRESHOLD } from '../utils/constants.js';

const STATUS_STYLES = {
  connected: { label: 'Operational', dot: 'bg-status-good', badge: 'badge-good' },
  unavailable: { label: 'Unavailable', dot: 'bg-status-critical', badge: 'badge-critical' },
  database_not_found: { label: 'Not provisioned', dot: 'bg-status-warning', badge: 'badge-warning' },
  not_configured: { label: 'Not configured', dot: 'bg-slate-300', badge: 'badge-neutral' },
  checking: { label: 'Checking', dot: 'bg-slate-300', badge: 'badge-neutral' },
};

function ServiceRow({ icon: Icon, title, description, identifier, state }) {
  const style = STATUS_STYLES[state?.status] ?? STATUS_STYLES.checking;

  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 ring-inset">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="text-[13px] font-medium text-slate-900">{title}</p>
          <span className={`badge ${style.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
            {style.label}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-slate-500">{description}</p>
        {identifier && <p className="mt-1 font-mono text-[11px] text-slate-400">{identifier}</p>}
        {state && state.status !== 'connected' && state.message && (
          <p className="mt-1.5 text-[11px] text-slate-500">{state.message}</p>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const toast = useToast();

  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmSync, setConfirmSync] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getSystemStatus();
      setStatus(response.data);
      setStatusError('');
    } catch (err) {
      setStatus(null);
      setStatusError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await syncAllRecords();
      toast.success('Archive synchronised', response.message);
    } catch (err) {
      toast.error('Synchronisation failed', getErrorMessage(err));
    } finally {
      setSyncing(false);
      setConfirmSync(false);
      load();
    }
  }

  const canSync = status?.primary.status === 'connected' && status?.sir.status === 'connected';

  return (
    <>
      <PageHeader
        title="Settings"
        description="System status, data synchronisation and platform policy."
        actions={
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="System status" subtitle="Live state of the platform's data services">
            {loading && !status ? (
              <div className="space-y-5">
                {[0, 1].map((index) => (
                  <div key={index} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                ))}
              </div>
            ) : statusError ? (
              <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">{statusError}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                <ServiceRow
                  icon={Database}
                  title="Primary data store"
                  description="Holds every student, course and attendance record. This is the source of truth for the whole platform."
                  identifier={status?.primary.database}
                  state={status?.primary}
                />
                <ServiceRow
                  icon={Archive}
                  title="Institutional archive"
                  description="Receives a synchronised copy of every record so the institution keeps an independent archive."
                  identifier={status?.sir.database}
                  state={status?.sir}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Data synchronisation"
            subtitle="Push every current record to the institutional archive"
          >
            <p className="text-[13px] leading-relaxed text-slate-600">
              Records are synchronised automatically whenever they are created, updated or removed. Running a
              full synchronisation repairs the archive if it was unreachable at the time of a change. Existing
              copies are updated in place — nothing is duplicated and nothing is deleted.
            </p>

            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => setConfirmSync(true)}
              disabled={!canSync || syncing}
              title={canSync ? undefined : 'Both services must be operational before synchronising'}
            >
              {syncing ? <Spinner /> : <CloudUpload className="h-4 w-4" />}
              Synchronise all records
            </button>

            {!canSync && !loading && (
              <p className="mt-2.5 text-[11px] text-slate-500">
                Synchronisation is available when both services are operational.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Academic policy" subtitle="Thresholds applied across the platform">
            <dl className="space-y-4 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Minimum attendance</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">{LOW_ATTENDANCE_THRESHOLD}%</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Academic attention below</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">7.00 CGPA</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">High achiever from</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">8.00 CGPA</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Grading scale</dt>
                <dd className="font-semibold text-slate-900">10-point CGPA</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              These thresholds drive the risk flags and insights shown throughout the platform.
            </p>
          </SectionCard>

          <SectionCard title="About">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 ring-inset">
                <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-slate-900">{APP_NAME}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  A student management and academic intelligence platform for tracking enrolment, attendance
                  and academic performance across a department.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {confirmSync && (
        <ConfirmDialog
          title="Synchronise all records to the archive?"
          variant="primary"
          icon={CloudUpload}
          confirmLabel="Synchronise"
          loadingLabel="Synchronising..."
          loading={syncing}
          onConfirm={handleSync}
          onCancel={() => setConfirmSync(false)}
          message={
            <>
              <p>
                Every student, course and attendance record will be copied to the institutional archive.
              </p>
              <p>Existing copies are updated in place. No duplicates are created and nothing is deleted.</p>
            </>
          }
        />
      )}
    </>
  );
}
