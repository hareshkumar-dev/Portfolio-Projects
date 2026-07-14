/**
 * API client.
 *
 * Public endpoints (listings + inquiries) need no authentication.
 * Admin endpoints use the session ID issued at login, persisted in
 * localStorage and sent as a Bearer token.
 */

export const getSession = () => localStorage.getItem('sessionId');
export const setSession = (id) => localStorage.setItem('sessionId', id);
export const clearSession = () => localStorage.removeItem('sessionId');

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSession()}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/* Public listings */

export function fetchProperties(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) params.set(k, v);
  });
  const qs = params.toString();
  return request(`/api/public/properties${qs ? `?${qs}` : ''}`);
}

export function fetchCities() {
  return request('/api/public/properties/cities');
}

export function fetchProperty(id) {
  return request(`/api/public/properties/${id}`);
}

export function inquire(propertyId, details) {
  return request(`/api/public/properties/${propertyId}/inquire`, {
    method: 'POST',
    body: JSON.stringify(details),
  });
}

/* Auth (agent) — login is the OAuth redirect handled in LoginPage/App; only logout is an API call. */

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* Admin */

export function fetchAllProperties() {
  return request('/api/admin/properties');
}

export function createProperty(property) {
  return request('/api/admin/properties', { method: 'POST', body: JSON.stringify(property) });
}

export function updateProperty(id, changes) {
  return request(`/api/admin/properties/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteProperty(id) {
  return request(`/api/admin/properties/${id}`, { method: 'DELETE' });
}

export function fetchInquiries() {
  return request('/api/admin/inquiries');
}

/* Formatting */

/** Compact price: 9500000 -> ₹95.0 L, 12000000 -> ₹1.2 Cr */
export function formatPrice(value) {
  const n = Number(value) || 0;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2).replace(/\.?0+$/, '')} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
