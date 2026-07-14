/**
 * pages/ProductMaster.jsx — Product Master
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /product/productcreate  → create (multipart: index_image, variation_images[])
 * GET  /product/productlist    → list (each row includes variation_images: [{id,image_path,sort_order}])
 * POST /product/productupdate  → update (multipart: index_image?, variation_images[]?, delete_image_ids?)
 * POST /product/productdelete  → delete
 *
 * Images are uploaded to the backend's /storage filesystem; only the
 * filename is stored in the DB, so the UI builds the full URL via storageUrl().
 *
 * Variation images are a dynamic list backed by the product_images table
 * (one main image + any number of variation images — no fixed cap of 5).
 * Each row is either an existing saved image (has `existingId`, a
 * product_images.id) or a not-yet-uploaded new pick; removing an existing
 * row queues its id for deletion (sent as delete_image_ids) rather than
 * deleting anything client-side.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';
import { format } from 'date-fns';
import Api from '../utils/Api';
import { storageUrl } from '../utils/imageUrl';

// ─── Tiny SVG icon ────────────────────────────
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
  img:     'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  box:     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  x:       'M6 18L18 6M6 6l12 12',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
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

// ─── Single image upload slot ──────────────────
// `value` is either { file: File, preview: objectURL } for a newly picked
// image, or a plain string filename (from the backend) for an existing one.
const ImageSlot = ({ label, value, onChange, onClear }) => {
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
    <div className="flex flex-col gap-1.5">
      {label && <p className="text-xs font-medium text-primary-500">{label}</p>}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${preview ? 'border-primary-200 bg-primary-50/30' : 'border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/20 cursor-pointer'}`}
        style={{ aspectRatio: '1 / 1', minHeight: 80 }}
        onClick={() => !preview && ref.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
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
      {!preview && (
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
const MAX_VARIATION_IMAGES = 20; // matches the backend's productImageFields cap

// A variation row's `value` uses the same contract ImageSlot already
// expects: '' (empty), a filename string (existing saved image), or
// { file, preview } (a freshly picked, not-yet-uploaded file).
let rowKeySeq = 0;
const makeVarRow = (value = '', existingId = null) => ({ key: ++rowKeySeq, value, existingId });

const EMPTY_FORM = {
  code:          '',
  name:          '',
  categoryName:    '',
  subCategoryName: '',
  description:   '',
  indexImage:    '',
  varImages:     [],
  deletedImageIds: [],
};

const ProductModal = ({ product, categories, subCategories, onSave, onClose }) => {
  const isEdit = !!product;

  const [form, setForm] = useState(() => {
    const existingVarImages = Array.isArray(product?.variation_images)
      ? [...product.variation_images]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(v => makeVarRow(v.image_path, v.id))
      : [];

    return product
      ? {
          code:            product.product_code        || '',
          name:            product.product_name        || '',
          categoryName:    product.category_name        || '',
          subCategoryName: product.sub_category_name    || '',
          description:     product.product_description  || '',
          indexImage:      product.index_image          || '',
          // A product with no saved variation images still gets one empty
          // slot to start from, same as a brand-new product.
          varImages:       existingVarImages.length > 0 ? existingVarImages : [makeVarRow()],
          deletedImageIds: [],
        }
      : { ...EMPTY_FORM, varImages: [makeVarRow()] };
  });

  const [saving, setSaving] = useState(false);

  // Prefill the next suggested product code on Add only — never on Edit,
  // and never once the user has typed something into the field themselves
  // (checked via the functional update, not a render-time value, so a
  // slow response can't clobber what they've already typed).
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    Api.get('/product/productnextcode')
      .then(res => {
        if (cancelled) return;
        const suggested = res.data?.code;
        if (suggested) {
          setForm(prev => (prev.code ? prev : { ...prev, code: suggested }));
        }
      })
      .catch(() => { /* leave the field empty — user can still type a code */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Sets a variation row's picked file/value — rejects an exact duplicate
  // (same name + size) of a file already staged in another row.
  const setVarImage = (i, v) => {
    if (v && typeof v === 'object' && v.file) {
      const isDuplicate = form.varImages.some((row, idx) =>
        idx !== i && row.value && typeof row.value === 'object' &&
        row.value.file.name === v.file.name && row.value.file.size === v.file.size
      );
      if (isDuplicate) {
        toast.error('This image has already been added.');
        return;
      }
    }
    setForm(p => {
      const next = [...p.varImages];
      next[i] = { ...next[i], value: v };
      return { ...p, varImages: next };
    });
  };

  // Adding always appends a fresh empty slot for the user to fill in.
  const addVarImageSlot = () => {
    if (form.varImages.length >= MAX_VARIATION_IMAGES) {
      toast.error(`You can add up to ${MAX_VARIATION_IMAGES} variation images.`);
      return;
    }
    setForm(p => ({ ...p, varImages: [...p.varImages, makeVarRow()] }));
  };

  // Removing a row that represents an already-saved image queues its id
  // for server-side deletion; removing a not-yet-uploaded/empty row is just
  // a local no-op splice — nothing was ever saved for it.
  const removeVarImageSlot = (i) => {
    setForm(p => {
      const row = p.varImages[i];
      const next = p.varImages.filter((_, idx) => idx !== i);
      return {
        ...p,
        varImages: next,
        deletedImageIds: row.existingId ? [...p.deletedImageIds, row.existingId] : p.deletedImageIds,
      };
    });
  };

  // filtered sub-categories based on chosen category
  const filteredSubs = useMemo(() =>
    form.categoryName
      ? subCategories.filter(s => s.category_name === form.categoryName)
      : subCategories,
  [form.categoryName, subCategories]);

  // reset sub-cat when category changes
  const handleCategoryChange = (catName) => {
    set('categoryName', catName);
    set('subCategoryName', '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim())          { toast.error('Product code is required.');     return; }
    if (!form.name.trim())          { toast.error('Product name is required.');     return; }
    if (!form.categoryName)         { toast.error('Please select a category.');     return; }
    if (!form.subCategoryName)      { toast.error('Please select a sub category.'); return; }
    setSaving(true);
    await onSave({
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim(),
    });
    setSaving(false);
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
                  value={form.categoryName}
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                >
                  <option value="">— Select Category —</option>
                  {categories.map(c => (
                    <option key={c.category_name} value={c.category_name}>{c.category_name}</option>
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
                  value={form.subCategoryName}
                  onChange={e => set('subCategoryName', e.target.value)}
                  required
                  disabled={!form.categoryName}
                >
                  <option value="">— Select Sub Category —</option>
                  {filteredSubs.map(s => (
                    <option key={s.sub_category_name} value={s.sub_category_name}>{s.sub_category_name}</option>
                  ))}
                </select>
                {form.categoryName && filteredSubs.length === 0 && (
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

            {/* Row 5 — Variation Images (dynamic — add as many as needed) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="form-label !mb-0">
                  Variation Images <span className="text-primary-300 font-normal text-xs">({form.varImages.length}/{MAX_VARIATION_IMAGES})</span>
                </p>
                <button
                  type="button"
                  onClick={addVarImageSlot}
                  className="btn-outline btn-sm !py-1 !px-2.5 text-xs gap-1"
                  title="Add another variation image"
                >
                  <Ic d={D.add} className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {form.varImages.map((row, i) => (
                  <div key={row.key} className="flex flex-col gap-1.5">
                    <ImageSlot
                      label={`Variation ${i + 1}`}
                      value={row.value}
                      onChange={v => setVarImage(i, v)}
                      onClear={() => setVarImage(i, '')}
                    />
                    <button
                      type="button"
                      onClick={() => removeVarImageSlot(i)}
                      className="btn-outline btn-sm !py-1 text-xs gap-1 text-danger-500 border-danger-200 hover:bg-danger-50 justify-center"
                      title="Remove this variation image"
                    >
                      <Ic d={D.trash} className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
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
const ViewModal = ({ product, onClose }) => {
  const varImages = Array.isArray(product.variation_images)
    ? [...product.variation_images].sort((a, b) => a.sort_order - b.sort_order).map(v => v.image_path)
    : [];
  return (
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
            { label: 'Product Code',    value: product.product_code },
            { label: 'Product Name',    value: product.product_name },
            { label: 'Category',        value: product.category_name || '—' },
            { label: 'Sub Category',    value: product.sub_category_name || '—' },
            { label: 'Description',     value: product.product_description || '—' },
            { label: 'Created Date',    value: product.created_date ? format(new Date(product.created_date), 'dd MMM yyyy, hh:mm a') : '—' },
            { label: 'Updated Date',    value: product.updated_date ? format(new Date(product.updated_date), 'dd MMM yyyy, hh:mm a') : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide">{label}</span>
              <span className="text-sm font-medium text-primary-700 whitespace-pre-line">{value}</span>
            </div>
          ))}

          {/* Index image */}
          {product.index_image && (
            <div>
              <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide block mb-2">Index Image</span>
              <img
                src={storageUrl(product.index_image)}
                alt="index"
                className="w-32 h-32 object-cover rounded-xl border border-surface-200 shadow-sm"
              />
            </div>
          )}

          {/* Variation images */}
          {varImages.length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wide block mb-2">Variation Images</span>
              <div className="flex flex-wrap gap-2">
                {varImages.map((img, i) => (
                  <img key={i} src={storageUrl(img)} alt={`var-${i + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-surface-200 shadow-sm" />
                ))}
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
};

// ─── Main Page ────────────────────────────────
const ProductMaster = () => {
  const [products,      setProducts]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null); // null | 'add' | product-obj
  const [viewItem,      setViewItem]      = useState(null);
  const [confirm,       setConfirm]       = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await Api.get('/category/categorydropdown');
      setCategories(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load categories.');
    }
  }, []);

  const fetchSubCategories = useCallback(async () => {
    try {
      const res = await Api.get('/subcategory/sub-categorylist');
      setSubCategories(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load sub categories.');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.get('/product/productlist');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setProducts([...list].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0)));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
    fetchProducts();
  }, [fetchCategories, fetchSubCategories, fetchProducts]);

  // Build the multipart form body shared by create/update
  const buildFormData = (form) => {
    const fd = new FormData();
    fd.append('product_code', form.code);
    fd.append('product_name', form.name);
    fd.append('category_name', form.categoryName);
    fd.append('sub_category_name', form.subCategoryName);
    fd.append('product_description', form.description);

    if (form.indexImage && typeof form.indexImage === 'object') {
      fd.append('index_image', form.indexImage.file);
    }
    // Only rows with a freshly picked file are actual uploads — an existing
    // saved image (plain filename string) needs no re-upload, and an empty
    // unfilled slot contributes nothing (never submitted as an image).
    form.varImages.forEach((row) => {
      if (row.value && typeof row.value === 'object') fd.append('variation_images', row.value.file);
    });
    if (form.deletedImageIds?.length > 0) {
      fd.append('delete_image_ids', JSON.stringify(form.deletedImageIds));
    }
    return fd;
  };

  const handleCreate = async (form) => {
    try {
      const fd = buildFormData(form);
      const res = await Api.post('/product/productcreate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.status === 0) { toast.error(res.data.message || 'Failed to add product.'); return; }
      toast.success('Product added successfully.');
      setModal(null);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add product.');
    }
  };

  const handleUpdate = async (form) => {
    try {
      const fd = buildFormData(form);
      fd.append('id', modal?.id);
      const res = await Api.post('/product/productupdate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.status === 0) { toast.error(res.data.message || 'Failed to update product.'); return; }
      toast.success('Product updated.');
      setModal(null);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update product.');
    }
  };

  const handleSave = (form) => (modal === 'add' ? handleCreate(form) : handleUpdate(form));

  const handleDelete = async (id) => {
    try {
      const res = await Api.post('/product/productdelete', { id });
      if (res.data?.status === 0) { toast.error(res.data.message || 'Failed to delete product.'); return; }
      toast.success('Product deleted.');
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete product.');
    }
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return products;
    return products.filter(p =>
      p.product_code?.toLowerCase().includes(t) ||
      p.product_name?.toLowerCase().includes(t) ||
      p.category_name?.toLowerCase().includes(t) ||
      p.sub_category_name?.toLowerCase().includes(t)
    );
  }, [products, search]);

  const recentCount = useMemo(() => products.filter(p => {
    const d = new Date(p.created_date);
    return !isNaN(d) && (Date.now() - d) / 86400000 <= 7;
  }).length, [products]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Master</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage all products with images and category mapping.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchProducts} disabled={loading} className="btn-outline" title="Refresh list">
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
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-primary-400">
                      <div className="spinner !w-5 !h-5" />
                      <span>Loading products…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
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
                      {prod.product_code}
                    </span>
                  </td>
                  <td className="font-medium text-primary-700 max-w-[160px] truncate" title={prod.product_name}>
                    {prod.product_name}
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 text-accent-600 text-xs font-medium">
                      {prod.category_name || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-200 text-primary-600 text-xs font-medium">
                      {prod.sub_category_name || '—'}
                    </span>
                  </td>
                  <td>
                    {prod.index_image
                      ? <img src={storageUrl(prod.index_image)} alt="idx"
                          className="w-10 h-10 object-cover rounded-lg border border-surface-200 shadow-sm" />
                      : <span className="text-primary-300 text-xs">—</span>
                    }
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {prod.created_date ? format(new Date(prod.created_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="text-primary-400 text-xs whitespace-nowrap">
                    {prod.updated_date ? format(new Date(prod.updated_date), 'dd MMM yyyy') : '—'}
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
                          message:   `Are you sure you want to delete "${prod.product_name}"? This cannot be undone.`,
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
        {!loading && filtered.length > 0 && (
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

export default ProductMaster;
