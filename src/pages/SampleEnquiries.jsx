/**
 * pages/SampleEnquiries.jsx — Sample Enquiries
 * Grid: Enquiry ID · Customer ID · Enquired On · Product Name · Quantity · Responded ·
 *       Sample Ordered · Sample Shipped · Order Placed · Created Date · Updated Date · Actions
 * Actions: View · Update · Delete · Mark as Done
 * Modal: Enquiry ID (auto), Customer ID, Enquired On (calendar), Product Name (dropdown from products),
 *        Quantity, Responded, Sample Ordered, Sample Shipped, Order Placed
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { ConfirmationModal } from '../components/ui';
import toast from 'react-hot-toast';
import { addActivity } from '../components/Header';

const newId = () => 'SE-' + Math.random().toString(36).slice(2,8).toUpperCase();
const nowISO = () => new Date().toISOString();

const readLS = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const writeLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const KEY_PRODUCTS = 'yogo_products';
const KEY_SAMPLES  = 'yogo_samples';

const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const D = {
  add:        'M12 4v16m8-8H4',
  edit:       'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:      'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  eye:        'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  close:      'M6 18L18 6M6 6l12 12',
  search:     'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  calendar:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  box:        'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  user:       'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  done:       'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  eyeCheck:   'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0zM12 15a3 3 0 100-6 3 3 0 000 6z M10 15h4 M12 13v4',
  envelope:   'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  check:      'M5 13l4 4L19 7',
  cross:      'M6 18L18 6M6 6l12 12',
};

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

// ─── Status badge helper ──────────────────────
const StatusBadge = ({ text }) => {
  if (text === 'Yes' || text === true || text === 'Yes') return <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-success-50 text-success-600 text-xs font-semibold">Yes</span>;
  if (text === 'No'  || text === false|| text === 'No') return <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-danger-50 text-danger-600 text-xs font-semibold">No</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-200 text-primary-600 text-xs font-medium">{text || '—'}</span>;
};

// ─── Modal Components ─────────────────────────
const SampleModal = ({ item, products, onSave, onClose }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    enquiryId:   item?.enquiryId   || '',
    customerId:  item?.customerId  || '',
    enquiredOn:  item?.enquiredOn  || format(new Date(), 'yyyy-MM-dd'),
    productId:   item?.productId   || '',
    quantity:    item?.quantity    || 1,
    responded:   item?.responded   || 'No',
    sampleOrdered: item?.sampleOrdered || 'No',
    sampleShipped: item?.sampleShipped || 'No',
    orderPlaced: item?.orderPlaced || 'No',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerId)     { toast.error('Customer ID is required.'); return; }
    if (!form.enquiredOn)     { toast.error('Enquired date is required.'); return; }
    if (!form.productId)      { toast.error('Product selection is required.'); return; }
    setSaving(true);
    setTimeout(() => { onSave(form); setSaving(false); }, 300);
  };

  const product = products.find(p => p.id === form.productId);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Update Sample Enquiry' : 'Add Sample Enquiry'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight:'calc(90vh - 140px)' }}>
            {/* Row 1: Enquiry ID, Customer ID, Enquired On */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Enquiry ID <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.enquiryId} onChange={e=>set('enquiryId',e.target.value.toUpperCase())} placeholder="e.g. SE-ABC123" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Customer ID <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.customerId} onChange={e=>set('customerId',e.target.value)} placeholder="e.g. CUST-ABC" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Enquired On <span className="text-danger-500">*</span></label>
                <input type="date" className="form-input" value={form.enquiredOn} onChange={e=>set('enquiredOn',e.target.value)} required />
              </div>
            </div>

            {/* Row 2: Product Name + Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Product Name <span className="text-danger-500">*</span></label>
                <select className="form-select" value={form.productId} onChange={e=>set('productId',e.target.value)} required>
                  <option value="">— Select Product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {products.length === 0 && <p className="text-[11px] text-danger-500 mt-1">No products available. Add in Product Master first.</p>}
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Quantity <span className="text-danger-500">*</span></label>
                <input type="number" min="1" className="form-input" value={form.quantity} onChange={e=>set('quantity',Math.max(1, parseInt(e.target.value) || 1))} required />
              </div>
            </div>

            {/* Row 3: Responded, Sample Ordered, Sample Shipped, Order Placed */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Responded</label>
                <select className="form-select" value={form.responded} onChange={e=>set('responded',e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Sample Ordered</label>
                <select className="form-select" value={form.sampleOrdered} onChange={e=>set('sampleOrdered',e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Sample Shipped</label>
                <select className="form-select" value={form.sampleShipped} onChange={e=>set('sampleShipped',e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Order Placed</label>
                <select className="form-select" value={form.orderPlaced} onChange={e=>set('orderPlaced',e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
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

const ViewModal = ({ item, product, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full !max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
        <h3 className="font-heading text-base font-semibold text-primary-600">Enquiry Details</h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
      </div>
      <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight:'calc(90vh - 120px)' }}>
        {[
          { label:'Enquiry ID',   value:item.enquiryId,   icon:D.id    },
          { label:'Customer ID',  value:item.customerId,  icon:D.user  },
          { label:'Enquired On',  value:format(new Date(item.enquiredOn),'dd MMM yyyy'), icon:D.calendar },
          { label:'Product Name', value:product?.name || '—', icon:D.box },
          { label:'Quantity',     value:(String(item.quantity)), icon:D.box },
          { label:'Responded',    value:item.responded,    icon:D.envelope },
          { label:'Sample Ordered', value:item.sampleOrdered, icon:D.box },
          { label:'Sample Shipped', value:item.sampleShipped, icon:D.box },
          { label:'Order Placed', value:item.orderPlaced, icon:D.check },
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
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-primary-300">Created: {format(new Date(item.createdAt),'dd MMM yyyy, hh:mm a')}</span>
          {item.updatedAt !== item.createdAt && (
            <span className="text-xs text-primary-300">Updated: {format(new Date(item.updatedAt),'dd MMM yyyy, hh:mm a')}</span>
          )}
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end"><button onClick={onClose} className="btn-outline">Close</button></div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────
const SampleEnquiries = () => {
  const [items,    setItems]    = useState([]);
  const [products, setProducts] = useState([]);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  useEffect(() => {
    setProducts(readLS(KEY_PRODUCTS));
    setItems(readLS(KEY_SAMPLES));
  }, []);

  const persist = (data) => { setItems(data); writeLS(KEY_SAMPLES, data); };

  const getProductName = (id) => products.find(p => p.id === id)?.name || '—';

  const handleSave = (form) => {
    if (modal === 'add') {
      persist([...items, { ...form, createdAt:nowISO(), updatedAt:nowISO() }]);
      toast.success('Sample enquiry added.');
    } else {
      persist(items.map(i => i.enquiryId===modal.enquiryId ? { ...i, ...form, updatedAt:nowISO() } : i));
      toast.success('Sample enquiry updated.');
    addActivity('Sample enquiry updated', 'enquiry');
    }
    setModal(null);
  };

  const handleDelete = (id) => { persist(items.filter(i => i.enquiryId!==id)); toast.success('Sample enquiry deleted.');
    addActivity('Sample enquiry deleted', 'enquiry'); };

  const handleDone = (id) => {
    persist(items.map(i => i.enquiryId===id ? { ...i, orderPlaced:'Yes' } : i));
    toast.success('Marked as done (Order Placed = Yes).');
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i =>
      i.enquiryId?.toLowerCase().includes(t) || i.customerId?.toLowerCase().includes(t) ||
      getProductName(i.productId)?.toLowerCase().includes(t)
    );
  }, [items, search, products]);

  const totalCount = items.length;
  const todayCount  = items.filter(i => isToday(new Date(i.enquiredOn))).length;
  const weekCount   = items.filter(i => isThisWeek(new Date(i.enquiredOn),{weekStartsOn:1})).length;
  const doneCount   = items.filter(i => i.orderPlaced==='Yes').length;

  return (
    <div className="page-container">
      <div className="page-header flex-wrap items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Sample Enquiries</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage all sample enquiry submissions.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={()=>setModal('add')} className="btn-primary w-full sm:w-auto">
            <Ic d={D.add} /><span>Add Enquiry</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Enquiries" value={totalCount} iconPath={D.box}    color="primary" />
        <StatCard label="Today"          value={todayCount}  iconPath={D.calendar} color="success" sub="Enquired today" />
        <StatCard label="This Week"      value={weekCount}   iconPath={D.calendar} color="accent"  sub="Last 7 days" />
        <StatCard label="Order Placed"   value={doneCount}   iconPath={D.done}     color="earth"   sub="Completed" />
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input className="form-input pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by enquiry ID, customer ID, product…" />
        </div>
        {search && <button onClick={()=>setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th>Enquiry ID</th>
                <th>Customer ID</th>
                <th>Enquired On</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Responded</th>
                <th>Sample Ordered</th>
                <th>Sample Shipped</th>
                <th>Order Placed</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.box} className="w-7 h-7" /></div>
                    <p className="text-sm">{items.length===0?'No sample enquiries yet. Click "Add Enquiry" to start.':'No enquiries match your search.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map((item, idx) => (
                <tr key={item.enquiryId} className={item.orderPlaced==='Yes' ? 'opacity-60' : ''}>
                  <td className="text-primary-400 text-xs font-mono">{idx+1}</td>
                  <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium">{item.enquiryId}</span></td>
                  <td><span className="text-primary-700 text-sm">{item.customerId}</span></td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">{format(new Date(item.enquiredOn),'dd MMM yyyy')}</td>
                  <td><span className="font-medium text-primary-700">{getProductName(item.productId)}</span></td>
                  <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-semibold">{item.quantity}</span></td>
                  <td><StatusBadge text={item.responded} /></td>
                  <td><StatusBadge text={item.sampleOrdered} /></td>
                  <td><StatusBadge text={item.sampleShipped} /></td>
                  <td>
                    {item.orderPlaced==='Yes'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success-50 text-success-600 text-xs font-semibold"><Ic d={D.check} className="w-3 h-3" />Yes</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-danger-50 text-danger-600 text-xs font-semibold">No</span>
                    }
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">{format(new Date(item.createdAt),'dd MMM yyyy')}</td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">{format(new Date(item.updatedAt),'dd MMM yyyy')}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <button onClick={()=>setViewItem(item)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} /></button>
                      <button onClick={()=>setModal(item)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} /></button>
                      <button onClick={()=>setConfirm({ title:'Delete Enquiry', message:`Delete sample enquiry "${item.enquiryId}"?`, onConfirm:()=>handleDelete(item.enquiryId) })} className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50" title="Delete"><Ic d={D.trash} /></button>
                      {item.orderPlaced!=='Yes' && (
                        <button onClick={()=>setConfirm({ title:'Mark as Done', message:`Mark "${item.enquiryId}" as done and set "Order Placed" to Yes?`, onConfirm:()=>handleDone(item.enquiryId) })} className="btn-icon text-success-500 hover:text-success-600 hover:bg-success-50" title="Mark as Done"><Ic d={D.done} /></button>
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
            Showing <span className="font-medium text-primary-600">{filtered.length}</span> of <span className="font-medium text-primary-600">{items.length}</span> enquiries
          </div>
        )}
      </div>

      {(modal==='add'||(modal&&modal.enquiryId)) && <SampleModal item={modal==='add'?null:modal} products={products} onSave={handleSave} onClose={()=>setModal(null)} />}
      {viewItem && <ViewModal item={viewItem} product={products.find(p=>p.id===viewItem.productId)} onClose={()=>setViewItem(null)} />}
      {confirm  && <ConfirmationModal open={!!confirm} onClose={()=>setConfirm(null)} onConfirm={confirm.onConfirm} title={confirm.title} message={confirm.message} />}
    </div>
  );
};

export default SampleEnquiries;
