import { useEffect, useState, useCallback } from 'react';
import {
  fetchAllProperties, deleteProperty, fetchInquiries, formatPrice, formatDate, getSession,
} from '../api.js';
import PropertyForm from './PropertyForm.jsx';

/**
 * Agent console with two tabs: manage the property catalog, and review
 * inbound inquiries (the Web leads created from listing pages).
 */
export default function AgentConsole({ onSessionExpired }) {
  const [tab, setTab] = useState('listings');
  const [properties, setProperties] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [props, inq] = await Promise.all([fetchAllProperties(), fetchInquiries()]);
      setProperties(props);
      setInquiries(inq);
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

  async function handleDelete(property) {
    if (!window.confirm(`Delete "${property.title}"?`)) return;
    try {
      await deleteProperty(property.id);
      setProperties((prev) => prev.filter((p) => p.id !== property.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="page"><div className="empty">Loading…</div></div>;

  const available = properties.filter((p) => p.status === 'Available').length;

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="stat-tile">
          <div className="stat-label">Listings</div>
          <div className="stat-value">{properties.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Available</div>
          <div className="stat-value">{available}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Open inquiries</div>
          <div className="stat-value">{inquiries.length}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}>
          Listings
        </button>
        <button className={`tab ${tab === 'inquiries' ? 'active' : ''}`} onClick={() => setTab('inquiries')}>
          Inquiries {inquiries.length > 0 && <span className="tab-badge">{inquiries.length}</span>}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {tab === 'listings' ? (
        <>
          <div className="board-header">
            <h2>Property Listings</h2>
            <div className="board-actions">
              <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                + New Listing
              </button>
              <button className="btn ghost" onClick={load}>⟳ Refresh</button>
            </div>
          </div>

          {properties.length === 0 ? (
            <div className="empty">No listings yet. Click <b>+ New Listing</b> to add one.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>City</th>
                  <th>Price</th>
                  <th>Beds</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">
                      {p.featured && <span className="mini-tag">★</span>} {p.title}
                    </td>
                    <td className="cell-muted">{p.city || '—'}</td>
                    <td className="mono">{formatPrice(p.price)}</td>
                    <td>{p.bedrooms || '—'}</td>
                    <td className="cell-muted">{p.type}</td>
                    <td>
                      <span className={`badge st-${(p.status || '').toLowerCase().replace(/\s+/g, '')}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button className="btn small" onClick={() => { setEditing(p); setShowForm(true); }}>
                        Edit
                      </button>
                      <button className="btn small danger" onClick={() => handleDelete(p)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <>
          <div className="board-header">
            <h2>Inquiries</h2>
            <button className="btn ghost" onClick={load}>⟳ Refresh</button>
          </div>

          {inquiries.length === 0 ? (
            <div className="empty">No inquiries yet. They appear here when buyers enquire from a listing.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Contact</th>
                  <th>Property</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((i) => (
                  <tr key={i.id}>
                    <td className="cell-strong">{i.name}</td>
                    <td className="cell-muted">
                      <div>{i.email}</div>
                      {i.phone && <div>{i.phone}</div>}
                    </td>
                    <td>{i.property}</td>
                    <td className="cell-muted">{formatDate(i.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {showForm && (
        <PropertyForm
          property={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
