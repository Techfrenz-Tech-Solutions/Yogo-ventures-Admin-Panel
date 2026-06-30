/**
 * pages/CountryMaster.jsx — Country Master
 * Add / Edit / View / Delete countries with country code & country name.
 * Same features and styles as CategoryMaster.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ui';
import { format } from 'date-fns';

const newId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const now   = () => new Date().toISOString();

const Ic = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  add:    'M12 4v16m8-8H4',
  edit:   'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:  'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  view:   'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  close:  'M6 18L18 6M6 6l12 12',
  globe:  'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  tag:    'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, iconPath, color }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-500', num: 'text-primary-700' },
    accent:  { bg: 'bg-accent-100', text: 'text-accent-500',  num: 'text-accent-600'  },
    earth:   { bg: 'bg-earth-50',   text: 'text-earth-500',   num: 'text-earth-600'   },
    success: { bg: 'bg-success-50', text: 'text-success-500', num: 'text-success-600' },
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

// ─── Country Modal (Add / Edit) ───────────────
const CountryModal = ({ country, onSave, onClose }) => {
  const isEdit = !!country;
  const [form, setForm] = useState({
    code: country?.code || '',
    name: country?.name || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Country code is required.'); return; }
    if (!form.name.trim()) { toast.error('Country name is required.'); return; }
    setSaving(true);
    setTimeout(() => {
      onSave({ ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() });
      setSaving(false);
    }, 300);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-primary-700">
          <h3 className="font-heading text-base font-semibold text-primary-600 dark:text-surface-100">
            {isEdit ? 'Edit Country' : 'Add Country'}
          </h3>
          <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-surface-100">
            <Ic d={ICONS.close} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="form-group !mb-0">
              <label className="form-label">
                Country Code <span className="text-danger-500">*</span>
              </label>
              <input
                className="form-input"
                value={form.code}
                onChange={e => set('code', e.target.value)}
                placeholder="e.g. IN"
                maxLength={10}
                required
              />
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">
                Country Name <span className="text-danger-500">*</span>
              </label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. India"
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
const ViewModal = ({ country, onClose }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box w-full max-w-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-primary-700">
        <h3 className="font-heading text-base font-semibold text-primary-600 dark:text-surface-100">Country Details</h3>
        <button onClick={onClose} className="btn-icon text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-surface-100">
          <Ic d={ICONS.close} />
        </button>
      </div>
      <div className="p-5 space-y-3">
        {[
          { label: 'Country Code', value: country.code },
          { label: 'Country Name', value: country.name },
          { label: 'Created Date', value: format(new Date(country.createdAt), 'dd MMM yyyy, hh:mm a') },
          { label: 'Updated Date', value: format(new Date(country.updatedAt), 'dd MMM yyyy, hh:mm a') },
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

// ─── Main Page ────────────────────────────────
const STORAGE_KEY = 'yogo_countries';

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};
const save = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

const CountryMaster = () => {
  const [countries, setCountries] = useState([]);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);
  const [viewItem,  setViewItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  useEffect(() => { setCountries(load()); }, []);

  const persist = useCallback((data) => { setCountries(data); save(data); }, []);

  const handleSave = (form) => {
    if (modal === 'add') {
      const entry = {
        id: newId(),
        code: form.code,
        name: form.name,
        createdAt: now(),
        updatedAt: now(),
      };
      persist([...countries, entry]);
      toast.success('Country added successfully.');
    } else {
      const updated = countries.map(c =>
        c.id === modal.id ? { ...c, ...form, updatedAt: now() } : c
      );
      persist(updated);
      toast.success('Country updated.');
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    persist(countries.filter(c => c.id !== id));
    toast.success('Country deleted.');
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return countries;
    return countries.filter(c =>
      c.code?.toLowerCase().includes(t) || c.name?.toLowerCase().includes(t)
    );
  }, [countries, search]);

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Country Master</h1>
          <p className="text-primary-400 dark:text-primary-400 text-sm mt-0.5">Manage all countries.</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Ic d={ICONS.add} />
          <span>Add Country</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Countries"   value={countries.length}  iconPath={ICONS.globe}  color="primary" />
        <StatCard label="Active Countries"  value={countries.length}  iconPath={ICONS.tag}    color="success" />
        <StatCard label="Recently Added"
          value={countries.filter(c => {
            const d = new Date(c.createdAt);
            const diff = (Date.now() - d) / 86400000;
            return diff <= 7;
          }).length}
          iconPath={ICONS.add} color="accent" />
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

      {/* Grid / Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th>Country Code</th>
                <th>Country Name</th>
                <th>Created Date</th>
                <th>Updated Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-primary-300 dark:text-primary-500">
                    {countries.length === 0
                      ? 'No countries yet. Click "Add Country" to create one.'
                      : 'No countries match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((country, idx) => (
                  <tr key={country.id}>
                    <td className="text-primary-400 text-xs font-mono">{idx + 1}</td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 dark:bg-primary-700 text-primary-600 dark:text-primary-200 text-xs font-mono font-medium">
                        {country.code}
                      </span>
                    </td>
                    <td className="font-medium text-primary-700 dark:text-surface-100">{country.name}</td>
                    <td className="text-primary-400 dark:text-primary-400 text-xs whitespace-nowrap">
                      {format(new Date(country.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="text-primary-400 dark:text-primary-400 text-xs whitespace-nowrap">
                      {format(new Date(country.updatedAt), 'dd MMM yyyy')}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewItem(country)}
                          className="btn-icon text-info-500 hover:text-info-600 hover:bg-info-50"
                          title="View"
                        >
                          <Ic d={ICONS.view} />
                        </button>
                        <button
                          onClick={() => setModal(country)}
                          className="btn-icon text-primary-400 hover:text-primary-600 hover:bg-primary-50"
                          title="Edit"
                        >
                          <Ic d={ICONS.edit} />
                        </button>
                        <button
                          onClick={() => setConfirm({
                            title:   'Delete Country',
                            message: `Are you sure you want to delete "${country.name}"? This cannot be undone.`,
                            onConfirm: () => handleDelete(country.id),
                          })}
                          className="btn-icon text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                          title="Delete"
                        >
                          <Ic d={ICONS.trash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-100 dark:border-primary-700 text-xs text-primary-400 dark:text-primary-400">
            Showing {filtered.length} of {countries.length} countries
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'add' || (modal && modal.id)) && (
        <CountryModal
          country={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewItem && (
        <ViewModal country={viewItem} onClose={() => setViewItem(null)} />
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

export default CountryMaster;
