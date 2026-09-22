import { apiClient } from './client';

export const auth = {
  login: (credentials) => apiClient('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => apiClient('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiClient('/auth/me'),
};

export const visitors = {
  getWalkIns: () => apiClient('/visitors/today'),
  getHostVisits: () => apiClient('/visitors/host'),
  registerWalkIn: (data) => apiClient('/visitors/walk-in', { method: 'POST', body: JSON.stringify(data) }),
  checkIn: (id) => apiClient(`/visitors/${id}/checkin`, { method: 'POST' }),
  qrCheckIn: (id) => apiClient(`/visitors/${id}/qr-checkin`, { method: 'POST' }),
  checkOut: (id) => apiClient(`/visitors/${id}/checkout`, { method: 'POST' }),
  decision: (id, decision) => apiClient(`/visitors/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision }) }),
};

export const employees = {
  getHosts: () => apiClient('/employees/hosts'),
};

export const invites = {
  create: (data) => apiClient('/invites', { method: 'POST', body: JSON.stringify(data) }),
};

export const admin = {
  getStats: () => apiClient('/admin/stats'),
  getEmployees: () => apiClient('/admin/employees'),
  getApprovals: () => apiClient('/admin/approvals'),
};
