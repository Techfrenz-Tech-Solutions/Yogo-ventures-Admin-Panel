/**
 * services/api.js — Axios Instance + Demo Mode Auto-Fallback
 * ─────────────────────────────────────────────
 * Auto-detects if backend is running. If not → Demo Mode.
 * Demo credentials: admin@demo.com / Admin@123
 */

import axios from 'axios';
import toast from 'react-hot-toast';
import {
  mockAuthAPI, mockProductAPI, mockCategoryAPI,
  mockOrderAPI, mockInvoiceAPI, mockChatAPI,
  mockAnalyticsAPI, mockSettingsAPI, mockProfileAPI,
  mockParentCategoryAPI, mockCountryAPI,
} from './mockApi';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const FORCE_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

let _isDemoMode = FORCE_DEMO;

export const isDemoMode = () => _isDemoMode;

// ─── Gate: resolves once backend status is known ──
// proxy() awaits this before deciding real vs mock.
const _backendReady = FORCE_DEMO
  ? Promise.resolve()           // demo forced — resolve immediately
  : axios
      .get(BASE_URL.replace('/api', '/api/health'), { timeout: 3000 })
      .then(() => { _isDemoMode = false; })
      .catch(() => {
        _isDemoMode = true;
        console.info('[API] Backend unreachable — Demo Mode active. Use admin@demo.com / Admin@123');
      });

export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('adminUser');
};

const api = axios.create({ baseURL: BASE_URL, timeout: 15000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = getRefreshToken();
      if (!refreshToken) { clearTokens(); window.location.href = '/login'; return Promise.reject(error); }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        setTokens(data.accessToken, null);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally { isRefreshing = false; }
    }
    if (error.response?.status >= 500) toast.error('Server error. Please try again.');
    return Promise.reject(error);
  }
);

const proxy = (realFn, mockFn) => async (...args) => {
  // Wait for the health check to finish before choosing real vs mock
  await _backendReady;
  return _isDemoMode ? mockFn(...args) : realFn(...args);
};

export const authAPI = {
  login:           proxy((d) => api.post('/auth/login', d),          mockAuthAPI.login),
  verifyMFA:       proxy((d) => api.post('/auth/mfa/verify', d),     mockAuthAPI.verifyMFA),
  setupMFA:        proxy(() => api.get('/auth/mfa/setup'),           mockAuthAPI.setupMFA),
  confirmMFASetup: proxy((d) => api.post('/auth/mfa/confirm', d),    mockAuthAPI.confirmMFASetup),
  logout:          proxy(() => api.post('/auth/logout'),             mockAuthAPI.logout),
  getMe:           proxy(() => api.get('/auth/me'),                  mockAuthAPI.getMe),
};

export const productAPI = {
  getAll:     proxy((p) => api.get('/products', { params: p }),    mockProductAPI.getAll),
  getById:    proxy((id) => api.get(`/products/${id}`),            mockProductAPI.getById),
  create:     proxy((d) => api.post('/products', d, { headers: { 'Content-Type': 'multipart/form-data' } }), mockProductAPI.create),
  update:     proxy((id, d) => api.put(`/products/${id}`, d, { headers: { 'Content-Type': 'multipart/form-data' } }), mockProductAPI.update),
  delete:     proxy((id) => api.delete(`/products/${id}`),         mockProductAPI.delete),
  bulkImport: proxy((p) => api.post('/products/bulk', { products: p }), mockProductAPI.bulkImport),
  getStats:   proxy(() => api.get('/products/stats'),              mockProductAPI.getStats),
};

export const categoryAPI = {
  getAll:  proxy((p) => api.get('/categories', { params: p }),   mockCategoryAPI.getAll),
  getById: proxy((id) => api.get(`/categories/${id}`),           mockCategoryAPI.getById),
  create:  proxy((d) => api.post('/categories', d),              mockCategoryAPI.create),
  update:  proxy((id, d) => api.put(`/categories/${id}`, d),     mockCategoryAPI.update),
  delete:  proxy((id) => api.delete(`/categories/${id}`),        mockCategoryAPI.delete),
};
export const parentCategoryAPI = {
  getAll:  proxy((p) => api.get('/parent-categories', { params: p }),   mockParentCategoryAPI.getAll),
  getById: proxy((id) => api.get(`/parent-categories/${id}`),           mockParentCategoryAPI.getById),
  create:  proxy((d) => api.post('/parent-categories', d),              mockParentCategoryAPI.create),
  update: proxy((id, d) => api.put(`/parent-categories/${id}`, d),     mockParentCategoryAPI.update),
  delete: proxy((id) => api.delete(`/parent-categories/${id}`),        mockParentCategoryAPI.delete),
};

