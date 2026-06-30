/**
 * pages/Orders.jsx — Orders & Enquiries Management
 *
 * Two separate tables:
 *   1. Enquiries Table  — type='enquiry'  columns: Enquiry ID | Name | Contact | Email | Message | Status | Date | Actions
 *   2. Quotes Table     — type='order'    columns: Quote ID | Name | Email | Phone Number | Street | City | Pincode | State | Country | Actions
 */
import { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','processed'];

const Orders = () => {
  // ── Enquiries state ──────────────────────────
  const [enquiries, setEnquiries] = useState([]);
  const [enquiryPagination, setEnquiryPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [enquiryLoading, setEnquiryLoading] = useState(true);
  const [enquirySearch, setEnquirySearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const debouncedEnquirySearch = useDebounce(enquirySearch);

  // ── Quotes state ─────────────────────────────
  const [quotes, setQuotes] = useState([]);
  const [quotePagination, setQuotePagination] = useState({ page: 1, total: 0, pages: 1 });
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteSearch, setQuoteSearch] = useState('');
  const debouncedQuoteSearch = useDebounce(quoteSearch);

  // ── Load enquiries (type=enquiry) ─────────────
  const loadEnquiries = useCallback(async (page = 1) => {
    setEnquiryLoading(true);
    try {
      const r = await orderAPI.getAll({ page, limit: 20, search: debouncedEnquirySearch, status: filterStatus, type: 'enquiry' });
      setEnquiries(r.data.data || []);
      setEnquiryPagination(r.data.pagination || {});
    } catch {}
    setEnquiryLoading(false);
  }, [debouncedEnquirySearch, filterStatus]);

  // ── Load quotes (type=order) ──────────────────
  const loadQuotes = useCallback(async (page = 1) => {
    setQuoteLoading(true);
    try {
      const r = await orderAPI.getAll({ page, limit: 20, search: debouncedQuoteSearch, type: 'order' });
      setQuotes(r.data.data || []);
      setQuotePagination(r.data.pagination || {});
    } catch {}
    setQuoteLoading(false);
  }, [debouncedQuoteSearch]);

  useEffect(() => { loadEnquiries(1); }, [loadEnquiries]);
  useEffect(() => { loadQuotes(1); }, [loadQuotes]);

  const handleStatusChange = async (id, status) => {
    try {
      await orderAPI.updateStatus(id, { status });
      toast.success(`Marked as ${status}`);
      loadEnquiries(enquiryPagination.page);
    } catch {}
  };

  const handleDeleteEnquiry = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    try { await orderAPI.delete(id); toast.success('Deleted.'); loadEnquiries(enquiryPagination.page); } catch {}
  };

  const handleDeleteQuote = async (id) => {
    if (!confirm('Delete this quote?')) return;
    try { await orderAPI.delete(id); toast.success('Deleted.'); loadQuotes(quotePagination.page); } catch {}
  };

  const statusBadge = (s) => {
    const map = { pending:'badge-warning', confirmed:'badge-info', processing:'badge-info', shipped:'badge-info', delivered:'badge-success', cancelled:'badge-danger', processed:'badge-success', refunded:'badge-neutral' };
    return <span className={`badge ${map[s]||'badge-neutral'}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quote & Enquiries</h1>
          <p className="text-primary-400 text-sm mt-0.5">
            {enquiryPagination.total || 0} enquiries · {quotePagination.total || 0} quotes
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 1 — ENQUIRIES TABLE
      ══════════════════════════════════════════ */}
      <div className="flex items-center gap-2 mt-2 mb-1">
        <h2 className="font-heading font-semibold text-primary-600 text-base">Enquiries</h2>
        <span className="badge badge-info">{enquiryPagination.total || 0}</span>
      </div>

      {/* Enquiry Filters */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input className="form-input pl-9" value={enquirySearch} onChange={e=>setEnquirySearch(e.target.value)} placeholder="Search by name, email, enquiry #..." />
        </div>
        {/* <select className="form-select w-36" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select> */}
      </div>

      {/* Enquiry Detail Panel */}
      {selectedEnquiry && (
        <div className="card border border-primary-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-heading font-semibold text-primary-600">Enquiry {selectedEnquiry.orderNumber}</h4>
              <p className="text-xs text-primary-400 mt-0.5">{format(new Date(selectedEnquiry.createdAt), 'PPpp')}</p>
            </div>
            <button onClick={()=>setSelectedEnquiry(null)} className="btn-icon text-primary-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-primary-400 text-xs">Customer</p><p className="font-medium text-primary-700">{selectedEnquiry.customerName}</p></div>
            <div><p className="text-primary-400 text-xs">Email</p><p className="font-medium text-primary-700">{selectedEnquiry.customerEmail}</p></div>
            <div><p className="text-primary-400 text-xs">Contact</p><p className="font-medium text-primary-700">{selectedEnquiry.customerContact || '—'}</p></div>
            <div><p className="text-primary-400 text-xs">Total</p><p className="font-mono font-semibold text-primary-700">₹{selectedEnquiry.totalAmount?.toLocaleString('en-IN')}</p></div>
          </div>
          {selectedEnquiry.enquiryMessage && (
            <div className="mt-4 bg-surface-50 rounded-xl p-3">
              <p className="text-xs text-primary-400 mb-1">Enquiry Message</p>
              <p className="text-sm text-primary-600">{selectedEnquiry.enquiryMessage}</p>
            </div>
          )}
          <div className="flex gap-2 mt-4 pt-4 border-t border-surface-100 flex-wrap">
            {['confirmed','processing','shipped','delivered','processed'].map(s=>(
              <button key={s} onClick={()=>handleStatusChange(selectedEnquiry._id, s)} className="btn-secondary btn-sm capitalize">{s}</button>
            ))}
            <button onClick={()=>handleStatusChange(selectedEnquiry._id,'cancelled')} className="btn-danger btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Enquiries Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Enquiry ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiryLoading ? (
                Array.from({length:5}).map((_,i)=><tr key={i}><td colSpan={8}><div className="h-8 bg-surface-100 rounded animate-pulse mx-2"/></td></tr>)
              ) : enquiries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-primary-300">No enquiries found</td></tr>
              ) : enquiries.map((o) => (
                <tr key={o._id}>
                  {/* Enquiry ID */}
                  <td className="font-mono text-xs text-primary-500">{o.orderNumber}</td>
                  {/* Name */}
                  <td className="font-medium text-primary-700">{o.customerName}</td>
                  {/* Contact */}
                  <td className="text-primary-400 text-sm">{o.customerContact || '—'}</td>
                  {/* Email */}
                  <td className="text-primary-400 text-sm">{o.customerEmail}</td>
                  {/* Message (enquiry message preview) */}
                  <td>
                    <p className="text-sm text-primary-500 max-w-[180px] truncate" title={o.enquiryMessage || ''}>
                      {o.enquiryMessage
                        ? o.enquiryMessage
                        : <span className="text-primary-300 italic">—</span>}
                    </p>
                  </td>
                  {/* Status */}
                  <td>{statusBadge(o.status)}</td>
                  {/* Date */}
                  <td className="text-primary-400 text-xs">{format(new Date(o.createdAt),'dd MMM yy')}</td>
                  {/* Actions */}
                  <td>
                    <div className="flex gap-1">
                      <button onClick={()=>setSelectedEnquiry(o)} className="btn-icon text-primary-400 hover:text-primary-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      {!o.isProcessed && (
                        <button onClick={()=>handleStatusChange(o._id,'processed')} className="btn-icon text-success-500 hover:text-success-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </button>
                      )}
                      <button onClick={()=>handleDeleteEnquiry(o._id)} className="btn-icon text-danger-400 hover:text-danger-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {enquiryPagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-primary-400">Page {enquiryPagination.page} of {enquiryPagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={()=>loadEnquiries(enquiryPagination.page-1)} disabled={enquiryPagination.page<=1} className="btn-ghost btn-sm disabled:opacity-40">← Prev</button>
              <button onClick={()=>loadEnquiries(enquiryPagination.page+1)} disabled={enquiryPagination.page>=enquiryPagination.pages} className="btn-ghost btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>


      {/* ══════════════════════════════════════════
          SECTION 2 — QUOTES TABLE
      ══════════════════════════════════════════ */}
      <div className="flex items-center gap-2 mt-6 mb-1">
        <h2 className="font-heading font-semibold text-primary-600 text-base">Quotes</h2>
        <span className="badge badge-neutral">{quotePagination.total || 0}</span>
      </div>

      {/* Quote Filters */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input className="form-input pl-9" value={quoteSearch} onChange={e=>setQuoteSearch(e.target.value)} placeholder="Search by name, email, quote #..." />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Street</th>
                <th>City</th>
                <th>Pincode</th>
                <th>State</th>
                <th>Country</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quoteLoading ? (
                Array.from({length:5}).map((_,i)=><tr key={i}><td colSpan={10}><div className="h-8 bg-surface-100 rounded animate-pulse mx-2"/></td></tr>)
              ) : quotes.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-primary-300">No quotes found</td></tr>
              ) : quotes.map((o) => (
                <tr key={o._id}>
                  {/* Quote ID */}
                  <td className="font-mono text-xs text-primary-500">{o.orderNumber}</td>
                  {/* Name */}
                  <td className="font-medium text-primary-700">{o.customerName}</td>
                  {/* Email */}
                  <td className="text-primary-400 text-sm">{o.customerEmail || '—'}</td>
                  {/* Phone Number */}
                  <td className="text-primary-500 text-sm">{o.customerContact || '—'}</td>
                  {/* Street */}
                  <td className="text-primary-500 text-sm">{o.customerAddress?.street || '—'}</td>
                  {/* City */}
                  <td className="text-primary-500 text-sm">{o.customerAddress?.city || '—'}</td>
                  {/* Pincode */}
                  <td className="text-primary-500 text-sm font-mono">{o.customerAddress?.postalCode || '—'}</td>
                  {/* State */}
                  <td className="text-primary-500 text-sm">{o.customerAddress?.state || '—'}</td>
                  {/* Country */}
                  <td className="text-primary-500 text-sm">{o.customerAddress?.country || '—'}</td>
                  {/* Actions */}
                  <td>
                    <div className="flex gap-1">
                      <button onClick={()=>handleDeleteQuote(o._id)} className="btn-icon text-danger-400 hover:text-danger-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {quotePagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-primary-400">Page {quotePagination.page} of {quotePagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={()=>loadQuotes(quotePagination.page-1)} disabled={quotePagination.page<=1} className="btn-ghost btn-sm disabled:opacity-40">← Prev</button>
              <button onClick={()=>loadQuotes(quotePagination.page+1)} disabled={quotePagination.page>=quotePagination.pages} className="btn-ghost btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
