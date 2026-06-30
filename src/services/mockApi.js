/**
 * services/mockApi.js — In-Browser Mock API
 * ─────────────────────────────────────────────
 * Simulates all backend responses using localStorage.
 * Activated when VITE_DEMO_MODE=true OR backend is unreachable.
 *
 * Demo credentials:
 *   Email:    admin@demo.com
 *   Password: Admin@123
 */

import { format, subDays, subMonths } from 'date-fns';

// ─── Demo admin account ───────────────────────
const DEMO_ADMIN = {
  _id: 'demo-admin-001',
  firstName: 'Admin',
  lastName: 'Demo',
  email: 'admin@demo.com',
  role: 'superadmin',
  avatar: null,
  contact: '+91 98765 43210',
  location: 'Chennai, India',
  mfaEnabled: false,
  isActive: true,
  preferences: { theme: 'light', currency: 'INR' },
  createdAt: new Date().toISOString(),
};

// ─── Mock Products — starts empty ────────────
// Products are added manually by the user via the Add Product modal.
const MOCK_PRODUCTS = [];

// ─── Mock Categories ──────────────────────────
const MOCK_CATEGORIES = [
  { _id: 'c1', name: 'Fashion',     slug: 'fashion',     parent: null, isActive: true, productCount: 0, displayOrder: 1, createdAt: new Date().toISOString() },
  { _id: 'c2', name: 'Accessories', slug: 'accessories', parent: null, isActive: true, productCount: 0, displayOrder: 2, createdAt: new Date().toISOString() },
  { _id: 'c3', name: 'Appliances',  slug: 'appliances',  parent: null, isActive: true, productCount: 0, displayOrder: 3, createdAt: new Date().toISOString() },
  { _id: 'c4', name: 'Crafting',    slug: 'crafting',    parent: null, isActive: true, productCount: 0, displayOrder: 4, createdAt: new Date().toISOString() },
];

// ─── Mock Parent Categories ───────────────────
const MOCK_PARENT_CATEGORIES = [
  { _id: 'pc1', code: 'FASH', name: 'Fashion', isActive: true, createdAt: new Date().toISOString() },
  { _id: 'pc2', code: 'ACC',  name: 'Accessories', isActive: true, createdAt: new Date().toISOString() },
  { _id: 'pc3', code: 'APP',  name: 'Appliances', isActive: true, createdAt: new Date().toISOString() },
  { _id: 'pc4', code: 'CRAFT',name: 'Crafting', isActive: true, createdAt: new Date().toISOString() },
];

// ─── Mock Countries ───────────────────────────
const MOCK_COUNTRIES = [
  { _id: 'co1', code: 'IN', name: 'India', isActive: true, createdAt: new Date().toISOString() },
  { _id: 'co2', code: 'US', name: 'United States', isActive: true, createdAt: new Date().toISOString() },
  { _id: 'co3', code: 'UK', name: 'United Kingdom', isActive: true, createdAt: new Date().toISOString() },
];

// ─── Mock Orders ──────────────────────────────
const MOCK_ORDERS = [
  { _id: 'o1', orderNumber: 'ORD-20250101-0001', type: 'order', customerName: 'Priya Sharma', customerEmail: 'priya@example.com', customerContact: '+91 98765 11111', totalAmount: 4998, currency: 'INR', status: 'delivered', paymentStatus: 'paid', items: [{ productName: 'Wireless Earbuds Pro', quantity: 2, unitPrice: 2499 }], createdAt: subDays(new Date(), 2).toISOString() },
  { _id: 'o2', orderNumber: 'ORD-20250101-0002', type: 'order', customerName: 'Arjun Mehta', customerEmail: 'arjun@example.com', customerContact: '+91 98765 22222', totalAmount: 799, currency: 'INR', status: 'processing', paymentStatus: 'paid', items: [{ productName: 'Organic Cotton T-Shirt', quantity: 1, unitPrice: 799 }], createdAt: subDays(new Date(), 1).toISOString() },
  { _id: 'o3', orderNumber: 'ORD-20250101-0003', type: 'enquiry', customerName: 'Kavitha Nair', customerEmail: 'kavitha@example.com', customerContact: '+91 98765 33333', totalAmount: 0, currency: 'INR', status: 'pending', isProcessed: false, enquiryMessage: 'Is the leather wallet available in black?', createdAt: subDays(new Date(), 3).toISOString() },
  { _id: 'o4', orderNumber: 'ORD-20250101-0004', type: 'order', customerName: 'Rahul Gupta', customerEmail: 'rahul@example.com', customerContact: '+91 98765 44444', totalAmount: 1499, currency: 'INR', status: 'shipped', paymentStatus: 'paid', items: [{ productName: 'Yoga Mat Premium', quantity: 1, unitPrice: 1499 }], createdAt: subDays(new Date(), 5).toISOString() },
  { _id: 'o5', orderNumber: 'ORD-20250101-0005', type: 'order', customerName: 'Sneha Patel', customerEmail: 'sneha@example.com', customerContact: '+91 98765 55555', totalAmount: 2999, currency: 'INR', status: 'confirmed', paymentStatus: 'unpaid', items: [{ productName: 'Running Shoes X200', quantity: 1, unitPrice: 2999 }], createdAt: subDays(new Date(), 7).toISOString() },
];

