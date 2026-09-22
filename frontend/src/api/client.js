import { API_URL } from '../config';

/**
 * A wrapper around the native fetch API.
 * Automatically prepends the base API_URL and attaches the JWT token if available.
 */
export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'An error occurred');
  }

  return data;
};
