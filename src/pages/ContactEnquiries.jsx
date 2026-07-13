/**
 * pages/ContactEnquiries.jsx — Contact Us Enquiries
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * GET  /contactus/contact-uslist           → list
 * POST /contactus/contact-usupdate-status  → mark as done  { id, status: "Mark as Done" }
 * POST /contactus/contact-usdelete         → delete        { id }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isToday, isThisWeek } from 'date-fns';
import { ConfirmationModal, RetryBlock } from '../components/ui';
import toast from 'react-hot-toast';
import Api from '../utils/Api';
import { useRowHighlight, HIGHLIGHT_STYLE } from '../hooks/useRowHighlight';

// ─── SVG Icon helper ──────────────────────────
const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const D = {
  mail:     'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  inbox:    'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  done:     'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  eye:      'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  trash:    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  close:    'M6 18L18 6M6 6l12 12',
  search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  user:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  phone:    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  globe:    'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  tag:      'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  chat:     'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
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
  const firstName  = enq.first_name  || enq.firstName  || '';
  const lastName   = enq.last_name   || enq.lastName   || '';
  const email      = enq.email_id    || enq.email      || '';
  const country    = enq.country     || '';
  const phone      = enq.phone_number|| enq.phone      || '';
  const subject    = enq.subject     || '';
  const message    = enq.message     || '';
  const createdAt  = enq.created_date|| enq.created_at || enq.createdAt || '';
  const isDone     = enq.status === 'Mark as Done' || enq.done === true;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Ic d={D.mail} className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold text-primary-600">Contact Enquiry</h3>
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
          <div className="mb-4 px-4 py-3 rounded-2xl bg-primary-50 border border-primary-100 flex items-center gap-3">
            <Ic d={D.tag} className="w-5 h-5 text-primary-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest">Subject</p>
              <p className="text-sm font-semibold text-primary-700 mt-0.5">{subject}</p>
            </div>
          </div>
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Customer Info</p>
          <div className="bg-surface-50 rounded-2xl px-4 mb-4">
            <DetailRow label="First Name"   value={firstName} iconPath={D.user}  />
            <DetailRow label="Last Name"    value={lastName}  iconPath={D.user}  />
            <DetailRow label="Email ID"     value={email}     iconPath={D.mail}  />
            <DetailRow label="Country"      value={country}   iconPath={D.globe} />
            <DetailRow label="Phone Number" value={phone}     iconPath={D.phone} />
          </div>
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Message</p>
          <div className="bg-surface-50 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-start gap-3">
              <Ic d={D.chat} className="w-4 h-4 text-primary-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary-700 leading-relaxed whitespace-pre-line">{message || '—'}</p>
            </div>
          </div>
          {createdAt && (
            <p className="text-[11px] text-primary-300 text-right">
              Received: {format(new Date(createdAt), 'dd MMM yyyy, hh:mm a')}
            </p>
          )}
        </div>
        <div className="px-6 pb-5 pt-2 flex justify-end gap-2 border-t border-surface-100">
          {email && (
            <a
              href={`mailto:${email}?subject=Re: ${encodeURIComponent(subject)}`}
              className="btn-secondary btn-sm gap-1.5"
            >
              <Ic d={D.mail} className="w-3.5 h-3.5" />Reply via Email
            </a>
          )}
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────
const ContactEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search,    setSearch]    = useState('');
  const [viewItem,  setViewItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);
  const [searchParams] = useSearchParams();

  // A dashboard preview-card deep link always needs the full list visible —
  // clear any stale search text so the target row isn't filtered out.
  useEffect(() => {
    if (searchParams.get('highlight')) setSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const highlightedId = useRowHighlight(enquiries, loading);

  // ── Fetch list ──────────────────────────────
  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await Api.get('/contactus/contact-uslist');
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

  // ── Mark as Done ─────────────────────────────
  const handleMarkDone = async (enq) => {
    try {
      await Api.post('/contactus/contact-usupdate-status', {
        id:     enq.id,
        status: 'Mark as Done',
      });
      toast.success('Marked as done.');
      fetchEnquiries();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  // ── Delete ──────────────────────────────────
  const handleDelete = async (enq) => {
    try {
      await Api.post('/contactus/contact-usdelete', { id: enq.id });
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
      const firstName = (e.first_name  || e.firstName  || '').toLowerCase();
      const lastName  = (e.last_name   || e.lastName   || '').toLowerCase();
      const email     = (e.email_id    || e.email      || '').toLowerCase();
      const country   = (e.country     || '').toLowerCase();
      const phone     = (e.phone_number|| e.phone      || '').toLowerCase();
      const subject   = (e.subject     || '').toLowerCase();
      return firstName.includes(t) || lastName.includes(t) ||
             email.includes(t)     || country.includes(t)  ||
             phone.includes(t)     || subject.includes(t);
    });
  }, [enquiries, search]);

  // ─────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contact Us Enquiries</h1>
          <p className="text-primary-400 text-sm mt-0.5">All messages submitted through the contact form.</p>
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
            <Ic d={D.mail} className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-primary-500 font-medium">{totalCount} Total Messages</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Messages" value={totalCount} iconPath={D.mail}     color="primary" />
        <StatCard label="New Today"      value={todayCount} iconPath={D.inbox}    color="success" sub="Received today" />
        <StatCard label="This Week"      value={weekCount}  iconPath={D.calendar} color="accent"  sub="Last 7 days" />
        <StatCard label="Completed"      value={doneCount}  iconPath={D.done}     color="earth"   sub="Marked as done" />
      </div>

      {/* Search */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, country, subject…"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">S.No</th>
                <th>Contact Request ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email ID</th>
                <th>Country</th>
                <th>Phone Number</th>
                <th className="w-36">Subject</th>
                <th>Message</th>
                <th>Created Date</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-primary-400">
                      <div className="spinner !w-5 !h-5" />
                      <span>Loading enquiries…</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={12}>
                    <RetryBlock message={fetchError} onRetry={fetchEnquiries} colSpan={12} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-primary-300">
                      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                        <Ic d={D.inbox} className="w-7 h-7" />
                      </div>
                      <p className="text-sm">
                        {enquiries.length === 0
                          ? 'No messages received yet.'
                          : 'No messages match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((enq, idx) => {
                  const requestId = enq.reference_number || '';
                  const firstName = enq.first_name   || enq.firstName  || '';
                  const lastName  = enq.last_name    || enq.lastName   || '';
                  const email     = enq.email_id     || enq.email      || '';
                  const country   = enq.country      || '';
                  const phone     = enq.phone_number || enq.phone      || '';
                  const subject   = enq.subject      || '';
                  const message   = enq.message      || '';
                  const createdAt = enq.created_date || enq.created_at || enq.createdAt || '';
                  const isDone    = enq.status === 'Mark as Done' || enq.done === true;

                  return (
                    <tr
                      key={enq.id}
                      data-row-id={enq.id}
                      className={isDone ? 'opacity-60' : ''}
                      style={highlightedId === String(enq.id) ? HIGHLIGHT_STYLE : undefined}
                    >
                      <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium">
                          {requestId || '—'}
                        </span>
                      </td>
                      <td className="font-medium text-primary-700 text-sm">{firstName}</td>
                      <td className="text-primary-700 text-sm">{lastName}</td>
                      <td>
                        <a href={`mailto:${email}`} className="text-primary-500 hover:text-primary-700 text-xs underline underline-offset-2 transition-colors">
                          {email}
                        </a>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs text-primary-600">
                          <Ic d={D.globe} className="w-3 h-3 text-primary-300 flex-shrink-0" />
                          {country}
                        </span>
                      </td>
                      <td>
                        <a href={`tel:${phone}`} className="text-primary-600 hover:text-primary-800 text-xs whitespace-nowrap">
                          {phone}
                        </a>
                      </td>
                      <td className="w-36 max-w-[144px]">
                        <span className="flex items-center gap-1 min-w-0">
                          <Ic d={D.tag} className="w-3 h-3 text-primary-300 flex-shrink-0" />
                          <span className="text-xs font-medium text-primary-600 truncate block" style={{ maxWidth: '110px' }} title={subject}>
                            {subject}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[180px]">
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
                          ? <span className="badge badge-success text-[10px]">Done</span>
                          : <span className="badge badge-warning text-[10px]">Pending</span>}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
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
                                title:     'Delete Message',
                                message:   `Delete message from ${firstName} ${lastName}?`,
                                onConfirm: () => handleDelete(enq),
                              })
                            }
                            className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                            title="Delete"
                          >
                            <Ic d={D.trash} />
                          </button>
                          {!isDone && (
                            <button
                              onClick={() =>
                                setConfirm({
                                  title:     'Mark as Done',
                                  message:   `Mark message from ${firstName} ${lastName} as done?`,
                                  onConfirm: () => handleMarkDone(enq),
                                })
                              }
                              className="btn-icon text-success-500 hover:text-success-600 hover:bg-success-50"
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
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-primary-400">
              Showing <span className="font-medium text-primary-600">{filtered.length}</span> of{' '}
              <span className="font-medium text-primary-600">{enquiries.length}</span> messages
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success-500" />
              <span className="text-xs text-primary-400">{doneCount} completed</span>
            </div>
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
    </div>
  );
};

export default ContactEnquiries;
