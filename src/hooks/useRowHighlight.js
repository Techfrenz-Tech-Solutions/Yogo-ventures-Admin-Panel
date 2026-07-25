/**
 * hooks/useRowHighlight.js — temporary row highlight driven by a
 * `?highlight=<id>` URL query param (used by the Dashboard's enquiry
 * preview cards to deep-link into a specific row on a listing page).
 *
 * Usage:
 *   const highlightedId = useRowHighlight(items, loading);
 *   ...
 *   <tr data-row-id={item.id} style={highlightedId === String(item.id) ? HIGHLIGHT_STYLE : undefined}>
 *
 * - Waits for `loading` to finish and for the target row to actually be
 *   present in `items` (handles async API loading).
 * - Scrolls the matching row into view.
 * - Applies the highlight for a few seconds, then clears it.
 * - Strips the `highlight` param from the URL afterwards so a refresh
 *   doesn't repeat the animation.
 * - Never mutates the record itself — purely a client-side visual effect.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const HIGHLIGHT_STYLE = { backgroundColor: '#FEF9C3', transition: 'background-color 0.3s ease' };

export function useRowHighlight(items, loading, idKey = 'id') {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const [activeHighlight, setActiveHighlight] = useState(null);
  const triggeredRef = useRef(null);

  useEffect(() => {
    if (!highlightParam) {
      triggeredRef.current = null;
      return;
    }
    if (triggeredRef.current === highlightParam) return;
    if (loading) return;

    const match = items.find(i => String(i[idKey]) === String(highlightParam));
    if (!match) return; // not loaded yet (or filtered out) — effect re-runs as items change

    triggeredRef.current = highlightParam;

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-row-id="${CSS.escape(String(highlightParam))}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    setActiveHighlight(String(highlightParam));

    const clearHighlight = setTimeout(() => setActiveHighlight(null), 3500);
    const clearParam = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
    }, 3500);

    return () => { clearTimeout(clearHighlight); clearTimeout(clearParam); };
  }, [highlightParam, loading, items, idKey, setSearchParams]);

  return activeHighlight;
}
