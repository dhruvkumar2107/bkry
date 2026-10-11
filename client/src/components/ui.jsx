import React from 'react';
import { X, Loader2, PackageOpen } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/format.js';

export const Spinner = ({ className = 'h-5 w-5' }) => (
  <Loader2 className={`animate-spin ${className}`} />
);

export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
    <Spinner className="h-8 w-8 text-brand-600" />
    <p className="mt-3 text-sm">{label}</p>
  </div>
);

export const EmptyState = ({ icon: Icon = PackageOpen, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-6 text-center">
    <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-cream-100 text-gold-600">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
    {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Badge = ({ children, className = 'bg-slate-100 text-slate-700' }) => (
  <span className={`chip ${className}`}>{children}</span>
);

export const StatusBadge = ({ status }) => (
  <span className={`chip ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`w-full ${sizes[size]} max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-soft sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-sm text-slate-600">{message}</p>
    <div className="mt-6 flex justify-end gap-2">
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
    </div>
  </Modal>
);

export const Field = ({ label, children, hint }) => (
  <label className="block">
    {label && <span className="label">{label}</span>}
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
  </label>
);

export const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button className="btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
      <span className="text-sm text-slate-500">Page {page} of {pages}</span>
      <button className="btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
};
