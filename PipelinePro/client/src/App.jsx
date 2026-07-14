import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import PipelineBoard from './components/PipelineBoard.jsx';
import LeadsPage from './components/LeadsPage.jsx';
import { getSession, setSession, clearSession, logout } from './api.js';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'leads', label: 'Leads' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getSession()));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState('dashboard');

  // Complete the OAuth round-trip: the server redirects back to
  // "/?sessionId=…&user=…" on success or "/?error=…" on failure.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    const userParam = params.get('user');
    const error = params.get('error');

    if (sessionId && userParam) {
      setSession(sessionId);
      const userInfo = JSON.parse(decodeURIComponent(userParam));
      handleLoggedIn(userInfo);
      window.history.replaceState({}, '', '/');
    } else if (error) {
      setAuthError(decodeURIComponent(error));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  function handleLoggedIn(userInfo) {
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
    setLoggedIn(true);
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
    setLoggedIn(false);
  }

  if (!loggedIn) return <LoginPage error={authError} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          </span>
          <span className="brand-name">PipelinePro</span>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user?.displayName || user?.username}</span>
          <button className="btn ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="page">
        {tab === 'dashboard' && <Dashboard onSessionExpired={handleLogout} />}
        {tab === 'pipeline' && <PipelineBoard onSessionExpired={handleLogout} />}
        {tab === 'leads' && <LeadsPage onSessionExpired={handleLogout} />}
      </main>
    </div>
  );
}
