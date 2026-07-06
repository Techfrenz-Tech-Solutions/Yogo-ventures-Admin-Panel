/**
 * pages/BestSellingMaster.jsx — Best Selling Products Master
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /bestselling/best-sellingcreate  → create (multipart: image)
 * GET  /bestselling/best-sellinglist    → list
 * POST /bestselling/best-sellingupdate  → update (multipart)
 * POST /bestselling/best-sellingdelete  → delete
 * GET  /product/productlist              → product dropdown source
 *
 * Images are uploaded to the backend's /storage filesystem; only the
 * filename is stored in the DB, so the UI builds the full URL via storageUrl().
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';
import { format } from 'date-fns';
import Api from '../utils/Api';
import { storageUrl } from '../utils/imageUrl';

// ─── Icon helper ──────────────────────────────
const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const D = {
  add:     'M12 4v16m8-8H4',
  edit:    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:   'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  eye:     'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  close:   'M6 18L18 6M6 6l12 12',
  upload:  'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  star:    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  img:     'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  x:       'M6 18L18 6M6 6l12 12',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color }) => {
  const map = {
    primary: { bg: 'bg-primary-50',  ic: 'text-primary-500', val: 'text-primary-700' },
    success: { bg: 'bg-success-50',  ic: 'text-success-500', val: 'text-success-600' },
    accent:  { bg: 'bg-accent-100',  ic: 'text-accent-500',  val: 'text-accent-600'  },
    earth:   { bg: 'bg-earth-50',    ic: 'text-earth-500',   val: 'text-earth-600'   },
    warning: { bg: 'bg-warning-50',  ic: 'text-warning-500', val: 'text-warning-600' },
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
// `value` is either { file, preview } for a newly picked image, or a plain
// filename string (from the backend) for an existing one.
const ImageSlot = ({ value, onChange, onClear }) => {
  const ref = useRef(null);
  const preview = value && typeof value === 'object' ? value.preview : storageUrl(value);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB.');    return; }
    onChange({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Preview box */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${preview
            ? 'border-primary-200 bg-primary-50/30'
            : 'border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/20 cursor-pointer'}`}
        style={{ width: '100%', aspectRatio: '16/9', minHeight: 120 }}
        onClick={() => !preview && ref.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt="product" className="w-full h-full object-cover" />
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
      {/* Upload button */}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="btn-outline btn-sm w-full gap-1.5 justify-center"
      >
        <Ic d={D.upload} className="w-3.5 h-3.5" />
        {preview ? 'Change Image' : 'Upload Image'}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ─── Add / Edit Modal ─────────────────────────
const ProductModal = ({ item, products, onSave, onClose }) => {
  const isEdit = !!item;
  const [productName, setProductName] = useState(item?.product_name || '');
  const [image,       setImage]       = useState(item?.image        || '');
  const [saving,      setSaving]      = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName) { toast.error('Please select a product.'); return; }
    setSaving(true);
    await onSave({ productName, image });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Best Selling Product' : 'Add Best Selling Product'}
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
                value={productName}
                onChange={e => setProductName(e.target.value)}
                required
              >
                <option value="">— Select Product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.product_name}>{p.product_name}</option>
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
const ViewModal = ({ item, onClose }) => {
  const preview = item.image && typeof item.image === 'object' ? item.image.preview : storageUrl(item.image);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full !max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            Best Selling Product
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
            <Ic d={D.close} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Image */}
          {preview ? (
            <img
              src={preview}
              alt={item.product_name}
              className="w-full rounded-2xl border border-surface-200 object-cover shadow-sm"
              style={{ maxHeight: 220 }}
            />
          ) : (
            <div className="w-full rounded-2xl border-2 border-dashed border-surface-200
              bg-surface-50 flex items-center justify-center py-10">
              <Ic d={D.img} className="w-10 h-10 text-surface-300" />
            </div>
          )}
          {/* Details */}
          {[
            { label: 'Product Name',  value: item.product_name },
            { label: 'Created Date',  value: item.created_date ? format(new Date(item.created_date), 'dd MMM yyyy, hh:mm a') : '—' },
            { label: 'Updated Date',  value: item.updated_date ? format(new Date(item.updated_date), 'dd MMM yyyy, hh:mm a') : '—' },
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
};

// ─── Main Page ────────────────────────────────
const BestSellingMaster = () => {
  const [items,    setItems]    = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null); // null | 'add' | item-obj
  const [viewItem, setViewItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await Api.get('/product/productlist');
      setProducts(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load products.');
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.get('/bestselling/best-sellinglist');
      setItems(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load best selling products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); fetchItems(); }, [fetchProducts, fetchItems]);

  const handleCreate = async ({ productName, image }) => {
    try {
      const fd = new FormData();
      fd.append('product_name', productName);
      if (image && typeof image === 'object') fd.append('image', image.file);
      const res = await Api.post('/bestselling/best-sellingcreate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.status === 0) { toast.error(res.data.message || 'Failed to add best selling product.'); return; }
      toast.success('Best selling product added.');
      setModal(null);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add best selling product.');
    }
  };

  const handleUpdate = async ({ productName, image }) => {
    try {
      const fd = new FormData();
      fd.append('id', modal?.id);
      fd.append('product_name', productName);
      if (image && typeof image === 'object') fd.append('image', image.file);
      const res = await Api.post('/bestselling/best-sellingupdate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.status === 0) { toast.error(res.data.message || 'Failed to update best selling product.'); return; }
      toast.success('Best selling product updated.');
      setModal(null);
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update best selling product.');
    }
  };

  const handleSave = (form) => (modal === 'add' ? handleCreate(form) : handleUpdate(form));

  const handleDelete = async (id) => {
    try {
      const res = await Api.post('/bestselling/best-sellingdelete', { id });
      if (res.data?.status === 0) { toast.error(res.data.message || 'Failed to delete entry.'); return; }
      toast.success('Entry deleted.');
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete entry.');
    }
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i => i.product_name?.toLowerCase().includes(t));
  }, [items, search]);

  const recentCount = useMemo(() => items.filter(i => {
    const d = new Date(i.created_date);
    return !isNaN(d) && (Date.now() - d) / 86400000 <= 7;
  }).length, [items]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Best Selling Products</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage your featured best-selling product list.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchItems} disabled={loading} className="btn-outline" title="Refresh list">
            <Ic d={D.refresh} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">
            <Ic d={D.add} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Featured"    value={items.length}   iconPath={D.star}   color="primary" />
        <StatCard label="With Images"
          value={items.filter(i => i.image).length}
          iconPath={D.img}    color="success" />
        <StatCard label="Recently Added"    value={recentCount}    iconPath={D.add}    color="accent"  />
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-primary-400">
                      <div className="spinner !w-5 !h-5" />
                      <span>Loading best selling products…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-primary-300">
                      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                        <Ic d={D.star} className="w-7 h-7" />
                      </div>
                      <p className="text-sm">
                        {items.length === 0
                          ? 'No best selling products yet. Click "Add Product" to start.'
                          : 'No products match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                  <td className="font-medium text-primary-700">{item.product_name}</td>
                  <td>
                    {item.image ? (
                      <img
                        src={storageUrl(item.image)}
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
                    {item.created_date ? format(new Date(item.created_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {item.updated_date ? format(new Date(item.updated_date), 'dd MMM yyyy') : '—'}
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
                          message:   `Remove "${item.product_name}" from best selling list?`,
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
            Showing {filtered.length} of {items.length} products
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
          onClose={() => setViewItem(null)}
        />
      )}
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

export default BestSellingMaster;
