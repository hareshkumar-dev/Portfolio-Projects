import { useState, useEffect } from 'react';
import PublicEvents from './components/PublicEvents.jsx';
import LoginPage from './components/LoginPage.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { getSession, setSession, clearSession, logout } from './api.js';

/**
 * Two audiences, one app:
 *  - visitors browse and register on the public page (no login)
 *  - organizers sign in to manage events and attendees
 */
export default function App() {
  const [view, setView] = useState('public'); // 'public' | 'login' | 'admin'
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [loginError, setLoginError] = useState('');

  // Complete the organizer OAuth round-trip: the server redirects back
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
    setView('public');
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('public')}>
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V6a1 1 0 0 1 1-1z" />
              <path d="M14 5v14" strokeDasharray="2 2" />
            </svg>
          </span>
          <span className="brand-name">Eventify</span>
        </button>
        <div className="topbar-right">
          {view === 'admin' && user ? (
            <>
              <span className="user-name">{user.displayName || user.username}</span>
              <button className="btn ghost" onClick={handleLogout}>Sign out</button>
            </>
          ) : view === 'public' ? (
            <button className="btn ghost" onClick={goAdmin}>Organizer sign in →</button>
          ) : null}
        </div>
      </header>

      <main className="page">
        {view === 'public' && <PublicEvents />}
        {view === 'login' && <LoginPage error={loginError} onBack={() => setView('public')} />}
        {view === 'admin' && <AdminDashboard onSessionExpired={handleLogout} />}
      </main>
    </div>
  );
}
