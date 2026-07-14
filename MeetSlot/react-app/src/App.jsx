import React, { useEffect, useState, useCallback } from 'react';

// Meeting types with a fixed, colorblind-safe color per type.
const TYPES = [
  { name: 'Client Meeting', color: '#2a78d6' },
  { name: 'Internal', color: '#199e70' },
  { name: 'Interview', color: '#4a3aa7' },
  { name: 'Demo', color: '#d95926' }
];
const TYPE_COLOR = Object.fromEntries(TYPES.map((t) => [t.name, t.color]));

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Monthly team calendar. All data access goes through `props.api`,
 * the bridge the LWC host provides — this React code has no idea
 * it's running inside Salesforce.
 */
export default function App({ api }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTypes, setActiveTypes] = useState(new Set(TYPES.map((t) => t.name)));
  const [booking, setBooking] = useState(null);  // date string being booked
  const [detail, setDetail] = useState(null);    // meeting being viewed

  const load = useCallback(async (y, m) => {
    setError('');
    setLoading(true);
    try {
      const rows = await api.getMeetings(y, m + 1); // Apex expects 1-12
      setMeetings(rows || []);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load(year, month);
  }, [load, year, month]);

  function shiftMonth(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function toggleType(name) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  async function removeMeeting(id) {
    if (!window.confirm('Cancel this meeting?')) return;
    setDetail(null);
    try {
      await api.deleteMeeting(id);
      load(year, month);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  // Index visible meetings by day
  const byDay = {};
  for (const m of meetings) {
    if (!activeTypes.has(m.Type__c)) continue;
    (byDay[m.Meeting_Date__c] = byDay[m.Meeting_Date__c] || []).push(m);
  }
  Object.values(byDay).forEach((list) =>
    list.sort((a, b) => minutesOf(a.Start_Time__c) - minutesOf(b.Start_Time__c))
  );

  // Build a 6-week grid including leading/trailing days
  const firstDow = new Date(year, month, 1).getDay();
  const cells = [];
  const start = new Date(year, month, 1 - firstDow);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      key: keyOf(d.getFullYear(), d.getMonth(), d.getDate()),
      isToday: d.toDateString() === new Date().toDateString()
    });
  }

  return (
    <div className="ms-root">
      <div className="ms-toolbar">
        <button className="ms-btn icon" onClick={() => shiftMonth(-1)}>◀</button>
        <span className="ms-month">{MONTHS[month]} {year}</span>
        <button className="ms-btn icon" onClick={() => shiftMonth(1)}>▶</button>
        <button className="ms-btn" onClick={goToday}>Today</button>
        <span className="ms-spacer" />
        <button className="ms-btn primary" onClick={() => setBooking(keyOf(year, month, new Date().getDate()))}>
          + Book meeting
        </button>
      </div>

      <div className="ms-filters">
        {TYPES.map((t) => (
          <button
            key={t.name}
            className={`ms-chip ${activeTypes.has(t.name) ? 'active' : ''}`}
            style={activeTypes.has(t.name) ? { color: t.color } : undefined}
            onClick={() => toggleType(t.name)}
          >
            <span className="ms-dot" style={{ background: t.color }} />
            {t.name}
          </button>
        ))}
      </div>

      {error && <div className="ms-error">{error}</div>}

      {loading ? (
        <div className="ms-loading">Loading calendar…</div>
      ) : (
        <div className="ms-grid">
          {DOW.map((d) => <div className="ms-dow" key={d}>{d}</div>)}
          {cells.map((cell) => {
            const dayMeetings = cell.inMonth ? (byDay[cell.key] || []) : [];
            const shown = dayMeetings.slice(0, 3);
            return (
              <div
                key={cell.key}
                className={`ms-cell ${cell.inMonth ? '' : 'other'} ${cell.isToday ? 'today' : ''}`}
                onClick={() => cell.inMonth && setBooking(cell.key)}
              >
                <div className="ms-daynum">{cell.day}</div>
                {shown.map((m) => (
                  <button
                    key={m.Id}
                    className="ms-event"
                    style={{ background: TYPE_COLOR[m.Type__c] || '#64748b' }}
                    title={`${timeOf(m.Start_Time__c)} ${m.Name}`}
                    onClick={(e) => { e.stopPropagation(); setDetail(m); }}
                  >
                    {timeOf(m.Start_Time__c)} {m.Name}
                  </button>
                ))}
                {dayMeetings.length > 3 && (
                  <span className="ms-more">+{dayMeetings.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {booking && (
        <BookModal
          api={api}
          date={booking}
          onClose={() => setBooking(null)}
          onSaved={() => { setBooking(null); load(year, month); }}
          onError={setError}
        />
      )}

      {detail && (
        <DetailModal
          meeting={detail}
          onClose={() => setDetail(null)}
          onCancelMeeting={() => removeMeeting(detail.Id)}
        />
      )}
    </div>
  );
}

function BookModal({ api, date, onClose, onSaved, onError }) {
  const [subject, setSubject] = useState('');
  const [meetingDate, setMeetingDate] = useState(date);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState('Client Meeting');
  const [attendees, setAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!subject) return;
    setSaving(true);
    try {
      await api.createMeeting({
        subject, date: meetingDate, startTime,
        duration: Number(duration) || 30, type, attendees, notes
      });
      onSaved();
    } catch (err) {
      onError(messageOf(err));
      setSaving(false);
    }
  }

  return (
    <div className="ms-backdrop" onClick={onClose}>
      <form className="ms-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Book a meeting</h3>
        <label className="ms-field">
          Subject *
          <input value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus required />
        </label>
        <div className="ms-row">
          <label className="ms-field">
            Date *
            <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
          </label>
          <label className="ms-field">
            Start time *
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
        </div>
        <div className="ms-row">
          <label className="ms-field">
            Duration (min)
            <input type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
          <label className="ms-field">
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </label>
        </div>
        <label className="ms-field">
          Attendees
          <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="e.g. Priya, Arjun" />
        </label>
        <label className="ms-field">
          Notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="ms-actions">
          <button type="button" className="ms-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ms-btn primary" disabled={saving}>
            {saving ? 'Booking…' : 'Book meeting'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailModal({ meeting, onClose, onCancelMeeting }) {
  return (
    <div className="ms-backdrop" onClick={onClose}>
      <div className="ms-modal ms-detail" onClick={(e) => e.stopPropagation()}>
        <div className="ms-detail-head">
          <span className="ms-type-tag" style={{ background: TYPE_COLOR[meeting.Type__c] || '#64748b' }}>
            {meeting.Type__c}
          </span>
          <h3 style={{ margin: 0 }}>{meeting.Name}</h3>
        </div>
        <dl>
          <div><dt>Date</dt><dd>{meeting.Meeting_Date__c}</dd></div>
          <div><dt>Time</dt><dd>{timeOf(meeting.Start_Time__c)}</dd></div>
          {meeting.Duration_Minutes__c ? (
            <div><dt>Duration</dt><dd>{meeting.Duration_Minutes__c} min</dd></div>
          ) : null}
          {meeting.Attendees__c ? (
            <div><dt>Attendees</dt><dd>{meeting.Attendees__c}</dd></div>
          ) : null}
        </dl>
        {meeting.Notes__c && <div className="ms-notes">{meeting.Notes__c}</div>}
        <div className="ms-actions" style={{ marginTop: 16 }}>
          <button className="ms-btn danger" onClick={onCancelMeeting}>Cancel meeting</button>
          <button className="ms-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Salesforce Time fields reach the browser as milliseconds-since-midnight
 * (a Number), though older shapes can be an "HH:mm:ss.SSSZ" string — handle
 * both and return minutes-since-midnight for sorting.
 */
function minutesOf(value) {
  if (value == null || value === '') return -1;
  if (typeof value === 'number') return Math.floor(value / 60000);
  const [h, m] = String(value).split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

/** Render a Time value as "HH:mm", accepting a Number or an "HH:mm:ss" string. */
function timeOf(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    const total = Math.floor(value / 60000);
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  }
  return String(value).slice(0, 5);
}

function messageOf(e) {
  if (!e) return 'Something went wrong.';
  if (e.body && e.body.message) return e.body.message; // Apex/LWC error shape
  return e.message || String(e);
}
