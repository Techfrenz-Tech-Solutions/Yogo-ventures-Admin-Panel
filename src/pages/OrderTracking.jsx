/**
 * pages/OrderTracking.jsx — Order Tracking
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /ordertrack/order-trackingcreate  → create
 * GET  /ordertrack/order-trackinglist    → list
 * POST /ordertrack/order-trackingupdate  → update
 * POST /ordertrack/order-trackingdelete  → delete
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ConfirmationModal } from '../components/ui';
import toast from 'react-hot-toast';
import Api from '../utils/Api';

const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const D = {
  add:      'M12 4v16m8-8H4',
  edit:     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  eye:      'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  close:    'M6 18L18 6M6 6l12 12',
  search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  box:      'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  truck:    'M1 3h15v13H1zM16 7h3l3 3v5h-6V7zM8 18a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z',
  check:    'M5 13l4 4L19 7',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  user:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  done:     'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
};

const fmtDate = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—';
const toInput  = (d) => d ? d.split('T')[0] : '';

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

// ─── Date input field ─────────────────────────
const DateField = ({ label, value, onChange }) => (
  <div className="form-group !mb-0">
    <label className="form-label text-xs">{label}</label>
    <input type="date" className="form-input py-1 text-xs" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

// ─── Timeline field keys (snake_case matching API) ───
const TIMELINE_FIELDS = [
  { key: 'order_placed',                label: 'Order Placed' },
  { key: 'product_initiated',           label: 'Product Initiated' },
  { key: 'inspection_initiated',        label: 'Inspection Initiated' },
  { key: 'certification_in_progress',   label: 'Certification In Progress' },
  { key: 'packing_in_progress',         label: 'Packing In Progress' },
  { key: 'shipped_from_manufacturer',   label: 'Shipped From Manufacturer' },
  { key: 'in_yogo_warehouse',           label: 'In Yogo Warehouse' },
  { key: 'shipped_from_yogo',           label: 'Shipped From Yogo' },
  { key: 'customer_clearance_loading',  label: 'Customer Clearance (Loading)' },
  { key: 'bill_of_loading',             label: 'Bill of Loading' },
  { key: 'sold_on',                     label: 'Sold On' },
  { key: 'reached_destination_part_on', label: 'Reached Destination (On)' },
  { key: 'customer_clearance_dest',     label: 'Customer Clearance (Dest)' },
  { key: 'reached_customer_warehouse',  label: 'Reached Customer Warehouse' },
  { key: 'order_completed',             label: 'Order Completed' },
];

// ─── Add / Edit Modal ─────────────────────────
const OrderModal = ({ item, onSave, onClose }) => {
  const isEdit = !!item;
  const today  = format(new Date(), 'yyyy-MM-dd');

  const initForm = () => {
    const base = {
      order_id:    item?.order_id    || item?.orderId    || '',
      customer_id: item?.customer_id || item?.customerId || '',
      product_name:item?.product_name|| item?.productName|| '',
      quantity:    item?.quantity    || 1,
    };
    TIMELINE_FIELDS.forEach(({ key }) => {
      base[key] = toInput(item?.[key] || '');
    });
    if (!base.order_placed) base.order_placed = today;
    return base;
  };

  const [form,   setForm]   = useState(initForm);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_id.trim())    { toast.error('Order ID is required.');    return; }
    if (!form.customer_id.trim()) { toast.error('Customer ID is required.'); return; }
    if (!form.product_name.trim()){ toast.error('Product name is required.'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Update Order' : 'Add Order'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
            <Ic d={D.close} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Order ID <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.order_id} onChange={e => set('order_id', e.target.value)} placeholder="e.g. OT-001" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Customer ID <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)} placeholder="e.g. CUST-001" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Product Name <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.product_name} onChange={e => set('product_name', e.target.value)} placeholder="e.g. Yoga Mat" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Quantity <span className="text-danger-500">*</span></label>
                <input type="number" min="1" className="form-input" value={form.quantity}
                  onChange={e => set('quantity', Math.max(1, parseInt(e.target.value) || 1))} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIMELINE_FIELDS.map(({ key, label }) => (
                <DateField key={key} label={label} value={form[key]} onChange={v => set(key, v)} />
              ))}
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
const ViewModal = ({ item, onClose }) => {
  const createdAt = item.created_date || item.created_at || item.createdAt || '';
  const updatedAt = item.updated_date || item.updated_at || item.updatedAt || '';
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">Order Details</h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {[
            { label: 'Order ID',     value: item.order_id    || item.orderId,    icon: D.box  },
            { label: 'Customer ID',  value: item.customer_id || item.customerId, icon: D.user },
            { label: 'Product Name', value: item.product_name|| item.productName,icon: D.box  },
            { label: 'Quantity',     value: String(item.quantity || ''),          icon: D.box  },
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
          <div className="pt-3 border-t border-surface-100 mt-2">
            <p className="text-xs font-semibold text-primary-500 uppercase tracking-wide mb-2">Order Timeline</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIMELINE_FIELDS.map(({ key, label }) => (
                <div key={key} className="bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                  <p className="text-[10px] font-medium text-primary-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-xs font-medium text-primary-700">{fmtDate(item[key])}</p>
                </div>
              ))}
            </div>
          </div>
          {(createdAt || updatedAt) && (
            <div className="flex items-center justify-between pt-3 border-t border-surface-100 mt-2">
              {createdAt && <span className="text-xs text-primary-300">Created: {fmtDate(createdAt)}</span>}
              {updatedAt && <span className="text-xs text-primary-300">Updated: {fmtDate(updatedAt)}</span>}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────
const OrderTracking = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null); // null | 'add' | itemObject
  const [viewItem, setViewItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  // ── Fetch list ──────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await Api.get('/ordertrack/order-trackinglist');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const sorted = [...list].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
      setItems(sorted);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load order tracking data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Create ──────────────────────────────────
  const handleCreate = async (form) => {
    try {
      const res = await Api.post('/ordertrack/order-trackingcreate', form);
      if (res.data?.status === 0) { toast.error(res.data?.message || 'Failed to add order.'); return; }
      toast.success('Order tracking added successfully.');
      setModal(null);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add order.');
    }
  };

  // ── Update ──────────────────────────────────
  const handleUpdate = async (form) => {
    try {
      const res = await Api.post('/ordertrack/order-trackingupdate', { id: modal?.id, ...form });
      if (res.data?.status === 0) { toast.error(res.data?.message || 'Failed to update order.'); return; }
      toast.success('Order tracking updated successfully.');
      setModal(null);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update order.');
    }
  };

  // ── Delete ──────────────────────────────────
  const handleDelete = async (item) => {
    try {
      const res = await Api.post('/ordertrack/order-trackingdelete', { id: item.id });
      if (res.data?.status === 0) { toast.error(res.data?.message || 'Failed to delete order.'); return; }
      toast.success('Order tracking deleted.');
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete order.');
    }
  };

  const handleSave = (form) => modal === 'add' ? handleCreate(form) : handleUpdate(form);

  // ── Search ───────────────────────────────────
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i =>
      (i.order_id    || i.orderId    || '').toLowerCase().includes(t) ||
      (i.customer_id || i.customerId || '').toLowerCase().includes(t) ||
      (i.product_name|| i.productName|| '').toLowerCase().includes(t)
    );
  }, [items, search]);

  // ── Stats ────────────────────────────────────
  const totalCount     = items.length;
  const pendingCount   = items.filter(i => !(i.order_completed || i.orderCompleted)).length;
  const completedCount = items.filter(i =>  !!(i.order_completed || i.orderCompleted)).length;
  const shippedCount   = items.filter(i =>  !!(i.shipped_from_yogo || i.shippedFromYogo)).length;

  return (
    <div className="page-container">
      <div className="page-header flex-wrap items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Order Tracking</h1>
          <p className="text-primary-400 text-sm mt-0.5">Track order status and timeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchItems} disabled={loading} className="btn-outline" title="Refresh">
            <Ic d={D.refresh} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">
            <Ic d={D.add} className="w-3.5 h-3.5" /><span>Add Order</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={totalCount}     iconPath={D.box}   color="primary" />
        <StatCard label="Pending"      value={pendingCount}   iconPath={D.truck} color="accent"  sub="Not completed" />
        <StatCard label="Shipped"      value={shippedCount}   iconPath={D.truck} color="success" sub="Shipped from Yogo" />
        <StatCard label="Completed"    value={completedCount} iconPath={D.check} color="earth"   sub="Order completed" />
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID, customer ID, product…" />
        </div>
        {search && <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th>Order ID</th>
                <th>Customer ID</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Order Placed</th>
                <th>Shipped From Yogo</th>
                <th>Reached Customer</th>
                <th>Order Completed</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-16">
                  <div className="flex items-center justify-center gap-2 text-primary-400">
                    <div className="spinner !w-5 !h-5" /><span>Loading orders…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.box} className="w-7 h-7" /></div>
                    <p className="text-sm">{items.length === 0 ? 'No orders yet. Click "Add Order" to start.' : 'No orders match your search.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map((item, idx) => {
                const orderId      = item.order_id     || item.orderId     || '';
                const customerId   = item.customer_id  || item.customerId  || '';
                const productName  = item.product_name || item.productName || '';
                const orderPlaced  = item.order_placed || item.orderPlaced || '';
                const shippedYogo  = item.shipped_from_yogo       || item.shippedFromYogo       || '';
                const reachedCust  = item.reached_customer_warehouse || item.reachedCustomerWarehouse || '';
                const orderDone    = item.order_completed || item.orderCompleted || '';
                const createdAt    = item.created_date || item.created_at || item.createdAt || '';
                const updatedAt    = item.updated_date || item.updated_at || item.updatedAt || '';
                const isDone       = !!orderDone;
                return (
                  <tr key={item.id} className={isDone ? 'opacity-60' : ''}>
                    <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                    <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium">{orderId}</span></td>
                    <td className="text-primary-700 text-sm">{customerId}</td>
                    <td className="font-medium text-primary-700">{productName}</td>
                    <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-semibold">{item.quantity}</span></td>
                    <td className="text-primary-400 text-xs whitespace-nowrap">{fmtDate(orderPlaced)}</td>
                    <td className="text-primary-400 text-xs whitespace-nowrap">{fmtDate(shippedYogo)}</td>
                    <td className="text-primary-400 text-xs whitespace-nowrap">{fmtDate(reachedCust)}</td>
                    <td>{isDone
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success-50 text-success-600 text-xs font-semibold"><Ic d={D.check} className="w-3 h-3" />Yes</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-danger-50 text-danger-600 text-xs font-semibold">No</span>}
                    </td>
                    <td className="text-primary-400 text-xs whitespace-nowrap">{fmtDate(createdAt)}</td>
                    <td className="text-primary-400 text-xs whitespace-nowrap">{fmtDate(updatedAt)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={() => setViewItem(item)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} /></button>
                        <button onClick={() => setModal(item)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} /></button>
                        <button onClick={() => setConfirm({ title: 'Delete Order', message: `Delete order "${orderId}"?`, onConfirm: () => handleDelete(item) })}
                          className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50" title="Delete"><Ic d={D.trash} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 text-xs text-primary-400">
            Showing <span className="font-medium text-primary-600">{filtered.length}</span> of{' '}
            <span className="font-medium text-primary-600">{items.length}</span> orders
          </div>
        )}
      </div>

      {(modal === 'add' || (modal && modal.id)) && (
        <OrderModal item={modal === 'add' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {viewItem && <ViewModal item={viewItem} onClose={() => setViewItem(null)} />}
      {confirm  && (
        <ConfirmationModal open={!!confirm} onClose={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          title={confirm.title} message={confirm.message} />
      )}
    </div>
  );
};

export default OrderTracking;
