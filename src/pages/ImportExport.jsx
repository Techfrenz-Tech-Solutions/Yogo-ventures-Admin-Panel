/**
 * pages/ImportExport.jsx — Bulk Data Import & Export
 * ─────────────────────────────────────────────
 * Features:
 *  - Drag-and-drop CSV/Excel product import
 *  - Preview table before import
 *  - Bulk product export to CSV/Excel
 *  - Import result summary
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { productAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── Expected CSV headers ──────────────────────
const TEMPLATE_HEADERS = ['name','category','brand','price','salePrice','currency','description','stockQty','tags','isPublished'];

// ─── Download Template ──────────────────────
const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ['Sample Product', 'Electronics', 'Samsung', 999, 799, 'INR', 'A great product', 50, 'tech,sale', true],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products Template');
  XLSX.writeFile(wb, 'product-import-template.xlsx');
  toast.success('Template downloaded.');
};

// ─── Export Products ──────────────────────────
const handleExportProducts = async () => {
  try {
    const { data } = await productAPI.getAll({ limit: 1000 });
    const products = data.data || [];
    const rows = products.map((p) => ({
      name: p.name, category: p.category?.name || '', brand: p.brand || '',
      price: p.price, salePrice: p.salePrice || '', currency: p.currency,
      description: p.description || '', stockQty: p.stockQty,
      stockStatus: p.stockStatus, tags: p.tags?.join(',') || '',
      isPublished: p.isPublished, createdAt: new Date(p.createdAt).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `products-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} products.`);
  } catch { toast.error('Export failed.'); }
};

// ─── Main Component ────────────────────────────
const ImportExport = () => {
  const [parsed, setParsed] = useState([]);        // preview rows
  const [headers, setHeaders] = useState([]);       // column headers
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileName, setFileName] = useState('');

  // ─── Dropzone ─────────────────────────────
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setHeaders(result.meta.fields || []);
          setParsed(result.data.slice(0, 5)); // preview first 5
          toast.success(`Parsed ${result.data.length} rows from CSV.`);
        },
        error: () => toast.error('Failed to parse CSV.'),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setHeaders(Object.keys(data[0] || {}));
        setParsed(data.slice(0, 5));
        toast.success(`Parsed ${data.length} rows from Excel.`);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Only CSV and Excel files are supported.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
  });

  // ─── Import ───────────────────────────────
  const handleImport = async () => {
    if (parsed.length === 0) return toast.error('No data to import.');
    setImportLoading(true);
    try {
      const { data } = await productAPI.bulkImport(parsed);
      setImportResult(data.results);
      toast.success(data.message);
      setParsed([]);
      setFileName('');
    } catch { toast.error('Import failed.'); }
    finally { setImportLoading(false); }
  };

  const clearFile = () => { setParsed([]); setHeaders([]); setFileName(''); setImportResult(null); };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Import / Export Data</h1>
          <p className="text-primary-400 text-sm mt-0.5">Bulk manage your product catalog</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Import Section ──────────────────── */}
        <div className="space-y-5">
          <div className="card">
            <h3 className="font-heading text-lg font-semibold text-primary-600 mb-1">Import Products</h3>
            <p className="text-primary-400 text-sm mb-4">Upload a CSV or Excel file to bulk-add or update products.</p>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-surface-300 hover:border-primary-300 hover:bg-primary-50/50'}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                </div>
                {fileName ? (
                  <div>
                    <p className="font-medium text-primary-600 text-sm">{fileName}</p>
                    <p className="text-primary-400 text-xs mt-0.5">{parsed.length > 0 ? `${parsed.length} rows previewed` : 'Processing...'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-primary-600 font-medium text-sm">
                      {isDragActive ? 'Drop it here!' : 'Drag & drop your file here'}
                    </p>
                    <p className="text-primary-400 text-xs mt-1">or click to browse · CSV, XLS, XLSX</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button onClick={downloadTemplate} className="btn-outline flex-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                Download Template
              </button>
              {fileName && (
                <button onClick={clearFile} className="btn-ghost text-danger-500">Clear</button>
              )}
            </div>
          </div>

          {/* Required Columns Guide */}
          <div className="card bg-primary-50 border border-primary-100">
            <h4 className="text-sm font-semibold text-primary-600 mb-3">Required CSV Columns</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATE_HEADERS.map((h) => (
                <div key={h} className="flex items-center gap-1.5 text-xs text-primary-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  <code className="font-mono">{h}</code>
                </div>
              ))}
            </div>
            <p className="text-xs text-primary-400 mt-3">
              <strong>Note:</strong> Use the category <em>name</em> (not ID). Missing optional fields will use defaults.
            </p>
          </div>
        </div>

        {/* ─── Export Section ───────────────────── */}
        <div className="space-y-5">
          <div className="card">
            <h3 className="font-heading text-lg font-semibold text-primary-600 mb-1">Export Data</h3>
            <p className="text-primary-400 text-sm mb-5">Download your store data for backup or analysis.</p>

            <div className="space-y-3">
              {[
                { label: 'Products Catalog', desc: 'All products with details, pricing, stock', action: handleExportProducts, icon: '📦' },
                { label: 'Category List', desc: 'All active categories', action: () => toast('Coming soon'), icon: '🗂️' },
                { label: 'Orders Data', desc: 'All orders with customer info', action: () => toast('Coming soon'), icon: '🧾' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-surface-50 rounded-xl hover:bg-primary-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-primary-700 text-sm">{item.label}</p>
                      <p className="text-xs text-primary-400">{item.desc}</p>
                    </div>
                  </div>
                  <button onClick={item.action} className="btn-secondary btn-sm flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    Export
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Preview Table ─────────────────────── */}
      {parsed.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-primary-600">Import Preview</h3>
              <p className="text-xs text-primary-400 mt-0.5">Showing first {parsed.length} rows · review before importing</p>
            </div>
            <button
              onClick={handleImport}
              disabled={importLoading}
              className="btn-primary"
            >
              {importLoading ? (
                <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Importing...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Confirm Import</>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {parsed.map((row, i) => (
                  <tr key={i}>{headers.map((h) => <td key={h}>{String(row[h] ?? '—')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Import Result ────────────────────── */}
      {importResult && (
        <div className={`card border ${importResult.failed > 0 ? 'border-warning-300 bg-warning-50' : 'border-success-300 bg-success-50'}`}>
          <h3 className="font-heading text-lg font-semibold mb-3" style={{ color: importResult.failed > 0 ? '#d97706' : '#059669' }}>
            Import Complete
          </h3>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-success-600">{importResult.success}</div>
              <div className="text-xs text-success-500 mt-0.5">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-danger-600">{importResult.failed}</div>
              <div className="text-xs text-danger-500 mt-0.5">Failed</div>
            </div>
          </div>
          {importResult.errors?.length > 0 && (
            <div className="mt-4 space-y-1 max-h-32 overflow-y-auto">
              {importResult.errors.map((err, i) => (
                <div key={i} className="text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-1.5">
                  Row {err.row}: {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportExport;
