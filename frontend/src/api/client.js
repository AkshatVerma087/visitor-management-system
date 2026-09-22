import { API_URL } from '../config';

let memoryToken = null;

export const setAccessToken = (token) => {
  memoryToken = token;
};

export const getAccessToken = () => memoryToken;

/**
 * A wrapper around the native fetch API.
 * Automatically prepends the base API_URL, attaches JWT token, and handles refresh flow.
 */
export const apiClient = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are sent (for refresh token)
  });

  // If unauthorized, try to refresh the token
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!refreshRes.ok) throw new Error('Refresh failed');
      
      const refreshData = await refreshRes.json();
      setAccessToken(refreshData.token);
      
      // Retry original request
      headers.Authorization = `Bearer ${refreshData.token}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (err) {
      // Refresh failed, clear token
      setAccessToken(null);
      // Let the 401 pass through so UI can log out
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null) || data.message || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
};
