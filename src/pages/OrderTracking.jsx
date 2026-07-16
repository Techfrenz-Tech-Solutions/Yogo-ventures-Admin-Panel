/**
 * pages/OrderTracking.jsx — Order Tracking
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /ordertrack/order-trackingcreate    → create (body: { order_id, customer_id, order_value,
 *                                              items: [{product_id, quantity}], dates: [{title, value}] })
 * GET  /ordertrack/order-trackinglist      → list (each row includes items: [{product_id, product_name,
 *                                              product_code, quantity}] and dates: [{title, normalisedTitle, value}])
 * POST /ordertrack/order-trackingupdate    → update (items/dates arrays are diffed server-side — see below)
 * POST /ordertrack/order-trackingdelete    → delete (cascades to that order's order_items)
 * PATCH /ordertrack/order-tracking/:id/remarks → save remarks only { remarks }
 * GET  /ordertrack/order-trackingnextcode  → next suggested Order ID
 * GET  /ordertrack/order-datetitles        → all reusable date titles, for the autocomplete
 * GET  /customer/customerlist              → customer dropdown
 * GET  /product/productlist                → product dropdown (id, product_name, product_code, ...)
 *
 * One order can hold multiple products — each { product_id, quantity } pair
 * is a row in order_items, not a comma-separated field. `product_name`/
 * `quantity` on the order itself are legacy single-product columns kept
 * only as a fallback for a pre-migration order with no order_items rows
 * yet; see getOrderItems() below, which every display path reads through.
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
import { ConfirmationModal, RetryBlock, Pagination, RemarksInput } from '../components/ui';
import toast from 'react-hot-toast';
import Api from '../utils/Api';
import { useExcelExport } from '../hooks/useExcelExport';
import { usePagedRows } from '../hooks/usePagedRows';
import './OrderTracking.css';

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
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
};

const fmtDate      = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—';
const fmtDynamicDate = (d) => d ? format(new Date(d), 'dd-MM-yyyy') : '—';
const toInputDate   = (d) => d ? String(d).slice(0, 10) : '';
const normaliseTitle = (raw) => String(raw || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/ /g, '-');
// Existing orders without an Order Value show "—" rather than ₹0.00.
const fmtINR = (v) => (v == null || v === '')
  ? '—'
  : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Order-level status — Pending (red) / Processing (yellow) / Delivered
// (green). `row` is the soft full-row background; `badge`/`active` are for
// the Status column chip and the pressed state of the per-row buttons.
const STATUS_META = {
  pending:    { label: 'Pending',    row: 'bg-danger-50',  badge: 'bg-danger-50 text-danger-600',   active: 'bg-danger-500 text-white border-danger-500' },
  processing: { label: 'Processing', row: 'bg-warning-50', badge: 'bg-warning-50 text-warning-600', active: 'bg-warning-500 text-white border-warning-500' },
  delivered:  { label: 'Delivered',  row: 'bg-success-50', badge: 'bg-success-50 text-success-600', active: 'bg-success-500 text-white border-success-500' },
};
const STATUS_BUTTON_ORDER = ['delivered', 'processing', 'pending'];

// Sticky fixed-column configuration — single source of truth for widths
// and cumulative left offsets, applied identically to the header <th> and
// every body <td> so they can never drift out of alignment. Order matches
// left-to-right column order in the table. Consumed as CSS custom
// properties by OrderTracking.css (--sticky-left-<key> / --sticky-w-<key>).
const STICKY_COLUMNS = [
  { key: 'sno',         width: 44  },
  { key: 'orderId',     width: 110 },
  { key: 'customerId',  width: 100 },
  { key: 'productName', width: 200 },
  { key: 'quantity',    width: 80  },
  { key: 'orderValue',  width: 120 },
  { key: 'status',      width: 110 },
];

const STICKY_LEFT = {};
STICKY_COLUMNS.reduce((offset, col) => {
  STICKY_LEFT[col.key] = offset;
  return offset + col.width;
}, 0);

// On narrow screens (see the @media block in OrderTracking.css) only S No,
// Order ID and Status stay sticky — Status's mobile left offset is just
// S No + Order ID's width, not the full desktop cumulative sum.
const STICKY_LEFT_STATUS_MOBILE = STICKY_COLUMNS[0].width + STICKY_COLUMNS[1].width;

// One CSS-custom-property bag, set once on the <table>, that both the base
// rules and the mobile override in OrderTracking.css read from.
const STICKY_TABLE_VARS = {
  ...Object.fromEntries(STICKY_COLUMNS.map(col => [`--sticky-left-${col.key}`, `${STICKY_LEFT[col.key]}px`])),
  ...Object.fromEntries(STICKY_COLUMNS.map(col => [`--sticky-w-${col.key}`, `${col.width}px`])),
  '--sticky-left-status-mobile': `${STICKY_LEFT_STATUS_MOBILE}px`,
};

// e.g. stickyClass('orderId') → "sticky-col sticky-col-orderid"
const stickyClass = (key) => `sticky-col sticky-col-${key.toLowerCase()}`;

// Every order has at least one product row to display — `items` (the
// order_items-backed list) when present, falling back to the legacy single
// product_name/quantity pair for a pre-migration order that has no
// order_items rows yet (its old product_name didn't match any current
// product_master row).
const getOrderItems = (item) => (
  item.items?.length ? item.items : (
    item.product_name ? [{ product_id: null, product_name: item.product_name, product_code: null, quantity: item.quantity }] : []
  )
);

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

let itemRowKeySeq = 0;
const makeItemRow = (productId = '', quantity = 1) => ({ key: ++itemRowKeySeq, productId, quantity });

// ─── Add / Edit Modal ─────────────────────────
const OrderModal = ({ item, customers, products, dateTitles, onSave, onClose }) => {
  const isEdit = !!item;

  const [form, setForm] = useState({
    order_id:    item?.order_id    || '',
    customer_id: item?.customer_id ? String(item.customer_id) : '',
    order_value: item?.order_value != null ? String(item.order_value) : '',
  });
  const [itemRows, setItemRows] = useState(() =>
    item?.items?.length
      ? item.items.map(it => makeItemRow(String(it.product_id), it.quantity))
      : [makeItemRow()]
  );
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

  // "Product Name (Product ID)", or with the product code appended when
  // available — e.g. "Memory Foam Pillow (Product ID: 24, Code: PROD-024)".
  // Searchable by name, ID and code via searchText.
  const productOptions = useMemo(() => products.map(p => ({
    value: String(p.id),
    label: p.product_code
      ? `${p.product_name} (Product ID: ${p.id}, Code: ${p.product_code})`
      : `${p.product_name} (${p.id})`,
    searchText: `${p.product_name} ${p.id} ${p.product_code || ''}`,
  })), [products]);

  const dateTitleOptions = useMemo(() => dateTitles.map(t => ({
    value: t.display_name,
    label: t.display_name,
    searchText: t.display_name,
  })), [dateTitles]);

  // Product rows already chosen elsewhere in the form are excluded from
  // every other row's own dropdown — the same product simply can't be
  // picked twice, so there's no separate duplicate-product error to show.
  const productOptionsForRow = (rowIndex) => {
    const chosenElsewhere = new Set(
      itemRows.filter((_, i) => i !== rowIndex).map(r => r.productId).filter(Boolean)
    );
    return productOptions.filter(o => !chosenElsewhere.has(o.value));
  };

  const updateItemRow = (i, key, v) => setItemRows(p => {
    const next = [...p];
    next[i] = { ...next[i], [key]: v };
    return next;
  });

  const addItemRow = () => setItemRows(p => [...p, makeItemRow()]);

  // At least one product row must always remain — the last row is cleared
  // in place instead of removed, rather than leaving the form with none.
  const removeItemRow = (i) => setItemRows(p => (
    p.length === 1 ? [makeItemRow()] : p.filter((_, idx) => idx !== i)
  ));

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

    const seenProducts = new Set();
    const items = [];
    for (const row of itemRows) {
      const hasProduct  = !!row.productId;
      const hasQuantity = row.quantity !== '' && row.quantity != null;
      if (!hasProduct && !hasQuantity) continue; // untouched empty row — not submitted
      if (!hasProduct) { toast.error('Each product row needs a product selected.'); return; }
      const qty = Number(row.quantity);
      if (!Number.isInteger(qty) || qty <= 0) { toast.error('Each product\'s quantity must be a positive whole number.'); return; }
      if (seenProducts.has(row.productId)) { toast.error('The same product was added more than once — each product can only appear once per order.'); return; }
      seenProducts.add(row.productId);
      items.push({ product_id: Number(row.productId), quantity: qty });
    }
    if (items.length === 0) { toast.error('Please select at least one product.'); return; }

    let orderValue = null;
    if (form.order_value !== '' && form.order_value != null) {
      const v = Number(form.order_value);
      if (!Number.isFinite(v) || v < 0) { toast.error('Order Value must be a non-negative number.'); return; }
      orderValue = v;
    }

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
      order_id:    form.order_id.trim(),
      customer_id: Number(form.customer_id),
      order_value: orderValue,
      items,
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
                <label className="form-label">Order Value (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 text-sm">₹</span>
                  <input
                    type="number" min="0" step="0.01" className="form-input pl-7"
                    value={form.order_value}
                    onChange={e => set('order_value', e.target.value)}
                    placeholder="e.g. 15500.00"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic product rows — one or more products per order */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="form-label !mb-0">Products <span className="text-danger-500">*</span></p>
                <button type="button" onClick={addItemRow} className="btn-outline btn-sm !py-1 !px-2.5 text-xs gap-1">
                  <Ic d={D.add} className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>
              <div className="space-y-2">
                {itemRows.map((row, i) => (
                  <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 sm:items-end">
                    <div className="form-group !mb-0">
                      <label className="form-label text-xs">Product</label>
                      <SearchableSelect
                        value={row.productId}
                        onChange={v => updateItemRow(i, 'productId', v)}
                        options={productOptionsForRow(i)}
                        placeholder="Search product by name, ID or code…"
                        emptyMessage={products.length === 0 ? 'No products found. Add one in Product Master first.' : 'No matches.'}
                      />
                    </div>
                    <div className="form-group !mb-0">
                      <label className="form-label text-xs">Quantity</label>
                      <input type="number" min="1" step="1" className="form-input" value={row.quantity}
                        onChange={e => updateItemRow(i, 'quantity', e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItemRow(i)}
                      className="btn-outline btn-sm text-danger-500 border-danger-200 hover:bg-danger-50 justify-center gap-1"
                      title="Remove this product"
                    >
                      <Ic d={D.trash} className="w-3.5 h-3.5" />
                      <span className="sm:hidden">Remove</span>
                    </button>
                  </div>
                ))}
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
  const items = getOrderItems(item);
  const statusMeta = STATUS_META[item.status || 'pending'] || STATUS_META.pending;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">Order Details</h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600"><Ic d={D.close} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {[
            { label: 'Order ID',    value: item.order_id, icon: D.box },
            { label: 'Customer',    value: customerLabel || `#${item.customer_id}`, icon: D.box },
            { label: 'Order Value', value: fmtINR(item.order_value), icon: D.box },
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
          <div className="flex items-start gap-3 py-2 border-b border-surface-100">
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Ic d={D.box} className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-primary-400 uppercase tracking-wide">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold mt-0.5 ${statusMeta.badge}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-surface-100 mt-2">
            <p className="text-xs font-semibold text-primary-500 uppercase tracking-wide mb-2">Products</p>
            {items.length === 0 ? (
              <p className="text-xs text-primary-300">No products recorded for this order.</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((it, i) => (
                  <div key={it.product_id ?? i} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2 border border-surface-100">
                    <span className="text-sm text-primary-700">
                      {it.product_name}{it.product_id != null ? ` (${it.product_id})` : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-semibold">
                      Qty: {it.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
  const [statusUpdating, setStatusUpdating] = useState({}); // { [orderId]: true } while a PATCH is in flight
  const [statusConfirm, setStatusConfirm] = useState(null); // { item, newStatus } while the confirmation popup is open

  // ── Filters (moved here from the old /order-history page) ───
  const [fromDate,          setFromDate]          = useState('');
  const [toDate,            setToDate]            = useState('');
  const [filterOrderId,     setFilterOrderId]     = useState('');
  const [filterCustomerId,  setFilterCustomerId]  = useState('');
  const [filterProductName, setFilterProductName] = useState('');
  const [filterStatus,      setFilterStatus]      = useState('');

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

  // ── Status change (row buttons) ───────────────
  // Updates only the clicked order's status: optimistic local update so the
  // button/row reflect the new status immediately, rolled back to the prior
  // value if the PATCH fails. No full list refetch — just this one row's
  // local state, per "do not reload the entire page after a status update".
  // Returns true on success / false on failure so the confirmation popup
  // (see statusConfirm below) knows whether it's safe to close.
  const handleStatusChange = async (item, newStatus) => {
    if (item.status === newStatus || statusUpdating[item.id]) return false;
    const previousStatus = item.status;

    setStatusUpdating(p => ({ ...p, [item.id]: true }));
    setItems(prev => prev.map(o => (o.id === item.id ? { ...o, status: newStatus } : o)));

    try {
      const res = await Api.patch(`/ordertrack/order-tracking/${item.id}/status`, { status: newStatus });
      if (res.data?.status !== 1) {
        throw new Error(res.data?.message || 'Failed to update order status.');
      }
      return true;
    } catch (err) {
      setItems(prev => prev.map(o => (o.id === item.id ? { ...o, status: previousStatus } : o)));
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update order status.');
      return false;
    } finally {
      setStatusUpdating(p => {
        const next = { ...p };
        delete next[item.id];
        return next;
      });
    }
  };

  // ── Remarks (inline, per-row save via RemarksInput) ──────────
  // Independent of status/courier/dates — saving a remark never touches
  // any other order field, and never uses the wrong record id (keyed by
  // this order_tracking row's own `id`, same as handleStatusChange above).
  const handleSaveRemarks = async (item, remarks) => {
    const res = await Api.patch(`/ordertrack/order-tracking/${item.id}/remarks`, { remarks });
    if (res.data?.status !== 1) {
      throw new Error(res.data?.message || 'Failed to save remarks.');
    }
    setItems(prev => prev.map(o => (o.id === item.id ? { ...o, remarks: res.data.remarks } : o)));
  };

  // Product Name filter options — every distinct product name appearing in
  // any order's item list (or its legacy product_name fallback), derived
  // from whatever's already loaded so no extra API call is needed just to
  // populate this dropdown.
  const productNameOptions = useMemo(() => {
    const names = items.flatMap(i => getOrderItems(i).map(it => it.product_name || '')).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const { exporting, runExport } = useExcelExport('/ordertrack/order-trackingexport', 'order-tracking');
  const handleExport = () => runExport({
    search:       search.trim() || undefined,
    from_date:    fromDate || undefined,
    to_date:      toDate || undefined,
    order_id:     filterOrderId.trim() || undefined,
    customer_id:  filterCustomerId.trim() || undefined,
    product_name: filterProductName || undefined,
    status:       filterStatus || undefined,
  });

  const hasExtraFilters = !!(fromDate || toDate || filterOrderId || filterCustomerId || filterProductName || filterStatus);
  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterOrderId('');
    setFilterCustomerId('');
    setFilterProductName('');
    setFilterStatus('');
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
        getOrderItems(i).some(it => (it.product_name || '').toLowerCase().includes(t))
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
    if (filterOrderId) {
      const ot = filterOrderId.trim().toLowerCase();
      result = result.filter(i => (i.order_id || '').toLowerCase().includes(ot));
    }
    if (filterCustomerId) {
      const ct = filterCustomerId.trim().toLowerCase();
      result = result.filter(i =>
        String(i.customer_id || '').toLowerCase().includes(ct) ||
        (i.customer_name || '').toLowerCase().includes(ct)
      );
    }
    if (filterProductName) {
      result = result.filter(i => getOrderItems(i).some(it => it.product_name === filterProductName));
    }
    if (filterStatus) {
      result = result.filter(i => (i.status || 'pending') === filterStatus);
    }

    return result;
  }, [items, search, fromDate, toDate, filterOrderId, filterCustomerId, filterProductName, filterStatus]);

  const {
    paged, page, setPage, rowsPerPage, setRowsPerPage, totalPages, total, rangeStart,
  } = usePagedRows('/order-tracking', filtered);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="form-group !mb-0">
            <label className="form-label">Order ID</label>
            <input className="form-input" value={filterOrderId} onChange={e => setFilterOrderId(e.target.value)} placeholder="e.g. ORD-001" />
          </div>
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
          <div className="form-group !mb-0">
            <label className="form-label">Status</label>
            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">— All Statuses —</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
        {hasExtraFilters && (
          <div className="mt-3">
            <button onClick={handleClearFilters} className="btn-ghost btn-sm text-primary-400">Clear filters</button>
          </div>
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

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table ot-table" style={STICKY_TABLE_VARS}>
            <thead>
              <tr>
                <th className={`${stickyClass('sno')} sticky-col--head bg-primary-50`}>S.No</th>
                <th className={`${stickyClass('orderId')} sticky-col--head bg-primary-50`}>Order ID</th>
                <th className={`${stickyClass('customerId')} sticky-col--head bg-primary-50`}>Customer ID</th>
                <th className={`${stickyClass('productName')} sticky-col--head bg-primary-50`}>Product Name</th>
                <th className={`${stickyClass('quantity')} sticky-col--head bg-primary-50`}>Quantity</th>
                <th className={`${stickyClass('orderValue')} sticky-col--head bg-primary-50`}>Order Value</th>
                <th className={`${stickyClass('status')} sticky-col--head bg-primary-50`}>Status</th>
                {dynamicColumns.map(col => <th key={col.key} className="whitespace-nowrap">{col.title}</th>)}
                <th style={{ minWidth: 220 }}>Remarks</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9 + dynamicColumns.length} className="text-center py-16">
                  <div className="flex items-center justify-center gap-2 text-primary-400">
                    <div className="spinner !w-5 !h-5" /><span>Loading orders…</span>
                  </div>
                </td></tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={9 + dynamicColumns.length}>
                    <RetryBlock message={fetchError} onRetry={fetchItems} colSpan={9 + dynamicColumns.length} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9 + dynamicColumns.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-primary-300">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center"><Ic d={D.box} className="w-7 h-7" /></div>
                    <p className="text-sm">{items.length === 0 ? 'No orders yet. Click "Add Order" to start.' : 'No orders match your search.'}</p>
                  </div>
                </td></tr>
              ) : paged.map((item, idx) => {
                const dateMap = Object.fromEntries((item.dates || []).map(d => [d.normalisedTitle, d.value]));
                const customerLabel = getCustomerLabel(item.customer_id, item.customer_name);
                const orderItems = getOrderItems(item);
                const orderStatus = item.status || 'pending';
                const statusMeta = STATUS_META[orderStatus] || STATUS_META.pending;
                const isUpdatingStatus = !!statusUpdating[item.id];
                return (
                  <tr key={item.id} className={statusMeta.row}>
                    <td className={`${stickyClass('sno')} ${statusMeta.row} text-primary-400 text-xs font-mono`}>{rangeStart + idx}</td>
                    <td className={`${stickyClass('orderId')} ${statusMeta.row}`}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium whitespace-nowrap">{item.order_id}</span>
                    </td>
                    <td className={`${stickyClass('customerId')} ${statusMeta.row} text-primary-700 text-sm`}>{customerLabel}</td>
                    <td className={`${stickyClass('productName')} ${statusMeta.row} font-medium text-primary-700`}>
                      <div className="space-y-1">
                        {orderItems.map((it, i) => (
                          <div key={it.product_id ?? i}>
                            {it.product_name}{it.product_id != null ? ` (${it.product_id})` : ''}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className={`${stickyClass('quantity')} ${statusMeta.row}`}>
                      <div className="space-y-1">
                        {orderItems.map((it, i) => (
                          <div key={it.product_id ?? i}>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-semibold whitespace-nowrap">{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className={`${stickyClass('orderValue')} ${statusMeta.row} text-primary-700 text-sm font-medium whitespace-nowrap`}>{fmtINR(item.order_value)}</td>
                    <td className={`${stickyClass('status')} ${statusMeta.row}`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    {dynamicColumns.map(col => (
                      <td key={col.key} className="text-primary-400 text-xs whitespace-nowrap">{fmtDynamicDate(dateMap[col.key])}</td>
                    ))}
                    <td>
                      <RemarksInput value={item.remarks} onSave={(remarks) => handleSaveRemarks(item, remarks)} />
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* Compact status buttons — update only this row, disabled/spinner while in flight */}
                        <div className="flex items-center gap-1" role="group" aria-label={`Status for order ${item.order_id}`}>
                          {STATUS_BUTTON_ORDER.map(s => {
                            const meta = STATUS_META[s];
                            const isActive = orderStatus === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  if (isActive || isUpdatingStatus) return; // already this status / update in flight
                                  setStatusConfirm({ item, newStatus: s });
                                }}
                                disabled={isUpdatingStatus || isActive}
                                title={`Mark as ${meta.label}`}
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-colors disabled:cursor-not-allowed ${
                                  isActive
                                    ? meta.active
                                    : 'bg-white text-primary-400 border-surface-200 hover:bg-surface-50 disabled:opacity-50'
                                }`}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                          {isUpdatingStatus && <div className="spinner !w-3.5 !h-3.5" />}
                        </div>
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
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-surface-100">
            <Pagination
              page={page} totalPages={totalPages} onPageChange={setPage}
              total={total} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage}
              itemLabel="orders"
            />
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
      {statusConfirm && (
        <ConfirmationModal
          open={!!statusConfirm}
          onClose={() => setStatusConfirm(null)}
          // No manual setStatusConfirm(null) here, unlike the generic
          // `confirm` modal above — ConfirmationModal only closes this one
          // itself once handleStatusChange resolves true, so a failed
          // update (it returns false) leaves the popup open for retry.
          onConfirm={() => handleStatusChange(statusConfirm.item, statusConfirm.newStatus)}
          title="Change Order Status"
          message={`Are you sure you want to change order ${statusConfirm.item.order_id} from ${
            (STATUS_META[statusConfirm.item.status || 'pending'] || STATUS_META.pending).label
          } to ${STATUS_META[statusConfirm.newStatus].label}?`}
          confirmText="Confirm"
          confirmingText="Updating…"
          type="primary"
        />
      )}
    </div>
  );
};

export default OrderTracking;
