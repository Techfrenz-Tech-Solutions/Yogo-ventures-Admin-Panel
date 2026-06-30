/**
 * pages/CustomerMaster.jsx — Customer Master
 * Add / Edit / View / Delete customers.
 * Modal fields: Customer ID (manual, required on Add), Customer Name, Email ID, Country, Phone Number
 * Grid: S.No · Customer ID · Customer Name · Email ID · Country · Phone Number
 *       · Created Date · Updated Date · Actions (View / Edit / Delete)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';
import { format } from 'date-fns';

const newId  = () => 'CUST-' + Math.random().toString(36).slice(2,7).toUpperCase();
const nowISO = () => new Date().toISOString();

const KEY = 'yogo_customers';
const readLS  = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const writeLS = (d) => localStorage.setItem(KEY, JSON.stringify(d));

const Ic = ({ d, className='w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const D = {
  add:    'M12 4v16m8-8H4',
  edit:   'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:  'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  eye:    'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  close:  'M6 18L18 6M6 6l12 12',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  users:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  user:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  mail:   'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  phone:  'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  globe:  'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  id:     'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color }) => {
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
      <div>
        <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-heading font-bold mt-0.5 ${c.val}`}>{value}</p>
      </div>
    </div>
  );
};

// ─── Add / Edit Modal ─────────────────────────
const CustomerModal = ({ customer, existingIds = [], onSave, onClose }) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    customerId:   customer?.customerId   || '',
    customerName: customer?.customerName || '',
    email:        customer?.email        || '',
    country:      customer?.country      || '',
    phone:        customer?.phone        || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerId.trim())   { toast.error('Customer ID is required.');    return; }
    if (!isEdit && existingIds.includes(form.customerId.trim())) {
      toast.error('This Customer ID already exists. Please enter a different one.');
      return;
    }
    if (!form.customerName.trim()) { toast.error('Customer name is required.'); return; }
    if (!form.email.trim())        { toast.error('Email ID is required.');       return; }
    setSaving(true);
    setTimeout(() => { onSave({ ...form, customerId: form.customerId.trim() }); setSaving(false); }, 300);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Customer ID — manually entered on Add, locked on Edit */}
            <div className="form-group !mb-0">
              <label className="form-label">Customer ID {!isEdit && <span className="text-danger-500">*</span>}</label>
              <div className="flex items-center gap-2">
                {isEdit ? (
                  <input className="form-input bg-surface-50 text-primary-400 font-mono cursor-not-allowed flex-1" value={form.customerId} readOnly />
                ) : (
                  <input
                    className="form-input font-mono flex-1"
                    value={form.customerId}
                    onChange={e=>set('customerId', e.target.value)}
                    placeholder="e.g. CUST-1001"
                    required
                  />
                )}
              </div>
              <p className="text-[11px] text-primary-300 mt-1">
                {isEdit ? 'Customer ID cannot be changed after creation.' : 'Enter a unique Customer ID.'}
              </p>
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">Customer Name <span className="text-danger-500">*</span></label>
              <input className="form-input" value={form.customerName} onChange={e=>set('customerName',e.target.value)} placeholder="e.g. John Doe" required />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">Email ID <span className="text-danger-500">*</span></label>
              <input type="email" className="form-input" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="e.g. john@example.com" required />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">Country</label>
              <input className="form-input" value={form.country} onChange={e=>set('country',e.target.value)} placeholder="e.g. India" />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="e.g. +91 9876543210" />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" /> Saving…</> : isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── View Modal ───────────────────────────────
