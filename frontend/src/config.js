// Global configuration for the frontend

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// Helper to resolve static files from the backend (like uploaded photos)
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${BACKEND_URL}${path}`;
};
