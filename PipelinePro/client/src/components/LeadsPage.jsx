import { useEffect, useState, useCallback } from 'react';
import {
  fetchLeads, createLead, updateLeadStatus, deleteLead, convertLead, getSession,
} from '../api.js';

// Standard Lead status picklist in a Developer Edition org
const LEAD_STATUSES = [
  'Open - Not Contacted',
  'Working - Contacted',
  'Closed - Not Converted',
];

/**
 * Lead management: capture, qualify (status), convert or discard.
 * Converting creates the Account, Contact and Opportunity in
 * Salesforce; the new deal appears on the Pipeline board.
 */
export default function LeadsPage({ onSessionExpired }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [converting, setConverting] = useState(null); // lead Id in progress

  const load = useCallback(async () => {
    setError('');
    try {
      setLeads(await fetchLeads());
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

  async function handleStatusChange(lead, status) {
    try {
      await updateLeadStatus(lead.Id, status);
      setLeads((prev) => prev.map((l) => (l.Id === lead.Id ? { ...l, Status: status } : l)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConvert(lead) {
    const ok = window.confirm(
      `Convert "${fullName(lead)}" (${lead.Company})?\n\nThis creates an Account, Contact and Opportunity in Salesforce.`
    );
    if (!ok) return;
    setConverting(lead.Id);
    setError('');
    try {
      await convertLead(lead.Id);
      setNotice(`${lead.Company} converted — the new deal is on your Pipeline board.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(null);
    }
  }

  async function handleDelete(lead) {
    if (!window.confirm(`Delete lead "${fullName(lead)}"?`)) return;
    try {
      await deleteLead(lead.Id);
      setLeads((prev) => prev.filter((l) => l.Id !== lead.Id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="empty">Loading leads…</div>;

  return (
    <div>
      <div className="board-header">
        <h2>Leads</h2>
        <div className="board-actions">
          <button className="btn primary" onClick={() => setShowForm(true)}>+ New Lead</button>
          <button className="btn ghost" onClick={load}>⟳ Refresh</button>
        </div>
      </div>

      {notice && <div className="notice-box">{notice}</div>}
      {error && <div className="error-box">{error}</div>}

      {leads.length === 0 ? (
        <div className="empty">No open leads. Click <b>+ New Lead</b> to capture one.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.Id}>
                <td className="cell-strong">{fullName(lead)}</td>
                <td>{lead.Company}</td>
                <td className="cell-muted">{lead.Email || '—'}</td>
                <td>
                  <select
                    className="status-select"
                    value={lead.Status || ''}
                    onChange={(e) => handleStatusChange(lead, e.target.value)}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {lead.Status && !LEAD_STATUSES.includes(lead.Status) && (
                      <option value={lead.Status}>{lead.Status}</option>
                    )}
                  </select>
                </td>
                <td className="cell-muted">
                  {new Date(lead.CreatedDate).toLocaleDateString()}
                </td>
                <td className="row-actions">
                  <button
                    className="btn small primary"
                    disabled={converting === lead.Id}
                    onClick={() => handleConvert(lead)}
                  >
                    {converting === lead.Id ? 'Converting…' : 'Convert'}
                  </button>
                  <button className="btn small danger" onClick={() => handleDelete(lead)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <LeadForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function fullName(lead) {
  return [lead.FirstName, lead.LastName].filter(Boolean).join(' ');
}

/** Lead capture modal */
function LeadForm({ onClose, onSaved }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createLead({ firstName, lastName, company, email, phone });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>New lead</h2>

        <div className="field-row">
          <label>
            First name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
          </label>
          <label>
            Last name *
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
        </div>

        <label>
          Company *
          <input value={company} onChange={(e) => setCompany(e.target.value)} required />
        </label>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Phone
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
