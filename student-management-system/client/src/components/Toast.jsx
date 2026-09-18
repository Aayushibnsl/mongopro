import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

/*
 * A tiny notification system.
 * Usage inside any component:
 *   const toast = useToast();
 *   toast.success('Student added successfully');
 *   toast.sync(response.sync);   // reports the institutional archive sync result
 */

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { icon: CheckCircle2, iconClass: 'text-brand-600' },
  error: { icon: XCircle, iconClass: 'text-red-600' },
  warning: { icon: TriangleAlert, iconClass: 'text-amber-500' },
  info: { icon: Info, iconClass: 'text-sky-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (type, title, description) => {
      const id = nextId.current++;
      // Keep at most 4 toasts on screen
      setToasts((current) => [...current.slice(-3), { id, type, title, description }]);
      setTimeout(() => dismiss(id), type === 'error' || type === 'warning' ? 6000 : 4000);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (title, description) => show('success', title, description),
      error: (title, description) => show('error', title, description),
      warning: (title, description) => show('warning', title, description),
      info: (title, description) => show('info', title, description),

      // Every create / update / delete response reports whether the archive copy succeeded
      sync: (sync) => {
        if (!sync) return;
        if (sync.status === 'synced') {
          show('success', 'Archive updated', 'The institutional archive has the same change.');
        } else if (sync.status === 'skipped') {
          show('warning', 'Archive not updated', sync.message);
        } else {
          show(
            'error',
            'Archive synchronisation failed',
            'Your change is safely saved and will sync on the next attempt.'
          );
        }
      },
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:top-20 sm:right-6 sm:left-auto"
      >
        {toasts.map(({ id, type, title, description }) => {
          const { icon: Icon, iconClass } = TOAST_STYLES[type];
          return (
            <div
              key={id}
              role="status"
              className="pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:w-96"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{title}</p>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
