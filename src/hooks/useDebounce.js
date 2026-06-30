/**
 * hooks/useDebounce.js — Debounce value hook
 */
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/**
 * hooks/usePagination.js — Pagination state hook
 */
export const usePagination = (initialPage = 1, initialLimit = 20) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };
  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  const resetPage = () => setPage(1);

  return {
    page, limit, total, totalPages,
    setPage, setLimit, setTotal,
    goToPage, nextPage, prevPage, resetPage,
  };
};

/**
 * hooks/useLocalStorage.js — Persistent state hook
 */
export const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const set = (val) => {
    try {
      const toStore = val instanceof Function ? val(value) : val;
      setValue(toStore);
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch {}
  };

  return [value, set];
};
