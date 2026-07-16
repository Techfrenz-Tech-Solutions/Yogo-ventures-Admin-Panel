/**
 * hooks/useExcelExport.js — shared "Export" button behaviour for the admin
 * list pages (Quote/Contact/General Enquiries, Customer Master, Order
 * Tracking). The workbook itself is generated server-side (see
 * helper/excelExport.js on the backend) — this hook just calls the export
 * endpoint with the page's active filters, downloads the returned .xlsx
 * blob, and tracks the in-flight/error state the button needs.
 */
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import Api from '../utils/Api';

// fallbackPrefix mirrors buildExportFilename() on the backend
// ("<prefix>-dd-mm-yyyy.xlsx") — only used if Content-Disposition wasn't
// readable (e.g. a proxy stripped it), so exports are still named per-page
// rather than all collapsing to a generic "export.xlsx".
function fallbackFilename(prefix) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${prefix}-${dd}-${mm}-${yyyy}.xlsx`;
}

export function useExcelExport(endpoint, fallbackPrefix = 'export') {
  const [exporting, setExporting] = useState(false);

  const runExport = useCallback(async (params = {}) => {
    if (exporting) return; // guard against repeated clicks while in flight
    setExporting(true);
    try {
      const res = await Api.get(endpoint, {
        params,
        responseType: 'blob',
        timeout: 60000, // exports can take longer than the default 8s
      });

      // Prefer the server-provided filename (Content-Disposition) so it
      // stays in sync with buildExportFilename() on the backend without
      // duplicating the "prefix-dd-mm-yyyy.xlsx" logic here.
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || fallbackFilename(fallbackPrefix);

      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // The blob response type means an error JSON body also arrives as a
      // Blob — read it back out to surface the real message if present.
      let message = 'Failed to export. Please try again.';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch { /* not JSON — keep the default message */ }
      } else {
        message = err?.response?.data?.message || message;
      }
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, [endpoint, exporting, fallbackPrefix]);

  return { exporting, runExport };
}
