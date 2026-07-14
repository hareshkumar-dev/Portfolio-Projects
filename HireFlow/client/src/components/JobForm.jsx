import { useState } from 'react';
import { createJob, updateJob } from '../api.js';

const STATUSES = ['Open', 'On Hold', 'Closed'];

/**
 * Job create/edit modal. Creates a new job when no `job` prop is
 * provided; otherwise updates the given job.
 */
export default function JobForm({ job, onClose, onSaved }) {
  const isEdit = Boolean(job);

  const [title, setTitle] = useState(job?.title || '');
  const [department, setDepartment] = useState(job?.department || '');
  const [location, setLocation] = useState(job?.location || '');
  const [openings, setOpenings] = useState(job?.openings ?? 1);
  const [status, setStatus] = useState(job?.status || 'Open');
  const [description, setDescription] = useState(job?.description || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title, department, location,
        openings: Number(openings) || 0, description,
      };
      if (isEdit) {
        await updateJob(job.id, { ...payload, status });
      } else {
        await createJob(payload);
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
        <h2>{isEdit ? 'Edit job' : 'New job'}</h2>

        <label>
          Job title *
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
        </label>

        <div className="field-row">
          <label>
            Department
            <input value={department} onChange={(e) => setDepartment(e.target.value)} />
          </label>
          <label>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        </div>

        <div className="field-row">
          <label>
            Openings
            <input
              type="number"
              min="1"
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
            />
          </label>
          {isEdit && (
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
        </div>

        <label>
          Description
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Responsibilities, requirements, and what makes this role great…"
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Post job'}
          </button>
        </div>
      </form>
    </div>
  );
}