export const countryAPI = {
  getAll:  proxy((p) => api.get('/countries', { params: p }),   mockCountryAPI.getAll),
  getById: proxy((id) => api.get(`/countries/${id}`),           mockCountryAPI.getById),
  create:  proxy((d) => api.post('/countries', d),              mockCountryAPI.create),
  update: proxy((id, d) => api.put(`/countries/${id}`, d),     mockCountryAPI.update),
  delete: proxy((id) => api.delete(`/countries/${id}`),        mockCountryAPI.delete),
};
export const orderAPI = {
  getAll:       proxy((p) => api.get('/orders', { params: p }),             mockOrderAPI.getAll),
  getById:      proxy((id) => api.get(`/orders/${id}`),                     mockOrderAPI.getById),
  updateStatus: proxy((id, d) => api.patch(`/orders/${id}/status`, d),      mockOrderAPI.updateStatus),
  delete:       proxy((id) => api.delete(`/orders/${id}`),                  mockOrderAPI.delete),
};

export const invoiceAPI = {
  getAll:      proxy((p) => api.get('/invoices', { params: p }),                           mockInvoiceAPI.getAll),
  getById:     proxy((id) => api.get(`/invoices/${id}`),                                   mockInvoiceAPI.getById),
  create:      proxy((d) => api.post('/invoices', d),                                      mockInvoiceAPI.create),
  update:      proxy((id, d) => api.put(`/invoices/${id}`, d),                             mockInvoiceAPI.update),
  delete:      proxy((id) => api.delete(`/invoices/${id}`),                                mockInvoiceAPI.delete),
  exportPDF:   proxy((id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),     mockInvoiceAPI.exportPDF),
  exportExcel: proxy(() => api.get('/invoices/export/excel', { responseType: 'blob' }),   mockInvoiceAPI.exportExcel),
};

export const chatAPI = {
  getAll:       proxy((p) => api.get('/chats', { params: p }),            mockChatAPI.getAll),
  getById:      proxy((id) => api.get(`/chats/${id}`),                    mockChatAPI.getById),
  reply:        proxy((id, d) => api.post(`/chats/${id}/reply`, d),       mockChatAPI.reply),
  updateStatus: proxy((id, d) => api.patch(`/chats/${id}/status`, d),     mockChatAPI.updateStatus),
};

export const analyticsAPI = {
  getDashboard:      proxy(() => api.get('/analytics/dashboard'),                        mockAnalyticsAPI.getDashboard),
  getSalesChart:     proxy((p) => api.get('/analytics/sales', { params: { period: p } }), mockAnalyticsAPI.getSalesChart),
  getTopProducts:    proxy(() => api.get('/analytics/top-products'),                     mockAnalyticsAPI.getTopProducts),
  getOrdersByStatus: proxy(() => api.get('/analytics/orders-by-status'),                 mockAnalyticsAPI.getOrdersByStatus),
};

export const settingsAPI = {
  get:    proxy(() => api.get('/settings'),          mockSettingsAPI.get),
  update: proxy((d) => api.put('/settings', d),      mockSettingsAPI.update),
};

export const profileAPI = {
  get:            proxy(() => api.get('/profile'),                                                          mockProfileAPI.get),
  update:         proxy((d) => api.put('/profile', d),                                                     mockProfileAPI.update),
  uploadAvatar:   proxy((f) => api.post('/profile/avatar', f, { headers: { 'Content-Type': 'multipart/form-data' } }), mockProfileAPI.uploadAvatar),
  changePassword: proxy((d) => api.put('/profile/change-password', d),                                    mockProfileAPI.changePassword),
};

export default api;
