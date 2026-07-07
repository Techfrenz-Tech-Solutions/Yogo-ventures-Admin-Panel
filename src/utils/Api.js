import axios from "axios";

const Api = axios.create({
  // In dev, Vite proxies /api → http://192.168.0.29:7002 (no CORS issue).
  // In production, set VITE_API_BASE_URL to the actual server origin.
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 8000, // 8s — fail fast if backend is restarting
});

// Response interceptor — normalise network/timeout errors into readable messages
Api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      err.response = err.response || {};
      err.response.data = { message: 'Request timed out. The server may be restarting — please try again.' };
    } else if (!err.response) {
      err.response = { data: { message: 'Unable to reach the server. Please check your connection.' } };
    }
    return Promise.reject(err);
  }
);

export default Api;