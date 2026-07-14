/**
 * API client.
 *
 * Public endpoints need no authentication. Admin endpoints use the
 * session ID issued at login, persisted in localStorage and sent as
 * a Bearer token.
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
    if (res.status === 401) clearSession();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/* Public */

export function fetchPublicEvents() {
  return request('/api/public/events');
}

export function registerForEvent(eventId, attendee) {
  return request(`/api/public/events/${eventId}/register`, {
    method: 'POST',
    body: JSON.stringify(attendee),
  });
}

/* Auth (admin) — login is the OAuth redirect handled in LoginPage/App; only logout is an API call. */

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* Admin */

export function fetchAdminEvents() {
  return request('/api/admin/events');
}

export function createEvent(event) {
  return request('/api/admin/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export function updateEvent(id, changes) {
  return request(`/api/admin/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function deleteEvent(id) {
  return request(`/api/admin/events/${id}`, { method: 'DELETE' });
}

export function fetchRegistrations(eventId) {
  return request(`/api/admin/events/${eventId}/registrations`);
}

export function setCheckedIn(registrationId, checkedIn) {
  return request(`/api/admin/registrations/${registrationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ checkedIn }),
  });
}

export function deleteRegistration(registrationId) {
  return request(`/api/admin/registrations/${registrationId}`, { method: 'DELETE' });
}

/* Formatting */

export function formatDate(iso) {
  if (!iso) return 'TBA';
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
