import { useState, useEffect } from 'react';
import Storefront from './components/Storefront.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import MyOrders from './components/MyOrders.jsx';
import LoginPage from './components/LoginPage.jsx';
import AdminOrders from './components/AdminOrders.jsx';
import { useCart } from './useCart.js';
import { getSession, setSession, clearSession, logout } from './api.js';

/**
 * Two audiences, one app:
 *  - shoppers browse the store, check out, and track orders (no login)
 *  - store operators sign in to manage and fulfill orders
 */
export default function App() {
  const [view, setView] = useState('store'); // store | orders | login | admin
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [loginError, setLoginError] = useState('');
  const cart = useCart();

  // Complete the operator OAuth round-trip: the server redirects back
  // to "/?sessionId=…&user=…" on success or "/?error=…" on failure.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    const userParam = params.get('user');
    const error = params.get('error');

    if (sessionId && userParam) {
      setSession(sessionId);
      handleLoggedIn(JSON.parse(decodeURIComponent(userParam)));
      window.history.replaceState({}, '', '/');
    } else if (error) {
      setLoginError(decodeURIComponent(error));
      setView('login');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  function goAdmin() {
    setView(getSession() ? 'admin' : 'login');
  }

  function handleLoggedIn(userInfo) {
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
    setView('admin');
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      /* session may already be gone server-side */
    }
    clearSession();
    localStorage.removeItem('user');
    setUser(null);
    setView('store');
  }

  const shopperNav = view === 'store' || view === 'orders';

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('store')}>
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </span>
          <span className="brand-name">ShopTrack</span>
        </button>

        {shopperNav && (
          <nav className="nav">
            <button className={`nav-link ${view === 'store' ? 'active' : ''}`} onClick={() => setView('store')}>
              Store
            </button>
            <button className={`nav-link ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
              Track Order
            </button>
          </nav>
        )}

        <div className="topbar-right">
          {view === 'admin' && user ? (
            <>
              <span className="user-name">{user.displayName || user.username}</span>
              <button className="btn ghost" onClick={handleLogout}>Sign out</button>
            </>
          ) : shopperNav ? (
            <>
              <button className="cart-btn" onClick={() => setCartOpen(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Cart{cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
              </button>
              <button className="btn ghost" onClick={goAdmin}>Operator sign in →</button>
            </>
          ) : null}
        </div>
      </header>

      <main className="page">
        {view === 'store' && <Storefront cart={cart} onOpenCart={() => setCartOpen(true)} />}
        {view === 'orders' && <MyOrders />}
        {view === 'login' && <LoginPage error={loginError} onBack={() => setView('store')} />}
        {view === 'admin' && <AdminOrders onSessionExpired={handleLogout} />}
      </main>

      {shopperNav && cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onOrderPlaced={() => { setCartOpen(false); setView('orders'); }}
        />
      )}
    </div>
  );
}
