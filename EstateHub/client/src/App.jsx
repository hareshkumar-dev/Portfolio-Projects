import { useState, useEffect } from 'react';
import Listings from './components/Listings.jsx';
import LoginPage from './components/LoginPage.jsx';
import AgentConsole from './components/AgentConsole.jsx';
import { getSession, setSession, clearSession, logout } from './api.js';

/**
 * Two audiences, one app:
 *  - buyers browse and enquire about listings (no login)
 *  - agents sign in to manage properties and review inquiries
 */
export default function App() {
  const [view, setView] = useState('browse'); // browse | login | agent
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [loginError, setLoginError] = useState('');

  // Complete the agent OAuth round-trip: the server redirects back to
  // "/?sessionId=…&user=…" on success or "/?error=…" on failure.
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

  function goAgent() {
    setView(getSession() ? 'agent' : 'login');
  }

  function handleLoggedIn(userInfo) {
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
    setView('agent');
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
    setView('browse');
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('browse')}>
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9.5 21v-6h5v6" />
            </svg>
          </span>
          <span className="brand-name">EstateHub</span>
        </button>
        <div className="topbar-right">
          {view === 'agent' && user ? (
            <>
              <span className="user-name">{user.displayName || user.username}</span>
              <button className="btn ghost" onClick={handleLogout}>Sign out</button>
            </>
          ) : view === 'browse' ? (
            <button className="btn ghost" onClick={goAgent}>Agent sign in →</button>
          ) : null}
        </div>
      </header>

      <main>
        {view === 'browse' && <Listings />}
        {view === 'login' && <LoginPage error={loginError} onBack={() => setView('browse')} />}
        {view === 'agent' && <AgentConsole onSessionExpired={handleLogout} />}
      </main>
    </div>
  );
}