// ─── Mock Invoices ────────────────────────────
const MOCK_INVOICES = [
  { _id: 'inv1', invoiceNumber: 'INV-2025-00001', billTo: { name: 'Priya Sharma', email: 'priya@example.com' }, subtotal: 4998, taxAmount: 899.64, totalAmount: 5897.64, currency: 'INR', status: 'paid', issueDate: subDays(new Date(), 2).toISOString(), lineItems: [{ description: 'Wireless Earbuds Pro x2', quantity: 2, unitPrice: 2499, taxRate: 0.18, taxAmount: 899.64, totalPrice: 5897.64 }] },
  { _id: 'inv2', invoiceNumber: 'INV-2025-00002', billTo: { name: 'Rahul Gupta', email: 'rahul@example.com' }, subtotal: 1499, taxAmount: 269.82, totalAmount: 1768.82, currency: 'INR', status: 'sent', issueDate: subDays(new Date(), 5).toISOString(), lineItems: [{ description: 'Yoga Mat Premium', quantity: 1, unitPrice: 1499, taxRate: 0.18, taxAmount: 269.82, totalPrice: 1768.82 }] },
  { _id: 'inv3', invoiceNumber: 'INV-2025-00003', billTo: { name: 'Arjun Mehta', email: 'arjun@example.com' }, subtotal: 799, taxAmount: 143.82, totalAmount: 942.82, currency: 'INR', status: 'draft', issueDate: subDays(new Date(), 1).toISOString(), lineItems: [{ description: 'Organic Cotton T-Shirt', quantity: 1, unitPrice: 799, taxRate: 0.18, taxAmount: 143.82, totalPrice: 942.82 }] },
];

// ─── Mock Chats ───────────────────────────────
const MOCK_CHATS = [
  { _id: 'ch1', customerName: 'Meena Krishnan', customerEmail: 'meena@example.com', customerContact: '+91 98765 66666', subject: 'Product inquiry', status: 'open', priority: 'high', unreadCount: 2, lastMessageAt: subDays(new Date(), 0).toISOString(), messages: [{ sender: 'customer', content: 'Hi! Do you have the wireless earbuds in blue?', sentAt: subDays(new Date(), 1).toISOString(), isRead: false }, { sender: 'customer', content: 'Also what is the battery life?', sentAt: new Date().toISOString(), isRead: false }] },
  { _id: 'ch2', customerName: 'Vijay Reddy', customerEmail: 'vijay@example.com', subject: 'Return request', status: 'in_progress', priority: 'medium', unreadCount: 0, lastMessageAt: subDays(new Date(), 2).toISOString(), messages: [{ sender: 'customer', content: 'I want to return the yoga mat I ordered last week.', sentAt: subDays(new Date(), 3).toISOString(), isRead: true }, { sender: 'admin', content: 'Hi Vijay! We have received your return request. Please share your order number and reason for return.', sentAt: subDays(new Date(), 2).toISOString(), isRead: true }] },
  { _id: 'ch3', customerName: 'Lakshmi Iyer', customerEmail: 'lakshmi@example.com', subject: 'Delivery status', status: 'resolved', priority: 'low', unreadCount: 0, lastMessageAt: subDays(new Date(), 5).toISOString(), messages: [{ sender: 'customer', content: 'When will my order be delivered?', sentAt: subDays(new Date(), 6).toISOString(), isRead: true }, { sender: 'admin', content: 'Your order will be delivered within 2-3 business days. Tracking ID: TRK123456.', sentAt: subDays(new Date(), 5).toISOString(), isRead: true }] },
];

