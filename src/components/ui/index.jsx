/**
 * components/ui/index.jsx — Shared UI Component Library
 * ─────────────────────────────────────────────
 * Button, Modal, Badge, DataTable, Input, Select,
 * Pagination, ConfirmDialog, EmptyState, Spinner
 */

import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// ─── Button ────────────────────────────────────
export const Button = ({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon: Icon,
  iconRight, className = '', ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };
  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    icon: 'btn-icon',
  };

  return (
    <button
      className={clsx(variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {size !== 'icon' && children}
      {iconRight && <iconRight size={16} className="ml-1" />}
    </button>
  );
};

// ─── Modal ─────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md', footer }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <div className={clsx('modal-box', sizeClasses[size])}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-100 dark:border-primary-700">
          <h3 className="text-lg font-heading font-semibold text-primary-600 dark:text-surface-100">{title}</h3>
          <button onClick={onClose} className="btn-icon text-surface-400 hover:text-primary-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3 border-t border-surface-100 dark:border-primary-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Confirmation Modal ────────────────────────
export const ConfirmationModal = ({
  open, onClose, onConfirm, title = 'Confirm Action', message,
  confirmText = 'Confirm', confirmingText, cancelText = 'Cancel', type = 'danger',
}) => {
  // `confirming` covers callers whose onConfirm is async (e.g. an API call)
  // and want the popup to stay open — with the Confirm button disabled and
  // showing confirmingText — until it resolves, only closing on success.
  // Backward compatible: a plain synchronous onConfirm (the vast majority
  // of existing callers, e.g. delete confirmations) returns undefined,
  // `await`s immediately, and closes exactly as before — nothing here
  // changes their behaviour.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    setConfirming(true);
    try {
      const result = await onConfirm();
      // An explicit `false` return (not just falsy — undefined/void from a
      // sync caller must still count as success) means "the action failed,
      // keep the popup open" — the caller is expected to have already
      // shown its own error (e.g. a toast) and rolled back any optimistic
      // state, so nothing further is required here beyond staying open.
      if (result === false) {
        setConfirming(false);
        return;
      }
      onClose();
    } catch (err) {
      setConfirming(false);
      setError(err?.message || 'Something went wrong. Please try again.');
      return;
    }
    setConfirming(false);
  };

  // Ignore every close path (X button, overlay click, Escape key, Cancel)
  // while a confirm request is in flight, so it can't be dismissed out
  // from under a pending update.
  const guardedClose = () => { if (!confirming) onClose(); };

  const buttonClasses = {
    danger: 'btn-danger',
    warning: 'btn-warning',
    primary: 'btn-primary',
  };

  return (
    <Modal
      open={open}
      onClose={guardedClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={guardedClose} disabled={confirming} className="btn-ghost">
            {cancelText}
          </button>
          <button onClick={handleConfirm} disabled={confirming} className={buttonClasses[type]}>
            {confirming ? (confirmingText || `${confirmText}…`) : confirmText}
          </button>
        </>
      }
    >
      <p className="text-primary-600">{message}</p>
      {error && <p className="text-danger-600 text-sm mt-2">{error}</p>}
    </Modal>
  );
};

// ─── Badge ─────────────────────────────────────
const badgeVariants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

const STATUS_MAP = {
  in_stock: 'success', low_stock: 'warning', out_of_stock: 'danger',
  pending: 'warning', confirmed: 'info', processing: 'info',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
  refunded: 'neutral', processed: 'success',
  draft: 'neutral', sent: 'info', paid: 'success', overdue: 'danger',
  open: 'warning', in_progress: 'info', resolved: 'success', closed: 'neutral',
};

export const Badge = ({ status, children, variant }) => {
  const resolvedVariant = variant || STATUS_MAP[status] || 'neutral';
  const label = children || (status ? status.replace(/_/g, ' ') : '');
  return <span className={badgeVariants[resolvedVariant]}>{label}</span>;
};

