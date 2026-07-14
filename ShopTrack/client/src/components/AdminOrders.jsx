import { useEffect, useState, useCallback, Fragment } from 'react';
import {
  fetchAllOrders, updateOrderStatus, formatMoney, formatDate, getSession,
} from '../api.js';

const STAGES = ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

/**
 * Store operator console: view every order and advance its
 * fulfillment status.
 */
export default function AdminOrders({ onSessionExpired }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setOrders(await fetchAllOrders());
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

  async function handleStatus(order, status) {
    try {
      await updateOrderStatus(order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="empty">Loading orders…</div>;

  const revenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const active = orders.filter((o) => ['Placed', 'Packed', 'Shipped'].includes(o.status)).length;

  return (
    <div>
      <div className="kpi-row">
        <div className="stat-tile">
          <div className="stat-label">Total orders</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">In fulfillment</div>
          <div className="stat-value">{active}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Revenue</div>
          <div className="stat-value">{formatMoney(revenue)}</div>
        </div>
      </div>

      <div className="board-header">
        <h2>Orders</h2>
        <div className="board-actions">
          <button className="btn ghost" onClick={load}>⟳ Refresh</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty">
          No orders yet. Orders placed from the storefront will appear here.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Placed</th>
              <th>Total</th>
              <th>Fulfillment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <tr>
                  <td className="cell-strong mono">{order.number}</td>
                  <td>
                    <div>{order.customerName}</div>
                    <div className="cell-muted">{order.customerEmail}</div>
                  </td>
                  <td className="cell-muted">{formatDate(order.placedOn)}</td>
                  <td className="mono">{formatMoney(order.total)}</td>
                  <td>
                    <select
                      className={`status-select st-${(order.status || '').toLowerCase()}`}
                      value={order.status || ''}
                      onChange={(e) => handleStatus(order, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="row-actions">
                    <button
                      className="btn small"
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    >
                      {expanded === order.id ? 'Hide' : 'Items'}
                    </button>
                  </td>
                </tr>
                {expanded === order.id && (
                  <tr className="detail-row">
                    <td colSpan={6}>
                      <table className="line-table inset">
                        <tbody>
                          {order.items.map((li) => (
                            <tr key={li.id}>
                              <td>{li.name}</td>
                              <td className="ln-qty">× {li.quantity}</td>
                              <td className="ln-price">{formatMoney(li.unitPrice * li.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