// ─── Generate sales chart data ─────────────────
const generateSalesData = (period) => {
  const data = [];
  const now = new Date();

  if (period === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      data.push({ _id: { year: d.getFullYear(), month: d.getMonth()+1, day: d.getDate() }, label: format(d, 'dd/MM'), revenue: Math.floor(Math.random() * 8000) + 2000, orders: Math.floor(Math.random() * 8) + 1 });
    }
  } else if (period === 'weekly') {
    for (let i = 11; i >= 0; i--) {
      data.push({ _id: { week: i + 1 }, label: `W${12-i}`, revenue: Math.floor(Math.random() * 40000) + 15000, orders: Math.floor(Math.random() * 30) + 10 });
    }
  } else if (period === 'monthly') {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      data.push({ _id: { year: d.getFullYear(), month: d.getMonth()+1 }, label: months[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2), revenue: Math.floor(Math.random() * 150000) + 60000, orders: Math.floor(Math.random() * 80) + 30 });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      data.push({ _id: { year }, label: String(year), revenue: Math.floor(Math.random() * 1500000) + 500000, orders: Math.floor(Math.random() * 600) + 200 });
    }
  }
  return data;
};

// ─── Small delay to simulate network ─────────
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// ─── Token helpers ────────────────────────────
const MOCK_TOKEN = 'mock-jwt-token-demo-mode';

// ─── Mock API Object (matches real API shape) ─
export const mockAuthAPI = {
  login: async ({ email, password }) => {
    await delay(600);
    if (email === DEMO_ADMIN.email && password === 'Admin@123') {
      return { data: { success: true, accessToken: MOCK_TOKEN, refreshToken: MOCK_TOKEN, admin: DEMO_ADMIN } };
    }
    throw { response: { status: 401, data: { success: false, message: 'Invalid credentials. Use admin@demo.com / Admin@123' } } };
  },
  logout: async () => { await delay(100); return { data: { success: true } }; },
  getMe: async () => {
    await delay(200);
    const token = localStorage.getItem('accessToken');
    if (token === MOCK_TOKEN) return { data: { success: true, admin: DEMO_ADMIN } };
    throw { response: { status: 401, data: { message: 'Unauthorized' } } };
  },
  setupMFA: async () => { await delay(300); return { data: { success: false, message: 'MFA setup not available in demo mode.' } }; },
  confirmMFASetup: async () => { await delay(300); return { data: { success: false } }; },
  verifyMFA: async () => { await delay(300); return { data: { success: false } }; },
};

