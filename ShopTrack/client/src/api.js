/**
 * API client.
 *
 * Public endpoints (storefront) need no authentication. Admin endpoints
 * use the session ID issued at login, persisted in localStorage and
 * sent as a Bearer token.
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

/* Public storefront */

export function fetchCatalog() {
  return request('/api/public/catalog');
}

export function placeOrder(customer, items) {
  return request('/api/public/orders', {
    method: 'POST',
    body: JSON.stringify({ customer, items }),
  });
}

export function fetchMyOrders(email) {
  return request(`/api/public/orders?email=${encodeURIComponent(email)}`);
}

/* Auth (store operator) — login is the OAuth redirect handled in LoginPage/App; only logout is an API call. */

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* Admin */

export function fetchAllOrders() {
  return request('/api/admin/orders');
}

export function updateOrderStatus(id, status) {
  return request(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/* Formatting */

export function formatMoney(value) {
  return `$${(Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
