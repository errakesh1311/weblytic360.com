const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'w360_token';
const USER_KEY = 'w360_user';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    clearSession();
    if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

const qs = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

export const api = {  // auth
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),  me: () => request('/api/auth/me'),
  updateMe: (payload) => request('/api/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePreferences: (payload) =>
    request('/api/auth/preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (email) =>
    request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) =>
    request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  // sites
  listSites: () => request('/api/sites'),
  getSite: (siteId) => request(`/api/sites/${siteId}`),
  createSite: (payload) => request('/api/sites', { method: 'POST', body: JSON.stringify(payload) }),
  updateSite: (siteId, payload) =>
    request(`/api/sites/${siteId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSite: (siteId) => request(`/api/sites/${siteId}`, { method: 'DELETE' }),

  // stats
  siteStats: (siteId, params = {}) => request(`/api/stats/${siteId}?${qs(params)}`),  overview: (siteId, params = {}) => request(`/api/stats/${siteId}/overview?${qs(params)}`),
  timeseries: (siteId, params = {}) => request(`/api/stats/${siteId}/timeseries?${qs(params)}`),
  metrics: (siteId, type, params = {}) =>
    request(`/api/stats/${siteId}/metrics?${qs({ type, ...params })}`),
  entryExitPages: (siteId, which, params = {}) =>
    request(`/api/stats/${siteId}/pages/${which}?${qs(params)}`),
  active: (siteId, params = {}) => request(`/api/stats/${siteId}/active?${qs(params)}`),
  aiTraffic: (siteId, params = {}) => request(`/api/stats/${siteId}/ai?${qs(params)}`),
  network: (params = {}) => request(`/api/stats/network?${qs(params)}`),

  // events
  events: (siteId, params = {}) => request(`/api/events/${siteId}?${qs(params)}`),
  // notifications
  notifications: () => request('/api/notifications'),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id) => request(`/api/notifications/${id}`, { method: 'DELETE' }),

  // team
  team: () => request('/api/team'),
  inviteMember: (payload) => request('/api/team', { method: 'POST', body: JSON.stringify(payload) }),  updateMemberRole: (id, role) =>
    request(`/api/team/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (id) => request(`/api/team/${id}`, { method: 'DELETE' }),

  // api keys
  apiKeys: () => request('/api/keys'),
  createApiKey: (payload) => request('/api/keys', { method: 'POST', body: JSON.stringify(payload) }),
  revokeApiKey: (id) => request(`/api/keys/${id}/revoke`, { method: 'POST' }),
  deleteApiKey: (id) => request(`/api/keys/${id}`, { method: 'DELETE' }),

  // imports
  imports: () => request('/api/imports'),
  createImport: (payload) =>
    request('/api/imports', { method: 'POST', body: JSON.stringify(payload) }),
  deleteImport: (id) => request(`/api/imports/${id}`, { method: 'DELETE' }),

  // billing
  plans: () => request('/api/billing/plans'),
  usage: () => request('/api/billing/usage'),
  subscribe: (planId) =>
    request('/api/billing/subscribe', { method: 'POST', body: JSON.stringify({ planId }) }),
};

export default api;
