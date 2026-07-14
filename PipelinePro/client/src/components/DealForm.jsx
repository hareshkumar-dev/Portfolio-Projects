import { useState } from 'react';
import { createDeal, updateDeal } from '../api.js';

/** Default close date for new deals: 30 days out */
function defaultCloseDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/**
 * Deal create/edit modal. Creates a new deal when no `deal` prop is
 * provided; otherwise updates the given deal.
 */
export default function DealForm({ deal, stages, onClose, onSaved }) {
  const isEdit = Boolean(deal);

  const [name, setName] = useState(deal?.Name || '');
  const [amount, setAmount] = useState(deal?.Amount ?? '');
  const [stage, setStage] = useState(deal?.StageName || 'Prospecting');
  const [closeDate, setCloseDate] = useState(
    deal?.CloseDate?.slice(0, 10) || defaultCloseDate()
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { name, amount: Number(amount) || 0, stage, closeDate };
      if (isEdit) {
        await updateDeal(deal.Id, payload);
      } else {
        await createDeal(payload);
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
        <h2>{isEdit ? 'Edit deal' : 'New deal'}</h2>

        <label>
          Deal name *
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp — Annual license"
            autoFocus
            required
          />
        </label>

        <label>
          Amount (USD)
          <input
            type="number"
            min="0"
            step="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50000"
          />
        </label>

        <label>
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {stages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            {stage && !stages.includes(stage) && (
              <option value={stage}>{stage}</option>
            )}
          </select>
        </label>

        <label>
          Expected close date *
          <input
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            required
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create deal'}
          </button>
        </div>
      </form>
    </div>
  );
}
