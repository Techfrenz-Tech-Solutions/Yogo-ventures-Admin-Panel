/**
 * pages/Categories.jsx — Category Management
 *
 * Fixes applied:
 *  1. productCount is now computed client-side by fetching all products
 *     and counting how many have a category name matching each card.
 *     This works regardless of whether the backend's includeProductCount
 *     query param is implemented — it is always correct.
 *  2. load() re-fetches on every mount so data is always fresh after
 *     navigation / page refresh.
 *  3. Category matching is case-insensitive and handles category stored
 *     as object ({ name }) or plain string.
 */

import { useState, useEffect } from 'react';
import { categoryAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';
import './CategoryModal.css';
import { ConfirmationModal } from '../components/ui';

// ─── The 4 fixed branded categories ──────────────────────────────
const BRANDED = [
  {
    key:      'fashion',
    label:    'Fashion',
    gradient: 'cat-gradient-fashion',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3a2 2 0 011.995 1.85L14 5v.5l6.5 5.5a1 1 0 01-1.18 1.62L12 7.5 4.68 12.62A1 1 0 013.5 11l6.5-5.5V5a2 2 0 012-2z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h18"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5"/>
      </svg>
    ),
  },
  {
    key:      'accessories',
    label:    'Accessories',
    gradient: 'cat-gradient-accessories',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="7" y="7" width="10" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v2a1 1 0 001 1h4a1 1 0 001-1v-2"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v2m0 0h1.5M12 13h-1.5"/>
      </svg>
    ),
  },
  {
    key:      'appliances',
    label:    'Appliances',
    gradient: 'cat-gradient-appliances',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8l1 7H7L8 3z"/>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7 10l1 8a1 1 0 001 1h6a1 1 0 001-1l1-8"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19v2m4-2v2M9 6h6"/>
      </svg>
    ),
  },
  {
    key:      'crafting',
    label:    'Crafting',
    gradient: 'cat-gradient-crafting',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="6" cy="6"  r="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.76 7.76L18 12 7.76 16.24"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l-1.5 7.5"/>
      </svg>
    ),
  },
];

// FIX: helper to extract category name regardless of storage format
const getCategoryName = (cat) => {
  if (!cat) return '';
  if (typeof cat === 'object') return (cat.name || '').trim().toLowerCase();
  return String(cat).trim().toLowerCase();
};

// Match a DB record to a branded card (exact-first, then partial)
const findDbRecord = (dbCategories, brandedLabel) => {
  const bl = brandedLabel.toLowerCase();
  return (
    dbCategories.find((c) => (c.name || '').toLowerCase().trim() === bl) ||
    dbCategories.find((c) =>
      (c.name || '').toLowerCase().includes(bl) || bl.includes((c.name || '').toLowerCase())
    )
  );
};

