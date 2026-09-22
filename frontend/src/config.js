// Global configuration for the frontend

// Change the PORT here to automatically update all API and Socket connections
export const PORT = 4000;

export const API_URL = `http://localhost:${PORT}/api`;
export const SOCKET_URL = `http://localhost:${PORT}`;

// Helper to resolve static files from the backend (like uploaded photos)
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${SOCKET_URL}${path}`;
};
