/**
 * pages/OrderStatusMaster.jsx — Order Status Master
 * Grid: S.No · Order Code · Order Name · Created Date · Updated Date · Actions
 * Actions: View · Edit · Delete · Mark as Done
 */

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ConfirmationModal } from '../components/ui';
import toast from 'react-hot-toast';

const newId = () => 'OS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const nowISO = () => new Date().toISOString();

const readLS = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const writeLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const KEY_STATUS = 'yogo_order_status';

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
  box:        'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  check:      'M5 13l4 4L19 7',
  done:       'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
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
    <div className="card flex items-center gap-3 hover:shadow-card-hover transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
        <Ic d={iconPath} className={`w-5 h-5 ${c.ic}`} />
      </div>
      <div className="min-w-0">
        <p className="text-primary-400 text-[10px] font-medium uppercase tracking-wide truncate">{label}</p>
        <p className={`text-xl font-heading font-bold mt-0.5 ${c.val}`}>{value}</p>
        {sub && <p className="text-[9px] text-primary-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Modal Components ─────────────────────────
const OrderStatusModal = ({ item, onSave, onClose }) => {
  const isEdit = !!item;
  
  const [form, setForm] = useState({
    statusId:  item?.statusId  || newId(),
    statusCode: item?.statusCode || '',
    statusName: item?.statusName || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.statusCode)     { toast.error('Order code is required.'); return; }
    if (!form.statusName)     { toast.error('Order name is required.'); return; }
    setSaving(true);
    setTimeout(() => { onSave(form); setSaving(false); }, 300);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Update Order Status' : 'Add Order Status'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight:'calc(90vh - 140px)' }}>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Order Code <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.statusCode} onChange={e=>set('statusCode',e.target.value.toUpperCase())} placeholder="e.g. PEND" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Order Name <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.statusName} onChange={e=>set('statusName',e.target.value)} placeholder="e.g. Pending" required />
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

const ViewModal = ({ item, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full !max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
        <h3 className="font-heading text-base font-semibold text-primary-600">Status Details</h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
      </div>
      <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight:'calc(90vh - 120px)' }}>
        <div className="grid grid-cols-1 gap-3">
          {[
            { label:'Order Code',  value:item.statusCode,  icon:D.box },
            { label:'Order Name',  value:item.statusName,  icon:D.box },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-surface-50 rounded-lg p-3 border border-surface-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Ic d={icon} className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm font-medium text-primary-700">{value || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-surface-100 mt-3">
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
const OrderStatusMaster = () => {
  const [items,    setItems]    = useState([]);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  useEffect(() => {
    setItems(readLS(KEY_STATUS));
  }, []);

  const persist = (data) => { setItems(data); writeLS(KEY_STATUS, data); };

  const handleSave = (form) => {
    if (modal === 'add') {
      persist([...items, { ...form, createdAt:nowISO(), updatedAt:nowISO() }]);
      toast.success('Order status added.');
    } else {
      persist(items.map(i => i.statusId===modal.statusId ? { ...i, ...form, updatedAt:nowISO() } : i));
      toast.success('Order status updated.');
    }
    setModal(null);
  };

  const handleDelete = (id) => { persist(items.filter(i => i.statusId!==id)); toast.success('Order status deleted.'); };

  const handleDone = (id) => {
    persist(items.map(i => i.statusId===id ? { ...i, isDone:true, updatedAt:nowISO() } : i));
    toast.success('Marked as done.');
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i =>
      i.statusCode?.toLowerCase().includes(t) || i.statusName?.toLowerCase().includes(t)
    );
  }, [items, search]);

  const totalCount = items.length;
  const activeCount = items.filter(i => !i.isDone).length;

  return (
    <div className="page-container">
      <div className="page-header flex-wrap items-center gap-2">
        <div>
          <h1 className="page-title text-xl">Order Status Master</h1>
          <p className="text-primary-400 text-xs mt-0.5">Manage order status codes.</p>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button onClick={()=>setModal('add')} className="btn-primary w-full sm:w-auto text-sm">
            <Ic d={D.add} className="w-3.5 h-3.5" /><span>Add Status</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Statuses" value={totalCount} iconPath={D.box} color="primary" />
        <StatCard label="Active"         value={activeCount} iconPath={D.check} color="success" sub="Not done" />
      </div>

      <div className="card !p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-300" />
          <input className="form-input pl-9 py-2 text-xs" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code/name…" />
        </div>
        {search && <button onClick={()=>setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
      </div>

      <div className="card !p-0 overflow-hidden flex-1 min-h-0">
        <div className="overflow-x-auto h-full">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-xs">S.No</th>
                <th className="text-xs">Order Code</th>
                <th className="text-xs">Order Name</th>
                <th className="text-xs">Created Date</th>
                <th className="text-xs">Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.box} className="w-7 h-7" /></div>
                    <p className="text-sm">{items.length===0?'No order statuses yet. Click "Add Status" to start.':'No statuses match your search.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map((item, idx) => {
                const isDone = !!item.isDone;
                return (
                  <tr key={item.statusId} className={isDone ? 'opacity-60' : ''}>
                    <td className="text-primary-400 text-[10px] font-mono">{idx+1}</td>
                    <td><span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-[10px] font-mono font-medium">{item.statusCode}</span></td>
                    <td><span className="font-medium text-primary-700 text-xs">{item.statusName}</span></td>
                    <td className="text-primary-400 text-[10px] whitespace-nowrap">{format(new Date(item.createdAt),'dd MMM yyyy')}</td>
                    <td className="text-primary-400 text-[10px] whitespace-nowrap">{format(new Date(item.updatedAt),'dd MMM yyyy')}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={()=>setViewItem(item)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>setModal(item)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>setConfirm({ title:'Delete Status', message:`Delete "${item.statusCode}"?`, onConfirm:()=>handleDelete(item.statusId) })} className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50" title="Delete"><Ic d={D.trash} className="w-3.5 h-3.5" /></button>
                        {!isDone && (
                          <button onClick={()=>setConfirm({ title:'Mark as Done', message:`Mark "${item.statusCode}" as done?`, onConfirm:()=>handleDone(item.statusId) })} className="btn-icon text-success-500 hover:text-success-600 hover:bg-success-50" title="Mark as Done"><Ic d={D.done} className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 text-xs text-primary-400">
            Showing <span className="font-medium text-primary-600">{filtered.length}</span> of <span className="font-medium text-primary-600">{items.length}</span> statuses
          </div>
        )}
      </div>

      {(modal==='add'||(modal&&modal.statusId)) && <OrderStatusModal item={modal==='add'?null:modal} onSave={handleSave} onClose={()=>setModal(null)} />}
      {viewItem && <ViewModal item={viewItem} onClose={()=>setViewItem(null)} />}
      {confirm  && <ConfirmationModal open={!!confirm} onClose={()=>setConfirm(null)} onConfirm={confirm.onConfirm} title={confirm.title} message={confirm.message} />}
    </div>
  );
};

export default OrderStatusMaster;
