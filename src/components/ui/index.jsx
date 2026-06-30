/**
 * components/ui/index.jsx — Shared UI Component Library
 * ─────────────────────────────────────────────
 * Button, Modal, Badge, DataTable, Input, Select,
 * Pagination, ConfirmDialog, EmptyState, Spinner
 */

import { useEffect, useRef } from 'react';
import { X, AlertTriangle, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import clsx from 'clsx';

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
export const ConfirmationModal = ({ open, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonClasses = {
    danger: 'btn-danger',
    warning: 'btn-warning',
    primary: 'btn-primary',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">
            {cancelText}
          </button>
          <button onClick={handleConfirm} className={buttonClasses[type]}>
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-primary-600">{message}</p>
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
export const Pagination = ({ page, totalPages, onPageChange, total, limit }) => {
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-surface-400">
        Showing <span className="font-medium text-primary-600">{start}–{end}</span> of{' '}
        <span className="font-medium text-primary-600">{total}</span>
      </p>
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
