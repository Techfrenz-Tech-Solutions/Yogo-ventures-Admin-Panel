/**
 * hooks/usePagedRows.js — shared client-side pagination for admin table
 * pages. Every table page here already fetches its full (filtered) row
 * set from the backend in one call — this hook just slices that array for
 * display, so no backend changes are needed for these pages (see
 * useServerPagedRows.js for the one endpoint, if any, that needs a real
 * `limit` query param instead).
 *
 * Usage:
 *   const { paged, page, setPage, rowsPerPage, setRowsPerPage, totalPages,
 *           total, rangeStart, rangeEnd } = usePagedRows('/category-master', filtered);
 *   ...render `paged` instead of `filtered` in the table body...
 *   <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
 *     total={total} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} />
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

export const ROWS_PER_PAGE_OPTIONS = [10, 50, 100, 200];
const DEFAULT_ROWS_PER_PAGE = 10;

function readStoredRowsPerPage(storageKey) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const num = Number(raw);
    return ROWS_PER_PAGE_OPTIONS.includes(num) ? num : DEFAULT_ROWS_PER_PAGE;
  } catch {
    // sessionStorage unavailable (private browsing, disabled storage, a
    // corrupted/inaccessible value) — default rather than throw.
    return DEFAULT_ROWS_PER_PAGE;
  }
}

/**
 * pageKey should be the route path (e.g. '/category-master') so each
 * table page's preference is stored under its own sessionStorage key
 * (`rowsPerPage:/category-master`) and changing one page's rows-per-page
 * never affects another page.
 *
 * options.jumpToId: pass the dashboard `?highlight=<id>` value (see
 * useRowHighlight) on pages that support it — when the matching row is
 * found in `rows`, pagination jumps to whichever page it falls on, so the
 * highlight/scroll-into-view behaviour still finds a rendered row instead
 * of silently doing nothing because the target is on a hidden page.
 */
export function usePagedRows(pageKey, rows, options = {}) {
  const { jumpToId, jumpToIdKey = 'id' } = options;
  const storageKey = `rowsPerPage:${pageKey}`;
  const [rowsPerPage, setRowsPerPageState] = useState(() => readStoredRowsPerPage(storageKey));
  const [page, setPage] = useState(1);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  // Filtering/search can shrink the result set enough that the current
  // page no longer exists — clamp to the new last page rather than always
  // forcing back to page 1, so a still-valid page isn't disrupted by an
  // unrelated filter tweak (only rows-per-page changes force page 1, per
  // setRowsPerPage below).
  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (jumpToId == null) return;
    const idx = rows.findIndex(r => String(r[jumpToIdKey]) === String(jumpToId));
    if (idx === -1) return; // not loaded yet, or filtered out — nothing to jump to
    setPage(Math.floor(idx / rowsPerPage) + 1);
  }, [jumpToId, jumpToIdKey, rows, rowsPerPage]);

  const setRowsPerPage = useCallback((value) => {
    const num = Number(value);
    const safe = ROWS_PER_PAGE_OPTIONS.includes(num) ? num : DEFAULT_ROWS_PER_PAGE;
    setRowsPerPageState(safe);
    setPage(1);
    try {
      window.sessionStorage.setItem(storageKey, String(safe));
    } catch {
      // In-memory state still works even if persistence fails.
    }
  }, [storageKey]);

  const paged = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  return {
    paged,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    total,
    rangeStart: total === 0 ? 0 : (page - 1) * rowsPerPage + 1,
    rangeEnd: Math.min(page * rowsPerPage, total),
  };
}
