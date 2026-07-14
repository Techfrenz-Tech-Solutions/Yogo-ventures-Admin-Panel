/**
 * pages/OrderTracking.jsx — Order Tracking
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /ordertrack/order-trackingcreate    → create (body includes dates: [{title, value}])
 * GET  /ordertrack/order-trackinglist      → list (each row includes dates: [{title, normalisedTitle, value}])
 * POST /ordertrack/order-trackingupdate    → update (dates array is diffed server-side — see below)
 * POST /ordertrack/order-trackingdelete    → delete
 * GET  /ordertrack/order-trackingnextcode  → next suggested Order ID
 * GET  /ordertrack/order-datetitles        → all reusable date titles, for the autocomplete
 * GET  /customer/customerlist              → customer dropdown
 * GET  /product/productlist                → product dropdown
 *
 * Order milestone dates are no longer fixed columns (order_placed_date,
 * shipped_from_yogo_date, ...) — they're a dynamic, per-order list of
 * { title, value } pairs backed by order_dates/order_date_titles. The
 * table's date columns are derived as the union of every title actually
 * used across the loaded orders, so a column only exists/persists while at
 * least one order still uses that title.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { ConfirmationModal, RetryBlock } from '../components/ui';
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
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

const fmtDate      = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—';
const fmtDynamicDate = (d) => d ? format(new Date(d), 'dd-MM-yyyy') : '—';
const toInputDate   = (d) => d ? String(d).slice(0, 10) : '';
const normaliseTitle = (raw) => String(raw || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/ /g, '-');

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

// ─── Searchable dropdown / autocomplete ───────
// Used for Customer, Product and Date Title. With allowCustomValue=false the
// value is only ever set by picking a listed option (typing alone can't
// produce an invalid selection); with allowCustomValue=true, free-typed text
// is itself a valid value (used for a brand-new date title).
const SearchableSelect = ({ value, onChange, options, placeholder, emptyMessage, allowCustomValue, disabled }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (open) return;
    setQuery(selected ? selected.label : (allowCustomValue ? (value || '') : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.searchText.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const handleSelect = (opt) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    onChange(allowCustomValue ? v : '');
  };

  return (
    <div className="relative" ref={ref}>
      <input
        className="form-input"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-surface-200 rounded-xl shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-primary-300">{emptyMessage || 'No matches.'}</div>
          ) : (
            filtered.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 text-primary-700"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

let dateRowKeySeq = 0;
const makeDateRow = (title = '', value = '') => ({ key: ++dateRowKeySeq, title, value });
const MAX_DATE_ROWS = 30;

// ─── Add / Edit Modal ─────────────────────────
const OrderModal = ({ item, customers, products, dateTitles, onSave, onClose }) => {
  const isEdit = !!item;

  const [form, setForm] = useState({
    order_id:     item?.order_id     || '',
    customer_id:  item?.customer_id  ? String(item.customer_id) : '',
    product_name: item?.product_name || '',
    quantity:     item?.quantity     || 1,
  });
  const [dateRows, setDateRows] = useState(() =>
    item?.dates?.length
      ? item.dates.map(d => makeDateRow(d.title, toInputDate(d.value)))
      : [makeDateRow()]
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Prefill the next suggested Order ID on Add only — never on Edit, and
  // never once the user has typed something themselves (checked via the
  // functional update, not a render-time value).
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    Api.get('/ordertrack/order-trackingnextcode')
      .then(res => {
        if (cancelled) return;
        const suggested = res.data?.code;
        if (suggested) setForm(prev => (prev.order_id ? prev : { ...prev, order_id: suggested }));
      })
      .catch(() => { /* leave the field empty — user can still type an Order ID */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerOptions = useMemo(() => customers.map(c => ({
    value: String(c.id),
    label: `${c.customer_name} (${c.id})`,
    searchText: `${c.customer_name} ${c.id}`,
  })), [customers]);

  const productOptions = useMemo(() => products.map(p => ({
    value: p.product_name,
    label: `${p.product_name} (${p.product_code})`,
    searchText: `${p.product_name} ${p.product_code}`,
  })), [products]);

  const dateTitleOptions = useMemo(() => dateTitles.map(t => ({
    value: t.display_name,
    label: t.display_name,
    searchText: t.display_name,
  })), [dateTitles]);

  const updateDateRow = (i, key, v) => setDateRows(p => {
    const next = [...p];
    next[i] = { ...next[i], [key]: v };
    return next;
  });

  const addDateRow = () => {
    if (dateRows.length >= MAX_DATE_ROWS) {
      toast.error(`You can add up to ${MAX_DATE_ROWS} dates.`);
      return;
    }
    setDateRows(p => [...p, makeDateRow()]);
  };

  const removeDateRow = (i) => setDateRows(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_id.trim())  { toast.error('Order ID is required.'); return; }
    if (!form.customer_id)      { toast.error('Please select a customer.'); return; }
    if (!form.product_name)     { toast.error('Please select a product.'); return; }

    const seen = new Set();
    const dates = [];
    for (const row of dateRows) {
      const title = row.title.trim().replace(/\s+/g, ' ');
      if (!title && !row.value) continue; // untouched empty row — not submitted
      if (!title) { toast.error('Each date needs a title.'); return; }
      if (!row.value) { toast.error(`"${title}" needs a date value.`); return; }
      const norm = normaliseTitle(title);
      if (seen.has(norm)) { toast.error(`"${title}" was added more than once — each date title can only be used once per order.`); return; }
      seen.add(norm);
      dates.push({ title, value: row.value });
    }

    setSaving(true);
    await onSave({
      order_id:     form.order_id.trim(),
      customer_id:  Number(form.customer_id),
      product_name: form.product_name,
      quantity:     Number(form.quantity),
      dates,
    });
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
                <input className="form-input" value={form.order_id} onChange={e => set('order_id', e.target.value)} placeholder="e.g. ORD-001" required />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Customer <span className="text-danger-500">*</span></label>
                <SearchableSelect
                  value={form.customer_id}
                  onChange={v => set('customer_id', v)}
                  options={customerOptions}
                  placeholder="Search customer by name or ID…"
                  emptyMessage={customers.length === 0 ? 'No customers found. Add one in Customer Master first.' : 'No matches.'}
                />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Product <span className="text-danger-500">*</span></label>
                <SearchableSelect
                  value={form.product_name}
                  onChange={v => set('product_name', v)}
                  options={productOptions}
                  placeholder="Search product by name or code…"
                  emptyMessage={products.length === 0 ? 'No products found. Add one in Product Master first.' : 'No matches.'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Quantity <span className="text-danger-500">*</span></label>
                <input type="number" min="1" className="form-input" value={form.quantity}
                  onChange={e => set('quantity', Math.max(1, parseInt(e.target.value) || 1))} required />
              </div>
            </div>

            {/* Dynamic dates — any number, any title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="form-label !mb-0">Dates</p>
                <button type="button" onClick={addDateRow} className="btn-outline btn-sm !py-1 !px-2.5 text-xs gap-1">
                  <Ic d={D.add} className="w-3.5 h-3.5" /> Add Date
                </button>
              </div>
              <div className="space-y-2">
                {dateRows.map((row, i) => (
                  <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:items-end">
                    <div className="form-group !mb-0">
                      <label className="form-label text-xs">Date Title</label>
                      <SearchableSelect
                        value={row.title}
                        onChange={v => updateDateRow(i, 'title', v)}
                        options={dateTitleOptions}
                        placeholder="e.g. Ship Cargo"
                        allowCustomValue
                        emptyMessage="No existing titles yet — type to create a new one."
                      />
                    </div>
                    <div className="form-group !mb-0">
                      <label className="form-label text-xs">Date</label>
                      <input type="date" className="form-input" value={row.value} onChange={e => updateDateRow(i, 'value', e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDateRow(i)}
                      className="btn-outline btn-sm text-danger-500 border-danger-200 hover:bg-danger-50 justify-center gap-1"
                      title="Remove this date"
                    >
                      <Ic d={D.trash} className="w-3.5 h-3.5" />
                      <span className="sm:hidden">Remove</span>
                    </button>
                  </div>
                ))}
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

// ─── View Modal ───────────────────────────────
const ViewModal = ({ item, customerLabel, onClose }) => {
  const createdAt = item.created_date || item.created_at || item.createdAt || '';
  const updatedAt = item.updated_date || item.updated_at || item.updatedAt || '';
  const dates = item.dates || [];
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">Order Details</h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {[
            { label: 'Order ID',     value: item.order_id, icon: D.box },
            { label: 'Customer',     value: customerLabel || `#${item.customer_id}`, icon: D.box },
            { label: 'Product Name', value: item.product_name, icon: D.box },
            { label: 'Quantity',     value: String(item.quantity || ''), icon: D.box },
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
            <p className="text-xs font-semibold text-primary-500 uppercase tracking-wide mb-2">Order Dates</p>
            {dates.length === 0 ? (
              <p className="text-xs text-primary-300">No dates recorded for this order.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dates.map(d => (
                  <div key={d.normalisedTitle} className="bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                    <p className="text-[10px] font-medium text-primary-400 uppercase tracking-wide mb-1">{d.title}</p>
                    <p className="text-xs font-medium text-primary-700">{fmtDynamicDate(d.value)}</p>
                  </div>
                ))}
              </div>
            )}
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
  const [items,     setItems]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products,   setProducts] = useState([]);
  const [dateTitles, setDateTitles] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null); // null | 'add' | itemObject
  const [viewItem,  setViewItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  // ── Filters (moved here from the old /order-history page) ───
  const [fromDate,          setFromDate]          = useState('');
  const [toDate,            setToDate]            = useState('');
  const [filterCustomerId,  setFilterCustomerId]  = useState('');
  const [filterProductName, setFilterProductName] = useState('');

  // ── Fetch list ──────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await Api.get('/ordertrack/order-trackinglist');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const sorted = [...list].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
      setItems(sorted);
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Failed to load. The server may be restarting.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await Api.get('/customer/customerlist');
      setCustomers(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load customers.');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await Api.get('/product/productlist');
      setProducts(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load products.');
    }
  }, []);

  const fetchDateTitles = useCallback(async () => {
    try {
      const res = await Api.get('/ordertrack/order-datetitles');
      setDateTitles(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch {
      // Silent — the Date Title field still works, just without suggestions.
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCustomers();
    fetchProducts();
    fetchDateTitles();
  }, [fetchItems, fetchCustomers, fetchProducts, fetchDateTitles]);

  const getCustomerLabel = useCallback((customerId, fallbackName) => {
    const c = customers.find(c => String(c.id) === String(customerId));
    const name = c?.customer_name || fallbackName;
    return name ? `${name} (${customerId})` : `#${customerId}`;
  }, [customers]);

  // ── Create ──────────────────────────────────
  const handleCreate = async (form) => {
    try {
      const res = await Api.post('/ordertrack/order-trackingcreate', form);
      if (res.data?.status === 0) { toast.error(res.data?.message || 'Failed to add order.'); return; }
      toast.success('Order tracking added successfully.');
      setModal(null);
      fetchItems();
      fetchDateTitles();
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
      fetchDateTitles();
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

  // Product Name filter options — derived from whatever's already loaded
  // (product_name is free text on this table, not a Product Master id), so
  // no extra API call is needed just to populate this dropdown.
  const productNameOptions = useMemo(() => {
    const names = items.map(i => i.product_name || '').filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasExtraFilters = !!(fromDate || toDate || filterCustomerId || filterProductName);
  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterCustomerId('');
    setFilterProductName('');
  };

  // Dynamic date columns — the union of every date title actually used by
  // at least one currently-loaded order. A title with zero remaining usages
  // simply won't appear here, even though the title definition itself is
  // kept around (for reuse) in order_date_titles.
  const dynamicColumns = useMemo(() => {
    const map = new Map();
    items.forEach(it => (it.dates || []).forEach(d => {
      if (!map.has(d.normalisedTitle)) map.set(d.normalisedTitle, d.title);
    }));
    return Array.from(map, ([key, title]) => ({ key, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [items]);

  // ── Search + filters (moved here from the old /order-history page) ──
  const filtered = useMemo(() => {
    let result = items;

    const t = search.trim().toLowerCase();
    if (t) {
      result = result.filter(i =>
        (i.order_id     || '').toLowerCase().includes(t) ||
        String(i.customer_id || '').toLowerCase().includes(t) ||
        (i.customer_name || '').toLowerCase().includes(t) ||
        (i.product_name  || '').toLowerCase().includes(t)
      );
    }

    // Dates may come back as a full ISO timestamp or a plain yyyy-mm-dd —
    // comparing only the first 10 chars keeps this correct either way.
    // "From/To Date" filters against each order's earliest recorded date.
    if (fromDate || toDate) {
      result = result.filter(i => {
        const values = (i.dates || []).map(d => String(d.value).slice(0, 10));
        if (values.length === 0) return false;
        return values.some(v => (!fromDate || v >= fromDate) && (!toDate || v <= toDate));
      });
    }
    if (filterCustomerId) {
      const ct = filterCustomerId.trim().toLowerCase();
      result = result.filter(i =>
        String(i.customer_id || '').toLowerCase().includes(ct) ||
        (i.customer_name || '').toLowerCase().includes(ct)
      );
    }
    if (filterProductName) {
      result = result.filter(i => (i.product_name || '') === filterProductName);
    }

    return result;
  }, [items, search, fromDate, toDate, filterCustomerId, filterProductName]);

  const totalCount = items.length;

  return (
    <div className="page-container">
      <div className="page-header flex-wrap items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Order Tracking</h1>
          <p className="text-primary-400 text-sm mt-0.5">Track orders and their milestone dates.</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Orders"        value={totalCount}            iconPath={D.box}      color="primary" />
        <StatCard label="Date Titles Tracked" value={dynamicColumns.length} iconPath={D.calendar} color="accent"  sub="Unique titles in use" />
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID, customer, product…" />
        </div>
        {search && <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">Clear</button>}
      </div>

      {/* Filters — moved here from the old /order-history page */}
      <div className="card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="form-group !mb-0">
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="dd-mm-yyyy" />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="dd-mm-yyyy" />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">Customer ID</label>
            <input className="form-input" value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)} placeholder="e.g. CUST-ABC" />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">Product Name</label>
            <select className="form-select" value={filterProductName} onChange={e => setFilterProductName(e.target.value)}>
              <option value="">— All Products —</option>
              {productNameOptions.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        {hasExtraFilters && (
          <div className="mt-3">
            <button onClick={handleClearFilters} className="btn-ghost btn-sm text-primary-400">Clear filters</button>
          </div>
        )}
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
                {dynamicColumns.map(col => <th key={col.key} className="whitespace-nowrap">{col.title}</th>)}
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6 + dynamicColumns.length} className="text-center py-16">
                  <div className="flex items-center justify-center gap-2 text-primary-400">
                    <div className="spinner !w-5 !h-5" /><span>Loading orders…</span>
                  </div>
                </td></tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={6 + dynamicColumns.length}>
                    <RetryBlock message={fetchError} onRetry={fetchItems} colSpan={6 + dynamicColumns.length} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6 + dynamicColumns.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.box} className="w-7 h-7" /></div>
                    <p className="text-sm">{items.length === 0 ? 'No orders yet. Click "Add Order" to start.' : 'No orders match your search.'}</p>
                  </div>
                </td></tr>
              ) : filtered.map((item, idx) => {
                const dateMap = Object.fromEntries((item.dates || []).map(d => [d.normalisedTitle, d.value]));
                const customerLabel = getCustomerLabel(item.customer_id, item.customer_name);
                return (
                  <tr key={item.id}>
                    <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                    <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium">{item.order_id}</span></td>
                    <td className="text-primary-700 text-sm">{customerLabel}</td>
                    <td className="font-medium text-primary-700">{item.product_name}</td>
                    <td><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-semibold">{item.quantity}</span></td>
                    {dynamicColumns.map(col => (
                      <td key={col.key} className="text-primary-400 text-xs whitespace-nowrap">{fmtDynamicDate(dateMap[col.key])}</td>
                    ))}
                    <td>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={() => setViewItem(item)} className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50" title="View"><Ic d={D.eye} /></button>
                        <button onClick={() => setModal(item)} className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50" title="Edit"><Ic d={D.edit} /></button>
                        <button onClick={() => setConfirm({ title: 'Delete Order', message: `Delete order "${item.order_id}"?`, onConfirm: () => handleDelete(item) })}
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
        <OrderModal
          item={modal === 'add' ? null : modal}
          customers={customers}
          products={products}
          dateTitles={dateTitles}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewItem && (
        <ViewModal
          item={viewItem}
          customerLabel={getCustomerLabel(viewItem.customer_id, viewItem.customer_name)}
          onClose={() => setViewItem(null)}
        />
      )}
      {confirm  && (
        <ConfirmationModal open={!!confirm} onClose={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          title={confirm.title} message={confirm.message} />
      )}
    </div>
  );
};

export default OrderTracking;
