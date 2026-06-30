import { useState, useEffect, useCallback, useMemo } from 'react';
import { parentCategoryAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';

const ParentCategoryModal = ({ parentCategory, onSave, onClose }) => {
  const isEdit = !!parentCategory?._id;
  const [form, setForm] = useState({
    code: parentCategory?.code || '',
    name: parentCategory?.name || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      if (isEdit) await parentCategoryAPI.update(parentCategory._id, payload);
      else await parentCategoryAPI.create(payload);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-form p-5">
            <div className="modal-grid gap-4">
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
          <div className="modal-footer px-5 py-4 border-t border-surface-100 flex justify-end gap-2">
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

const ParentMaster = () => {
  const [parentCategories, setParentCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parentCategoryAPI.getAll({ limit: 9999 });
      setParentCategories(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return parentCategories;
    return parentCategories.filter((pc) =>
      pc.code?.toLowerCase().includes(term) || pc.name?.toLowerCase().includes(term)
    );
  }, [parentCategories, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Parent Master</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage parent category records here.</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Parent Category
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
            placeholder="Search by code or name..."
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-primary-400">
            Clear
          </button>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={3}>
                      <div className="h-8 bg-surface-100 rounded animate-pulse mx-2" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-primary-300">
                    No parent categories found.
                  </td>
                </tr>
              ) : filtered.map((pc) => (
                <tr key={pc._id}>
                  <td>
                    <span className="font-mono text-xs text-primary-400 bg-surface-100 px-2 py-0.5 rounded">
                      {pc.code}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-primary-700">{pc.name}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModal(pc)}
                        className="btn-icon text-primary-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmModal({
                          title: 'Delete Parent Category',
                          message: `Are you sure you want to delete "${pc.name}"? This action cannot be undone.`,
                          onConfirm: async () => {
                            try {
                              await parentCategoryAPI.delete(pc._id);
                              toast.success('Parent category deleted.');
                              load();
                            } catch {
                              toast.error('Failed to delete parent category.');
                            }
                          },
                        })}
                        className="btn-icon text-danger-400 hover:text-danger-600"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ParentCategoryModal
          parentCategory={modal === 'add' ? null : modal}
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

export default ParentMaster;
