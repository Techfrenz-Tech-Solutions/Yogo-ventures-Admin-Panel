/**
 * pages/Quotes.jsx — Quotes Management
 * Shows only type='order' records.
 * Columns: Quote ID | Name | Email | Phone Number | Street | City | Pincode | State | Country | Actions
 */

import { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';

const Quotes = () => {
  const [quotes, setQuotes]         = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const debouncedSearch             = useDebounce(search);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await orderAPI.getAll({ page, limit: 20, search: debouncedSearch, type: 'order' });
      setQuotes(r.data.data || []);
      setPagination(r.data.pagination || {});
    } catch {}
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (id) => {
    setConfirmModal({
      title: 'Delete Quote',
      message: 'Are you sure you want to delete this quote? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await orderAPI.delete(id);
          toast.success('Deleted.');
          load(pagination.page);
        } catch {}
      },
    });
  };

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
          <div className="stat-icon bg-primary-50 text-primary-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">Total Quotes</p>
            <p className="text-2xl font-heading font-bold text-primary-700 mt-0.5">
              {pagination.total || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Quotes</h1>
          <p className="text-primary-400 text-sm mt-0.5">{pagination.total || 0} total quotes</p>
        </div>
      </div>

      {/* Search */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, quote #..." />
        </div>
        {search && <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
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

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote ID</th><th>Name</th><th>Email</th><th>Phone Number</th>
                <th>State</th><th>Country</th><th>Received Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="h-8 bg-surface-100 rounded animate-pulse mx-2"/></td></tr>
                ))
              ) : quotes.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-primary-300">No quotes found</td></tr>
              ) : quotes.map(o => (
                <tr key={o._id}>
                  <td className="font-mono text-xs text-primary-500">{o.orderNumber}</td>
                  <td className="font-medium text-primary-700">{o.customerName}</td>
                  <td className="text-primary-400 text-sm">{o.customerEmail || '—'}</td>
                  <td className="text-primary-500 text-sm">{o.customerContact || '—'}</td>
                  <td className="text-primary-500 text-sm">{o.customerAddress?.state || '—'}</td>
                  <td className="text-primary-500 text-sm">{o.customerAddress?.country || '—'}</td>
                  <td className="text-primary-500 text-sm">{format(new Date(o.createdAt), 'dd MMM yy')}</td>
                  <td>
                    <button onClick={() => handleDelete(o._id)} className="btn-icon text-danger-400 hover:text-danger-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-primary-400">Page {pagination.page} of {pagination.pages} · {pagination.total} total</p>
            <div className="flex gap-1">
              <button onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-ghost btn-sm disabled:opacity-40">← Prev</button>
              <button onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-ghost btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {confirmModal && (
        <ConfirmationModal
          open={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
        />
      )}
    </div>
  );
};

export default Quotes;
