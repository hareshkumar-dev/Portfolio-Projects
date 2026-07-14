import { useEffect, useState, useCallback } from 'react';
import { fetchAllJobs, deleteJob, getSession } from '../api.js';
import JobForm from './JobForm.jsx';
import ApplicantBoard from './ApplicantBoard.jsx';

/**
 * Recruiter console. Lists jobs; opening one shows its applicant
 * pipeline as a Kanban board.
 */
export default function RecruiterConsole({ onSessionExpired }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openJob, setOpenJob] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setJobs(await fetchAllJobs());
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

  async function handleDelete(job) {
    const ok = window.confirm(
      `Delete "${job.title}"?\n\nAll ${job.applicants} application(s) will be removed with it.`
    );
    if (!ok) return;
    try {
      await deleteJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      setError(err.message);
    }
  }

  // Drill into a single job's applicant board
  if (openJob) {
    return (
      <ApplicantBoard
        job={openJob}
        onBack={() => { setOpenJob(null); load(); }}
        onSessionExpired={onSessionExpired}
      />
    );
  }

  if (loading) return <div className="empty">Loading jobs…</div>;

  const openCount = jobs.filter((j) => j.status === 'Open').length;
  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicants, 0);
  const totalHired = jobs.reduce((sum, j) => sum + j.hired, 0);

  return (
    <div>
      <div className="kpi-row">
        <div className="stat-tile">
          <div className="stat-label">Open roles</div>
          <div className="stat-value">{openCount}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total applicants</div>
          <div className="stat-value">{totalApplicants}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Hired</div>
          <div className="stat-value">{totalHired}</div>
        </div>
      </div>

      <div className="board-header">
        <h2>Jobs</h2>
        <div className="board-actions">
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            + New Job
          </button>
          <button className="btn ghost" onClick={load}>⟳ Refresh</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {jobs.length === 0 ? (
        <div className="empty">No jobs yet. Click <b>+ New Job</b> to post one.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Hired / Openings</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="cell-strong">{job.title}</td>
                <td className="cell-muted">{job.department || '—'}</td>
                <td>
                  <span className={`badge st-${job.status?.toLowerCase().replace(/\s+/g, '')}`}>
                    {job.status}
                  </span>
                </td>
                <td>{job.applicants}</td>
                <td>
                  <span className={job.hired >= job.openings && job.openings > 0 ? 'filled' : ''}>
                    {job.hired} / {job.openings}
                  </span>
                </td>
                <td className="row-actions">
                  <button className="btn small primary" onClick={() => setOpenJob(job)}>
                    Pipeline
                  </button>
                  <button className="btn small" onClick={() => { setEditing(job); setShowForm(true); }}>
                    Edit
                  </button>
                  <button className="btn small danger" onClick={() => handleDelete(job)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <JobForm
          job={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