export const mockProductAPI = {
  getAll: async (params = {}) => {
    await delay(300);
    let products = [...MOCK_PRODUCTS];
    if (params.search) products = products.filter(p => p.name.toLowerCase().includes(params.search.toLowerCase()));
    if (params.category) products = products.filter(p =>
      p.category?._id === params.category || p.category === params.category
    );
    if (params.stockStatus) products = products.filter(p => p.stockStatus === params.stockStatus);
    const page  = parseInt(params.page)  || 1;
    const limit = parseInt(params.limit) || 20;
    const start = (page - 1) * limit;
    return { data: { success: true, data: products.slice(start, start + limit), pagination: { page, limit, total: products.length, pages: Math.ceil(products.length / limit) || 1 } } };
  },
  getById: async (id) => {
    await delay(200);
    const p = MOCK_PRODUCTS.find(p => p._id === id);
    if (!p) throw { response: { status: 404, data: { message: 'Product not found.' } } };
    return { data: { success: true, data: p } };
  },
  create: async (data) => {
    await delay(400);
    // FormData → plain object
    const obj = {};
    if (data instanceof FormData) {
      data.forEach((v, k) => { obj[k] = v; });
    } else {
      Object.assign(obj, data);
    }
    const now = new Date().toISOString();
    const newP = {
      ...obj,
      _id:         'p' + Date.now(),
      productId:   'PRD-' + String(MOCK_PRODUCTS.length + 1).padStart(4, '0'),
      images:      [],
      stockStatus: obj.stockStatus || 'in_stock',
      createdAt:   now,
      updatedAt:   now,
    };
    MOCK_PRODUCTS.push(newP);
    return { data: { success: true, data: newP, message: 'Product created successfully.' } };
  },
  update: async (id, data) => {
    await delay(300);
    const idx = MOCK_PRODUCTS.findIndex(p => p._id === id);
    if (idx === -1) throw { response: { status: 404, data: { message: 'Product not found.' } } };
    const obj = {};
    if (data instanceof FormData) {
      data.forEach((v, k) => { obj[k] = v; });
    } else {
      Object.assign(obj, data);
    }
    MOCK_PRODUCTS[idx] = { ...MOCK_PRODUCTS[idx], ...obj, updatedAt: new Date().toISOString() };
    return { data: { success: true, data: MOCK_PRODUCTS[idx], message: 'Product updated.' } };
  },
  delete: async (id) => {
    await delay(300);
    const idx = MOCK_PRODUCTS.findIndex(p => p._id === id);
    if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1);
    return { data: { success: true, message: 'Product deleted.' } };
  },
  getStats: async () => {
    await delay(200);
    return { data: { success: true, data: { total: MOCK_PRODUCTS.length, inStock: MOCK_PRODUCTS.filter(p => p.stockStatus === 'in_stock').length, outOfStock: MOCK_PRODUCTS.filter(p => p.stockStatus === 'out_of_stock').length, lowStock: MOCK_PRODUCTS.filter(p => p.stockStatus === 'low_stock').length, featured: 0 } } };
  },
  bulkImport: async ({ products }) => {
    await delay(500);
    return { data: { success: true, message: `Imported ${products.length} products.`, results: { success: products.length, failed: 0, errors: [] } } };
  },
};

export const mockCategoryAPI = {
  getAll: async () => {
    await delay(200);
    return { data: { success: true, data: MOCK_CATEGORIES } };
  },
  create: async (data) => {
    await delay(300);
    const now = new Date().toISOString();
    const cat = { ...data, _id: 'c' + Date.now(), productCount: 0, createdAt: now, updatedAt: now };
    MOCK_CATEGORIES.push(cat);
    return { data: { success: true, data: cat, message: 'Category created.' } };
  },
  update: async (id, data) => {
    await delay(300);
    const idx = MOCK_CATEGORIES.findIndex(c => c._id === id);
    if (idx !== -1) MOCK_CATEGORIES[idx] = { ...MOCK_CATEGORIES[idx], ...data, updatedAt: new Date().toISOString() };
    return { data: { success: true, data: MOCK_CATEGORIES[idx], message: 'Category updated.' } };
  },
  delete: async (id) => {
    await delay(300);
    const idx = MOCK_CATEGORIES.findIndex(c => c._id === id);
    if (idx !== -1) MOCK_CATEGORIES.splice(idx, 1);
    return { data: { success: true, message: 'Category deleted.' } };
  },
  getById: async (id) => {
    await delay(200);
    const cat = MOCK_CATEGORIES.find(c => c._id === id);
    return { data: { success: true, data: cat } };
  },
};

export const mockParentCategoryAPI = {
  getAll: async () => {
    await delay(200);
    return { data: { success: true, data: MOCK_PARENT_CATEGORIES } };
  },
  create: async (data) => {
    await delay(300);
    const now = new Date().toISOString();
    const pc = { ...data, _id: 'pc' + Date.now(), isActive: true, createdAt: now, updatedAt: now };
    MOCK_PARENT_CATEGORIES.push(pc);
    return { data: { success: true, data: pc, message: 'Parent category created.' } };
  },
  update: async (id, data) => {
    await delay(300);
    const idx = MOCK_PARENT_CATEGORIES.findIndex(c => c._id === id);
    if (idx !== -1) MOCK_PARENT_CATEGORIES[idx] = { ...MOCK_PARENT_CATEGORIES[idx], ...data, updatedAt: new Date().toISOString() };
    return { data: { success: true, data: MOCK_PARENT_CATEGORIES[idx], message: 'Parent category updated.' } };
  },
  delete: async (id) => {
    await delay(300);
    const idx = MOCK_PARENT_CATEGORIES.findIndex(c => c._id === id);
    if (idx !== -1) MOCK_PARENT_CATEGORIES.splice(idx, 1);
    return { data: { success: true, message: 'Parent category deleted.' } };
  },
  getById: async (id) => {
    await delay(200);
    const pc = MOCK_PARENT_CATEGORIES.find(c => c._id === id);
    return { data: { success: true, data: pc } };
  },
};

