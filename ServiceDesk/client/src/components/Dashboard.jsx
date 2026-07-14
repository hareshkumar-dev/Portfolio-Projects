import { useEffect, useState, useCallback } from 'react';
import { fetchTickets, deleteTicket, updateTicket, getSession } from '../api.js';
import TicketForm from './TicketForm.jsx';

const STATUSES = ['New', 'Working', 'Escalated', 'Closed'];

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

const Icon = {
  ticket: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H5.17L4 17.17V4z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="12" x2="13" y2="12" /></svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
};

/**
 * Ticket console: lists tickets and handles create, edit,
 * status transitions, and deletion — all live against Salesforce.
 */
export default function Dashboard({ user, onLogout, onSessionExpired }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTickets(await fetchTickets());
    } catch (err) {
      if (!getSession()) return onSessionExpired();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(ticket) {
    if (!window.confirm(`Delete ticket ${ticket.CaseNumber} — "${ticket.Subject}"?`)) return;
    try {
      await deleteTicket(ticket.Id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(ticket, status) {
    try {
      await updateTicket(ticket.Id, { status });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const count = (s) => tickets.filter((t) => t.Status === s).length;
  const tiles = [
    { key: 'total', label: 'Total tickets', value: tickets.length, cls: 'kpi kpi_slate' },
    { key: 'new', label: 'New', value: count('New'), cls: 'kpi kpi_blue' },
    { key: 'working', label: 'Working', value: count('Working'), cls: 'kpi kpi_amber' },
    { key: 'esc', label: 'Escalated', value: count('Escalated'), cls: 'kpi kpi_red' },
  ];

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">{Icon.ticket}</span>
          <div>
            <h1>ServiceDesk</h1>
            <span className="topbar-sub">Customer Support Portal</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <span className="avatar">{initials(user?.displayName || user?.username)}</span>
            <span className="user-name">{user?.displayName || user?.username}</span>
          </div>
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            {Icon.plus}<span>New Ticket</span>
          </button>
          <button className="btn ghost icon-only" onClick={load} title="Refresh">{Icon.refresh}</button>
          <button className="btn ghost" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <div className="kpi-row">
        {tiles.map((t) => (
          <div key={t.key} className={t.cls}>
            <div className="kpi-value">{t.value}</div>
            <div className="kpi-label">{t.label}</div>
          </div>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="empty">Loading tickets…</div>
      ) : tickets.length === 0 ? (
        <div className="empty">No tickets yet. Click <b>New Ticket</b> to raise one.</div>
      ) : (
        <div className="ticket-list">
          {tickets.map((t) => {
            const pr = t.Priority || 'Medium';
            const st = t.Status || 'New';
            return (
              <div key={t.Id} className={`ticket-card accent-${st.toLowerCase()}`}>
                <div className="tc-main">
                  <div className="tc-top">
                    <span className="case-num">{t.CaseNumber}</span>
                    <span className={`pill priority-${pr.toLowerCase()}`}>{pr}</span>
                  </div>
                  <div className="tc-subject">{t.Subject}</div>
                  {t.Description && <div className="tc-desc">{t.Description}</div>}
                  <div className="tc-meta">
                    Opened {new Date(t.CreatedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="tc-side">
                  <select
                    className={`status-select status-${st.toLowerCase()}`}
                    value={st}
                    onChange={(e) => handleStatusChange(t, e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    {t.Status && !STATUSES.includes(t.Status) && <option value={t.Status}>{t.Status}</option>}
                  </select>
                  <div className="tc-actions">
                    <button className="icon-btn" title="Edit" onClick={() => { setEditing(t); setShowForm(true); }}>{Icon.edit}</button>
                    <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(t)}>{Icon.trash}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TicketForm
          ticket={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
