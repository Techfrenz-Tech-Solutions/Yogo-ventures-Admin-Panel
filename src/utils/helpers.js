/**
 * utils/helpers.js — General Utility Functions
 * ─────────────────────────────────────────────
 */

/**
 * Format currency value with symbol
 * @param {number} amount
 * @param {string} currency - 'INR' | 'USD'
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Truncate text to a given length with ellipsis
 */
export const truncate = (str, length = 50) => {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
};

/**
 * Capitalize first letter of each word
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/**
 * Format date string to "DD MMM YYYY"
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
};

/**
 * Generate growth indicator badge props
 * @param {number} pct - percentage change
 */
export const growthProps = (pct) => ({
  isPositive: pct >= 0,
  label: `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`,
  className: pct >= 0 ? 'text-success-600' : 'text-danger-600',
});

/**
 * Slugify a string
 */
export const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

/**
 * Generate a random hex color
 */
export const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

/**
 * Deep-clone an object (JSON safe)
 */
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Debounce function
 */
export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Check if a value is empty (null, undefined, '', [], {})
 */
export const isEmpty = (val) => {
  if (val == null) return true;
  if (typeof val === 'string' || Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return false;
};


// ─────────────────────────────────────────────
// utils/validators.js — Form Validation Rules
// ─────────────────────────────────────────────

export const validators = {
  required: (val) => (val !== undefined && val !== null && String(val).trim() !== '') || 'This field is required',
  email: (val) => /^\S+@\S+\.\S+$/.test(val) || 'Enter a valid email address',
  minLength: (min) => (val) => String(val).length >= min || `Minimum ${min} characters required`,
  maxLength: (max) => (val) => String(val).length <= max || `Maximum ${max} characters allowed`,
  min: (min) => (val) => Number(val) >= min || `Must be at least ${min}`,
  max: (max) => (val) => Number(val) <= max || `Must be at most ${max}`,
  positiveNumber: (val) => Number(val) > 0 || 'Must be a positive number',
  url: (val) => !val || /^https?:\/\/.+/.test(val) || 'Enter a valid URL (https://...)',
  phone: (val) => !val || /^[+]?[\d\s\-()]{7,15}$/.test(val) || 'Enter a valid phone number',
};

// Run multiple rules against a value
export const validate = (value, rules = []) => {
  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) return result;
  }
  return null;
};
