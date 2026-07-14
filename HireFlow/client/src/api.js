/**
 * API client.
 *
 * Public endpoints (careers site) need no authentication. Admin
 * endpoints use the session ID issued at login, persisted in
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

/* Public careers site */

export function fetchOpenJobs() {
  return request('/api/public/jobs');
}

export function applyToJob(jobId, application) {
  return request(`/api/public/jobs/${jobId}/apply`, {
    method: 'POST',
    body: JSON.stringify(application),
  });
}

/* Auth (recruiter) — login is the OAuth redirect handled in LoginPage/App; only logout is an API call. */

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* Admin */

export function fetchAllJobs() {
  return request('/api/admin/jobs');
}

export function createJob(job) {
  return request('/api/admin/jobs', { method: 'POST', body: JSON.stringify(job) });
}

export function updateJob(id, changes) {
  return request(`/api/admin/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteJob(id) {
  return request(`/api/admin/jobs/${id}`, { method: 'DELETE' });
}

export function fetchApplications(jobId) {
  return request(`/api/admin/jobs/${jobId}/applications`);
}

export function updateApplicationStage(id, stage) {
  return request(`/api/admin/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
}

export function deleteApplication(id) {
  return request(`/api/admin/applications/${id}`, { method: 'DELETE' });
}

/* Formatting */

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
