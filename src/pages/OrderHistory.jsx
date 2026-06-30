/**
 * pages/OrderHistory.jsx — Order History
 * Filters: From Date, To Date, Customer ID, Product Name (dropdown)
 * Button: Get Order History
 * Shows Order Tracking data with actions: View, Edit, Delete, Mark as Done
 */

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ConfirmationModal } from '../components/ui';
import toast from 'react-hot-toast';

const readLS = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const writeLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const KEY_PRODUCTS = 'yogo_products';
const KEY_ORDERS = 'yogo_orders';
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
  calendar:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z',
  box:        'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  user:       'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  truck:      'M1 3h15v13H1zM16 7h3l3 3v5h-6V7zM8 18a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z',
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
const OrderModal = ({ item, products, onSave, onClose }) => {
  const isEdit = !!item;
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const defaultStatuses = {
    orderPlaced:               item?.orderPlaced               || today,
    productInitiated:          item?.productInitiated          || '',
    inspectionInitiated:       item?.inspectionInitiated       || '',
    certificationInProgress:   item?.certificationInProgress   || '',
    packingInProgress:         item?.packingInProgress         || '',
    shippedFromManufacturer:   item?.shippedFromManufacturer   || '',
    inYogoWarehouse:           item?.inYogoWarehouse           || '',
    shippedFromYogo:           item?.shippedFromYogo           || '',
    customerClearanceLoading:  item?.customerClearanceLoading  || '',
    billOfLoading:             item?.billOfLoading             || '',
    soldOn:                    item?.soldOn                    || '',
    reachedDestinationPartOn:  item?.reachedDestinationPartOn  || '',
    customerClearanceDest:     item?.customerClearanceDest     || '',
    reachedCustomerWarehouse:  item?.reachedCustomerWarehouse  || '',
    orderCompleted:            item?.orderCompleted            || '',
  };
  
  const [form, setForm] = useState({
    orderId:     item?.orderId     || '',
    customerId:  item?.customerId  || '',
    productId:   item?.productId   || '',
    quantity:    item?.quantity    || 1,
    ...defaultStatuses,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.orderId)        { toast.error('Order ID is required.'); return; }
    if (!form.customerId)     { toast.error('Customer ID is required.'); return; }
    if (!form.productId)      { toast.error('Product selection is required.'); return; }
    setSaving(true);
    setTimeout(() => { onSave(form); setSaving(false); }, 300);
  };

  const product = products.find(p => p.id === form.productId);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Update Order' : 'Add Order'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight:'calc(90vh - 140px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Order ID <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.orderId} onChange={e=>set('orderId',e.target.value.toUpperCase())} placeholder="e.g. OT-ABC123" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Customer ID <span className="text-danger-500">*</span></label>
                <input className="form-input" value={form.customerId} onChange={e=>set('customerId',e.target.value)} placeholder="e.g. CUST-ABC" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Product Name <span className="text-danger-500">*</span></label>
                <select className="form-select" value={form.productId} onChange={e=>set('productId',e.target.value)} required>
                  <option value="">— Select Product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {products.length === 0 && <p className="text-[11px] text-danger-500 mt-1">No products available. Add in Product Master first.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Quantity <span className="text-danger-500">*</span></label>
                <input type="number" min="1" className="form-input" value={form.quantity} onChange={e=>set('quantity',Math.max(1, parseInt(e.target.value) || 1))} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group !mb-0">
                <label className="form-label">Order Placed</label>
                <input type="date" className="form-input" value={form.orderPlaced} onChange={e=>set('orderPlaced',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Product Initiated</label>
                <input type="date" className="form-input" value={form.productInitiated} onChange={e=>set('productInitiated',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Inspection Initiated</label>
                <input type="date" className="form-input" value={form.inspectionInitiated} onChange={e=>set('inspectionInitiated',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Certification In Progress</label>
                <input type="date" className="form-input" value={form.certificationInProgress} onChange={e=>set('certificationInProgress',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Packing In Progress</label>
                <input type="date" className="form-input" value={form.packingInProgress} onChange={e=>set('packingInProgress',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Shipped From Manufacturer</label>
                <input type="date" className="form-input" value={form.shippedFromManufacturer} onChange={e=>set('shippedFromManufacturer',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">In Yogo Warehouse</label>
                <input type="date" className="form-input" value={form.inYogoWarehouse} onChange={e=>set('inYogoWarehouse',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Shipped From Yogo</label>
                <input type="date" className="form-input" value={form.shippedFromYogo} onChange={e=>set('shippedFromYogo',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Customer Clearance (Loading)</label>
                <input type="date" className="form-input" value={form.customerClearanceLoading} onChange={e=>set('customerClearanceLoading',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Bill of Loading</label>
                <input type="date" className="form-input" value={form.billOfLoading} onChange={e=>set('billOfLoading',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Sold On</label>
                <input type="date" className="form-input" value={form.soldOn} onChange={e=>set('soldOn',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Reached Destination (On)</label>
                <input type="date" className="form-input" value={form.reachedDestinationPartOn} onChange={e=>set('reachedDestinationPartOn',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Customer Clearance (Dest)</label>
                <input type="date" className="form-input" value={form.customerClearanceDest} onChange={e=>set('customerClearanceDest',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Reached Customer Warehouse</label>
                <input type="date" className="form-input" value={form.reachedCustomerWarehouse} onChange={e=>set('reachedCustomerWarehouse',e.target.value)} />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Order Completed</label>
                <input type="date" className="form-input" value={form.orderCompleted} onChange={e=>set('orderCompleted',e.target.value)} />
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
    <div className="modal-box w-full !max-w-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
        <h3 className="font-heading text-base font-semibold text-primary-600">Order Details</h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
      </div>
      <div className="px-4 py-3 space-y-2 overflow-y-auto" style={{ maxHeight:'calc(90vh - 140px)' }}>
        {[
          { label:'Order ID',   value:item.orderId,   icon:D.id    },
          { label:'Customer ID',  value:item.customerId,  icon:D.user  },
          { label:'Product Name', value:product?.name || '—', icon:D.box },
          { label:'Quantity',     value:String(item.quantity), icon:D.box },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-start gap-2 py-1.5 border-b border-surface-100 last:border-0">
            <div className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Ic d={icon} className="w-3 h-3 text-primary-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-primary-400 uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-primary-700 mt-0.5">{value || '—'}</p>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t border-surface-100">
          <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wide mb-1.5">Order Timeline</p>
          {[
            { label:'Order Placed',               value:item.orderPlaced },
            { label:'Product Initiated',          value:item.productInitiated },
            { label:'Inspection Initiated',       value:item.inspectionInitiated },
            { label:'Certification In Progress',  value:item.certificationInProgress },
            { label:'Packing In Progress',        value:item.packingInProgress },
            { label:'Shipped From Manufacturer',  value:item.shippedFromManufacturer },
            { label:'In Yogo Warehouse',          value:item.inYogoWarehouse },
            { label:'Shipped From Yogo',          value:item.shippedFromYogo },
            { label:'Customer Clearance (Loading)', value:item.customerClearanceLoading },
            { label:'Bill of Loading',            value:item.billOfLoading },
            { label:'Sold On',                    value:item.soldOn },
            { label:'Reached Destination (On)',   value:item.reachedDestinationPartOn },
            { label:'Customer Clearance (Dest)',  value:item.customerClearanceDest },
            { label:'Reached Customer Warehouse', value:item.reachedCustomerWarehouse },
            { label:'Order Completed',            value:item.orderCompleted },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-2 py-1.5 border-b border-surface-50 last:border-0">
              <p className="w-36 text-[10px] text-primary-400 truncate">{label}</p>
              <p className="text-xs text-primary-700 flex-1">{value ? format(new Date(value), 'dd MMM yyyy') : '—'}</p>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-1.5">
          <span className="text-[10px] text-primary-300">Created: {format(new Date(item.createdAt),'dd MMM yyyy, hh:mm a')}</span>
          {item.updatedAt !== item.createdAt && (
            <span className="text-[10px] text-primary-300">Updated: {format(new Date(item.updatedAt),'dd MMM yyyy, hh:mm a')}</span>
          )}
        </div>
      </div>
      <div className="px-4 pb-4 flex justify-end"><button onClick={onClose} className="btn-outline text-xs">Close</button></div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────
const OrderHistory = () => {
  const [items,       setItems]       = useState([]);
  const [products,    setProducts]    = useState([]);
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [customerId,  setCustomerId]  = useState('');
  const [productId,   setProductId]   = useState('');
  const [modal,       setModal]       = useState(null);
  const [viewItem,    setViewItem]    = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [filterApplied, setFilterApplied] = useState(false);

  useEffect(() => {
    setProducts(readLS(KEY_PRODUCTS));
    setItems(readLS(KEY_ORDERS));
  }, []);

  const persist = (data) => { setItems(data); writeLS(KEY_ORDERS, data); };

  const getProductName = (id) => products.find(p => p.id === id)?.name || '—';
  const formatDate = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  const handleSave = (form) => {
    if (modal === 'add') {
      persist([...items, { ...form, createdAt:nowISO(), updatedAt:nowISO() }]);
      toast.success('Order tracking added.');
    } else {
      persist(items.map(i => i.orderId===modal.orderId ? { ...i, ...form, updatedAt:nowISO() } : i));
      toast.success('Order tracking updated.');
    }
    setModal(null);
  };

  const handleDelete = (id) => { persist(items.filter(i => i.orderId!==id)); toast.success('Order tracking deleted.'); };

  const handleDone = (id) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    persist(items.map(i => {
      if (i.orderId !== id) return i;
      const allDates = [
        'orderPlaced', 'productInitiated', 'inspectionInitiated', 'certificationInProgress',
        'packingInProgress', 'shippedFromManufacturer', 'inYogoWarehouse', 'shippedFromYogo',
        'customerClearanceLoading', 'billOfLoading', 'soldOn', 'reachedDestinationPartOn',
        'customerClearanceDest', 'reachedCustomerWarehouse', 'orderCompleted'
      ];
      const updates = {};
      allDates.forEach(d => { if (!i[d]) updates[d] = today; });
      return { ...i, ...updates, updatedAt:nowISO() };
    }));
    toast.success('Order marked as done (all dates filled).');
  };

  const handleGetHistory = () => {
    setFilterApplied(true);
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setCustomerId('');
    setProductId('');
    setFilterApplied(false);
  };

  const filtered = useMemo(() => {
    let result = items;
    
    if (fromDate) {
      result = result.filter(i => i.orderPlaced >= fromDate);
    }
    if (toDate) {
      result = result.filter(i => i.orderPlaced <= toDate);
    }
    if (customerId) {
      result = result.filter(i => i.customerId?.toLowerCase().includes(customerId.toLowerCase()));
    }
    if (productId) {
      result = result.filter(i => i.productId === productId);
    }
    
    return result;
  }, [items, fromDate, toDate, customerId, productId]);

  const totalCount = items.length;
  const filteredCount = filtered.length;

  return (
    <div className="page-container">
      <div className="page-header flex-wrap items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="text-primary-400 text-sm mt-0.5">View and manage order history.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={handleGetHistory} className="btn-primary w-full sm:w-auto">
            <Ic d={D.search} /><span>Get Order History</span>
          </button>
        </div>
      </div>

      <div className="card !p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="form-group !mb-0">
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={toDate} onChange={e=>setToDate(e.target.value)} />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">Customer ID</label>
            <input className="form-input" value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="e.g. CUST-ABC" />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">Product Name</label>
            <select className="form-select" value={productId} onChange={e=>setProductId(e.target.value)}>
              <option value="">— All Products —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {filterApplied && (
            <button onClick={handleClearFilters} className="btn-ghost btn-xs text-primary-400">
              Clear
            </button>
          )}
        </div>
      </div>

      {filterApplied && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Orders"    value={totalCount}   iconPath={D.box}    color="primary" />
            <StatCard label="Filtered"        value={filteredCount} iconPath={D.truck}  color="accent"  sub="After filters" />
          </div>

          <div className="card !p-3 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-300" />
              <input className="form-input pl-9 py-2 text-xs" value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="Search by customer…" />
            </div>
            {customerId && <button onClick={() => setCustomerId('')} className="btn-ghost btn-xs text-primary-400">Clear</button>}
          </div>

          <div className="card !p-0 overflow-hidden flex-1 min-h-0">
            <div className="overflow-x-auto h-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10 text-xs">S.No</th>
                    <th className="text-xs">Order ID</th>
                    <th className="text-xs">Customer ID</th>
                    <th className="text-xs">Product Name</th>
                    <th className="text-xs">Quantity</th>
                    <th className="text-xs">Order Placed</th>
                    <th className="text-xs">Shipped From Yogo</th>
                    <th className="text-xs">Reached Customer</th>
                    <th className="text-xs">Order Completed</th>
                    <th className="text-xs">Created Date</th>
                    <th className="text-xs">Updated Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-primary-300">
                        <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center"><Ic d={D.box} className="w-6 h-6" /></div>
                        <p className="text-xs">No orders found with the selected filters.</p>
                      </div>
                    </td></tr>
                  ) : filtered.map((item, idx) => {
                    const isDone = !!item.orderCompleted;
                    return (
                      <tr key={item.orderId} className={isDone ? 'opacity-60' : ''}>
                        <td className="text-primary-400 text-[10px] font-mono">{idx+1}</td>
                        <td><span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-[10px] font-mono font-medium">{item.orderId}</span></td>
                        <td><span className="text-primary-700 text-xs">{item.customerId}</span></td>
                        <td><span className="font-medium text-primary-700 text-xs">{getProductName(item.productId)}</span></td>
                        <td><span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-[10px] font-semibold">{item.quantity}</span></td>
                        <td className="text-primary-400 text-[10px] whitespace-nowrap">{formatDate(item.orderPlaced)}</td>
                        <td className="text-primary-400 text-[10px] whitespace-nowrap">{formatDate(item.shippedFromYogo)}</td>
                        <td className="text-primary-400 text-[10px] whitespace-nowrap">{formatDate(item.reachedCustomerWarehouse)}</td>
                        <td>
                          {isDone
                            ? <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-success-50 text-success-600 text-[10px] font-semibold"><Ic d={D.check} className="w-3 h-3" />Yes</span>
                            : <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-danger-50 text-danger-600 text-[10px] font-semibold">No</span>
                          }
                        </td>
                        <td className="text-primary-400 text-[10px] whitespace-nowrap">{format(new Date(item.createdAt),'dd MMM yyyy')}</td>
                        <td className="text-primary-400 text-[10px] whitespace-nowrap">{format(new Date(item.updatedAt),'dd MMM yyyy')}</td>
                        <td>
                          <div className="flex items-center justify-center gap-0.5 flex-wrap">
                            <button onClick={()=>setViewItem(item)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} className="w-3 h-3" /></button>
                            <button onClick={()=>setModal(item)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} className="w-3 h-3" /></button>
                            <button onClick={()=>setConfirm({ title:'Delete Order', message:`Delete order "${item.orderId}"?`, onConfirm:()=>handleDelete(item.orderId) })} className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50" title="Delete"><Ic d={D.trash} className="w-3 h-3" /></button>
                            {!isDone && (
                              <button onClick={()=>setConfirm({ title:'Mark as Done', message:`Mark "${item.orderId}" as done?`, onConfirm:()=>handleDone(item.orderId) })} className="btn-icon text-success-500 hover:text-success-600 hover:bg-success-50" title="Mark as Done"><Ic d={D.done} className="w-3 h-3" /></button>
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
                Showing <span className="font-medium text-primary-600">{filtered.length}</span> orders
              </div>
            )}
          </div>
        </div>
      )}

      {(modal==='add'||(modal&&modal.orderId)) && <OrderModal item={modal==='add'?null:modal} products={products} onSave={handleSave} onClose={()=>setModal(null)} />}
      {viewItem && <ViewModal item={viewItem} product={products.find(p=>p.id===viewItem.productId)} onClose={()=>setViewItem(null)} />}
      {confirm  && <ConfirmationModal open={!!confirm} onClose={()=>setConfirm(null)} onConfirm={confirm.onConfirm} title={confirm.title} message={confirm.message} />}
    </div>
  );
};

export default OrderHistory;
