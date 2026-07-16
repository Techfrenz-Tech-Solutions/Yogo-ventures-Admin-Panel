/**
 * pages/QuoteEnquiries.jsx — Get Quote Enquiries
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * GET  /quoteenquire/enquiry-quotelist          → list
 * POST /quoteenquire/enquiry-quoteupdate-status → mark as done  { id, status: "Mark as Done" }
 * POST /quoteenquire/enquiry-quoteupdate-remarks → save remarks { id, remarks }
 * POST /quoteenquire/enquiry-quotedelete        → delete        { id }
 * GET  /country/countrylist                     → country dropdown (for filtering if needed)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isToday, isThisWeek } from 'date-fns';
import { ConfirmationModal, RetryBlock, Pagination, RemarksInput } from '../components/ui';
import toast from 'react-hot-toast';
import Api from '../utils/Api';
import { useRowHighlight, HIGHLIGHT_STYLE } from '../hooks/useRowHighlight';
import { useExcelExport } from '../hooks/useExcelExport';
import { usePagedRows } from '../hooks/usePagedRows';
import './QuoteEnquiries.css';

// ─── SVG Icon helper ──────────────────────────
const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const D = {
  quote:    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  inbox:    'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  done:     'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  eye:      'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  trash:    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  close:    'M6 18L18 6M6 6l12 12',
  search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  user:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  mail:     'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  phone:    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  globe:    'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  chat:     'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  undo:     'M9 14l-4-4 4-4m-4 4h11a4 4 0 014 4v1',
};

// Minimum column widths (px) for the natural-width, horizontally-scrolling
// table (see QuoteEnquiries.css) — set once here on the header <th> cells
// as `minWidth`; with table-layout: auto a column only grows past this
// floor if its content needs more room, and every body <td> lines up with
// its header because both read from this same object.
const QUOTE_COLUMN_WIDTHS = {
  sno: 50, quoteId: 110, productName: 150, qty: 60, color: 90,
  firstName: 100, lastName: 100, email: 190, country: 120,
  phone: 130, message: 200, createdDate: 110, status: 100, remarks: 220, actions: 120,
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color, sub }) => {
  const map = {
    primary: { bg: 'bg-primary-50', ic: 'text-primary-500', val: 'text-primary-700' },
    success: { bg: 'bg-success-50', ic: 'text-success-500', val: 'text-success-600' },
    accent:  { bg: 'bg-accent-100', ic: 'text-accent-500',  val: 'text-accent-600'  },
    earth:   { bg: 'bg-earth-50',   ic: 'text-earth-500',   val: 'text-earth-600'   },
  };
  const c = map[color] || map.primary;
  return (
    <div className="card flex items-center gap-4 hover:shadow-card-hover transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
        <Ic d={iconPath} className={`w-6 h-6 ${c.ic}`} />
      </div>
      <div className="min-w-0">
        <p className="text-primary-400 text-xs font-medium uppercase tracking-wide truncate">{label}</p>
        <p className={`text-2xl font-heading font-bold mt-0.5 ${c.val}`}>{value}</p>
        {sub && <p className="text-[11px] text-primary-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Detail Row (View Modal) ──────────────────
const DetailRow = ({ label, value, iconPath }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-surface-100 last:border-0">
    <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Ic d={iconPath} className="w-4 h-4 text-primary-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium text-primary-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-primary-700 mt-0.5 break-words">{value || '—'}</p>
    </div>
  </div>
);

// ─── View Modal ───────────────────────────────
const ViewModal = ({ enq, onClose }) => {
  // Field name fallbacks for different API response shapes
  const productName = enq.product_name || enq.productName || '';
  const quantity    = enq.quantity     || enq.qty          || '';
  const color       = enq.color        || '';
  const firstName   = enq.first_name   || enq.firstName    || '';
  const lastName    = enq.last_name    || enq.lastName     || '';
  const email       = enq.email_id     || enq.email        || '';
  const country     = enq.country_name || enq.country      || '';
  const phone       = enq.phone_number || enq.phone        || '';
  const message     = enq.message      || '';
  const createdAt   = enq.created_date || enq.created_at   || enq.createdAt || '';
  const isDone      = enq.status === 'Mark as Done' || enq.done === true;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Ic d={D.quote} className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold text-primary-600">Enquiry Details</h3>
              <p className="text-xs text-primary-400">#{enq.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDone && <span className="badge badge-success text-[11px]">Done</span>}
            <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
              <Ic d={D.close} />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Product Info</p>
          <div className="bg-surface-50 rounded-2xl px-4 mb-4">
            <DetailRow label="Product Name" value={productName}      iconPath={D.quote} />
            <DetailRow label="Quantity"     value={String(quantity)} iconPath={D.inbox} />
            <DetailRow label="Color"        value={color}            iconPath={'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'} />
          </div>
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Customer Info</p>
          <div className="bg-surface-50 rounded-2xl px-4 mb-4">
            <DetailRow label="First Name" value={firstName} iconPath={D.user}  />
            <DetailRow label="Last Name"  value={lastName}  iconPath={D.user}  />
            <DetailRow label="Email"      value={email}     iconPath={D.mail}  />
            <DetailRow label="Country"    value={country}   iconPath={D.globe} />
            <DetailRow label="Phone"      value={phone}     iconPath={D.phone} />
          </div>
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Message</p>
          <div className="bg-surface-50 rounded-2xl px-4 py-3 mb-4">
            <p className="text-sm text-primary-700 leading-relaxed whitespace-pre-line">{message || '—'}</p>
          </div>
          {createdAt && (
            <p className="text-[11px] text-primary-300 text-right">
              Submitted: {format(new Date(createdAt), 'dd MMM yyyy, hh:mm a')}
            </p>
          )}
        </div>
        <div className="px-6 pb-5 pt-2 flex justify-end border-t border-surface-100">
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────
const QuoteEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search,    setSearch]    = useState('');
  const [viewItem,  setViewItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);
  const [statusUpdating, setStatusUpdating] = useState({}); // { [enquiryId]: true } while a status request is in flight
  const [statusConfirm,  setStatusConfirm]  = useState(null); // { enq, newStatus } while the confirmation popup is open
  const [searchParams] = useSearchParams();

  // A dashboard preview-card deep link always needs the full list visible —
  // clear any stale search text so the target row isn't filtered out.
  useEffect(() => {
    if (searchParams.get('highlight')) setSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const highlightedId = useRowHighlight(enquiries, loading);
  const { exporting, runExport } = useExcelExport('/quoteenquire/enquiry-quoteexport', 'quote-enquiries');
  const handleExport = () => runExport({ search: search.trim() || undefined });

  // ── Fetch list ──────────────────────────────
  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await Api.get('/quoteenquire/enquiry-quotelist');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      // Sort by id ascending — oldest first
      const sorted = [...list].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
      setEnquiries(sorted);
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Failed to load. The server may be restarting.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  // ── Status change (Mark as Done / Mark as Pending) ───────────
  // Optimistic local update (no full-list refetch) so only the clicked
  // row's status/highlight changes — rolled back to the prior value if the
  // request fails. Returns true/false so the confirmation popup (see
  // statusConfirm below) knows whether it's safe to close.
  const handleStatusChange = async (enq, newStatus) => {
    if (enq.status === newStatus || statusUpdating[enq.id]) return false;
    const previousStatus = enq.status;

    setStatusUpdating(p => ({ ...p, [enq.id]: true }));
    setEnquiries(prev => prev.map(e => (e.id === enq.id ? { ...e, status: newStatus } : e)));

    try {
      const res = await Api.post('/quoteenquire/enquiry-quoteupdate-status', {
        id:     enq.id,
        status: newStatus,
      });
      if (res.data?.status !== 1) {
        throw new Error(res.data?.message || 'Failed to update status.');
      }
      toast.success(newStatus === 'Mark as Done' ? 'Marked as done.' : 'Marked as pending.');
      return true;
    } catch (err) {
      setEnquiries(prev => prev.map(e => (e.id === enq.id ? { ...e, status: previousStatus } : e)));
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update status.');
      return false;
    } finally {
      setStatusUpdating(p => {
        const next = { ...p };
        delete next[enq.id];
        return next;
      });
    }
  };

  // ── Remarks (inline, per-row save via RemarksInput) ──────────
  // Independent of status — never touches `status` or any other field, and
  // never triggers the quote confirmation email. Updates local state with
  // the server-confirmed value on success; throws on failure so
  // RemarksInput rolls its own input back to the last saved value.
  const handleSaveRemarks = async (enq, remarks) => {
    const res = await Api.post('/quoteenquire/enquiry-quoteupdate-remarks', { id: enq.id, remarks });
    if (res.data?.status !== 1) {
      throw new Error(res.data?.message || 'Failed to save remarks.');
    }
    setEnquiries(prev => prev.map(e => (e.id === enq.id ? { ...e, remarks: res.data.remarks } : e)));
  };

  // ── Delete ──────────────────────────────────
  const handleDelete = async (enq) => {
    try {
      await Api.post('/quoteenquire/enquiry-quotedelete', { id: enq.id });
      toast.success('Enquiry deleted.');
      fetchEnquiries();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete enquiry.');
    }
  };

  // ── Stats ────────────────────────────────────
  const totalCount = enquiries.length;
  const todayCount = enquiries.filter(e => {
    const d = new Date(e.created_date || e.created_at || e.createdAt);
    return !isNaN(d) && isToday(d);
  }).length;
  const weekCount = enquiries.filter(e => {
    const d = new Date(e.created_date || e.created_at || e.createdAt);
    return !isNaN(d) && isThisWeek(d, { weekStartsOn: 1 });
  }).length;
  const doneCount = enquiries.filter(e =>
    e.status === 'Mark as Done' || e.done === true
  ).length;

  // ── Search filter ────────────────────────────
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return enquiries;
    return enquiries.filter(e => {
      const productName = (e.product_name  || e.productName || '').toLowerCase();
      const firstName   = (e.first_name    || e.firstName   || '').toLowerCase();
      const lastName    = (e.last_name     || e.lastName    || '').toLowerCase();
      const email       = (e.email_id      || e.email       || '').toLowerCase();
      const country     = (e.country_name  || e.country     || '').toLowerCase();
      const color       = (e.color         || '').toLowerCase();
      return productName.includes(t) || firstName.includes(t) ||
             lastName.includes(t)    || email.includes(t)     ||
             country.includes(t)     || color.includes(t);
    });
  }, [enquiries, search]);

  const {
    paged, page, setPage, rowsPerPage, setRowsPerPage, totalPages, total, rangeStart,
  } = usePagedRows('/quote-enquiries', filtered, { jumpToId: searchParams.get('highlight') });

  // ─────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Get Quote Enquiries</h1>
          <p className="text-primary-400 text-sm mt-0.5">All product quote enquiries submitted by customers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEnquiries}
            disabled={loading}
            className="btn-outline"
            title="Refresh"
          >
            <Ic d={D.refresh} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 border border-primary-100">
            <Ic d={D.quote} className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-primary-500 font-medium">{totalCount} Total Enquiries</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Enquiries" value={totalCount} iconPath={D.quote}    color="primary" />
        <StatCard label="New Today"       value={todayCount} iconPath={D.inbox}    color="success" sub="Received today" />
        <StatCard label="This Week"       value={weekCount}  iconPath={D.calendar} color="accent"  sub="Last 7 days" />
        <StatCard label="Completed"       value={doneCount}  iconPath={D.done}     color="earth"   sub="Marked as done" />
      </div>

      {/* Search */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, name, email, country…"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>
        )}
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          className="btn-outline"
          title={filtered.length === 0 ? 'No matching records to export' : 'Export the filtered list to Excel'}
        >
          {exporting ? (
            <><div className="spinner !w-4 !h-4" /> Exporting…</>
          ) : (
            <><Ic d={D.download} className="w-4 h-4" /> Export</>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto qe-table-wrap">
          <table className="data-table qe-table">
            <thead>
              <tr>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.sno }}>S.No</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.quoteId }}>Quote ID</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.productName }}>Product Name</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.qty }}>Qty</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.color }}>Color</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.firstName }}>First Name</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.lastName }}>Last Name</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.email }}>Email ID</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.country }}>Country</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.phone }}>Phone Number</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.message }}>Message</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.createdDate }}>Created Date</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.status }}>Status</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.remarks }}>Remarks</th>
                <th style={{ minWidth: QUOTE_COLUMN_WIDTHS.actions }} className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={15} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-primary-400">
                      <div className="spinner !w-5 !h-5" />
                      <span>Loading enquiries…</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={15}>
                    <RetryBlock message={fetchError} onRetry={fetchEnquiries} colSpan={15} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-primary-300">
                      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                        <Ic d={D.inbox} className="w-7 h-7" />
                      </div>
                      <p className="text-sm">
                        {enquiries.length === 0
                          ? 'No enquiries received yet.'
                          : 'No enquiries match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((enq, idx) => {
                  const quoteId     = enq.reference_number || '';
                  const productName = enq.product_name  || enq.productName || '';
                  const quantity    = enq.quantity      || enq.qty         || '';
                  const color       = enq.color         || '';
                  const firstName   = enq.first_name    || enq.firstName   || '';
                  const lastName    = enq.last_name     || enq.lastName    || '';
                  const email       = enq.email_id      || enq.email       || '';
                  const country     = enq.country_name  || enq.country     || '';
                  const phone       = enq.phone_number  || enq.phone       || '';
                  const message     = enq.message       || '';
                  const createdAt   = enq.created_date  || enq.created_at  || enq.createdAt || '';
                  const isDone      = enq.status === 'Mark as Done' || enq.done === true;

                  return (
                    <tr
                      key={enq.id}
                      data-row-id={enq.id}
                      className={isDone ? 'opacity-60' : ''}
                      style={highlightedId === String(enq.id) ? HIGHLIGHT_STYLE : undefined}
                    >
                      <td className="text-primary-400 text-xs font-mono">{rangeStart + idx}</td>
                      <td>
                        <span className="text-primary-600 font-mono font-medium qe-nowrap" style={{ fontSize: '11.5px' }} title={quoteId}>
                          {quoteId || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium text-primary-700 qe-clamp-2" title={productName}>{productName}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-semibold qe-nowrap">
                          {quantity}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-200 text-primary-600 text-xs font-medium qe-truncate max-w-full" title={color}>
                          {color}
                        </span>
                      </td>
                      <td className="text-primary-700 text-sm qe-truncate" title={firstName}>{firstName}</td>
                      <td className="text-primary-700 text-sm qe-truncate" title={lastName}>{lastName}</td>
                      <td>
                        <a href={`mailto:${email}`} className="text-primary-500 hover:text-primary-700 text-xs underline underline-offset-2 transition-colors qe-truncate block" title={email}>
                          {email}
                        </a>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs text-primary-600 qe-truncate max-w-full">
                          <Ic d={D.globe} className="w-3 h-3 text-primary-300 flex-shrink-0" />
                          <span className="qe-truncate">{country}</span>
                        </span>
                      </td>
                      <td>
                        <a href={`tel:${phone}`} className="text-primary-600 hover:text-primary-800 text-xs whitespace-nowrap">
                          {phone}
                        </a>
                      </td>
                      <td>
                        <p className="text-primary-500 text-xs line-clamp-2 leading-relaxed" title={message}>
                          {message}
                        </p>
                      </td>
                      <td className="text-primary-400 text-xs whitespace-nowrap">
                        {createdAt ? (
                          <>
                            {format(new Date(createdAt), 'dd MMM yyyy')}
                            <br />
                            <span className="text-primary-300">{format(new Date(createdAt), 'hh:mm a')}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td>
                        {isDone
                          ? <span className="badge badge-success text-[10px] qe-nowrap">Done</span>
                          : <span className="badge badge-warning text-[10px] qe-nowrap">Pending</span>}
                      </td>
                      <td>
                        <RemarksInput value={enq.remarks} onSave={(remarks) => handleSaveRemarks(enq, remarks)} />
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-0.5 flex-wrap">
                          <button
                            onClick={() => setViewItem(enq)}
                            className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50"
                            title="View"
                          >
                            <Ic d={D.eye} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirm({
                                title:     'Delete Enquiry',
                                message:   `Delete enquiry from ${firstName} ${lastName}?`,
                                onConfirm: () => handleDelete(enq),
                              })
                            }
                            className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                            title="Delete"
                          >
                            <Ic d={D.trash} />
                          </button>
                          {isDone ? (
                            <button
                              onClick={() => setStatusConfirm({ enq, newStatus: 'Pending' })}
                              disabled={!!statusUpdating[enq.id]}
                              className="btn-icon text-warning-500 hover:text-warning-600 hover:bg-warning-50 disabled:opacity-50"
                              title="Mark as Pending"
                            >
                              <Ic d={D.undo} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setStatusConfirm({ enq, newStatus: 'Mark as Done' })}
                              disabled={!!statusUpdating[enq.id]}
                              className="btn-icon text-success-500 hover:text-success-600 hover:bg-success-50 disabled:opacity-50"
                              title="Mark as Done"
                            >
                              <Ic d={D.done} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-surface-100">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-success-500" />
              <span className="text-xs text-primary-400">{doneCount} completed</span>
            </div>
            <Pagination
              page={page} totalPages={totalPages} onPageChange={setPage}
              total={total} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage}
              itemLabel="enquiries"
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {viewItem && <ViewModal enq={viewItem} onClose={() => setViewItem(null)} />}
      {confirm && (
        <ConfirmationModal
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          title={confirm.title}
          message={confirm.message}
        />
      )}
      {statusConfirm && (
        <ConfirmationModal
          open={!!statusConfirm}
          onClose={() => setStatusConfirm(null)}
          // No manual setStatusConfirm(null) here — ConfirmationModal only
          // closes this one itself once handleStatusChange resolves true,
          // so a failed update (it returns false) leaves the popup open.
          onConfirm={() => handleStatusChange(statusConfirm.enq, statusConfirm.newStatus)}
          title="Change Quote Status"
          message={`Are you sure you want to change quote ${statusConfirm.enq.reference_number || `#${statusConfirm.enq.id}`} from ${
            statusConfirm.enq.status === 'Mark as Done' ? 'Done' : 'Pending'
          } ${statusConfirm.newStatus === 'Pending' ? 'back to' : 'to'} ${statusConfirm.newStatus === 'Mark as Done' ? 'Done' : 'Pending'}?`}
          confirmText="Confirm"
          confirmingText="Updating…"
          type="primary"
        />
      )}
    </div>
  );
};

export default QuoteEnquiries;