// ─── DataTable ─────────────────────────────────
export const DataTable = ({ columns, data = [], loading = false, emptyMessage = 'No data found' }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner scale-150" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row._id || row.id || i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Pagination ────────────────────────────────
// rowsPerPage/onRowsPerPageChange are optional — when provided (the admin
// table pages, via hooks/usePagedRows.js), the summary + a "Rows per
// page" selector always render, even with a single page, since seeing/
// changing the page size shouldn't depend on there being multiple pages.
// Without them (a couple of older pages that predate this selector), the
// component keeps its original behaviour exactly: hidden entirely when
// there's nothing to paginate.
export const Pagination = ({
  page, totalPages, onPageChange, total, limit,
  rowsPerPage, onRowsPerPageChange, rowsPerPageOptions = [10, 50, 100, 200], itemLabel = 'entries',
}) => {
  const hasRowsPerPage = typeof onRowsPerPageChange === 'function';
  if (!hasRowsPerPage && totalPages <= 1) return null;

  const effectiveLimit = hasRowsPerPage ? rowsPerPage : limit;
  const start = total === 0 ? 0 : (page - 1) * effectiveLimit + 1;
  const end = Math.min(page * effectiveLimit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-surface-400">
          Showing <span className="font-medium text-primary-600">{start}–{end}</span> of{' '}
          <span className="font-medium text-primary-600">{total}</span>{hasRowsPerPage ? ` ${itemLabel}` : ''}
        </p>
        {hasRowsPerPage && (
          <label className="flex items-center gap-1.5 text-sm text-surface-400 whitespace-nowrap">
            Rows per page:
            <select
              className="form-select !py-1 !pr-7 !text-sm !w-auto"
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            >
              {rowsPerPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-icon disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} className="text-primary-500" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={clsx(
                  'w-8 h-8 text-sm rounded-lg font-medium transition-colors',
                  p === page
                    ? 'bg-primary-500 text-white'
                    : 'text-primary-500 hover:bg-surface-100'
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn-icon disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} className="text-primary-500" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Form Input ────────────────────────────────
export const Input = ({ label, error, className = '', required, ...props }) => (
  <div className="form-group">
    {label && (
      <label className="form-label">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
    )}
    <input
      className={clsx('form-input', error && 'form-input-error', className)}
      {...props}
    />
    {error && <p className="form-error"><AlertTriangle size={12} />{error}</p>}
  </div>
);

// ─── Form Select ───────────────────────────────
export const Select = ({ label, error, className = '', required, children, ...props }) => (
  <div className="form-group">
    {label && (
      <label className="form-label">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
    )}
    <select className={clsx('form-select', error && 'form-input-error', className)} {...props}>
      {children}
    </select>
    {error && <p className="form-error"><AlertTriangle size={12} />{error}</p>}
  </div>
);

// ─── Textarea ──────────────────────────────────
export const Textarea = ({ label, error, className = '', required, ...props }) => (
  <div className="form-group">
    {label && (
      <label className="form-label">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
    )}
    <textarea className={clsx('form-textarea', error && 'form-input-error', className)} {...props} />
    {error && <p className="form-error"><AlertTriangle size={12} />{error}</p>}
  </div>
);

// ─── Confirm Dialog ────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', variant = 'danger', loading }) => (
  <Modal open={open} onClose={onClose} title={title || 'Confirm Action'} size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>
    }
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-2xl bg-danger-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle size={18} className="text-danger-500" />
      </div>
      <p className="text-sm text-primary-600 leading-relaxed">{message || 'Are you sure you want to proceed?'}</p>
    </div>
  </Modal>
);

// ─── Empty State ───────────────────────────────
export const EmptyState = ({ message = 'No items found', action }) => (
  <div className="flex flex-col items-center gap-3 py-8">
    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
      <Inbox size={22} className="text-surface-400" />
    </div>
    <p className="text-sm text-surface-400">{message}</p>
    {action && action}
  </div>
);

// ─── Spinner ───────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return <div className={clsx('spinner', sizeMap[size])} />;
};


// ─── Retry Block ───────────────────────────────
// Shows when an API call fails (e.g. backend restarting).
// Drop this inside a table cell or page section instead of the loading spinner.
export const RetryBlock = ({ message = 'Failed to load data.', onRetry, colSpan = 6 }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-sm text-primary-500 font-medium">{message}</p>
        <p className="text-xs text-primary-300">The server may be restarting. Please wait a moment.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-outline btn-sm mt-1 gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        )}
      </div>
    </td>
  </tr>
);

// ─── Remarks Input ─────────────────────────────
// Inline, per-row editable text field shared by every table that has a
// REMARKS column (Quote/Contact/General/Sample Enquiries, Order Tracking).
// One instance per row, each with its own local draft/saved/saving state —
// never a single shared value across rows. Saves on blur or Enter, restores
// the last saved value on Escape, skips the request entirely if the trimmed
// value hasn't changed, and rolls back to the last saved value on failure.
//
// `onSave(trimmedValue)` must return a Promise that resolves on success and
// rejects (or throws) on failure — the caller owns the actual API call and
// any persistent (non-remarks) state update; this component only owns the
// input's own draft/saved/saving/error lifecycle.
export const RemarksInput = ({ value, onSave, placeholder = 'Add remarks', className = '' }) => {
  const [text, setText] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(value ?? '');
  const savingRef = useRef(false);
  const skipBlurRef = useRef(false);

  // Picks up an external refresh (e.g. a full refetch) as long as this row
  // isn't mid-edit/mid-save, so a background reload can't clobber unsaved
  // typing or race a save that's still in flight.
  useEffect(() => {
    if (!savingRef.current) {
      setText(value ?? '');
      savedRef.current = value ?? '';
    }
  }, [value]);

  const commit = async (draft) => {
    const trimmed = draft.trim();
    if (trimmed === (savedRef.current || '')) {
      if (trimmed !== draft) setText(trimmed);
      return;
    }
    if (savingRef.current) return; // one in-flight save per row at a time
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(trimmed);
      savedRef.current = trimmed;
      setText(trimmed);
    } catch (err) {
      setText(savedRef.current);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save remarks.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <input
      type="text"
      className={clsx('form-input text-sm', className)}
      style={{ minWidth: 220 }}
      value={text}
      placeholder={placeholder}
      disabled={saving}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (skipBlurRef.current) { skipBlurRef.current = false; return; }
        commit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(text);
        } else if (e.key === 'Escape') {
          setText(savedRef.current);
          skipBlurRef.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
};
