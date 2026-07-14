import { useEffect, useState } from 'react';
import { fetchOpenJobs, applyToJob } from '../api.js';

/** Public careers page. Candidates browse open roles and apply. */
export default function CareersPage() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(null); // job being applied to

  async function load() {
    setError('');
    try {
      setJobs(await fetchOpenJobs());
    } catch (err) {
      setError(err.message);
      setJobs([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (jobs === null && !error) return <div className="empty">Loading open roles…</div>;

  return (
    <div>
      <section className="hero">
        <h1>Open Roles</h1>
        <p>Join our team — browse the openings below and apply in a minute.</p>
      </section>

      {error && (
        <div className="error-box">
          {error}
          {error.includes('Integration user') && (
            <div className="hint">Set credentials in <code>server/.env</code> and restart the API.</div>
          )}
        </div>
      )}

      {jobs?.length === 0 && !error ? (
        <div className="empty">No open roles right now — check back soon.</div>
      ) : (
        <div className="job-list">
          {jobs?.map((job) => (
            <div className="job-card" key={job.id}>
              <div className="job-main">
                <h3 className="job-title">{job.title}</h3>
                <div className="job-meta">
                  {job.department && <span>🏢 {job.department}</span>}
                  {job.location && <span>📍 {job.location}</span>}
                  <span>👥 {job.applicants} applicant{job.applicants === 1 ? '' : 's'}</span>
                  {job.openings > 0 && <span className="openings">{job.openings} opening{job.openings === 1 ? '' : 's'}</span>}
                </div>
                {job.description && <p className="job-desc">{job.description}</p>}
              </div>
              <button className="btn primary" onClick={() => setApplying(job)}>Apply</button>
            </div>
          ))}
        </div>
      )}

      {applying && (
        <ApplyModal
          job={applying}
          onClose={() => setApplying(null)}
          onApplied={() => { setApplying(null); load(); }}
        />
      )}
    </div>
  );
}

/** Application form modal */
function ApplyModal({ job, onClose, onApplied }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await applyToJob(job.id, { name, email, phone, coverNote });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="modal-backdrop" onClick={onApplied}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-mark">✅</div>
          <h2 className="centered">Application received</h2>
          <p className="centered muted">
            Thanks {name}! Your application for <b>{job.title}</b> is in.
            Our recruiters will review it shortly.
          </p>
          <div className="modal-actions centered-actions">
            <button className="btn primary" onClick={onApplied}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Apply — {job.title}</h2>

        <label>
          Full name *
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>
        <div className="field-row">
          <label>
            Email *
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Phone
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <label>
          Cover note
          <textarea
            rows={3}
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            placeholder="Tell us why you're a great fit…"
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </form>
    </div>
  );
}