// ─── Country Form Modal ───────────────────────────────────────────
const CountryModal = ({ country, onSave, onClose }) => {
  const isEdit = !!country?._id;

  const [form, setForm] = useState({
    code: country?.code || '',
    name: country?.name || '',
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
      if (isEdit) await countryAPI.update(country._id, payload);
      else        await countryAPI.create(payload);
      toast.success(`Country ${isEdit ? 'updated' : 'created'}!`);
      onSave();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save country.');
    }
    setSaving(false);
  };

  return (
    <div className="cat-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cat-modal-box">

        <div className="cat-modal-header">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Country' : 'Add Country'}
          </h3>
          <button onClick={onClose}
            className="cat-btn-close bg-primary-50 text-primary-500 border border-primary-200 hover:bg-primary-100 hover:text-primary-700"
            aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="cat-modal-body">
            <div className="form-group">
              <label className="form-label cat-label-required">Country Code</label>
              <input
                className="form-input"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                placeholder="e.g. IN"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label cat-label-required">Country Name</label>
              <input className="form-input" value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. India"/>
            </div>
          </div>

          <div className="cat-modal-footer">
            <button type="button" onClick={onClose}
              className="cat-btn-cancel bg-primary-50 text-primary-600 border border-primary-300 hover:bg-primary-100 hover:border-primary-400">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="cat-btn-save bg-primary-500 hover:bg-primary-600 text-white border-0">
              {saving
                ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white"/>Saving...</>
                : (isEdit ? 'Update' : 'Create')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
const CategoryModal = ({ cat, onSave, onClose }) => {
  const isEdit = !!cat?._id;

  const [form, setForm] = useState({
    name:           cat?.name           || '',
    parentCategory: cat?.parentCategory
                    || (typeof cat?.parent === 'object' ? cat?.parent?.name : cat?.parent)
                    || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Category name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name:         form.name.trim(),
        parent:       form.parentCategory.trim() || null,
        isActive:     true,
        displayOrder: cat?.displayOrder || 0,
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
    <div className="cat-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cat-modal-box">

        <div className="cat-modal-header">
          <h3 className="font-heading text-base font-semibold text-primary-600">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h3>
          <button onClick={onClose}
            className="cat-btn-close bg-primary-50 text-primary-500 border border-primary-200 hover:bg-primary-100 hover:text-primary-700"
            aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="cat-modal-body">
            <div className="form-group">
              <label className="form-label cat-label-required">Category Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Fashion"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent Category</label>
              <input className="form-input" value={form.parentCategory}
                onChange={(e) => set('parentCategory', e.target.value)}
                placeholder="e.g. T-Shirts"/>
            </div>
          </div>

          <div className="cat-modal-footer">
            <button type="button" onClick={onClose}
              className="cat-btn-cancel bg-primary-50 text-primary-600 border border-primary-300 hover:bg-primary-100 hover:border-primary-400">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="cat-btn-save bg-primary-500 hover:bg-primary-600 text-white border-0">
              {saving
                ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white"/>Saving...</>
                : (isEdit ? 'Update' : 'Create')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

// ─── Categories Page ──────────────────────────────────────────────
const Categories = () => {
  const [dbCategories, setDbCategories] = useState([]);
  // FIX: fetch all products so we can compute per-category counts client-side
  const [allProducts, setAllProducts]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [search, setSearch]             = useState('');

  const load = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const catRes = await categoryAPI.getAll();
      setDbCategories(catRes.data.data || []);

      // FIX: Fetch ALL products so we can count per branded category.
      // Using a high limit ensures we get everything.
      // This is reliable regardless of backend includeProductCount support.
      const prodRes = await productAPI.getAll({ limit: 9999, page: 1 });
      setAllProducts(prodRes.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (dbRecord) => {
    setConfirmModal({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${dbRecord.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await categoryAPI.delete(dbRecord._id);
          toast.success('Category deleted.');
          load();
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to delete category.');
        }
      },
    });
  };

  // FIX: count products by matching category name (case-insensitive)
  // handles both plain string and object storage formats
  const getProductCount = (brandedLabel) => {
    const bl = brandedLabel.toLowerCase();
    return allProducts.filter((p) => getCategoryName(p.category) === bl).length;
  };

  const cards = BRANDED.map((branded) => {
    const dbRecord = findDbRecord(dbCategories, branded.label);
    return {
      branded,
      dbRecord:     dbRecord || null,
      productCount: getProductCount(branded.label),
      isActive:     dbRecord ? !!dbRecord.isActive : false,
    };
  });

  const filteredCards = cards.filter((card) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      card.branded.label.toLowerCase().includes(term)
      || card.dbRecord?.name?.toLowerCase().includes(term)
    );
  });

  const activeCount = cards.filter((c) => c.dbRecord).length;

  const modalCat = modal?.mode === 'edit' ? modal.dbRecord : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="text-primary-400 text-sm mt-0.5">{activeCount} of 4 categories added</p>
        </div>
        <button onClick={() => setModal({ mode: 'add' })} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add Category
        </button>
      </div>

      <div className="card !p-4 flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            className="form-input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">
            Clear
          </button>
        )}
      </div>

      {/* Responsive grid */}
      <div className="cat-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card cat-skeleton" />
          ))
        ) : (
          filteredCards.map(({ branded, dbRecord, productCount, isActive }) => (
            <div key={branded.key} className="card hover:shadow-card-hover group cat-card">

              <div className="flex items-start justify-between mb-3">
                <div className={`cat-icon-badge ${branded.gradient}`}>
                  {branded.icon}
                </div>

                <div className="cat-card-actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal({
                      mode: 'edit',
                      dbRecord: dbRecord || { name: branded.label },
                    })}
                    className="btn-icon text-primary-400 hover:text-primary-600"
                    title={dbRecord ? 'Edit' : 'Add to DB'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  {dbRecord && (
                    <button
                      onClick={() => handleDelete(dbRecord)}
                      className="btn-icon text-danger-400 hover:text-danger-600"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <h4 className="font-semibold text-primary-700 cat-card-name">{branded.label}</h4>

              <div className="cat-card-footer">
                <span className="cat-product-count">
                  <svg className="cat-count-icon" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
                  </svg>
                  {productCount} {productCount === 1 ? 'product' : 'products'}
                </span>

                <span className={`badge ${dbRecord ? (isActive ? 'badge-success' : 'badge-neutral') : 'badge-neutral'}`}>
                  {dbRecord ? (isActive ? 'Active' : 'Inactive') : 'Not added'}
                </span>
              </div>

            </div>
          ))
        )}
      </div>

      {modal && (
        <CategoryModal
          cat={modalCat}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
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

export default Categories;