/**
 * pages/NewArrivalsMaster.jsx — New Arrivals Master
 * Manage curated list of new arrival products from Product Master.
 * Features: Add (dropdown select from products), Upload image, View/Edit/Delete
 * Grid: S.No · Product Name · Image · Created Date · Updated Date · Actions
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────
const newId  = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const nowISO = () => new Date().toISOString();

// ─── Storage keys ─────────────────────────────
const KEY_NEWARRIVALS = 'yogo_newarrivals';
const KEY_PRODUCTS    = 'yogo_products';

const readLS  = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const writeLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ─── Icon helper ──────────────────────────────
const Ic = ({ d, className = 'w-4 h-4' }) => (
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
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  clock:  'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  img:    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  x:      'M6 18L18 6M6 6l12 12',
  tag:    'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color }) => {
  const map = {
    primary: { bg: 'bg-primary-50',  ic: 'text-primary-500', val: 'text-primary-700' },
    success: { bg: 'bg-success-50',  ic: 'text-success-500', val: 'text-success-600' },
    accent:  { bg: 'bg-accent-100',  ic: 'text-accent-500',  val: 'text-accent-600'  },
    earth:   { bg: 'bg-earth-50',    ic: 'text-earth-500',   val: 'text-earth-600'   },
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

// ─── Image Upload Slot ────────────────────────
const ImageSlot = ({ value, onChange, onClear }) => {
  const ref = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB.');    return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${value
            ? 'border-primary-200 bg-primary-50/30'
            : 'border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/20 cursor-pointer'}`}
        style={{ width: '100%', aspectRatio: '16/9', minHeight: 120 }}
        onClick={() => !value && ref.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="product" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-danger-500
                text-white flex items-center justify-center shadow hover:bg-danger-600 transition-colors"
              title="Remove image"
            >
              <Ic d={D.x} className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
            <Ic d={D.img} className="w-8 h-8 text-surface-300" />
            <span className="text-xs text-primary-300">Click to upload image</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="btn-outline btn-sm w-full gap-1.5 justify-center"
      >
        <Ic d={D.upload} className="w-3.5 h-3.5" />
        {value ? 'Change Image' : 'Upload Image'}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ─── Add / Edit Modal ─────────────────────────
const ProductModal = ({ item, products, onSave, onClose }) => {
  const isEdit    = !!item;
  const [productId, setProductId] = useState(item?.productId || '');
  const [image,     setImage]     = useState(item?.image     || '');
  const [saving,    setSaving]    = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productId) { toast.error('Please select a product.'); return; }
    setSaving(true);
    setTimeout(() => {
      onSave({ productId, image });
      setSaving(false);
    }, 300);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit New Arrival' : 'Add New Arrival'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
            <Ic d={D.close} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Product dropdown */}
            <div className="form-group !mb-0">
              <label className="form-label">
                Product Name <span className="text-danger-500">*</span>
              </label>
              <select
                className="form-select"
                value={productId}
                onChange={e => setProductId(e.target.value)}
                required
              >
                <option value="">— Select Product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {products.length === 0 && (
                <p className="text-[11px] text-danger-500 mt-1">
                  No products found. Add products in Product Master first.
                </p>
              )}
            </div>

            {/* Image upload */}
            <div className="form-group !mb-0">
              <label className="form-label">Product Image</label>
              <ImageSlot
                value={image}
                onChange={setImage}
                onClear={() => setImage('')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" /> Saving…</>
                : isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── View Modal ───────────────────────────────
const ViewModal = ({ item, productName, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full !max-w-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
        <h3 className="font-heading text-base font-semibold text-primary-600">
          New Arrival Details
        </h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
          <Ic d={D.close} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        {item.image ? (
          <img
            src={item.image}
            alt={productName}
            className="w-full rounded-2xl border border-surface-200 object-cover shadow-sm"
            style={{ maxHeight: 220 }}
          />
        ) : (
          <div className="w-full rounded-2xl border-2 border-dashed border-surface-200
            bg-surface-50 flex items-center justify-center py-10">
            <Ic d={D.img} className="w-10 h-10 text-surface-300" />
          </div>
        )}
        {[
          { label: 'Product Name',  value: productName },
          { label: 'Created Date',  value: format(new Date(item.createdAt),  'dd MMM yyyy, hh:mm a') },
          { label: 'Updated Date',  value: format(new Date(item.updatedAt),  'dd MMM yyyy, hh:mm a') },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide">{label}</span>
            <span className="text-sm font-medium text-primary-700">{value}</span>
          </div>
        ))}
      </div>
      <div className="px-6 pb-5 flex justify-end">
        <button onClick={onClose} className="btn-outline">Close</button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────
const NewArrivalsMaster = () => {
  const [items,    setItems]    = useState([]);
  const [products, setProducts] = useState([]);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  useEffect(() => {
    setProducts(readLS(KEY_PRODUCTS));
    setItems(readLS(KEY_NEWARRIVALS));
  }, []);

  const persist = useCallback((data) => {
    setItems(data);
    writeLS(KEY_NEWARRIVALS, data);
  }, []);

  const getProductName = (id) => products.find(p => p.id === id)?.name || '—';

  const handleSave = (form) => {
    if (modal === 'add') {
      persist([...items, { id: newId(), ...form, createdAt: nowISO(), updatedAt: nowISO() }]);
      toast.success('New arrival product added.');
    } else {
      persist(items.map(i => i.id === modal.id ? { ...i, ...form, updatedAt: nowISO() } : i));
      toast.success('New arrival product updated.');
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    persist(items.filter(i => i.id !== id));
    toast.success('Entry deleted.');
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i => getProductName(i.productId).toLowerCase().includes(t));
  }, [items, search, products]);

  const recentCount = items.filter(i => (Date.now() - new Date(i.createdAt)) / 86400000 <= 7).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">New Arrivals</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage your latest new arrival product list.</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Ic d={D.add} />
          <span>Add New Arrival</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total New Arrivals" value={items.length}                       iconPath={D.clock}  color="primary" />
        <StatCard label="With Images"         value={items.filter(i => i.image).length} iconPath={D.img}    color="success" />
        <StatCard label="Added This Week"     value={recentCount}                       iconPath={D.add}    color="accent"  />
      </div>

      {/* Search */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name…"
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
                <th>Product Name</th>
                <th>Image</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-primary-300">
                      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                        <Ic d={D.clock} className="w-7 h-7" />
                      </div>
                      <p className="text-sm">
                        {items.length === 0
                          ? 'No new arrivals yet. Click "Add New Arrival" to start.'
                          : 'No products match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                  <td className="font-medium text-primary-700">{getProductName(item.productId)}</td>
                  <td>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt="product"
                        className="w-14 h-10 object-cover rounded-lg border border-surface-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded-lg border-2 border-dashed border-surface-200
                        bg-surface-50 flex items-center justify-center">
                        <Ic d={D.img} className="w-4 h-4 text-surface-300" />
                      </div>
                    )}
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {format(new Date(item.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {format(new Date(item.updatedAt), 'dd MMM yyyy')}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewItem(item)}
                        className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50"
                        title="View"
                      >
                        <Ic d={D.eye} />
                      </button>
                      <button
                        onClick={() => setModal(item)}
                        className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50"
                        title="Edit"
                      >
                        <Ic d={D.edit} />
                      </button>
                      <button
                        onClick={() => setConfirm({
                          title:     'Delete Entry',
                          message:   `Remove "${getProductName(item.productId)}" from new arrivals list?`,
                          onConfirm: () => handleDelete(item.id),
                        })}
                        className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                        title="Delete"
                      >
                        <Ic d={D.trash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 text-xs text-primary-400">
            Showing {filtered.length} of {items.length} new arrivals
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'add' || (modal && modal.id)) && (
        <ProductModal
          item={modal === 'add' ? null : modal}
          products={products}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewItem && (
        <ViewModal
          item={viewItem}
          productName={getProductName(viewItem.productId)}
          onClose={() => setViewItem(null)}
        />
      )}
      {confirm && (
        <ConfirmationModal
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={confirm.onConfirm}
          title={confirm.title}
          message={confirm.message}
        />
      )}
    </div>
  );
};

export default NewArrivalsMaster;
