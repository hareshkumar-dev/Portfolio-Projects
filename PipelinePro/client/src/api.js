/**
 * API client.
 *
 * Single point of contact between the frontend and the PipelinePro API.
 * The session ID issued at login is persisted in localStorage and sent
 * as a Bearer token on every request.
 */

export const getSession = () => localStorage.getItem('sessionId');
export const setSession = (id) => localStorage.setItem('sessionId', id);
export const clearSession = () => localStorage.removeItem('sessionId');

/** fetch() wrapper handling auth headers, JSON, and error normalization */
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
    // Expired or invalid session — clear it so the app returns to login
    if (res.status === 401) clearSession();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/* Auth — login is the OAuth redirect handled in LoginPage/App; only logout is an API call. */

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* Deals (Opportunities) */

export function fetchDeals() {
  return request('/api/opportunities');
}

export function createDeal(deal) {
  return request('/api/opportunities', {
    method: 'POST',
    body: JSON.stringify(deal),
  });
}

export function updateDeal(id, changes) {
  return request(`/api/opportunities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function deleteDeal(id) {
  return request(`/api/opportunities/${id}`, { method: 'DELETE' });
}

/* Leads */

export function fetchLeads() {
  return request('/api/leads');
}

export function createLead(lead) {
  return request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(lead),
  });
}

export function updateLeadStatus(id, status) {
  return request(`/api/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteLead(id) {
  return request(`/api/leads/${id}`, { method: 'DELETE' });
}

export function convertLead(id) {
  return request(`/api/leads/${id}/convert`, { method: 'POST' });
}

/* Dashboard */

export function fetchStats() {
  return request('/api/stats');
}

/* Formatting helpers */

/** Compact currency: 1234 -> $1.2K, 4500000 -> $4.5M */
export function formatMoney(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${n.toLocaleString()}`;
}
