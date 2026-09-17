import { TriangleAlert } from 'lucide-react';

import Modal from './Modal.jsx';
import { Spinner } from './LoadingState.jsx';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  loadingLabel = 'Deleting...',
  variant = 'danger',
  icon: Icon = TriangleAlert,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const isDanger = variant === 'danger';

  return (
    <Modal
      title={title}
      size="sm"
      onClose={loading ? () => {} : onCancel}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner />}
            {loading ? loadingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDanger ? 'bg-red-50' : 'bg-brand-50'}`}
        >
          <Icon className={`h-5 w-5 ${isDanger ? 'text-red-600' : 'text-brand-700'}`} />
        </div>
        <div className="space-y-2 text-sm text-slate-600">{message}</div>
      </div>
    </Modal>
  );
}
