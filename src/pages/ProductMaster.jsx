/**
 * pages/ProductMaster.jsx — Product Master
 * Add / Edit / View / Delete products with:
 *   - Product Code, Name, Category (dropdown), Sub Category (filtered dropdown)
 *   - Product Description (textarea)
 *   - Index Image (1 upload slot)
 *   - Variation Images (5 individual upload slots)
 * Stats cards above grid. Fully responsive.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { addActivity } from '../components/Header';
import { ConfirmationModal } from '../components/ui';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────
const newId   = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const nowISO  = () => new Date().toISOString();

// ─── Storage keys ─────────────────────────────
const KEY_PRODUCTS  = 'yogo_products';
const KEY_CATS      = 'yogo_categories';
const KEY_SUBCATS   = 'yogo_subcategories';

const readLS  = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const writeLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ─── Tiny SVG icon ────────────────────────────
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
  img:    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  box:    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  x:      'M6 18L18 6M6 6l12 12',
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color }) => {
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
      <div>
        <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-heading font-bold mt-0.5 ${c.val}`}>{value}</p>
      </div>
    </div>
  );
};

// ─── Single image upload slot ─────────────────
const ImageSlot = ({ label, value, onChange, onClear }) => {
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
    <div className="flex flex-col gap-1.5">
      {label && <p className="text-xs font-medium text-primary-500">{label}</p>}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${value ? 'border-primary-200 bg-primary-50/30' : 'border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/20 cursor-pointer'}`}
        style={{ aspectRatio: '1 / 1', minHeight: 80 }}
        onClick={() => !value && ref.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-danger-500 text-white flex items-center justify-center shadow hover:bg-danger-600 transition-colors"
              title="Remove"
            >
              <Ic d={D.x} className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none select-none">
            <Ic d={D.upload} className="w-5 h-5 text-primary-300" />
            <span className="text-[10px] text-primary-300 text-center px-1">Upload</span>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {!value && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="btn-outline btn-sm w-full text-xs gap-1.5 justify-center"
        >
          <Ic d={D.upload} className="w-3.5 h-3.5" />
          Upload Image
        </button>
      )}
    </div>
  );
};

// ─── Product Modal (Add / Edit) ───────────────
const EMPTY_FORM = {
  code:          '',
  name:          '',
  categoryId:    '',
  subCategoryId: '',
  description:   '',
  indexImage:    '',
  varImages:     ['', '', '', '', ''],
};

const ProductModal = ({ product, categories, subCategories, onSave, onClose }) => {
  const isEdit = !!product;

  const [form, setForm] = useState(() =>
    product
      ? {
          code:          product.code          || '',
          name:          product.name          || '',
          categoryId:    product.categoryId    || '',
          subCategoryId: product.subCategoryId || '',
          description:   product.description   || '',
          indexImage:    product.indexImage    || '',
          varImages:     product.varImages?.length === 5
            ? [...product.varImages]
            : ['', '', '', '', ''],
        }
      : { ...EMPTY_FORM, varImages: ['', '', '', '', ''] }
  );

  const [saving, setSaving] = useState(false);

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setVI = (i, v) => setForm(p => {
    const next = [...p.varImages];
    next[i] = v;
    return { ...p, varImages: next };
  });

  // filtered sub-categories based on chosen category
  const filteredSubs = useMemo(() =>
    form.categoryId
      ? subCategories.filter(s => s.categoryId === form.categoryId)
      : subCategories,
  [form.categoryId, subCategories]);

  // reset sub-cat when category changes
  const handleCategoryChange = (catId) => {
    set('categoryId', catId);
    set('subCategoryId', '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim())       { toast.error('Product code is required.');    return; }
    if (!form.name.trim())       { toast.error('Product name is required.');    return; }
    if (!form.categoryId)        { toast.error('Please select a category.');    return; }
    if (!form.subCategoryId)     { toast.error('Please select a sub category.'); return; }
    setSaving(true);
    setTimeout(() => {
      onSave({
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
      });
      setSaving(false);
    }, 350);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* wider modal for the image grid */}
      <div className="modal-box w-full !max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
            <Ic d={D.close} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

            {/* Row 1 — Code + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Product Code <span className="text-danger-500">*</span></label>
                <input
                  className="form-input"
                  value={form.code}
                  onChange={e => set('code', e.target.value)}
                  placeholder="e.g. PROD001"
                  required
                />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Product Name <span className="text-danger-500">*</span></label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Yoga Mat Pro"
                  required
                />
              </div>
            </div>

            {/* Row 2 — Category + Sub Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Category <span className="text-danger-500">*</span></label>
                <select
                  className="form-select"
                  value={form.categoryId}
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                >
                  <option value="">— Select Category —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-[11px] text-danger-500 mt-1">No categories found. Create categories first.</p>
                )}
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Sub Category <span className="text-danger-500">*</span></label>
                <select
                  className="form-select"
                  value={form.subCategoryId}
                  onChange={e => set('subCategoryId', e.target.value)}
                  required
                  disabled={!form.categoryId}
                >
                  <option value="">— Select Sub Category —</option>
                  {filteredSubs.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {form.categoryId && filteredSubs.length === 0 && (
                  <p className="text-[11px] text-danger-500 mt-1">No sub categories for this category.</p>
                )}
              </div>
            </div>

            {/* Row 3 — Description */}
            <div className="form-group !mb-0">
              <label className="form-label">Product Description</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Enter product description…"
                rows={4}
              />
            </div>

            {/* Row 4 — Index Image */}
            <div>
              <p className="form-label mb-2">Index Image</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ImageSlot
                  label="Main / Index Image"
                  value={form.indexImage}
                  onChange={v => set('indexImage', v)}
                  onClear={() => set('indexImage', '')}
                />
              </div>
            </div>

            {/* Row 5 — Variation Images */}
            <div>
              <p className="form-label mb-2">Variation Images <span className="text-primary-300 font-normal text-xs">(up to 5)</span></p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {form.varImages.map((img, i) => (
                  <ImageSlot
                    key={i}
                    label={`Variation ${i + 1}`}
                    value={img}
                    onChange={v => setVI(i, v)}
                    onClear={() => setVI(i, '')}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-surface-100 flex-shrink-0">
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
const ViewModal = ({ product, categoryName, subCategoryName, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full !max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
        <h3 className="font-heading text-base font-semibold text-primary-600">Product Details</h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600">
          <Ic d={D.close} />
        </button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
        {/* Info rows */}
        {[
          { label: 'Product Code',    value: product.code },
          { label: 'Product Name',    value: product.name },
          { label: 'Category',        value: categoryName || '—' },
          { label: 'Sub Category',    value: subCategoryName || '—' },
          { label: 'Description',     value: product.description || '—' },
          { label: 'Created Date',    value: format(new Date(product.createdAt), 'dd MMM yyyy, hh:mm a') },
          { label: 'Updated Date',    value: format(new Date(product.updatedAt), 'dd MMM yyyy, hh:mm a') },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide">{label}</span>
            <span className="text-sm font-medium text-primary-700 whitespace-pre-line">{value}</span>
          </div>
        ))}

        {/* Index image */}
        {product.indexImage && (
          <div>
            <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide block mb-2">Index Image</span>
            <img
              src={product.indexImage}
              alt="index"
              className="w-32 h-32 object-cover rounded-xl border border-surface-200 shadow-sm"
            />
          </div>
        )}

        {/* Variation images */}
        {product.varImages?.some(v => v) && (
          <div>
            <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide block mb-2">Variation Images</span>
            <div className="flex flex-wrap gap-2">
              {product.varImages.map((img, i) =>
                img
                  ? <img key={i} src={img} alt={`var-${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-surface-200 shadow-sm" />
                  : null
              )}
            </div>
          </div>
        )}
      </div>
      <div className="px-6 pb-5 flex justify-end">
        <button onClick={onClose} className="btn-outline">Close</button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────
const ProductMaster = () => {
  const [products,      setProducts]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null); // null | 'add' | product-obj
  const [viewItem,      setViewItem]      = useState(null);
  const [confirm,       setConfirm]       = useState(null);

  // Load all data from localStorage on mount
  useEffect(() => {
    setCategories(readLS(KEY_CATS));
    setSubCategories(readLS(KEY_SUBCATS));
    setProducts(readLS(KEY_PRODUCTS));
  }, []);

  const persist = useCallback((data) => {
    setProducts(data);
    writeLS(KEY_PRODUCTS, data);
  }, []);

  const getCatName  = (id) => categories.find(c => c.id === id)?.name    || '—';
  const getSubName  = (id) => subCategories.find(s => s.id === id)?.name || '—';

  const handleSave = (form) => {
    if (modal === 'add') {
      const entry = { id: newId(), ...form, createdAt: nowISO(), updatedAt: nowISO() };
      persist([...products, entry]);
      toast.success('Product added successfully.');
      addActivity(`New product added: ${form.name}`, 'product');
    } else {
      persist(products.map(p => p.id === modal.id ? { ...p, ...form, updatedAt: nowISO() } : p));
      toast.success('Product updated.');
      addActivity(`Product updated: ${form.name}`, 'product');
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    persist(products.filter(p => p.id !== id));
    toast.success('Product deleted.');
    addActivity('A product has been deleted', 'product');
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return products;
    return products.filter(p =>
      p.code?.toLowerCase().includes(t) ||
      p.name?.toLowerCase().includes(t) ||
      getCatName(p.categoryId).toLowerCase().includes(t) ||
      getSubName(p.subCategoryId).toLowerCase().includes(t)
    );
  }, [products, search, categories, subCategories]);

  const recentCount = products.filter(p => (Date.now() - new Date(p.createdAt)) / 86400000 <= 7).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Master</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage all products with images and category mapping.</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Ic d={D.add} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Products"    value={products.length}  iconPath={D.box}    color="primary" />
        <StatCard label="Active Products"   value={products.length}  iconPath={D.eye}    color="success" />
        <StatCard label="Recently Added"    value={recentCount}      iconPath={D.add}    color="accent"  />
      </div>

      {/* Search */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code, name or category…"
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
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Index Image</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-primary-300">
                    {products.length === 0
                      ? 'No products yet. Click "Add Product" to create one.'
                      : 'No products match your search.'}
                  </td>
                </tr>
              ) : filtered.map((prod, idx) => (
                <tr key={prod.id}>
                  <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono font-medium">
                      {prod.code}
                    </span>
                  </td>
                  <td className="font-medium text-primary-700 max-w-[160px] truncate" title={prod.name}>
                    {prod.name}
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-medium">
                      {getCatName(prod.categoryId)}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-200 text-primary-600 text-xs font-medium">
                      {getSubName(prod.subCategoryId)}
                    </span>
                  </td>
                  <td>
                    {prod.indexImage
                      ? <img src={prod.indexImage} alt="idx"
                          className="w-10 h-10 object-cover rounded-lg border border-surface-200 shadow-sm" />
                      : <span className="text-primary-300 text-xs">—</span>
                    }
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {format(new Date(prod.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {format(new Date(prod.updatedAt), 'dd MMM yyyy')}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewItem(prod)}
                        className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50"
                        title="View"
                      >
                        <Ic d={D.eye} />
                      </button>
                      <button
                        onClick={() => setModal(prod)}
                        className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50"
                        title="Edit"
                      >
                        <Ic d={D.edit} />
                      </button>
                      <button
                        onClick={() => setConfirm({
                          title:     'Delete Product',
                          message:   `Are you sure you want to delete "${prod.name}"? This cannot be undone.`,
                          onConfirm: () => handleDelete(prod.id),
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
            Showing {filtered.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'add' || (modal && modal.id)) && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          categories={categories}
          subCategories={subCategories}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewItem && (
        <ViewModal
          product={viewItem}
          categoryName={getCatName(viewItem.categoryId)}
          subCategoryName={getSubName(viewItem.subCategoryId)}
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

export default ProductMaster;
