import { useState } from 'react';
import { createEvent, updateEvent } from '../api.js';

/**
 * Event create/edit modal. Creates a new event when no `event` prop
 * is provided; otherwise updates the given event.
 */
export default function EventForm({ event, onClose, onSaved }) {
  const isEdit = Boolean(event);

  const [name, setName] = useState(event?.name || '');
  const [date, setDate] = useState(event?.date?.slice(0, 10) || '');
  const [location, setLocation] = useState(event?.location || '');
  const [capacity, setCapacity] = useState(event?.capacity ?? '');
  const [description, setDescription] = useState(event?.description || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { name, date, location, capacity: Number(capacity) || 0, description };
      if (isEdit) {
        await updateEvent(event.id, payload);
      } else {
        await createEvent(payload);
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
        <h2>{isEdit ? 'Edit event' : 'New event'}</h2>

        <label>
          Event name *
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>

        <div className="field-row">
          <label>
            Date *
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Capacity
            <input
              type="number"
              min="0"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="0 = unlimited"
            />
          </label>
        </div>

        <label>
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Online, or a venue"
          />
        </label>

        <label>
          Description
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What attendees can expect…"
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  );
}
