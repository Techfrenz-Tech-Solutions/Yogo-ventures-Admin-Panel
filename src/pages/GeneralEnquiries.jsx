/**
 * pages/GeneralEnquiries.jsx — Enquiries
 * Grid: S.No · First Name · Last Name · Email ID · Country · Phone Number
 *       · Product Category · Message · Created Date · Actions
 * Actions: View · Edit · Delete · Mark as Done
 */

import { useState, useMemo } from 'react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { addActivity } from '../components/Header';
import { ConfirmationModal } from '../components/ui';

const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const D = {
  enquiry:  'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  inbox:    'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  trend:    'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  done:     'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  eye:      'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  edit:     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  close:    'M6 18L18 6M6 6l12 12',
  search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  user:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  mail:     'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  phone:    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  globe:    'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  tag:      'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  chat:     'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
};

const SEED = [
  { id:'E001', firstName:'Rahul',   lastName:'Verma',     email:'rahul.v@example.com',     country:'India',     phone:'+91 9988776655', productCategory:'Yoga Equipment',    message:'Interested in placing a bulk order for yoga mats for our fitness centre chain.',  createdAt:new Date(Date.now()-1*3600000).toISOString(), done:false },
  { id:'E002', firstName:'Sophie',  lastName:'Martin',    email:'sophie.m@example.com',    country:'France',    phone:'+33 612345678',  productCategory:'Resistance Bands',  message:'Can you provide a product catalogue with wholesale pricing for my boutique?',    createdAt:new Date(Date.now()-4*3600000).toISOString(), done:false },
  { id:'E003', firstName:'Tariq',   lastName:'Hassan',    email:'tariq.h@example.com',     country:'Pakistan',  phone:'+92 3001234567', productCategory:'Foam Rollers',      message:'Looking for a reliable supplier for foam rollers for our sports shops.',         createdAt:new Date(Date.now()-1*86400000).toISOString(), done:false },
  { id:'E004', firstName:'Nina',    lastName:'Petrova',   email:'nina.p@example.com',      country:'Russia',    phone:'+7 9161234567',  productCategory:'Meditation Tools',  message:'We are interested in stocking your meditation cushions and accessories.',        createdAt:new Date(Date.now()-3*86400000).toISOString(), done:true  },
  { id:'E005', firstName:'Carlos',  lastName:'Mendez',    email:'carlos.m@example.com',    country:'Mexico',    phone:'+52 5551234567', productCategory:'Gym Accessories',   message:'Please send pricing for gym gloves and straps for our e-commerce platform.',    createdAt:new Date(Date.now()-7*86400000).toISOString(), done:false },
  { id:'E006', firstName:'Aisha',   lastName:'Diallo',    email:'aisha.d@example.com',     country:'Senegal',   phone:'+221 771234567', productCategory:'Yoga Equipment',    message:'We are setting up a yoga studio and need wholesale pricing on all your mats.',   createdAt:new Date(Date.now()-11*86400000).toISOString(), done:false },
];

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color, sub }) => {
  const map = {
    primary: { bg:'bg-primary-50', ic:'text-primary-500', val:'text-primary-700' },
    success: { bg:'bg-success-50', ic:'text-success-500', val:'text-success-600' },
    accent:  { bg:'bg-accent-100', ic:'text-accent-500',  val:'text-accent-600'  },
    earth:   { bg:'bg-earth-50',   ic:'text-earth-500',   val:'text-earth-600'   },
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
const ViewModal = ({ enq, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full !max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
            <Ic d={D.enquiry} className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-primary-600">Enquiry Details</h3>
            <p className="text-xs text-primary-400">#{enq.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enq.done && <span className="badge badge-success text-[11px]">Done</span>}
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
      </div>
      <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight:'calc(90vh - 140px)' }}>
        <div className="mb-4 px-4 py-3 rounded-2xl bg-primary-50 border border-primary-100 flex items-center gap-3">
          <Ic d={D.tag} className="w-5 h-5 text-primary-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest">Product Category</p>
            <p className="text-sm font-semibold text-primary-700 mt-0.5">{enq.productCategory}</p>
          </div>
        </div>
        <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Customer Info</p>
        <div className="bg-surface-50 rounded-2xl px-4 mb-4">
          <DetailRow label="First Name"      value={enq.firstName}       iconPath={D.user}  />
          <DetailRow label="Last Name"       value={enq.lastName}        iconPath={D.user}  />
          <DetailRow label="Email ID"        value={enq.email}           iconPath={D.mail}  />
          <DetailRow label="Country"         value={enq.country}         iconPath={D.globe} />
          <DetailRow label="Phone Number"    value={enq.phone}           iconPath={D.phone} />
        </div>
        <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-2">Message</p>
        <div className="bg-surface-50 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-start gap-3">
            <Ic d={D.chat} className="w-4 h-4 text-primary-300 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-primary-700 leading-relaxed whitespace-pre-line">{enq.message || '—'}</p>
          </div>
        </div>
        <p className="text-[11px] text-primary-300 text-right">Received: {format(new Date(enq.createdAt),'dd MMM yyyy, hh:mm a')}</p>
      </div>
      <div className="px-6 pb-5 pt-2 flex justify-end gap-2 border-t border-surface-100">
        <a href={`mailto:${enq.email}`} className="btn-secondary btn-sm gap-1.5">
          <Ic d={D.mail} className="w-3.5 h-3.5" />Reply via Email
        </a>
        <button onClick={onClose} className="btn-outline">Close</button>
      </div>
    </div>
  </div>
);

// ─── Edit Modal ───────────────────────────────
const EditModal = ({ enq, onSave, onClose }) => {
  const [form, setForm] = useState({ ...enq });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">Edit Enquiry</h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight:'calc(90vh - 140px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0"><label className="form-label">First Name</label><input className="form-input" value={form.firstName} onChange={e=>set('firstName',e.target.value)} /></div>
              <div className="form-group !mb-0"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={e=>set('lastName',e.target.value)} /></div>
              <div className="form-group !mb-0"><label className="form-label">Email ID</label><input className="form-input" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
              <div className="form-group !mb-0"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={e=>set('country',e.target.value)} /></div>
              <div className="form-group !mb-0"><label className="form-label">Phone Number</label><input className="form-input" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
              <div className="form-group !mb-0"><label className="form-label">Product Category</label><input className="form-input" value={form.productCategory} onChange={e=>set('productCategory',e.target.value)} /></div>
            </div>
            <div className="form-group !mb-0"><label className="form-label">Message</label><textarea className="form-textarea" rows={3} value={form.message} onChange={e=>set('message',e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Update</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────
const GeneralEnquiries = () => {
  const [enquiries, setEnquiries] = useState(SEED);
  const [search,    setSearch]    = useState('');
  const [viewItem,  setViewItem]  = useState(null);
  const [editItem,  setEditItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  const totalCount = enquiries.length;
  const todayCount = enquiries.filter(e => isToday(new Date(e.createdAt))).length;
  const weekCount  = enquiries.filter(e => isThisWeek(new Date(e.createdAt),{weekStartsOn:1})).length;
  const doneCount  = enquiries.filter(e => e.done).length;

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return enquiries;
    return enquiries.filter(e =>
      e.firstName?.toLowerCase().includes(t)       || e.lastName?.toLowerCase().includes(t)  ||
      e.email?.toLowerCase().includes(t)           || e.country?.toLowerCase().includes(t)   ||
      e.phone?.toLowerCase().includes(t)           || e.productCategory?.toLowerCase().includes(t)
    );
  }, [enquiries, search]);

  const handleSave = (updated) => { setEnquiries(prev => prev.map(e => e.id === updated.id ? { ...updated } : e)); toast.success('Enquiry updated.');
    addActivity('General enquiry updated', 'enquiry'); setEditItem(null); };
  const handleDelete = (id) => { setEnquiries(prev => prev.filter(e => e.id !== id)); toast.success('Enquiry deleted.');
    addActivity('General enquiry deleted', 'enquiry'); };
  const handleDone = (id) => { setEnquiries(prev => prev.map(e => e.id === id ? { ...e, done:true } : e)); toast.success('Marked as done.');
    addActivity('General enquiry marked as done', 'enquiry'); };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Enquiries</h1>
          <p className="text-primary-400 text-sm mt-0.5">All general enquiries submitted by customers.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 border border-primary-100">
          <Ic d={D.enquiry} className="w-4 h-4 text-primary-400" />
          <span className="text-xs text-primary-500 font-medium">{totalCount} Total Enquiries</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Enquiries" value={totalCount} iconPath={D.enquiry}  color="primary" />
        <StatCard label="New Today"        value={todayCount} iconPath={D.inbox}    color="success" sub="Received today" />
        <StatCard label="This Week"        value={weekCount}  iconPath={D.calendar} color="accent"  sub="Last 7 days" />
        <StatCard label="Completed"        value={doneCount}  iconPath={D.done}     color="earth"   sub="Marked as done" />
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input className="form-input pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, country, category…" />
        </div>
        {search && <button onClick={()=>setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">S.No</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email ID</th>
                <th>Country</th>
                <th>Phone Number</th>
                <th>Product Category</th>
                <th>Message</th>
                <th>Created Date</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.enquiry} className="w-7 h-7" /></div>
                    <p className="text-sm">{enquiries.length===0?'No enquiries yet.':'No enquiries match your search.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map((enq, idx) => (
                <tr key={enq.id} className={enq.done ? 'opacity-60' : ''}>
                  <td className="text-primary-400 text-xs font-mono">{idx+1}</td>
                  <td className="font-medium text-primary-700 text-sm">{enq.firstName}</td>
                  <td className="text-primary-700 text-sm">{enq.lastName}</td>
                  <td><a href={`mailto:${enq.email}`} className="text-primary-500 hover:text-primary-700 text-xs underline underline-offset-2 transition-colors">{enq.email}</a></td>
                  <td><span className="inline-flex items-center gap-1 text-xs text-primary-600"><Ic d={D.globe} className="w-3 h-3 text-primary-300 flex-shrink-0" />{enq.country}</span></td>
                  <td><a href={`tel:${enq.phone}`} className="text-primary-600 hover:text-primary-800 text-xs whitespace-nowrap">{enq.phone}</a></td>
                  <td>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-medium">
                      <Ic d={D.tag} className="w-3 h-3 flex-shrink-0" />
                      {enq.productCategory}
                    </span>
                  </td>
                  <td className="max-w-[180px]"><p className="text-primary-500 text-xs line-clamp-2 leading-relaxed" title={enq.message}>{enq.message}</p></td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {format(new Date(enq.createdAt),'dd MMM yyyy')}<br/>
                    <span className="text-primary-300">{format(new Date(enq.createdAt),'hh:mm a')}</span>
                  </td>
                  <td>
                    {enq.done
                      ? <span className="badge badge-success text-[10px]">Done</span>
                      : <span className="badge badge-warning text-[10px]">Pending</span>}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <button onClick={()=>setViewItem(enq)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} /></button>
                      <button onClick={()=>setEditItem(enq)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} /></button>
                      <button onClick={()=>setConfirm({ title:'Delete Enquiry', message:`Delete enquiry from ${enq.firstName} ${enq.lastName}?`, onConfirm:()=>handleDelete(enq.id) })} className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50" title="Delete"><Ic d={D.trash} /></button>
                      {!enq.done && (
                        <button onClick={()=>setConfirm({ title:'Mark as Done', message:`Mark enquiry from ${enq.firstName} ${enq.lastName} as done?`, onConfirm:()=>handleDone(enq.id) })} className="btn-icon text-success-500 hover:text-success-600 hover:bg-success-50" title="Mark as Done"><Ic d={D.done} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 text-xs text-primary-400">
            Showing <span className="font-medium text-primary-600">{filtered.length}</span> of <span className="font-medium text-primary-600">{enquiries.length}</span> enquiries
          </div>
        )}
      </div>

      {viewItem && <ViewModal enq={viewItem} onClose={()=>setViewItem(null)} />}
      {editItem && <EditModal enq={editItem} onSave={handleSave} onClose={()=>setEditItem(null)} />}
      {confirm  && <ConfirmationModal open={!!confirm} onClose={()=>setConfirm(null)} onConfirm={confirm.onConfirm} title={confirm.title} message={confirm.message} />}
    </div>
  );
};

export default GeneralEnquiries;
