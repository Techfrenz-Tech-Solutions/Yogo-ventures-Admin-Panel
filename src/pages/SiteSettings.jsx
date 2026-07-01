/**
 * pages/SiteSettings.jsx — Site Configuration
 * ─────────────────────────────────────────────
 * Tabs: General · Social Media · Invoice
 */

import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = ['General', 'Social Media', 'Invoice'];

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