const ViewModal = ({ customer, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full !max-w-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
        <h3 className="font-heading text-base font-semibold text-primary-600">Customer Details</h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
      </div>
      <div className="p-6 space-y-3">
        {[
          { label:'Customer ID',   value:customer.customerId,   icon:D.id    },
          { label:'Customer Name', value:customer.customerName, icon:D.user  },
          { label:'Email ID',      value:customer.email,        icon:D.mail  },
          { label:'Country',       value:customer.country,      icon:D.globe },
          { label:'Phone Number',  value:customer.phone,        icon:D.phone },
          { label:'Created Date',  value:format(new Date(customer.createdAt),'dd MMM yyyy, hh:mm a'), icon:D.id },
          { label:'Updated Date',  value:format(new Date(customer.updatedAt),'dd MMM yyyy, hh:mm a'), icon:D.id },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-start gap-3 py-2 border-b border-surface-100 last:border-0">
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Ic d={icon} className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-primary-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-primary-700 mt-0.5">{value || '—'}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 pb-5 flex justify-end"><button onClick={onClose} className="btn-outline">Close</button></div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────
const CustomerMaster = () => {
  const [customers, setCustomers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);
  const [viewItem,  setViewItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  useEffect(() => { setCustomers(readLS()); }, []);

  const persist = useCallback((data) => { setCustomers(data); writeLS(data); }, []);

  const handleSave = (form) => {
    if (modal === 'add') {
      persist([...customers, { ...form, createdAt:nowISO(), updatedAt:nowISO() }]);
      toast.success('Customer added.');
    } else {
      persist(customers.map(c => c.customerId===modal.customerId ? { ...c, ...form, updatedAt:nowISO() } : c));
      toast.success('Customer updated.');
    }
    setModal(null);
  };

  const handleDelete = (id) => { persist(customers.filter(c => c.customerId!==id)); toast.success('Customer deleted.'); };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(c =>
      c.customerId?.toLowerCase().includes(t)   || c.customerName?.toLowerCase().includes(t) ||
      c.email?.toLowerCase().includes(t)        || c.country?.toLowerCase().includes(t)      ||
      c.phone?.toLowerCase().includes(t)
    );
  }, [customers, search]);

  const recentCount = customers.filter(c => (Date.now()-new Date(c.createdAt))/86400000<=7).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Master</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage all customer records.</p>
        </div>
        <button onClick={()=>setModal('add')} className="btn-primary">
          <Ic d={D.add} /><span>Add Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Customers"    value={customers.length} iconPath={D.users} color="primary" />
        <StatCard label="Active Customers"   value={customers.length} iconPath={D.user}  color="success" />
        <StatCard label="Recently Added"     value={recentCount}      iconPath={D.add}   color="accent"  />
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input className="form-input pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, name, email, country…" />
        </div>
        {search && <button onClick={()=>setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">S.No</th>
                <th>Customer ID</th>
                <th>Customer Name</th>
                <th>Email ID</th>
                <th>Country</th>
                <th>Phone Number</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.users} className="w-7 h-7" /></div>
                    <p className="text-sm">{customers.length===0?'No customers yet. Click "Add Customer" to start.':'No customers match your search.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map((cust, idx) => (
                <tr key={cust.customerId}>
                  <td className="text-primary-400 text-xs font-mono">{idx+1}</td>
                  <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium">{cust.customerId}</span></td>
                  <td className="font-medium text-primary-700">{cust.customerName}</td>
                  <td><a href={`mailto:${cust.email}`} className="text-primary-500 hover:text-primary-700 text-xs underline underline-offset-2 transition-colors">{cust.email}</a></td>
                  <td><span className="inline-flex items-center gap-1 text-xs text-primary-600"><Ic d={D.globe} className="w-3 h-3 text-primary-300 flex-shrink-0" />{cust.country||'—'}</span></td>
                  <td><a href={`tel:${cust.phone}`} className="text-primary-600 hover:text-primary-800 text-xs whitespace-nowrap">{cust.phone||'—'}</a></td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">{format(new Date(cust.createdAt),'dd MMM yyyy')}</td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">{format(new Date(cust.updatedAt),'dd MMM yyyy')}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>setViewItem(cust)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} /></button>
                      <button onClick={()=>setModal(cust)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} /></button>
                      <button onClick={()=>setConfirm({ title:'Delete Customer', message:`Delete customer "${cust.customerName}"? This cannot be undone.`, onConfirm:()=>handleDelete(cust.customerId) })} className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50" title="Delete"><Ic d={D.trash} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 text-xs text-primary-400">
            Showing <span className="font-medium text-primary-600">{filtered.length}</span> of <span className="font-medium text-primary-600">{customers.length}</span> customers
          </div>
        )}
      </div>

      {(modal==='add'||(modal&&modal.customerId)) && <CustomerModal customer={modal==='add'?null:modal} existingIds={customers.map(c=>c.customerId)} onSave={handleSave} onClose={()=>setModal(null)} />}
      {viewItem && <ViewModal customer={viewItem} onClose={()=>setViewItem(null)} />}
      {confirm  && <ConfirmationModal open={!!confirm} onClose={()=>setConfirm(null)} onConfirm={confirm.onConfirm} title={confirm.title} message={confirm.message} />}
    </div>
  );
};

export default CustomerMaster;
