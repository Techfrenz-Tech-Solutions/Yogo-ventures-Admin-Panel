/**
 * pages/SiteSettings.jsx — Site Configuration
 * ─────────────────────────────────────────────
 * Tabs: General · Social Media · Invoice
 */

import { useState, useEffect } from 'react';
import { settingsAPI, quoteConfirmationEmailAPI } from '../services/api';
import { Modal } from '../components/ui';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = ['General', 'Social Media', 'Invoice', 'Quote Confirmation Email'];

const SiteSettings = () => {
  const [activeTab, setActiveTab] = useState('General');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Quote Confirmation Email tab (separate backend resource) ──────────
  const [emailSettings, setEmailSettings] = useState(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await settingsAPI.get();
        setSettings(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();

    const fetchEmailSettings = async () => {
      try {
        const { data } = await quoteConfirmationEmailAPI.get();
        if (data.status === 1) setEmailSettings(data.data);
        else toast.error(data.message || 'Failed to load email settings.');
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load email settings.');
      } finally {
        setEmailLoading(false);
      }
    };
    fetchEmailSettings();
  }, []);

  const update = (field, value) => setSettings((s) => ({ ...s, [field]: value }));
  const updateNested = (parent, field, value) => setSettings((s) => ({ ...s, [parent]: { ...s[parent], [field]: value } }));
  const updateEmail = (field, value) => setEmailSettings((s) => ({ ...s, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('Settings saved successfully.');
    } catch {}
    finally { setSaving(false); }
  };

  const handleSaveEmailSettings = async () => {
    setEmailSaving(true);
    try {
      const { data } = await quoteConfirmationEmailAPI.update(emailSettings);
      if (data.status === 1) {
        setEmailSettings(data.data);
        toast.success('Quote confirmation email settings saved.');
      } else {
        toast.error(data.message || 'Failed to save email settings.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save email settings.');
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePreviewEmail = async () => {
    setPreviewLoading(true);
    try {
      const { data } = await quoteConfirmationEmailAPI.preview(emailSettings);
      if (data.status === 1) {
        setPreviewHtml(data.data.html);
        setPreviewOpen(true);
      } else {
        toast.error(data.message || 'Failed to render preview.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to render preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const { data } = await quoteConfirmationEmailAPI.sendTest({ recipient: testRecipient.trim() || undefined });
      if (data.status === 1) toast.success(data.message || 'Test email sent.');
      else toast.error(data.message || 'Failed to send test email.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send test email.');
    } finally {
      setSendingTest(false);
    }
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
        {activeTab === 'Quote Confirmation Email' ? (
          <button onClick={handleSaveEmailSettings} disabled={emailSaving || emailLoading} className="btn-primary">
            {emailSaving ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</> : 'Save Settings'}
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</> : 'Save Settings'}
          </button>
        )}
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

        {/* ─── Quote Confirmation Email ────────── */}
        {activeTab === 'Quote Confirmation Email' && (
          emailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="spinner" /><span className="ml-3 text-primary-400">Loading email settings...</span>
            </div>
          ) : !emailSettings ? (
            <p className="text-sm text-primary-400 py-8 text-center">
              Could not load the quote confirmation template. It may not have been seeded yet.
            </p>
          ) : (
            <div className="space-y-4">
              <h3 className="font-heading text-lg font-semibold text-primary-600 pb-2 border-b border-surface-100">
                Quote Confirmation Email
              </h3>
              <p className="text-xs text-primary-400 -mt-2">
                Controls the automated email sent to customers after they submit a "Get Quote" enquiry on the website.
                The visual layout is protected — only the text and display options below are editable here.
              </p>

              <div className="form-group">
                <label className="form-label">Enable Quote Confirmation Email</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateEmail('is_active', !emailSettings.is_active)}
                    className={clsx('relative w-11 h-6 rounded-full transition-colors', emailSettings.is_active ? 'bg-success-500' : 'bg-surface-300')}
                  >
                    <div className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', emailSettings.is_active ? 'translate-x-5.5 left-0.5' : 'left-0.5')} />
                  </button>
                  <span className="text-sm text-primary-500">{emailSettings.is_active ? 'Enabled — sent on every new quote enquiry' : 'Disabled — quotes are still saved, no email is sent'}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Subject</label>
                <input className="form-input" value={emailSettings.subject || ''} onChange={(e) => updateEmail('subject', e.target.value)} maxLength={255} placeholder="Your YoGo Ventures Quote Request — {{QUOTE_REFERENCE}}" />
              </div>

              <div className="form-group">
                <label className="form-label">Email Heading</label>
                <input className="form-input" value={emailSettings.heading || ''} onChange={(e) => updateEmail('heading', e.target.value)} maxLength={255} placeholder="Thank You for Your Enquiry!" />
              </div>

              <div className="form-group">
                <label className="form-label">Introductory Message</label>
                <textarea className="form-textarea" rows={2} maxLength={1000} value={emailSettings.intro_text || ''} onChange={(e) => updateEmail('intro_text', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Response-Time Message</label>
                <textarea className="form-textarea" rows={2} maxLength={500} value={emailSettings.response_text || ''} onChange={(e) => updateEmail('response_text', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Message</label>
                <textarea className="form-textarea" rows={2} maxLength={500} value={emailSettings.footer_text || ''} onChange={(e) => updateEmail('footer_text', e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Sender Display Name</label>
                  <input className="form-input" value={emailSettings.sender_name || ''} onChange={(e) => updateEmail('sender_name', e.target.value)} maxLength={150} placeholder="YoGo Ventures" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reply-To Email</label>
                  <input className="form-input" type="email" value={emailSettings.reply_to || ''} onChange={(e) => updateEmail('reply_to', e.target.value)} placeholder="support@yogoventures.com" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Display Options</label>
                <div className="space-y-2">
                  {[
                    { key: 'show_phone', label: 'Show customer phone number' },
                    { key: 'show_message', label: 'Show customer message' },
                    { key: 'show_product_images', label: 'Show product images' },
                    { key: 'show_product_variants', label: 'Show product variants / colour' },
                    { key: 'show_quantities', label: 'Show quantities' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-primary-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!emailSettings[key]}
                        onChange={(e) => updateEmail(key, e.target.checked)}
                        className="w-4 h-4 rounded border-surface-300"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-surface-100 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handlePreviewEmail} disabled={previewLoading} className="btn-outline">
                    {previewLoading ? 'Rendering...' : 'Preview Email'}
                  </button>
                  <input
                    className="form-input max-w-[240px]"
                    placeholder="Test recipient email (optional)"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                  />
                  <button onClick={handleSendTest} disabled={sendingTest} className="btn-outline">
                    {sendingTest ? 'Sending...' : 'Send Test Email'}
                  </button>
                </div>
                <p className="text-xs text-primary-400">
                  Preview and test emails use sample quote data — they don't affect real customer data or send to real customers.
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* ─── Email Preview Modal ──────────────── */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Quote Confirmation Email Preview" size="xl">
        <iframe
          title="Quote confirmation email preview"
          sandbox=""
          srcDoc={previewHtml}
          style={{ width: '100%', height: '70vh', border: 'none', background: '#fff' }}
        />
      </Modal>
    </div>
  );
};

export default SiteSettings;
