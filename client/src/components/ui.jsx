import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`w-full ${sizes[size]} max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-soft animate-fade-in sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
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

export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={`skeleton ${className}`} />;

export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
    <div className="skeleton aspect-square rounded-none" />
    <div className="space-y-2 p-3">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-2/5" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
);
