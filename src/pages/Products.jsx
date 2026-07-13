/**
 * pages/Products.jsx — Product Management Page
 * List, search, filter, add, edit, delete products
 * Image upload via multipart/form-data
 *
 * Fixes applied:
 *  1. Category filter now uses category NAME (not _id) to match how
 *     products store their category field (as a plain string).
 *  2. loadProducts is called on mount AND whenever filters change —
 *     ensuring data always reflects the latest DB state after refresh.
 *  3. categoryAPI.getAll() is refetched after every save so product
 *     counts in Category Master stay in sync.
 *  4. Products with category stored as an object ({ name }) are
 *     handled correctly in both display and filter matching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { productAPI, categoryAPI, parentCategoryAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';
import './ProductModal.css';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ─── Build 3-level tree from Category Master API documents ───────
//
// Category Master stores:
//   cat.name        → Level 1  (Category Name  — e.g. "Fashion")
//   cat.parent      → Level 2  (Parent Category — plain string, e.g. "T-Shirts")
//   cat.description → Level 3  (Child Category  — plain string, e.g. "Polo")
//
const buildCategoryTree = (apiCategories) => {
  const tree = {};

  apiCategories.forEach((cat) => {
    const catName = (cat.name || '').trim();
    if (!catName) return;

    if (!tree[catName]) tree[catName] = {};

    const parentName = (
      typeof cat.parent === 'string'
        ? cat.parent
        : cat.parent?.name || ''
    ).trim();

    const childName = (cat.description || '').trim();

    if (parentName) {
      if (!tree[catName][parentName]) {
        tree[catName][parentName] = new Set();
      }
      if (childName) {
        tree[catName][parentName].add(childName);
      }
    }
  });

  return tree;
};

// ─── Format datetime dd/mm/yyyy hh:mm:ss ─────────────────────────
const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

const emptyForm = {
  name:           '',
  category:       '',
  parentCategory: '',
  childCategory:  '',
  description:    '',
  price:          0,
  stockStatus:    'in_stock',
  isPublished:    true,
};

// ─── Thumbnail helper ─────────────────────────────────────────────
const ProductThumb = ({ images, name }) => {
  const primary = images?.find((i) => i.isPrimary) || images?.[0];
  const src = primary?.url
    ? (primary.url.startsWith('http') ? primary.url : `${BASE_URL}${primary.url}`)
    : null;

  if (src) {
    return (
      <img
        src={src}
        alt={primary?.alt || name}
        className="w-10 h-10 rounded-lg object-cover border border-surface-100"
        onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
      <svg className="w-5 h-5 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
};

// ─── Parent Category Modal ───────────────────────────────────────────
const ParentCategoryModal = ({ pc, onSave, onClose }) => {
  const isEdit = !!pc?._id;
  const [form, setForm] = useState({
    code: pc?.code || '',
    name: pc?.name || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        isActive: true,
      };
      if (isEdit) await parentCategoryAPI.update(pc._id, payload);
      else        await parentCategoryAPI.create(payload);
      toast.success(`Parent category ${isEdit ? 'updated' : 'created'}!`);
      onSave();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save parent category.');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header flex items-center justify-between px-5 py-3 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Parent Category' : 'Add Parent Category'}
          </h3>
          <button
            onClick={onClose}
            className="modal-btn-close bg-primary-50 text-primary-500 border border-primary-200 hover:bg-primary-100 hover:text-primary-700"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-form">
            <div className="modal-grid">
              <div className="form-group">
                <label className="form-label form-label-required">Parent Category Code</label>
                <input
                  className="form-input"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value)}
                  placeholder="e.g. FASH"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Parent Category Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Fashion"
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="modal-btn-cancel bg-primary-50 text-primary-600 border border-primary-300 hover:bg-primary-100 hover:border-primary-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="modal-btn-save bg-primary-500 hover:bg-primary-600 text-white border-0"
            >
              {saving ? (
                <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</>
              ) : (
                isEdit ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Category Modal ───────────────────────────────────────────
const CategoryModal = ({ cat, parentCategories, onSave, onClose }) => {
  const isEdit = !!cat?._id;
  const [form, setForm] = useState({
    code: cat?.code || '',
    name: cat?.name || '',
    parent: cat?.parent || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        parent: form.parent.trim() || null,
        isActive: true,
      };
      if (isEdit) await categoryAPI.update(cat._id, payload);
      else        await categoryAPI.create(payload);
      toast.success(`Category ${isEdit ? 'updated' : 'created'}!`);
      onSave();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save category.');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header flex items-center justify-between px-5 py-3 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h3>
          <button
            onClick={onClose}
            className="modal-btn-close bg-primary-50 text-primary-500 border border-primary-200 hover:bg-primary-100 hover:text-primary-700"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-form">
            <div className="modal-grid">
              <div className="form-group">
                <label className="form-label form-label-required">Category Code</label>
                <input
                  className="form-input"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value)}
                  placeholder="e.g. TSHIRT"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Category Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. T-Shirts"
                  required
                />
              </div>
              <div className="form-group modal-full">
                <label className="form-label">Parent Category</label>
                <select
                  className="form-select"
                  value={form.parent}
                  onChange={(e) => set('parent', e.target.value)}
                >
                  <option value="">Select parent category...</option>
                  {parentCategories.map((pc) => (
                    <option key={pc._id} value={pc.name}>{pc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="modal-btn-cancel bg-primary-50 text-primary-600 border border-primary-300 hover:bg-primary-100 hover:border-primary-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="modal-btn-save bg-primary-500 hover:bg-primary-600 text-white border-0"
            >
              {saving ? (
                <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</>
              ) : (
                isEdit ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
const ProductModal = ({ product, categoryTree, onSave, onClose }) => {
  const [form, setForm] = useState(
    product
      ? {
          ...emptyForm,
          name:           product.name           || '',
          // FIX: handle category stored as object OR plain string
          category:       typeof product.category === 'object'
                            ? product.category?.name || ''
                            : product.category || '',
          parentCategory: product.parentCategory || '',
          description:    product.description    || '',
          price:          product.price          ?? 0,
          stockStatus:    product.stockStatus    || 'in_stock',
          isPublished:    product.isPublished    ?? true,
        }
      : { ...emptyForm }
  );
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(
    product?.images?.[0]?.url
      ? (product.images[0].url.startsWith('http')
          ? product.images[0].url
          : `${BASE_URL}${product.images[0].url}`)
      : null
  );
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const isEdit  = !!product?._id;

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleCategoryChange = (val) => {
    setForm((f) => ({ ...f, category: val, parentCategory: '', childCategory: '' }));
  };

  const handleParentChange = (val) => {
    setForm((f) => ({ ...f, parentCategory: val }));
  };

  const categoryNames = Object.keys(categoryTree);
  const parentNames   = form.category
    ? Object.keys(categoryTree[form.category] || {})
    : [];

  const hasParents  = parentNames.length > 0;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required.');  return; }
    if (!form.category)    { toast.error('Category is required.');      return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name',           form.name.trim());
      fd.append('category',       form.category);
      fd.append('parentCategory', form.parentCategory);
      fd.append('description',    form.description);
      fd.append('price',          form.price ?? 0);
      fd.append('stockStatus',    form.stockStatus);
      fd.append('isPublished',    form.isPublished);
      if (imageFile) fd.append('image', imageFile);

      if (isEdit) await productAPI.update(product._id, fd);
      else        await productAPI.create(fd);

      toast.success(`Product ${isEdit ? 'updated' : 'created'} successfully!`);
      onSave();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save product.');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header flex items-center justify-between px-5 py-3 border-b border-surface-100">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            onClick={onClose}
            className="modal-btn-close bg-primary-50 text-primary-500 border border-primary-200 hover:bg-primary-100 hover:text-primary-700"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-form">
            <div className="modal-grid">

              {/* Product Name */}
              <div className="form-group modal-full">
                <label className="form-label form-label-required">Product Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Blue Cotton T-Shirt"
                  required
                />
              </div>

              {/* Level 1: Category */}
              <div className="form-group">
                <label className="form-label form-label-required">Category</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                >
                  {categoryNames.length === 0 ? (
                    <option value="">No categories yet — add in Category Master</option>
                  ) : (
                    <>
                      <option value="">Select category...</option>
                      {categoryNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Level 2: Parent Category */}
              {hasParents ? (
                <div className="form-group modal-full">
                  <label className="form-label">Parent Category</label>
                  <select
                    className="form-select"
                    value={form.parentCategory}
                    onChange={(e) => handleParentChange(e.target.value)}
                  >
                    <option value="">Select parent category...</option>
                    {parentNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Description */}
              <div className="form-group modal-full">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Product description..."
                  rows={2}
                />
              </div>

              {/* Upload Image */}
              <div className="form-group modal-full">
                <label className="form-label">Upload Image</label>
                <div
                  className="border-2 border-dashed border-surface-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors overflow-hidden"
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="flex items-center gap-3 px-4 py-2 bg-surface-50">
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-12 h-12 rounded-lg object-cover border border-surface-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary-600 truncate">
                          {imageFile ? imageFile.name : 'Current image'}
                        </p>
                        <p className="text-xs text-primary-300 mt-0.5">Click to change</p>
                      </div>
                      <svg className="w-4 h-4 text-primary-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="modal-upload-empty">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p>Click to upload image</p>
                        <span>JPG, PNG, WebP · max 5MB</span>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="modal-btn-cancel bg-primary-50 text-primary-600 border border-primary-300 hover:bg-primary-100 hover:border-primary-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="modal-btn-save bg-primary-500 hover:bg-primary-600 text-white border-0"
            >
              {saving ? (
                <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</>
              ) : (
                isEdit ? 'Update Product' : 'Create Product'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

// ─── Products Page ────────────────────────────────────────────────
const Products = () => {
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState({});
  const [pagination, setPagination]     = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  // FIX: filter by category NAME (string), not _id
  // Products store category as a plain string name — matching by _id always fails
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock]   = useState('');
  const [modal, setModal]               = useState(null);
  const [parentModal, setParentModal]   = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [stats, setStats]               = useState({ totalProducts: 0 });
  const debouncedSearch = useDebounce(search);

  // ── Load parent categories ──
  const loadParentCategories = useCallback(async () => {
    try {
      const r = await parentCategoryAPI.getAll();
      setParentCategories(r.data.data || []);
    } catch {}
  }, []);

  // ── Load categories once on mount (and re-expose via loadCategories) ──
  const loadCategories = useCallback(async () => {
    try {
      const r = await categoryAPI.getAll();
      const data = r.data.data || [];
      setCategories(data);
      setCategoryTree(buildCategoryTree(data));
    } catch {}
  }, []);

  useEffect(() => { loadParentCategories(); loadCategories(); }, [loadParentCategories, loadCategories]);

  // ── Load products whenever search / filters / page changes ──────
  const loadProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: debouncedSearch,
        stockStatus: filterStock,
      };

      // FIX: Only pass category filter if one is selected.
      //      Send it as a name string — the backend must match by name
      //      because products persist category as a plain string, not ObjectId.
      if (filterCategory) {
        params.category = filterCategory;
      }

      const res = await productAPI.getAll(params);
      setProducts(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch {}
    setLoading(false);
  }, [debouncedSearch, filterCategory, filterStock]);

  // Reload on filter change (also covers first mount via dependency)
  useEffect(() => { loadProducts(1); }, [loadProducts]);

  const handleDelete = async (id, name) => {
    setConfirmModal({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await productAPI.delete(id);
          toast.success('Product deleted.');
          loadProducts(pagination.page);
          // Refresh categories so product count cards stay in sync
          loadCategories();
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to delete product.');
        }
      },
    });
  };

  // Called when modal saves — refresh both products AND category counts
  const handleSave = () => {
    setModal(null);
    loadProducts(pagination.page);
    loadCategories(); // FIX: keeps category product counts in sync
  };

  const handleParentSave = () => {
    setParentModal(null);
    loadParentCategories();
    loadCategories();
  };

  const handleCategorySave = () => {
    setCategoryModal(null);
    loadCategories();
  };

  const COL_COUNT = 9;

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
          <div className="stat-icon bg-primary-50 text-primary-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">Total Products</p>
            <p className="text-2xl font-heading font-bold text-primary-700 mt-0.5">
              {pagination.total || 0}
            </p>
          </div>
        </div>
        <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
          <div className="stat-icon bg-earth-50 text-earth-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">Total Categories</p>
            <p className="text-2xl font-heading font-bold text-primary-700 mt-0.5">
              {categories.length || 0}
            </p>
          </div>
        </div>
        <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
          <div className="stat-icon bg-success-50 text-success-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">Total Parent Categories</p>
            <p className="text-2xl font-heading font-bold text-primary-700 mt-0.5">
              {parentCategories.length || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-primary-400 text-sm mt-0.5">{pagination.total || 0} total products</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input
            className="form-input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
          />
        </div>

        {/* FIX: use category NAME as the option value — not _id —
             so the filter matches how products are stored in the DB */}
        <select
          className="form-select w-44"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {/* Deduplicate by name since multiple Category Master rows share the same name */}
          {[...new Map(categories.map((c) => [c.name, c])).values()].map((c) => (
            <option key={c._id} value={c.name}>{c.name}</option>
          ))}
        </select>

        {(search || filterCategory || filterStock) && (
          <button
            onClick={() => { setSearch(''); setFilterCategory(''); setFilterStock(''); }}
            className="btn-ghost btn-sm text-primary-400"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Parent Category</th>
                <th>Description</th>
                <th>Image</th>
                <th>Actions</th>
                <th>Created Date</th>
                <th>Updated Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={COL_COUNT}>
                      <div className="h-8 bg-surface-100 rounded animate-pulse mx-2" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16 text-primary-300">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                      </svg>
                      No products found
                    </div>
                  </td>
                </tr>
              ) : products.map((p) => (
                <tr key={p._id}>

                  {/* Product ID */}
                  <td>
                    <span className="font-mono text-xs text-primary-400 bg-surface-100 px-2 py-0.5 rounded">
                      {p.productId || `#${p._id?.slice(-6).toUpperCase()}`}
                    </span>
                  </td>

                  {/* Name */}
                  <td>
                    <p className="font-medium text-primary-700">{p.name}</p>
                  </td>

                  {/* Category — handle both object and string */}
                  <td>
                    <span className="badge badge-neutral">
                      {typeof p.category === 'object'
                        ? p.category?.name || '—'
                        : p.category || '—'}
                    </span>
                  </td>

                  {/* Parent Category */}
                  <td>
                    <span className="text-sm text-primary-600">
                      {p.parentCategory || '—'}
                    </span>
                  </td>

                  {/* Description */}
                  <td>
                    <p className="text-sm text-primary-500 max-w-[180px] truncate" title={p.description || ''}>
                      {p.description || <span className="text-primary-300 italic">—</span>}
                    </p>
                  </td>

                  {/* Image */}
                  <td>
                    <ProductThumb images={p.images} name={p.name} />
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModal(p)}
                        className="btn-icon text-primary-400 hover:text-primary-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(p._id, p.name)}
                        className="btn-icon text-danger-400 hover:text-danger-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>

                  {/* Created Date */}
                  <td>
                    <span className="text-xs text-primary-400 whitespace-nowrap">
                      {formatDateTime(p.createdAt)}
                    </span>
                  </td>

                  {/* Updated Date */}
                  <td>
                    <span className="text-xs text-primary-400 whitespace-nowrap">
                      {formatDateTime(p.updatedAt)}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <p className="text-xs text-primary-400">
              Showing {products.length} of {pagination.total}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => loadProducts(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${pg === pagination.page
                      ? 'bg-primary-500 text-white'
                      : 'text-primary-400 hover:bg-surface-100'}`}
                >
                  {pg}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          categoryTree={categoryTree}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Parent Modal */}
      {parentModal && (
        <ParentCategoryModal
          pc={parentModal === 'add' ? null : parentModal}
          onSave={handleParentSave}
          onClose={() => setParentModal(null)}
        />
      )}

      {/* Category Modal */}
      {categoryModal && (
        <CategoryModal
          cat={categoryModal === 'add' ? null : categoryModal}
          parentCategories={parentCategories}
          onSave={handleCategorySave}
          onClose={() => setCategoryModal(null)}
        />
      )}

      {confirmModal && (
        <ConfirmationModal
          open={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
        />
      )}
    </div>
  );
};

export default Products;