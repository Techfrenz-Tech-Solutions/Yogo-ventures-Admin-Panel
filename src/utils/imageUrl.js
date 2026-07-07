const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:7002';

// Backend stores just the uploaded filename; build the full /storage URL for it.
// Hits the backend origin directly (not through the /api dev proxy, which only
// covers /api — /storage isn't proxied). Browsers don't apply CORS to <img>
// loads, so this works cross-origin without any backend changes.
export const storageUrl = (filename) => {
  if (!filename) return '';
  // Already a full URL — return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${API_ORIGIN}/storage/${filename}`;
};
