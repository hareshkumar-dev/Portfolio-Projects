import { useEffect, useState, useCallback } from 'react';
import {
  fetchApplications, updateApplicationStage, deleteApplication, formatDate, getSession,
} from '../api.js';

// Pipeline columns. Rejected is shown as a separate lane at the end.
const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

/**
 * Kanban board of applicants for one job. Dragging a card to another
 * column updates Application__c.Stage__c in Salesforce.
 *
 * Moving a candidate into "Hired" beyond the job's openings is rejected
 * by the Apex trigger; the error is shown and the card snaps back.
 */
export default function ApplicantBoard({ job, onBack, onSessionExpired }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setApps(await fetchApplications(job.id));
    } catch (err) {
      if (!getSession()) return onSessionExpired();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [job.id, onSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDrop(e, stage) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const app = apps.find((a) => a.id === id);
    if (!app || app.stage === stage) return;

    const previous = app.stage;
    // Optimistic move
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, stage } : a)));
    setError('');
    try {
      await updateApplicationStage(id, stage);
      // Reload so counts (and the trigger's date stamp) reflect Salesforce
      load();
    } catch (err) {
      // Trigger blocked it (e.g. over-hiring) — revert the card
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, stage: previous } : a)));
      setError(err.message);
    }
  }

  async function handleDelete(app) {
    if (!window.confirm(`Remove ${app.name}'s application?`)) return;
    try {
      await deleteApplication(app.id);
      setApps((prev) => prev.filter((a) => a.id !== app.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const hiredCount = apps.filter((a) => a.stage === 'Hired').length;

  return (
    <div>
      <button className="link-btn back" onClick={onBack}>← All jobs</button>

      <div className="board-header">
        <div>
          <h2>{job.title}</h2>
          <span className="board-sub">
            {job.department && `${job.department} · `}
            {hiredCount} / {job.openings} filled · {apps.length} applicant{apps.length === 1 ? '' : 's'}
          </span>
        </div>
        <button className="btn ghost" onClick={load}>⟳ Refresh</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="empty">Loading applicants…</div>
      ) : (
        <div className="board">
          {STAGES.map((stage) => {
            const stageApps = apps.filter((a) => a.stage === stage);
            return (
              <div
                key={stage}
                className={`column ${dragOver === stage ? 'drag-over' : ''} ${
                  stage === 'Hired' ? 'hired' : stage === 'Rejected' ? 'rejected' : ''
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="column-head">
                  <span className="column-title">{stage}</span>
                  <span className="column-count">{stageApps.length}</span>
                </div>

                {stageApps.map((app) => (
                  <div
                    key={app.id}
                    className="applicant-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', app.id)}
                    onClick={() => setDetail(app)}
                  >
                    <div className="applicant-name">{app.name}</div>
                    <div className="applicant-email">{app.email}</div>
                    <div className="applicant-foot">
                      <span className="applicant-num">{app.number}</span>
                      <span className="applicant-date">{formatDate(app.appliedOn)}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {detail && (
        <ApplicantDetail
          app={detail}
          onClose={() => setDetail(null)}
          onDelete={() => { handleDelete(detail); setDetail(null); }}
        />
      )}
    </div>
  );
}

/** Read-only applicant detail popover */
function ApplicantDetail({ app, onClose, onDelete }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{app.name}</h2>
        <p className="muted">{app.number} · applied {formatDate(app.appliedOn)}</p>

        <dl className="detail-list">
          <div><dt>Email</dt><dd>{app.email}</dd></div>
          {app.phone && <div><dt>Phone</dt><dd>{app.phone}</dd></div>}
          <div><dt>Stage</dt><dd>{app.stage}</dd></div>
          <div><dt>Stage changed</dt><dd>{formatDate(app.stageChangedOn)}</dd></div>
        </dl>

        {app.coverNote && (
          <div className="cover-note">
            <div className="cover-label">Cover note</div>
            <p>{app.coverNote}</p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn danger" onClick={onDelete}>Delete</button>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
