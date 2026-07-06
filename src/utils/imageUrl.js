const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:7002';

// Backend stores just the uploaded filename; build the full /storage URL for it.
export const storageUrl = (filename) => (filename ? `${API_ORIGIN}/storage/${filename}` : '');
