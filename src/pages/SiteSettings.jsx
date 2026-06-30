/**
 * pages/SiteSettings.jsx — Site Configuration
 * ─────────────────────────────────────────────
 * Tabs: General · Currency & Tax · Theme · Social Media · Invoice
 */

import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = ['General', 'Currency & Tax', 'Theme', 'Social Media', 'Invoice'];

const SiteSettings = () => {
  const [activeTab, setActiveTab] = useState('General');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await settingsAPI.get();
        setSettings(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const update = (field, value) => setSettings((s) => ({ ...s, [field]: value }));
  const updateNested = (parent, field, value) => setSettings((s) => ({ ...s, [parent]: { ...s[parent], [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('Settings saved successfully.');
    } catch {}
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="page-container flex items-center justify-center h-64">
      <div className="spinner" /><span className="ml-3 text-primary-400">Loading settings...</span>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Site Settings</h1>
          <p className="text-primary-400 text-sm mt-0.5">Configure your eCommerce store settings</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</> : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-primary-400 hover:text-primary-600'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card max-w-2xl">
        {/* ─── General ───────────────────────── */}
        {activeTab === 'General' && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-primary-600 pb-2 border-b border-surface-100">General Information</h3>
            {[
              { key: 'siteName', label: 'Site Name', placeholder: 'My eCommerce Store' },
              { key: 'siteTagline', label: 'Tagline', placeholder: 'Your store tagline' },
              { key: 'siteUrl', label: 'Website URL', placeholder: 'https://yourdomain.com' },
              { key: 'supportEmail', label: 'Support Email', placeholder: 'support@yourdomain.com' },
              { key: 'supportContact', label: 'Support Phone', placeholder: '+91 98765 43210' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" value={settings?.[key] || ''} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Maintenance Mode</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => update('maintenanceMode', !settings?.maintenanceMode)}
                  className={clsx('relative w-11 h-6 rounded-full transition-colors', settings?.maintenanceMode ? 'bg-danger-500' : 'bg-surface-300')}
                >
                  <div className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', settings?.maintenanceMode ? 'translate-x-5.5 left-0.5' : 'left-0.5')} />
                </button>
                <span className="text-sm text-primary-500">{settings?.maintenanceMode ? 'Site is in maintenance mode' : 'Site is live'}</span>
              </div>
            </div>
            {settings?.maintenanceMode && (
              <div className="form-group">
                <label className="form-label">Maintenance Message</label>
                <textarea className="form-textarea" value={settings?.maintenanceMessage || ''} onChange={(e) => update('maintenanceMessage', e.target.value)} placeholder="We'll be back soon..." rows={3} />
              </div>
            )}
          </div>
        )}

        {/* ─── Currency & Tax ─────────────────── */}
        {activeTab === 'Currency & Tax' && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-primary-600 pb-2 border-b border-surface-100">Currency & Tax</h3>
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <select className="form-select" value={settings?.defaultCurrency || 'INR'} onChange={(e) => update('defaultCurrency', e.target.value)}>
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tax Label</label>
              <input className="form-input" value={settings?.taxLabel || ''} onChange={(e) => update('taxLabel', e.target.value)} placeholder="GST" />
            </div>
            <div className="form-group">
              <label className="form-label">Tax Rate (%)</label>
              <input type="number" className="form-input" value={(settings?.taxRate || 0) * 100} min={0} max={100} step={0.5}
                onChange={(e) => update('taxRate', parseFloat(e.target.value) / 100)} />
            </div>
            <div className="form-group">
              <label className="form-label">Price Includes Tax?</label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={settings?.taxIncluded === v} onChange={() => update('taxIncluded', v)} className="accent-primary-500" />
                    <span className="text-sm text-primary-600">{v ? 'Yes (inclusive)' : 'No (exclusive)'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Free Shipping Above (₹)</label>
                <input type="number" className="form-input" value={settings?.freeShippingThreshold || 0} onChange={(e) => update('freeShippingThreshold', parseFloat(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Shipping Cost (₹)</label>
                <input type="number" className="form-input" value={settings?.defaultShippingCost || 0} onChange={(e) => update('defaultShippingCost', parseFloat(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Theme ──────────────────────────── */}
        {activeTab === 'Theme' && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-primary-600 pb-2 border-b border-surface-100">Theme & Appearance</h3>
            <div className="form-group">
              <label className="form-label">Default Theme</label>
              <div className="flex gap-3">
                {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => update('defaultTheme', t)}
                    className={clsx(
                      'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                      settings?.defaultTheme === t ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-surface-200 text-primary-400 hover:border-primary-200'
                    )}
                  >
                    {t === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings?.primaryColor || '#335765'} onChange={(e) => update('primaryColor', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-surface-200" />
                  <input className="form-input font-mono text-sm" value={settings?.primaryColor || ''} onChange={(e) => update('primaryColor', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings?.accentColor || '#74A8A4'} onChange={(e) => update('accentColor', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-surface-200" />
                  <input className="form-input font-mono text-sm" value={settings?.accentColor || ''} onChange={(e) => update('accentColor', e.target.value)} />
                </div>
              </div>
            </div>
            {/* Palette Preview */}
            <div>
              <label className="form-label">Coastal Retreat Palette</label>
              <div className="flex gap-2">
                {['#335765','#74A8A4','#B6D9E0','#DBE2DC','#7F543D'].map((c) => (
                  <div key={c} className="flex-1 text-center">
                    <div className="h-12 rounded-xl border border-surface-200 cursor-pointer hover:scale-105 transition-transform" style={{ background: c }} onClick={() => update('primaryColor', c)} />
                    <p className="text-[9px] text-primary-400 mt-1 font-mono">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Social Media ────────────────────── */}
        {activeTab === 'Social Media' && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-primary-600 pb-2 border-b border-surface-100">Social Media Links</h3>
            {[
              { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
              { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/yourhandle' },
              { key: 'whatsapp', label: 'WhatsApp', placeholder: '+91 98765 43210' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" value={settings?.socialMedia?.[key] || ''} onChange={(e) => updateNested('socialMedia', key, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
          </div>
        )}

        {/* ─── Invoice ─────────────────────────── */}
        {activeTab === 'Invoice' && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-primary-600 pb-2 border-b border-surface-100">Invoice Configuration</h3>
            <div className="form-group">
              <label className="form-label">Invoice Number Prefix</label>
              <input className="form-input font-mono" value={settings?.invoicePrefix || 'INV'} onChange={(e) => update('invoicePrefix', e.target.value)} placeholder="INV" />
              <p className="text-xs text-primary-400 mt-1">Invoices will be numbered like: {settings?.invoicePrefix || 'INV'}-2025-00001</p>
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Footer Note</label>
              <textarea className="form-textarea" rows={3} value={settings?.invoiceFooterNote || ''} onChange={(e) => update('invoiceFooterNote', e.target.value)} placeholder="Thank you for your business!" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteSettings;