export const mockCountryAPI = {
  getAll: async () => {
    await delay(200);
    return { data: { success: true, data: MOCK_COUNTRIES } };
  },
  create: async (data) => {
    await delay(300);
    const now = new Date().toISOString();
    const co = { ...data, _id: 'co' + Date.now(), isActive: true, createdAt: now, updatedAt: now };
    MOCK_COUNTRIES.push(co);
    return { data: { success: true, data: co, message: 'Country created.' } };
  },
  update: async (id, data) => {
    await delay(300);
    const idx = MOCK_COUNTRIES.findIndex(c => c._id === id);
    if (idx !== -1) MOCK_COUNTRIES[idx] = { ...MOCK_COUNTRIES[idx], ...data, updatedAt: new Date().toISOString() };
    return { data: { success: true, data: MOCK_COUNTRIES[idx], message: 'Country updated.' } };
  },
  delete: async (id) => {
    await delay(300);
    const idx = MOCK_COUNTRIES.findIndex(c => c._id === id);
    if (idx !== -1) MOCK_COUNTRIES.splice(idx, 1);
    return { data: { success: true, message: 'Country deleted.' } };
  },
  getById: async (id) => {
    await delay(200);
    const co = MOCK_COUNTRIES.find(c => c._id === id);
    return { data: { success: true, data: co } };
  },
};

export const mockOrderAPI = {
  getAll: async (params = {}) => {
    await delay(300);
    let orders = [...MOCK_ORDERS];
    if (params.status) orders = orders.filter(o => o.status === params.status);
    if (params.type)   orders = orders.filter(o => o.type === params.type);
    if (params.search) orders = orders.filter(o => o.customerName.toLowerCase().includes(params.search.toLowerCase()) || o.orderNumber.includes(params.search));
    return { data: { success: true, data: orders, pagination: { page: 1, limit: 20, total: orders.length, pages: 1 } } };
  },
  getById: async (id) => {
    await delay(200);
    const o = MOCK_ORDERS.find(o => o._id === id);
    return { data: { success: true, data: o } };
  },
  updateStatus: async (id, { status }) => {
    await delay(300);
    const idx = MOCK_ORDERS.findIndex(o => o._id === id);
    if (idx !== -1) MOCK_ORDERS[idx].status = status;
    return { data: { success: true, data: MOCK_ORDERS[idx], message: 'Order updated.' } };
  },
  delete: async (id) => {
    await delay(300);
    const idx = MOCK_ORDERS.findIndex(o => o._id === id);
    if (idx !== -1) MOCK_ORDERS.splice(idx, 1);
    return { data: { success: true, message: 'Order deleted.' } };
  },
};

export const mockInvoiceAPI = {
  getAll: async () => {
    await delay(300);
    return { data: { success: true, data: MOCK_INVOICES, pagination: { page: 1, limit: 20, total: MOCK_INVOICES.length, pages: 1 } } };
  },
  getById: async (id) => {
    await delay(200);
    const inv = MOCK_INVOICES.find(i => i._id === id);
    return { data: { success: true, data: inv } };
  },
  create: async (data) => {
    await delay(400);
    const inv = { ...data, _id: 'inv' + Date.now(), invoiceNumber: `INV-2025-${String(MOCK_INVOICES.length + 1).padStart(5,'0')}`, createdAt: new Date().toISOString() };
    MOCK_INVOICES.push(inv);
    return { data: { success: true, data: inv, message: 'Invoice created.' } };
  },
  update: async (id, data) => {
    await delay(300);
    const idx = MOCK_INVOICES.findIndex(i => i._id === id);
    if (idx !== -1) MOCK_INVOICES[idx] = { ...MOCK_INVOICES[idx], ...data };
    return { data: { success: true, data: MOCK_INVOICES[idx] } };
  },
  delete: async (id) => {
    await delay(300);
    const idx = MOCK_INVOICES.findIndex(i => i._id === id);
    if (idx !== -1) MOCK_INVOICES.splice(idx, 1);
    return { data: { success: true, message: 'Invoice deleted.' } };
  },
  exportPDF:   async () => { await delay(500); return { data: new Blob(['PDF content'],   { type: 'application/pdf' }) }; },
  exportExcel: async () => { await delay(500); return { data: new Blob(['Excel content']) }; },
};

