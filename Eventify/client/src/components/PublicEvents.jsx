import { useEffect, useState } from 'react';
import { fetchPublicEvents, registerForEvent, formatDate } from '../api.js';

/**
 * Public event listing. No login — data is served through the
 * API's integration-user connection.
 */
export default function PublicEvents() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(null); // event being registered for

  async function load() {
    setError('');
    try {
      setEvents(await fetchPublicEvents());
    } catch (err) {
      setError(err.message);
      setEvents([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (events === null && !error) return <div className="empty">Loading events…</div>;

  return (
    <div>
      <section className="hero">
        <h1>Upcoming Events</h1>
        <p>Browse our upcoming sessions and reserve your seat.</p>
      </section>

      {error && <div className="error-box">{error}</div>}

      {events?.length === 0 && !error ? (
        <div className="empty">No upcoming events right now — check back soon.</div>
      ) : (
        <div className="event-grid">
          {events?.map((event) => {
            const spotsLeft = event.capacity
              ? Math.max(event.capacity - event.registered, 0)
              : null;
            const soldOut = spotsLeft === 0 && event.capacity > 0;
            const fillRatio = event.capacity
              ? Math.min(event.registered / event.capacity, 1)
              : 0;

            return (
              <div className="event-card" key={event.id}>
                <div className="event-date">{formatDate(event.date)}</div>
                <h3 className="event-name">{event.name}</h3>
                {event.location && <div className="event-loc">📍 {event.location}</div>}
                {event.description && <p className="event-desc">{event.description}</p>}

                {event.capacity > 0 && (
                  <div className="capacity">
                    <div className="meter" role="meter" aria-valuemin={0}
                      aria-valuemax={event.capacity} aria-valuenow={event.registered}>
                      <div className="meter-fill" style={{ width: `${fillRatio * 100}%` }} />
                    </div>
                    <span className="capacity-text">
                      {soldOut ? 'Sold out' : `${spotsLeft} of ${event.capacity} seats left`}
                    </span>
                  </div>
                )}

                <button
                  className="btn primary wide"
                  disabled={soldOut}
                  onClick={() => setRegistering(event)}
                >
                  {soldOut ? 'Sold out' : 'Register'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {registering && (
        <RegisterModal
          event={registering}
          onClose={() => setRegistering(null)}
          onRegistered={() => { setRegistering(null); load(); }}
        />
      )}
    </div>
  );
}

/** Seat reservation modal (name + email) */
function RegisterModal({ event, onClose, onRegistered }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await registerForEvent(event.id, { name, email });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="modal-backdrop" onClick={onRegistered}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-mark">✅</div>
          <h2 className="centered">You're in!</h2>
          <p className="centered muted">
            {name}, your seat for <b>{event.name}</b> is reserved.
            A confirmation was recorded for {email}.
          </p>
          <div className="modal-actions centered-actions">
            <button className="btn primary" onClick={onRegistered}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Register — {event.name}</h2>
        <p className="muted">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</p>

        <label>
          Full name *
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>

        <label>
          Email *
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Reserving…' : 'Reserve my seat'}
          </button>
        </div>
      </form>
    </div>
  );
}
