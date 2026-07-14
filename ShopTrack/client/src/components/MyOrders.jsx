import { useState } from 'react';
import { fetchMyOrders, formatMoney, formatDate } from '../api.js';
import OrderTimeline from './OrderTimeline.jsx';

/**
 * Public order tracking. A shopper enters the email they checked out
 * with; the server returns their orders (Order.Customer_Email__c).
 */
export default function MyOrders() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setOrders(await fetchMyOrders(email));
    } catch (err) {
      setError(err.message);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="track-wrap">
      <section className="hero">
        <h1>Track Your Order</h1>
        <p>Enter the email you used at checkout to see your orders.</p>
      </section>

      <form className="track-form" onSubmit={handleSearch}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Searching…' : 'Find orders'}
        </button>
      </form>

      {error && <div className="error-box">{error}</div>}

      {orders !== null && (
        orders.length === 0 ? (
          <div className="empty">No orders found for that email.</div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-head">
                  <div>
                    <span className="order-number">Order {order.number}</span>
                    <span className="order-date">· {formatDate(order.placedOn)}</span>
                  </div>
                  <span className="order-total">{formatMoney(order.total)}</span>
                </div>

                <OrderTimeline status={order.status} />

                <table className="line-table">
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
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
