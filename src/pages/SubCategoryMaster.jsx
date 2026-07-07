/**
 * pages/SubCategoryMaster.jsx — Sub Category Master
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /subcategory/sub-categorycreate  → create
 * GET  /subcategory/sub-categorylist    → list
 * POST /subcategory/sub-categoryupdate  → update
 * POST /subcategory/sub-categorydelete  → delete
 * GET  /category/categorydropdown       → dropdown options
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationModal, RetryBlock } from '../components/ui';
import { format } from 'date-fns';
import Api from '../utils/Api';

// ─── SVG Icon helper ──────────────────────────
const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  add:     'M12 4v16m8-8H4',
  edit:    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:   'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  view:    'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  close:   'M6 18L18 6M6 6l12 12',
  folder:  'M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  tag:     'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  layers:  'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-50',  text: 'text-primary-500', num: 'text-primary-700' },
    accent:  { bg: 'bg-accent-100',  text: 'text-accent-500',  num: 'text-accent-600'  },
    earth:   { bg: 'bg-earth-50',    text: 'text-earth-500',   num: 'text-earth-600'   },
    success: { bg: 'bg-success-50',  text: 'text-success-500', num: 'text-success-600' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className="card flex items-center gap-4 hover:shadow-card-hover transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
        <Ic d={iconPath} className={`w-6 h-6 ${c.text}`} />
      </div>
      <div>
        <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-heading font-bold mt-0.5 ${c.num}`}>{value}</p>
      </div>
    </div>
  );
};

// ─── Add / Edit Modal ─────────────────────────
const SubCategoryModal = ({ subCategory, categories, onSave, onClose }) => {
  const isEdit = !!subCategory;

  // Resolve the pre-selected category name once categories have loaded.
  // The dropdown API returns only { category_name } — no id.
  // So we store and send category_name, not a numeric id.
  const [form, setForm] = useState({
    code:         subCategory?.sub_category_code || subCategory?.code || '',
    name:         subCategory?.sub_category_name || subCategory?.name || '',
    categoryName: subCategory?.category_name || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // When categories load after mount, ensure the current category_name is set
  useEffect(() => {
    if (!subCategory || !subCategory.category_name) return;
    setForm(p => ({ ...p, categoryName: subCategory.category_name }));
  }, [subCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim())         { toast.error('Sub category code is required.'); return; }
    if (!form.name.trim())         { toast.error('Sub category name is required.'); return; }
    if (!form.categoryName.trim()) { toast.error('Please select a category.'); return; }
    setSaving(true);
    await onSave({ code: form.code.trim().toUpperCase(), name: form.name.trim(), categoryName: form.categoryName });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-primary-700">
          <h3 className="font-heading text-base font-semibold text-primary-600 dark:text-surface-100">
            {isEdit ? 'Edit Sub Category' : 'Add Sub Category'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-surface-100">
            <Ic d={ICONS.close} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="form-group !mb-0">
              <label className="form-label">
                Sub Category Code <span className="text-danger-500">*</span>
              </label>
              <input
                className="form-input"
                value={form.code}
                onChange={e => set('code', e.target.value)}
                placeholder="e.g. SUB001"
                required
              />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">
                Sub Category Name <span className="text-danger-500">*</span>
              </label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Smartphones"
                required
              />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">
                Category <span className="text-danger-500">*</span>
              </label>
              <select
                className="form-select"
                value={form.categoryName}
                onChange={e => set('categoryName', e.target.value)}
                required
              >
                <option value="">— Select Category —</option>
                {categories.map(cat => {
                  const name = cat.category_name || cat.name;
                  return <option key={name} value={name}>{name}</option>;
                })}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-danger-500 mt-1">
                  No categories available. Please create categories first.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100 dark:border-primary-700">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" /> Saving…</>
              ) : isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── View Modal ───────────────────────────────
const ViewModal = ({ subCategory, categoryName, onClose }) => {
  const createdAt = subCategory.created_date || subCategory.created_at || subCategory.createdAt;
  const updatedAt = subCategory.updated_date || subCategory.updated_at || subCategory.updatedAt;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-primary-700">
          <h3 className="font-heading text-base font-semibold text-primary-600 dark:text-surface-100">Sub Category Details</h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-surface-100">
            <Ic d={ICONS.close} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: 'Sub Category Code', value: subCategory.sub_category_code || subCategory.code },
            { label: 'Sub Category Name', value: subCategory.sub_category_name || subCategory.name },
            { label: 'Category Name',     value: categoryName || '—' },
            {
              label: 'Created Date',
              value: createdAt ? format(new Date(createdAt), 'dd MMM yyyy, hh:mm a') : '—',
            },
            {
              label: 'Updated Date',
              value: updatedAt ? format(new Date(updatedAt), 'dd MMM yyyy, hh:mm a') : '—',
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-primary-400 dark:text-primary-400 uppercase tracking-wide">{label}</span>
              <span className="text-sm font-medium text-primary-700 dark:text-surface-100">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 flex justify-end">
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────
const SubCategoryMaster = () => {
  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [fetchError,    setFetchError]    = useState('');
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null); // null | 'add' | subCategoryObject
  const [viewItem,      setViewItem]      = useState(null);
  const [confirm,       setConfirm]       = useState(null);

  // ── Fetch category dropdown ──────────────────
  const fetchCategoryDropdown = useCallback(async () => {
    try {
      const res = await Api.get('/category/categorydropdown');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCategories(list);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load category dropdown.');
    }
  }, []);

  // ── Fetch sub category list ──────────────────
  const fetchSubCategories = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await Api.get('/subcategory/sub-categorylist');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      // Sort ascending by numeric id
      const sorted = [...list].sort((a, b) => {
        const idA = Number(a.id ?? a._id ?? 0);
        const idB = Number(b.id ?? b._id ?? 0);
        return idA - idB;
      });
      setSubCategories(sorted);
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Failed to load. The server may be restarting.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategoryDropdown();
    fetchSubCategories();
  }, [fetchCategoryDropdown, fetchSubCategories]);

  // ── Create ──────────────────────────────────
  const handleCreate = async ({ code, name, categoryName }) => {
    try {
      await Api.post('/subcategory/sub-categorycreate', {
        sub_category_code: code,
        sub_category_name: name,
        category_name:     categoryName,
      });
      toast.success('Sub category added successfully.');
      setModal(null);
      fetchSubCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add sub category.');
    }
  };

  // ── Update ──────────────────────────────────
  const handleUpdate = async ({ code, name, categoryName }) => {
    try {
      await Api.post('/subcategory/sub-categoryupdate', {
        id:                modal?.id || modal?._id,
        sub_category_code: code,
        sub_category_name: name,
        category_name:     categoryName,
      });
      toast.success('Sub category updated successfully.');
      setModal(null);
      fetchSubCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update sub category.');
    }
  };

  // ── Delete ──────────────────────────────────
  const handleDelete = async (subCategory) => {
    try {
      await Api.post('/subcategory/sub-categorydelete', {
        id: subCategory?.id || subCategory?._id,
      });
      toast.success('Sub category deleted successfully.');
      fetchSubCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete sub category.');
    }
  };

  // ── Unified save dispatcher ──────────────────
  const handleSave = (form) => {
    if (modal === 'add') return handleCreate(form);
    return handleUpdate(form);
  };

  // ── Helper to get category name (fallback only) ──
  const getCategoryName = useCallback((catId) => {
    const cat = categories.find(c => (c.id || c._id) == catId);
    return cat ? (cat.category_name || cat.name) : '—';
  }, [categories]);

  // ── Search filter ────────────────────────────
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return subCategories;
    return subCategories.filter(s => {
      const code = (s.sub_category_code || s.code || '').toLowerCase();
      const name = (s.sub_category_name || s.name || '').toLowerCase();
      const catName = getCategoryName(s.category_id || s.categoryId).toLowerCase();
      return code.includes(t) || name.includes(t) || catName.includes(t);
    });
  }, [subCategories, search, getCategoryName]);

  // ── Recently added (last 7 days) ─────────────
  const recentCount = useMemo(() => {
    return subCategories.filter(s => {
      const d = new Date(s.created_date || s.created_at || s.createdAt);
      return !isNaN(d) && (Date.now() - d) / 86400000 <= 7;
    }).length;
  }, [subCategories]);

  // ─────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sub Category Master</h1>
          <p className="text-primary-400 dark:text-primary-400 text-sm mt-0.5">Manage all product sub categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubCategories}
            disabled={loading}
            className="btn-outline"
            title="Refresh list"
          >
            <Ic
              d={ICONS.refresh}
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">
            <Ic d={ICONS.add} />
            <span>Add Sub Category</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Sub Categories"  value={subCategories.length} iconPath={ICONS.layers} color="primary" />
        <StatCard label="Active Sub Categories" value={subCategories.length} iconPath={ICONS.tag}    color="success" />
        <StatCard label="Recently Added"        value={recentCount}          iconPath={ICONS.add}    color="accent"  />
      </div>

      {/* Search bar */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={ICONS.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
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
                <th className="w-12">S.No</th>
                <th>Sub Category Code</th>
                <th>Sub Category Name</th>
                <th>Category Name</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-primary-400">
                      <div className="spinner !w-5 !h-5" />
                      <span>Loading sub categories…</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7}>
                    <RetryBlock message={fetchError} onRetry={fetchSubCategories} colSpan={7} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-primary-300 dark:text-primary-500">
                    {subCategories.length === 0
                      ? 'No sub categories yet. Click "Add Sub Category" to create one.'
                      : 'No sub categories match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((sub, idx) => {
                  const code      = sub.sub_category_code || sub.code;
                  const name      = sub.sub_category_name || sub.name;
                  const catName   = sub.category_name || getCategoryName(sub.category_id || sub.categoryId);
                  const createdAt = sub.created_date      || sub.created_at  || sub.createdAt;
                  const updatedAt = sub.updated_date      || sub.updated_at  || sub.updatedAt;

                  return (
                    <tr key={sub._id || sub.id}>
                      <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 text-xs font-mono font-medium">
                          {code}
                        </span>
                      </td>
                      <td className="font-medium text-primary-700 dark:text-surface-100">{name}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-200 dark:bg-primary-700 text-primary-600 dark:text-primary-200 text-xs font-medium">
                          {catName}
                        </span>
                      </td>
                      <td className="text-primary-400 dark:text-primary-400 text-xs whitespace-nowrap">
                        {createdAt ? format(new Date(createdAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="text-primary-400 dark:text-primary-400 text-xs whitespace-nowrap">
                        {updatedAt ? format(new Date(updatedAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewItem(sub)}
                            className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50"
                            title="View"
                          >
                            <Ic d={ICONS.view} />
                          </button>
                          <button
                            onClick={() => setModal(sub)}
                            className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50"
                            title="Edit"
                          >
                            <Ic d={ICONS.edit} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirm({
                                title:     'Delete Sub Category',
                                message:   `Are you sure you want to delete "${name}"? This cannot be undone.`,
                                onConfirm: () => handleDelete(sub),
                              })
                            }
                            className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                            title="Delete"
                          >
                            <Ic d={ICONS.trash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 dark:border-primary-700 text-xs text-primary-400 dark:text-primary-400">
            Showing {filtered.length} of {subCategories.length} sub categories
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'add' || (modal && (modal.id || modal._id))) && (
        <SubCategoryModal
          subCategory={modal === 'add' ? null : modal}
          categories={categories}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewItem && (
        <ViewModal
          subCategory={viewItem}
          categoryName={viewItem.category_name || getCategoryName(viewItem.category_id || viewItem.categoryId)}
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

export default SubCategoryMaster;
