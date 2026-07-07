const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || '';

// Backend stores just the uploaded filename; build the full /storage URL for it.
// In dev, Vite proxies /storage → http://192.168.0.29:7002/storage (no CORS).
// In production, set VITE_API_BASE_URL to the actual server origin.
export const storageUrl = (filename) => {
  if (!filename) return '';
  // Already a full URL — return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${API_ORIGIN}/storage/${filename}`;
};
