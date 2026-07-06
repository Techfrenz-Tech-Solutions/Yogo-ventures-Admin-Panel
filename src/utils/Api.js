import axios from "axios";

const Api = axios.create({
  // In dev, Vite proxies /api → http://localhost:7002 (no CORS issue).
  // In production, set VITE_API_BASE_URL to the actual server origin.
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export default Api;