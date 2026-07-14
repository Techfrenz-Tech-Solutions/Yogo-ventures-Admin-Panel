/**
 * pages/CategoryMaster.jsx — Category Master
 * Connected to live API endpoints via Api.js (axios instance).
 *
 * POST /category/categorycreate  → create
 * GET  /category/categorylist    → list
 * POST /category/categoryupdate  → update
 * POST /category/categorydelete  → delete
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
const CategoryModal = ({ category, onSave, onClose }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({
    code: category?.category_code || category?.code || '',
    name: category?.category_name || category?.name || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Prefill the next suggested category code on Add only — never on Edit,
  // and never once the user has typed something into the field themselves
  // (checked via the functional update, not a render-time value, so a
  // slow response can't clobber what they've already typed).
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    Api.get('/category/categorynextcode')
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Category code is required.'); return; }
    if (!form.name.trim()) { toast.error('Category name is required.'); return; }
    setSaving(true);
    await onSave({ code: form.code.trim().toUpperCase(), name: form.name.trim() });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-primary-700">
          <h3 className="font-heading text-base font-semibold text-primary-600 dark:text-surface-100">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-surface-100">
            <Ic d={ICONS.close} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="form-group !mb-0">
              <label className="form-label">
                Category Code <span className="text-danger-500">*</span>
              </label>
              <input
                className="form-input"
                value={form.code}
                onChange={e => set('code', e.target.value)}
                placeholder="e.g. CAT001"
                required
              />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">
                Category Name <span className="text-danger-500">*</span>
              </label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Electronics"
                required
              />
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
const ViewModal = ({ category, onClose }) => {
  const createdAt = category.created_date || category.created_at || category.createdAt;
  const updatedAt = category.updated_date || category.updated_at || category.updatedAt;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-primary-700">
          <h3 className="font-heading text-base font-semibold text-primary-600 dark:text-surface-100">Category Details</h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-surface-100">
            <Ic d={ICONS.close} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: 'Category Code', value: category.category_code || category.code },
            { label: 'Category Name', value: category.category_name || category.name },
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
const CategoryMaster = () => {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(null); // null | 'add' | categoryObject
  const [viewItem,   setViewItem]   = useState(null);
  const [confirm,    setConfirm]    = useState(null);

  // ── Fetch list ──────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await Api.get('/category/categorylist');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      // Sort ascending by numeric id
      const sorted = [...list].sort((a, b) => {
        const idA = Number(a.id ?? a._id ?? 0);
        const idB = Number(b.id ?? b._id ?? 0);
        return idA - idB;
      });
      setCategories(sorted);
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Failed to load. The server may be restarting.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Create ──────────────────────────────────
  const handleCreate = async ({ code, name }) => {
    try {
      await Api.post('/category/categorycreate', {
        category_code: code,
        category_name: name,
      });
      toast.success('Category added successfully.');
      setModal(null);
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add category.');
    }
  };

  // ── Update ──────────────────────────────────
  const handleUpdate = async ({ code, name }) => {
    try {
      await Api.post('/category/categoryupdate', {
        id:            modal?.id || modal?._id,
        category_code: code,
        category_name: name,
      });
      toast.success('Category updated successfully.');
      setModal(null);
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update category.');
    }
  };

  // ── Delete ──────────────────────────────────
  const handleDelete = async (category) => {
    try {
      await Api.post('/category/categorydelete', {
        id: category?.id || category?._id,
      });
      toast.success('Category deleted successfully.');
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete category.');
    }
  };

  // ── Unified save dispatcher ──────────────────
  const handleSave = (form) => {
    if (modal === 'add') return handleCreate(form);
    return handleUpdate(form);
  };

  // ── Search filter ────────────────────────────
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return categories;
    return categories.filter(c => {
      const code = (c.category_code || c.code || '').toLowerCase();
      const name = (c.category_name || c.name || '').toLowerCase();
      return code.includes(t) || name.includes(t);
    });
  }, [categories, search]);

  // ── Recently added (last 7 days) ─────────────
  const recentCount = useMemo(() => {
    return categories.filter(c => {
      const d = new Date(c.created_date || c.created_at || c.createdAt);
      return !isNaN(d) && (Date.now() - d) / 86400000 <= 7;
    }).length;
  }, [categories]);

  // ─────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Category Master</h1>
          <p className="text-primary-400 dark:text-primary-400 text-sm mt-0.5">Manage all product categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
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
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Categories"  value={categories.length} iconPath={ICONS.folder} color="primary" />
        <StatCard label="Active Categories" value={categories.length} iconPath={ICONS.tag}    color="success" />
        <StatCard label="Recently Added"    value={recentCount}       iconPath={ICONS.add}    color="accent"  />
      </div>

      {/* Search bar */}
      <div className="card !p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Ic d={ICONS.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or name…"
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
                <th>Category Code</th>
                <th>Category Name</th>
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
                      <span>Loading categories…</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={6}>
                    <RetryBlock message={fetchError} onRetry={fetchCategories} colSpan={6} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-primary-300 dark:text-primary-500">
                    {categories.length === 0
                      ? 'No categories yet. Click "Add Category" to create one.'
                      : 'No categories match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((cat, idx) => {
                  const code      = cat.category_code || cat.code;
                  const name      = cat.category_name || cat.name;
                  const createdAt = cat.created_date  || cat.created_at  || cat.createdAt;
                  const updatedAt = cat.updated_date  || cat.updated_at  || cat.updatedAt;

                  return (
                    <tr key={cat._id || cat.id}>
                      <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 dark:bg-primary-700 text-primary-600 dark:text-primary-200 text-xs font-mono font-medium">
                          {code}
                        </span>
                      </td>
                      <td className="font-medium text-primary-700 dark:text-surface-100">{name}</td>
                      <td className="text-primary-400 dark:text-primary-400 text-xs whitespace-nowrap">
                        {createdAt ? format(new Date(createdAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="text-primary-400 dark:text-primary-400 text-xs whitespace-nowrap">
                        {updatedAt ? format(new Date(updatedAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewItem(cat)}
                            className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50"
                            title="View"
                          >
                            <Ic d={ICONS.view} />
                          </button>
                          <button
                            onClick={() => setModal(cat)}
                            className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50"
                            title="Edit"
                          >
                            <Ic d={ICONS.edit} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirm({
                                title:     'Delete Category',
                                message:   `Are you sure you want to delete "${name}"? This cannot be undone.`,
                                onConfirm: () => handleDelete(cat),
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
            Showing {filtered.length} of {categories.length} categories
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'add' || (modal && (modal.id || modal._id))) && (
        <CategoryModal
          category={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewItem && (
        <ViewModal category={viewItem} onClose={() => setViewItem(null)} />
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

export default CategoryMaster;
