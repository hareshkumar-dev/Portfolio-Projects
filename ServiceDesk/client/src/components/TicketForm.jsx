import { useState } from 'react';
import { createTicket, updateTicket } from '../api.js';

/**
 * Ticket create/edit modal. Creates a new ticket when no `ticket`
 * prop is provided; otherwise updates the given ticket.
 */
export default function TicketForm({ ticket, onClose, onSaved }) {
  const isEdit = Boolean(ticket);

  const [subject, setSubject] = useState(ticket?.Subject || '');
  const [description, setDescription] = useState(ticket?.Description || '');
  const [priority, setPriority] = useState(ticket?.Priority || 'Medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateTicket(ticket.Id, { subject, description, priority });
      } else {
        await createTicket({ subject, description, priority });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{isEdit ? `Edit ticket ${ticket.CaseNumber}` : 'Raise a new ticket'}</h2>

        <label>
          Subject *
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Cannot reset my password"
            autoFocus
            required
          />
        </label>

        <label>
          Description
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details that help support solve the issue…"
          />
        </label>

        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
