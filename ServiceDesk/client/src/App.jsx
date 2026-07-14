import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import { getSession, setSession, clearSession, logout } from './api.js';

/**
 * Top-level component. Only two "screens":
 *   - not logged in  -> <LoginPage />
 *   - logged in      -> <Dashboard />
 *
 * After the Salesforce OAuth flow, the server redirects back here with
 * ?sessionId=...&user=... (or ?error=...); we pick that up on load.
 */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getSession()));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sessionId');
    const err = params.get('error');

    if (sid) {
      setSession(sid);
      const raw = params.get('user');
      if (raw) {
        const userInfo = JSON.parse(decodeURIComponent(raw));
        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
      }
      setLoggedIn(true);
      window.history.replaceState({}, '', '/');
    } else if (err) {
      setError(decodeURIComponent(err));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      /* server may already have dropped the session - that's fine */
    }
    clearSession();
    localStorage.removeItem('user');
    setUser(null);
    setLoggedIn(false);
  }

  return loggedIn ? (
    <Dashboard user={user} onLogout={handleLogout} onSessionExpired={handleLogout} />
  ) : (
    <LoginPage error={error} />
  );
}
