/**
 * pages/Invoices.jsx — Invoice Management
 * ─────────────────────────────────────────────
 * Features: List invoices, create/edit modal, PDF export,
 *           Excel export, status management.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoiceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── Status Badge ──────────────────────────────
const statusStyle = {
  draft:     'badge-neutral',
  sent:      'badge-info',
  paid:      'badge-success',
  overdue:   'badge-danger',
  cancelled: 'badge-neutral',
};

// ─── Empty Line Item ───────────────────────────
const emptyLine = () => ({
  description: '', quantity: 1, unitPrice: 0, taxRate: 0.18,
  taxAmount: 0, totalPrice: 0,
});

// ─── Invoice Form Modal ───────────────────────
const InvoiceModal = ({ invoice, onClose, onSaved }) => {
  const isEdit = !!invoice?._id;
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    billTo: { name: '', email: '', contact: '', address: { street: '', city: '', state: '', postalCode: '' }, gstin: '' },
    lineItems: [emptyLine()],
    dueDate: '',
    notes: '',
    terms: 'Payment due within 30 days.',
    currency: 'INR',
    discountAmount: 0,
    shippingAmount: 0,
    ...(isEdit ? invoice : {}),
  });

  // ─── Recalculate totals ────────────────────
  const recalcLine = (line) => {
    const base = line.quantity * line.unitPrice;
    const tax = base * (parseFloat(line.taxRate) || 0);
    return { ...line, taxAmount: tax, totalPrice: base + tax };
  };

  const subtotal = form.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalTax = form.lineItems.reduce((s, l) => s + (l.taxAmount || 0), 0);
  const grandTotal = subtotal + totalTax + Number(form.shippingAmount) - Number(form.discountAmount);

  const updateLine = (idx, field, value) => {
    const lines = [...form.lineItems];
    lines[idx] = recalcLine({ ...lines[idx], [field]: field === 'quantity' || field === 'unitPrice' || field === 'taxRate' ? parseFloat(value) || 0 : value });
    setForm((f) => ({ ...f, lineItems: lines }));
  };

  const addLine = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLine()] }));
  const removeLine = (idx) => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

  const handleBillTo = (field, value) => {
    setForm((f) => ({ ...f, billTo: { ...f.billTo, [field]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.billTo.name) return toast.error('Customer name is required.');
    if (form.lineItems.length === 0) return toast.error('Add at least one line item.');

    setLoading(true);
    const payload = { ...form, subtotal, taxAmount: totalTax, totalAmount: grandTotal };
    try {
      if (isEdit) {
        await invoiceAPI.update(invoice._id, payload);
        toast.success('Invoice updated.');
      } else {
        await invoiceAPI.create(payload);
        toast.success('Invoice created.');
      }
      onSaved();
      onClose();
    } catch {
      // toast shown by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <h3 className="font-heading text-xl font-semibold text-primary-600">
            {isEdit ? 'Edit Invoice' : 'Create New Invoice'}
          </h3>
          <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Bill To */}
          <div>
            <h4 className="text-sm font-semibold text-primary-500 uppercase tracking-wide mb-3">Bill To</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[['name','Customer Name *'],['email','Email'],['contact','Phone'],['gstin','GSTIN / Tax ID']].map(([k,l]) => (
                <div key={k}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={form.billTo[k] || ''} onChange={(e) => handleBillTo(k, e.target.value)} placeholder={l} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="form-label">Address</label>
                <div className="grid grid-cols-2 gap-2">
                  <input className="form-input" value={form.billTo.address?.street || ''} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, address: { ...f.billTo.address, street: e.target.value } } }))} placeholder="Street" />
                  <input className="form-input" value={form.billTo.address?.city || ''} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, address: { ...f.billTo.address, city: e.target.value } } }))} placeholder="City" />
                  <input className="form-input" value={form.billTo.address?.state || ''} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, address: { ...f.billTo.address, state: e.target.value } } }))} placeholder="State" />
                  <input className="form-input" value={form.billTo.address?.postalCode || ''} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, address: { ...f.billTo.address, postalCode: e.target.value } } }))} placeholder="PIN Code" />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.dueDate?.slice(0, 10) || ''} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select className="form-select" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-primary-500 uppercase tracking-wide">Line Items</h4>
              <button type="button" onClick={addLine} className="btn-secondary btn-sm">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.lineItems.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-surface-50 rounded-xl p-2">
                  <input className="form-input col-span-4 text-xs" placeholder="Description" value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} />
                  <input type="number" className="form-input col-span-2 text-xs" placeholder="Qty" value={line.quantity} min={1} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                  <input type="number" className="form-input col-span-2 text-xs" placeholder="Unit Price" value={line.unitPrice} min={0} step="0.01" onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
                  <div className="col-span-2">
                    <select className="form-select text-xs" value={line.taxRate} onChange={(e) => updateLine(idx, 'taxRate', e.target.value)}>
                      <option value={0}>0%</option>
                      <option value={0.05}>5%</option>
                      <option value={0.12}>12%</option>
                      <option value={0.18}>18%</option>
                      <option value={0.28}>28%</option>
                    </select>
                  </div>
                  <div className="col-span-1 text-xs text-primary-600 font-medium text-right">
                    {form.currency === 'INR' ? '₹' : '$'}{line.totalPrice.toFixed(2)}
                  </div>
                  <button type="button" onClick={() => removeLine(idx)} className="col-span-1 text-danger-400 hover:text-danger-600 p-1 rounded">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-primary-500"><span>Subtotal</span><span>{form.currency === 'INR' ? '₹' : '$'}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-primary-500"><span>Tax</span><span>{form.currency === 'INR' ? '₹' : '$'}{totalTax.toFixed(2)}</span></div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-primary-500">Discount</span>
                  <input type="number" className="form-input w-24 text-xs text-right" value={form.discountAmount} min={0} step="0.01" onChange={(e) => setForm((f) => ({ ...f, discountAmount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-primary-500">Shipping</span>
                  <input type="number" className="form-input w-24 text-xs text-right" value={form.shippingAmount} min={0} step="0.01" onChange={(e) => setForm((f) => ({ ...f, shippingAmount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="flex justify-between font-bold text-primary-600 border-t border-primary-100 pt-2">
                  <span>Total</span>
                  <span className="text-lg">{form.currency === 'INR' ? '₹' : '$'}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea text-sm" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Thank you for your business!" />
            </div>
            <div>
              <label className="form-label">Terms & Conditions</label>
              <textarea className="form-textarea text-sm" rows={3} value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</> : (isEdit ? 'Update Invoice' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────
const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await invoiceAPI.getAll({ page: pagination.page, limit: 20, search: searchTerm, status: statusFilter });
      setInvoices(data.data || []);
      setPagination((p) => ({ ...p, total: data.pagination?.total || 0, pages: data.pagination?.pages || 1 }));
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, [pagination.page, searchTerm, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDownloadPDF = async (inv) => {
    try {
      const { data } = await invoiceAPI.exportPDF(inv._id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${inv.invoiceNumber}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success('PDF downloaded.');
    } catch { toast.error('Failed to download PDF.'); }
  };

  const handleExcelExport = async () => {
    setExportLoading(true);
    try {
      const { data } = await invoiceAPI.exportExcel();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', 'invoices.xlsx');
      document.body.appendChild(link); link.click(); link.remove();
      toast.success('Excel exported.');
    } catch { toast.error('Export failed.'); }
    finally { setExportLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoiceAPI.delete(id);
      toast.success('Invoice deleted.');
      fetchInvoices();
    } catch {}
  };

  const openCreate = () => { setSelectedInvoice(null); setModalOpen(true); };
  const openEdit = (inv) => { setSelectedInvoice(inv); setModalOpen(true); };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Management</h1>
          <p className="text-primary-400 text-sm mt-0.5">Create, manage and export invoices</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExcelExport} disabled={exportLoading} className="btn-outline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {exportLoading ? 'Exporting...' : 'Export Excel'}
          </button>
          {/* <button onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New Invoice
          </button> */}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="w-4 h-4 text-primary-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input className="form-input pl-9 w-full" placeholder="Search by number or customer..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} />
        </div>
        <select className="form-select w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner" /><span className="ml-3 text-primary-400 text-sm">Loading invoices...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th><th>Customer</th><th>Issue Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-primary-300">No invoices found.</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td><span className="font-medium text-primary-600 font-mono text-xs">{inv.invoiceNumber}</span></td>
                    <td>
                      <div className="font-medium text-primary-700">{inv.billTo?.name}</div>
                      <div className="text-xs text-primary-400">{inv.billTo?.email}</div>
                    </td>
                    <td className="text-sm">{inv.issueDate ? format(new Date(inv.issueDate), 'dd MMM yyyy') : '—'}</td>
                    <td className="text-sm">{inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}</td>
                    <td>
                      <span className="font-semibold text-primary-600">
                        {inv.currency === 'INR' ? '₹' : '$'}{inv.totalAmount?.toFixed(2)}
                      </span>
                    </td>
                    <td><span className={statusStyle[inv.status] || 'badge-neutral'}>{inv.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(inv)} className="btn-icon text-primary-400 hover:text-primary-600" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onClick={() => handleDownloadPDF(inv)} className="btn-icon text-primary-400 hover:text-primary-600" title="Download PDF">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(inv._id)} className="btn-icon text-danger-400 hover:text-danger-600" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 text-sm">
            <span className="text-primary-400">Total: {pagination.total} invoices</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${pagination.page === p ? 'bg-primary-500 text-white' : 'text-primary-500 hover:bg-primary-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setModalOpen(false)}
          onSaved={fetchInvoices}
        />
      )}
    </div>
  );
};

export default Invoices;
