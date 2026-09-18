import { RotateCcw, TriangleAlert } from 'lucide-react';

export default function ErrorState({ title = 'Something went wrong', message, onRetry, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 text-center ${compact ? 'py-10' : 'py-16'}`}
      role="alert"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 ring-1 ring-red-100 ring-inset">
        <TriangleAlert className="h-5 w-5 text-status-critical" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
