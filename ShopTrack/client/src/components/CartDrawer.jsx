import { useState } from 'react';
import { placeOrder, formatMoney } from '../api.js';

/**
 * Slide-in cart + checkout. Submitting the order sends the whole cart
 * to POST /api/public/orders, which creates the Order and OrderItems
 * in Salesforce in one transaction.
 */
export default function CartDrawer({ cart, onClose, onOrderPlaced }) {
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const items = cart.items.map((i) => ({
        pricebookEntryId: i.pricebookEntryId,
        quantity: i.quantity,
      }));
      const result = await placeOrder({ name, email }, items);
      setConfirmation({ total: result.total, email });
      cart.clear();
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>{confirmation ? 'Order placed' : checkout ? 'Checkout' : 'Your cart'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {confirmation ? (
          <div className="confirm">
            <div className="success-mark">✅</div>
            <p>Thank you! Your order of <b>{formatMoney(confirmation.total)}</b> is confirmed.</p>
            <p className="muted">
              Track it any time from <b>Track Order</b> using {confirmation.email}.
            </p>
            <button className="btn primary wide" onClick={onOrderPlaced}>Track my order</button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="empty small">Your cart is empty.</div>
        ) : (
          <>
            <div className="cart-lines">
              {cart.items.map((i) => (
                <div className="cart-line" key={i.pricebookEntryId}>
                  <div className="cart-line-info">
                    <div className="cart-line-name">{i.name}</div>
                    <div className="cart-line-price">{formatMoney(i.price)} each</div>
                  </div>
                  <div className="qty">
                    <button onClick={() => cart.setQuantity(i.pricebookEntryId, i.quantity - 1)}>−</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => cart.setQuantity(i.pricebookEntryId, i.quantity + 1)}>+</button>
                  </div>
                  <div className="cart-line-total">{formatMoney(i.price * i.quantity)}</div>
                  <button className="link-btn small" onClick={() => cart.remove(i.pricebookEntryId)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-total-row">
              <span>Total</span>
              <span className="cart-total">{formatMoney(cart.total)}</span>
            </div>

            {error && <div className="error-box">{error}</div>}

            {!checkout ? (
              <button className="btn primary wide" onClick={() => setCheckout(true)}>
                Checkout
              </button>
            ) : (
              <form onSubmit={handlePlaceOrder} className="checkout-form">
                <label>
                  Full name *
                  <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
                </label>
                <label>
                  Email *
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <button type="submit" className="btn primary wide" disabled={placing}>
                  {placing ? 'Placing order…' : `Place order · ${formatMoney(cart.total)}`}
                </button>
                <button type="button" className="link-btn" onClick={() => setCheckout(false)}>
                  ← Back to cart
                </button>
              </form>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