export const mockChatAPI = {
  getAll: async (params = {}) => {
    await delay(300);
    let chats = [...MOCK_CHATS];
    if (params.status) chats = chats.filter(c => c.status === params.status);
    return { data: { success: true, data: chats, pagination: { page: 1, limit: 50, total: chats.length, pages: 1 } } };
  },
  getById: async (id) => {
    await delay(200);
    const chat = MOCK_CHATS.find(c => c._id === id);
    if (chat) { chat.unreadCount = 0; chat.messages.forEach(m => { m.isRead = true; }); }
    return { data: { success: true, data: chat } };
  },
  reply: async (id, { content }) => {
    await delay(300);
    const chat = MOCK_CHATS.find(c => c._id === id);
    const msg = { sender: 'admin', content, sentAt: new Date().toISOString(), isRead: true };
    if (chat) { chat.messages.push(msg); chat.status = 'in_progress'; chat.lastMessageAt = new Date().toISOString(); }
    return { data: { success: true, data: msg } };
  },
  updateStatus: async (id, { status }) => {
    await delay(200);
    const chat = MOCK_CHATS.find(c => c._id === id);
    if (chat) chat.status = status;
    return { data: { success: true, data: chat } };
  },
};

export const mockAnalyticsAPI = {
  getDashboard: async () => {
    await delay(400);
    return { data: { success: true, data: {
      totalOrders:      MOCK_ORDERS.length,
      totalProducts:    MOCK_PRODUCTS.length,
      totalCategories:  MOCK_CATEGORIES.length,
      pendingEnquiries: MOCK_ORDERS.filter(o => o.type === 'enquiry' && !o.isProcessed).length,
      revenueThisMonth: 248500,
      revenueGrowth:    12.4,
      ordersThisMonth:  38,
      orderGrowth:      8.2,
      recentOrders:     MOCK_ORDERS.slice(0, 5),
    }}};
  },
  getSalesChart: async (period) => {
    await delay(400);
    return { data: { success: true, data: generateSalesData(period), period } };
  },
  getTopProducts: async () => {
    await delay(300);
    return { data: { success: true, data: [] } };
  },
  getOrdersByStatus: async () => {
    await delay(200);
    return { data: { success: true, data: [
      { _id: 'delivered',  count: 18 },
      { _id: 'processing', count: 8  },
      { _id: 'shipped',    count: 6  },
      { _id: 'pending',    count: 4  },
      { _id: 'cancelled',  count: 2  },
    ]}};
  },
};

export const mockSettingsAPI = {
  get: async () => {
    await delay(200);
    return { data: { success: true, data: {
      siteName:               'Demo eCommerce Store',
      siteTagline:            'Your one-stop shop',
      defaultCurrency:        'INR',
      taxRate:                0.18,
      taxLabel:               'GST',
      defaultTheme:           'light',
      primaryColor:           '#335765',
      accentColor:            '#74A8A4',
      freeShippingThreshold:  500,
      defaultShippingCost:    50,
      invoicePrefix:          'INV',
      invoiceFooterNote:      'Thank you for your business!',
      socialMedia: { instagram: 'https://instagram.com/demo', whatsapp: '+91 98765 43210' },
    }}};
  },
  update: async (data) => {
    await delay(300);
    return { data: { success: true, data, message: 'Settings saved.' } };
  },
};

export const mockProfileAPI = {
  get:          async ()       => { await delay(200); return { data: { success: true, data: DEMO_ADMIN } }; },
  update:       async (data)   => { await delay(300); Object.assign(DEMO_ADMIN, data); return { data: { success: true, data: DEMO_ADMIN, message: 'Profile updated.' } }; },
  uploadAvatar: async ()       => { await delay(400); return { data: { success: true, avatar: null, message: 'Avatar upload not available in demo.' } }; },
  changePassword: async ()     => { await delay(300); return { data: { success: true, message: 'Password updated (demo — no actual change).' } }; },
};

export const DEMO_CREDENTIALS = { email: 'admin@demo.com', password: 'Admin@123' };
export const IS_DEMO = true;