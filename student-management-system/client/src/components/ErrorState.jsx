import { RotateCcw, ServerCrash } from 'lucide-react';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center" role="alert">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <ServerCrash className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
