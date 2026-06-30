/**
 * pages/Enquiries.jsx — Enquiries Management
 * Columns: Enquiry ID | First Name | Last Name | Email Address | Phone Number |
 *          Country | Product Category | Subject | Message | Status |
 *          Enquiry Received Date | Actions
 * Responsive: card layout on mobile, compact table on tablet/desktop.
 */

import { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Enquiries.css';
import { ConfirmationModal } from '../components/ui';

const Enquiries = () => {
  const [enquiries, setEnquiries]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const debouncedSearch             = useDebounce(search);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await orderAPI.getAll({ page, limit: 20, search: debouncedSearch, type: 'enquiry' });
      setEnquiries(r.data.data || []);
      setPagination(r.data.pagination || {});
    } catch {}
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (id) => {
    setConfirmModal({
      title: 'Delete Enquiry',
      message: 'Are you sure you want to delete this enquiry? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await orderAPI.delete(id);
          toast.success('Deleted.');
          load(pagination.page);
          setSelected(null);
        } catch {}
      },
    });
  };

  /* ── Action buttons — shared by table row and mobile card ── */
  const RowActions = ({ o }) => (
    <div className="eq-actions">
      <button
        onClick={() => setSelected(o)}
        className="btn-icon text-primary-400 hover:text-primary-600"
        title="View details"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
      </button>
      <button
        onClick={() => handleDelete(o._id)}
        className="btn-icon text-danger-400 hover:text-danger-600"
        title="Delete enquiry"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  );

  /* ── Modal Detail Popup ── */
  const EnquiryModal = ({ enquiry, onClose }) => {
    if (!enquiry) return null;
    const fields = [
      { label: 'Enquiry ID',            value: enquiry.orderNumber },
      { label: 'First Name',            value: enquiry.firstName || '—' },
      { label: 'Last Name',             value: enquiry.lastName || '—' },
      { label: 'Email Address',         value: enquiry.customerEmail || '—' },
      { label: 'Phone Number',          value: enquiry.phone || enquiry.customerContact || '—' },
      { label: 'Country',               value: enquiry.country || '—' },
      { label: 'Subject',               value: enquiry.subject || '—' },
      { label: 'Enquiry Received Date', value: format(new Date(enquiry.createdAt), 'PPpp') },
    ];
    return (
      <div className="enquiry-modal-overlay" onClick={onClose}>
        <div className="enquiry-modal-box" onClick={e => e.stopPropagation()}>
          <div className="enquiry-modal-header">
            <div>
              <h4 className="font-heading font-semibold text-primary-600">
                Enquiry {enquiry.orderNumber}
              </h4>
              <p className="text-xs text-primary-400 mt-0.5">
                {format(new Date(enquiry.createdAt), 'PPpp')}
              </p>
            </div>
            <button onClick={onClose} className="btn-icon text-primary-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="enquiry-modal-grid">
            {fields.map(({ label, value, isNode }) => (
              <div key={label} className="enquiry-modal-field">
                <p className="text-primary-400 text-xs">{label}</p>
                {isNode
                  ? <div className="mt-0.5">{value}</div>
                  : <p className="font-medium text-primary-700 text-sm break-all">{value}</p>
                }
              </div>
            ))}
          </div>
          {enquiry.enquiryMessage && (
            <div className="enquiry-modal-message">
              <p className="text-xs text-primary-400 mb-1">Message</p>
              <p className="text-sm text-primary-600">{enquiry.enquiryMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Pagination ── */
  const PaginationBar = ({ className = '' }) => pagination.pages > 1 ? (
    <div className={`flex items-center justify-between px-4 py-3 border-t border-surface-100 ${className}`}>
      <p className="text-xs text-primary-400">
        Page {pagination.page} of {pagination.pages} · {pagination.total} total
      </p>
      <div className="flex gap-1">
        <button onClick={() => load(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="btn-ghost btn-sm disabled:opacity-40">← Prev</button>
        <button onClick={() => load(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          className="btn-ghost btn-sm disabled:opacity-40">Next →</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
          <div className="stat-icon bg-primary-50 text-primary-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">Total Enquiries</p>
            <p className="text-2xl font-heading font-bold text-primary-700 mt-0.5">
              {pagination.total || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Enquiries</h1>
          <p className="text-primary-400 text-sm mt-0.5">{pagination.total || 0} total enquiries</p>
        </div>
      </div>

      {/* Search */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input className="form-input pl-9" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, enquiry #..." />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">
            Clear
          </button>
        )}
      </div>

      {/* Export */}
      <div className="card !p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-primary-400 mb-1">From Date</label>
          <input type="date" className="form-input" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-primary-400 mb-1">To Date</label>
          <input type="date" className="form-input" />
        </div>
        <button className="btn-outline btn-sm gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Export PDF
        </button>
        <button className="btn-secondary btn-sm gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Export Excel
        </button>
      </div>

      {/* Modal */}
      {selected && <EnquiryModal enquiry={selected} onClose={() => setSelected(null)} />}

      {confirmModal && (
        <ConfirmationModal
          open={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
        />
      )}

      {/* ════════════════════════════════════════
          DESKTOP / TABLET TABLE  (≥ 768 px)
      ════════════════════════════════════════ */}
      <div className="card !p-0 overflow-hidden eq-table-wrap">
        <table className="data-table eq-table">
          <thead>
            <tr>
              <th className="eq-col-id">Enquiry ID</th>
              <th className="eq-col-sm">First Name</th>
              <th className="eq-col-sm">Last Name</th>
              <th className="eq-col-email">Email</th>
              <th className="eq-col-sm eq-hide-sm">Phone</th>
              <th className="eq-col-sm eq-hide-md">Country</th>
              <th className="eq-col-sm eq-hide-md">Subject</th>
              <th className="eq-col-msg eq-hide-sm">Message</th>
              <th className="eq-col-date eq-hide-sm">Received</th>
              <th className="eq-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={10}>
                    <div className="h-7 bg-surface-100 rounded animate-pulse mx-2"/>
                  </td>
                </tr>
              ))
            ) : enquiries.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-primary-300">
                  No enquiries found
                </td>
              </tr>
            ) : enquiries.map(o => (
              <tr key={o._id}>
                <td>
                  <span className="font-mono eq-cell-id eq-trunc" title={o.orderNumber}>
                    {o.orderNumber}
                  </span>
                </td>
                <td className="eq-cell-text">{o.firstName || '—'}</td>
                <td className="eq-cell-text">{o.lastName || '—'}</td>
                <td>
                  <span className="eq-cell-muted eq-trunc" title={o.customerEmail}>
                    {o.customerEmail}
                  </span>
                </td>
                <td className="eq-cell-muted eq-hide-sm">{o.phone || o.customerContact || '—'}</td>
                <td className="eq-cell-muted eq-hide-md">{o.country || '—'}</td>
                <td className="eq-hide-md">
                  <span className="eq-cell-muted eq-trunc" title={o.subject || ''}>
                    {o.subject || '—'}
                  </span>
                </td>
                <td className="eq-hide-sm">
                  <span className="eq-cell-muted eq-trunc" title={o.enquiryMessage || ''}>
                    {o.enquiryMessage || <span className="text-primary-300 italic">—</span>}
                  </span>
                </td>
                <td className="eq-cell-date eq-hide-sm">
                  {format(new Date(o.createdAt), 'dd MMM yy')}
                </td>
                <td><RowActions o={o} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar />
      </div>

      {/* ════════════════════════════════════════
          MOBILE CARD LIST  (< 768 px)
      ════════════════════════════════════════ */}
      <div className="eq-mobile-list">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="eq-mobile-card">
              <div className="h-5 bg-surface-100 rounded animate-pulse w-1/3 mb-2"/>
              <div className="h-4 bg-surface-100 rounded animate-pulse w-2/3"/>
            </div>
          ))
        ) : enquiries.length === 0 ? (
          <div className="card text-center py-12 text-primary-300">No enquiries found</div>
        ) : enquiries.map(o => (
          <div key={o._id} className="eq-mobile-card">
            <div className="eq-mc-top">
              <span className="font-mono text-xs text-primary-500">{o.orderNumber}</span>
            </div>
            <p className="eq-mc-name">
              {[o.firstName, o.lastName].filter(Boolean).join(' ') || '—'}
            </p>
            <div className="eq-mc-meta">
              {o.customerEmail   && <span>{o.customerEmail}</span>}
              {(o.phone || o.customerContact) && <span>{o.phone || o.customerContact}</span>}
              {o.country         && <span>{o.country}</span>}
              {o.subject         && <span>{o.subject}</span>}
            </div>
            {o.enquiryMessage && (
              <p className="eq-mc-msg">{o.enquiryMessage}</p>
            )}
            <div className="eq-mc-footer">
              <span className="text-xs text-primary-400">
                {format(new Date(o.createdAt), 'dd MMM yy')}
              </span>
              <RowActions o={o} />
            </div>
          </div>
        ))}
        <PaginationBar className="mt-1" />
      </div>

    </div>
  );
};

export default Enquiries;