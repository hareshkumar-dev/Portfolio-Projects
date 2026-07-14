import { useEffect, useState, useCallback } from 'react';
import {
  fetchAdminEvents, deleteEvent, fetchRegistrations,
  setCheckedIn, deleteRegistration, formatDate, getSession,
} from '../api.js';
import EventForm from './EventForm.jsx';

/**
 * Organizer console: manage events, view attendee lists,
 * and check attendees in on event day.
 */
export default function AdminDashboard({ onSessionExpired }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openEvent, setOpenEvent] = useState(null); // event whose attendees are shown

  const load = useCallback(async () => {
    setError('');
    try {
      setEvents(await fetchAdminEvents());
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

  async function handleDelete(event) {
    const ok = window.confirm(
      `Delete "${event.name}"?\n\nAll ${event.registered} registration(s) will be removed with it.`
    );
    if (!ok) return;
    try {
      await deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      if (openEvent?.id === event.id) setOpenEvent(null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="empty">Loading events…</div>;

  const totalRegistrations = events.reduce((sum, e) => sum + e.registered, 0);
  const upcoming = events.filter((e) => e.date && new Date(e.date) >= new Date()).length;

  return (
    <div>
      <div className="kpi-row">
        <div className="stat-tile">
          <div className="stat-label">Total events</div>
          <div className="stat-value">{events.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Upcoming</div>
          <div className="stat-value">{upcoming}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total registrations</div>
          <div className="stat-value">{totalRegistrations}</div>
        </div>
      </div>

      <div className="board-header">
        <h2>Events</h2>
        <div className="board-actions">
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            + New Event
          </button>
          <button className="btn ghost" onClick={load}>⟳ Refresh</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {events.length === 0 ? (
        <div className="empty">No events yet. Click <b>+ New Event</b> to create one.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Location</th>
              <th>Registered</th>
              <th>Checked in</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="cell-strong">{event.name}</td>
                <td>{formatDate(event.date)}</td>
                <td className="cell-muted">{event.location || '—'}</td>
                <td>
                  {event.registered}
                  {event.capacity > 0 && <span className="cell-muted"> / {event.capacity}</span>}
                </td>
                <td>{event.checkedIn}</td>
                <td className="row-actions">
                  <button className="btn small" onClick={() => setOpenEvent(event)}>
                    Attendees
                  </button>
                  <button className="btn small" onClick={() => { setEditing(event); setShowForm(true); }}>
                    Edit
                  </button>
                  <button className="btn small danger" onClick={() => handleDelete(event)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <EventForm
          event={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {openEvent && (
        <AttendeesPanel
          event={openEvent}
          onClose={() => setOpenEvent(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

/** Attendee list with check-in toggles */
function AttendeesPanel({ event, onClose, onChanged }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setRows(await fetchRegistrations(event.id));
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  async function toggleCheckIn(row) {
    try {
      await setCheckedIn(row.id, !row.checkedIn);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, checkedIn: !r.checkedIn } : r))
      );
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAttendee(row) {
    if (!window.confirm(`Remove ${row.name} from ${event.name}?`)) return;
    try {
      await deleteRegistration(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Attendees — {event.name}</h2>
        <p className="muted">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</p>

        {error && <div className="error-box">{error}</div>}

        {rows === null ? (
          <div className="empty">Loading attendees…</div>
        ) : rows.length === 0 ? (
          <div className="empty">No registrations yet.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Checked in</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-muted">{row.number}</td>
                    <td className="cell-strong">{row.name}</td>
                    <td className="cell-muted">{row.email}</td>
                    <td>
                      <button
                        className={`checkin ${row.checkedIn ? 'on' : ''}`}
                        onClick={() => toggleCheckIn(row)}
                      >
                        {row.checkedIn ? '✓ Checked in' : 'Check in'}
                      </button>
                    </td>
                    <td className="row-actions">
                      <button className="btn small danger" onClick={() => removeAttendee(row)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
