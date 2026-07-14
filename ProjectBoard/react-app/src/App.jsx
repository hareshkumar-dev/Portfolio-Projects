import React, { useEffect, useState, useCallback } from 'react';

const STAGES = ['To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['High', 'Medium', 'Low'];

/**
 * Kanban board. All data access goes through `props.api`, a bridge the
 * LWC host provides whose functions call Apex — so this React code has
 * no idea it's running inside Salesforce.
 */
export default function App({ api }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.getTasks();
      setTasks(data || []);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function moveTo(stage) {
    setOverStage(null);
    const id = dragId;
    setDragId(null);
    const task = tasks.find((t) => t.Id === id);
    if (!task || task.Stage__c === stage) return;

    // optimistic update
    setTasks((prev) => prev.map((t) => (t.Id === id ? { ...t, Stage__c: stage } : t)));
    try {
      await api.updateStage(id, stage);
    } catch (e) {
      setError(messageOf(e));
      load();
    }
  }

  async function removeTask(id) {
    if (!window.confirm('Delete this task?')) return;
    setTasks((prev) => prev.filter((t) => t.Id !== id));
    try {
      await api.deleteTask(id);
    } catch (e) {
      setError(messageOf(e));
      load();
    }
  }

  return (
    <div className="pb-root">
      <div className="pb-toolbar">
        <h2>Project Board</h2>
        <button className="pb-btn" onClick={load}>Refresh</button>
        <button className="pb-btn primary" onClick={() => setShowForm(true)}>+ New Task</button>
      </div>

      {error && <div className="pb-error">{error}</div>}

      {loading ? (
        <div className="pb-empty">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="pb-empty">No tasks yet. Click <b>+ New Task</b> to add one.</div>
      ) : (
        <div className="pb-board">
          {STAGES.map((stage) => {
            const colTasks = tasks.filter((t) => t.Stage__c === stage);
            return (
              <div
                key={stage}
                className={`pb-col ${overStage === stage ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
                onDragLeave={() => setOverStage(null)}
                onDrop={() => moveTo(stage)}
              >
                <div className="pb-col-head">
                  <span>{stage}</span>
                  <span className="pb-count">{colTasks.length}</span>
                </div>
                {colTasks.map((t) => (
                  <div
                    key={t.Id}
                    className={`pb-card ${dragId === t.Id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragId(t.Id)}
                    onDragEnd={() => setDragId(null)}
                  >
                    <div className="pb-title">{t.Name}</div>
                    <div className="pb-meta">
                      <span className={`pb-pill ${t.Priority__c || 'Medium'}`}>{t.Priority__c || 'Medium'}</span>
                      <span className="pb-assignee">{t.Assignee__c || 'Unassigned'}</span>
                    </div>
                    <div className="pb-card-foot">
                      <span className="pb-due">{formatDate(t.Due_Date__c)}</span>
                      <button className="pb-del" title="Delete" onClick={() => removeTask(t.Id)} aria-label="Delete task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskForm
          api={api}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function TaskForm({ api, onClose, onSaved, onError }) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      await api.createTask({ title, assignee, priority, dueDate, description });
      onSaved();
    } catch (err) {
      onError(messageOf(err));
      setSaving(false);
    }
  }

  return (
    <div className="pb-backdrop" onClick={onClose}>
      <form className="pb-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>New task</h3>
        <label className="pb-field">
          Title *
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
        </label>
        <div className="pb-row">
          <label className="pb-field">
            Assignee
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </label>
          <label className="pb-field">
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <label className="pb-field">
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="pb-field">
          Description
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="pb-actions">
          <button type="button" className="pb-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="pb-btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create task'}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function messageOf(e) {
  if (!e) return 'Something went wrong.';
  if (e.body && e.body.message) return e.body.message; // Apex/LWC error shape
  return e.message || String(e);
}
