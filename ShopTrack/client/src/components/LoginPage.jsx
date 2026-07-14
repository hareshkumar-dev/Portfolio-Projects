/**
 * Store operator login — OAuth 2.0 web-server flow.
 *
 * The button hands off to the API server's /api/auth/login endpoint,
 * which redirects to Salesforce's own hosted login page. Credentials
 * are entered on Salesforce, never here; the browser only ever holds an
 * opaque session ID.
 */
const LOGIN_URL = 'http://localhost:5003/api/auth/login';

export default function LoginPage({ error, onBack }) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <h1>Operator Sign In</h1>
        <p className="login-sub">Manage and fulfill store orders</p>

        {error && <div className="error-box">{error}</div>}

        <a className="sf-login-btn" href={LOGIN_URL}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M14.5 6.5a3.6 3.6 0 0 0-2.62 1.13A4.3 4.3 0 0 0 8.4 5.9a4.2 4.2 0 0 0-4.1 3.3A3.6 3.6 0 0 0 1.5 12.6 3.5 3.5 0 0 0 5 16.1h.3a3.9 3.9 0 0 0 5.6 1.2 4.3 4.3 0 0 0 6.4-1 3.3 3.3 0 0 0 .7.08 3.2 3.2 0 0 0 .1-6.4 3.7 3.7 0 0 0-3.6-3.48z" />
          </svg>
          Log in with Salesforce
        </a>

        <p className="login-hint">
          You'll sign in on Salesforce's secure page with your org email and
          password. This app never sees your credentials.
        </p>

        <button type="button" className="link-btn" onClick={onBack}>
          ← Back to store
        </button>
      </div>
    </div>
  );
}
