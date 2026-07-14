import { useState, useEffect } from 'react';
import CareersPage from './components/CareersPage.jsx';
import LoginPage from './components/LoginPage.jsx';
import RecruiterConsole from './components/RecruiterConsole.jsx';
import { getSession, setSession, clearSession, logout } from './api.js';

/**
 * Two audiences, one app:
 *  - candidates browse open roles and apply (no login)
 *  - recruiters sign in to manage jobs and move applicants through stages
 */
export default function App() {
  const [view, setView] = useState('careers'); // careers | login | console
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [loginError, setLoginError] = useState('');

  // Complete the recruiter OAuth round-trip: the server redirects back
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

  function goConsole() {
    setView(getSession() ? 'console' : 'login');
  }

  function handleLoggedIn(userInfo) {
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
    setView('console');
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
    setView('careers');
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('careers')}>
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </span>
          <span className="brand-name">HireFlow</span>
        </button>
        <div className="topbar-right">
          {view === 'console' && user ? (
            <>
              <span className="user-name">{user.displayName || user.username}</span>
              <button className="btn ghost" onClick={handleLogout}>Sign out</button>
            </>
          ) : view === 'careers' ? (
            <button className="btn ghost" onClick={goConsole}>Recruiter sign in →</button>
          ) : null}
        </div>
      </header>

      <main className="page">
        {view === 'careers' && <CareersPage />}
        {view === 'login' && <LoginPage error={loginError} onBack={() => setView('careers')} />}
        {view === 'console' && <RecruiterConsole onSessionExpired={handleLogout} />}
      </main>
    </div>
  );
}
