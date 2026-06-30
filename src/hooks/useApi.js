/**
 * hooks/useApi.js — Generic API data fetching hook
 * ─────────────────────────────────────────────
 * Manages loading, data, error state for any API call.
 *
 * Usage:
 *   const { data, loading, error, execute, reset } = useApi(productAPI.getAll);
 *   useEffect(() => { execute({ page: 1 }); }, []);
 */

import { useState, useCallback, useRef } from 'react';

const useApi = (apiFn) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFn(...args);
        setData(response.data);
        return response.data;
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'An error occurred';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

export default useApi;
