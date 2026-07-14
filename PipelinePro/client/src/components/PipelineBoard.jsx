import { useEffect, useState, useCallback } from 'react';
import { fetchDeals, updateDeal, deleteDeal, formatMoney, getSession } from '../api.js';
import DealForm from './DealForm.jsx';

// Board columns in funnel order. Deals in stages outside this list
// get their own column appended at the end.
const STAGES = [
  'Prospecting',
  'Qualification',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
];

/**
 * Kanban board over Salesforce Opportunities. Dragging a card to
 * another column updates the deal's StageName.
 */
export default function PipelineBoard({ onSessionExpired }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dragOver, setDragOver] = useState(null); // stage being dragged over

  const load = useCallback(async () => {
    setError('');
    try {
      setDeals(await fetchDeals());
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

  const columns = [
    ...STAGES,
    ...[...new Set(deals.map((d) => d.StageName))].filter((s) => !STAGES.includes(s)),
  ];

  async function handleDrop(e, stage) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const deal = deals.find((d) => d.Id === id);
    if (!deal || deal.StageName === stage) return;

    // Optimistic update; reload from Salesforce on failure
    setDeals((prev) => prev.map((d) => (d.Id === id ? { ...d, StageName: stage } : d)));
    try {
      await updateDeal(id, { stage });
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  async function handleDelete(deal) {
    if (!window.confirm(`Delete deal "${deal.Name}"?`)) return;
    try {
      await deleteDeal(deal.Id);
      setDeals((prev) => prev.filter((d) => d.Id !== deal.Id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="empty">Loading pipeline…</div>;

  return (
    <div>
      <div className="board-header">
        <h2>Deal Pipeline</h2>
        <div className="board-actions">
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            + New Deal
          </button>
          <button className="btn ghost" onClick={load}>⟳ Refresh</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="board">
        {columns.map((stage) => {
          const stageDeals = deals.filter((d) => d.StageName === stage);
          const total = stageDeals.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
          return (
            <div
              key={stage}
              className={`column ${dragOver === stage ? 'drag-over' : ''} ${
                stage === 'Closed Won' ? 'won' : stage === 'Closed Lost' ? 'lost' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="column-head">
                <span className="column-title">{stage}</span>
                <span className="column-meta">
                  {stageDeals.length} · {formatMoney(total)}
                </span>
              </div>

              {stageDeals.map((deal) => (
                <div
                  key={deal.Id}
                  className="deal-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', deal.Id)}
                >
                  <div className="deal-name">{deal.Name}</div>
                  {deal.Account?.Name && (
                    <div className="deal-account">{deal.Account.Name}</div>
                  )}
                  <div className="deal-foot">
                    <span className="deal-amount">{formatMoney(deal.Amount)}</span>
                    <span className="deal-date">
                      {new Date(deal.CloseDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="deal-actions">
                    <button
                      className="icon-btn"
                      title="Edit deal"
                      onClick={() => { setEditing(deal); setShowForm(true); }}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn"
                      title="Delete deal"
                      onClick={() => handleDelete(deal)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showForm && (
        <DealForm
          deal={editing}
          stages={STAGES}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
