/**
 * API client.
 *
 * Single point of contact between the frontend and the ServiceDesk API.
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

/* Auth — login is an OAuth redirect handled by the server; see LoginPage. */

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* Tickets */

export function fetchTickets() {
  return request('/api/tickets');
}

export function createTicket(ticket) {
  return request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
}

export function updateTicket(id, changes) {
  return request(`/api/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function deleteTicket(id) {
  return request(`/api/tickets/${id}`, { method: 'DELETE' });
}
