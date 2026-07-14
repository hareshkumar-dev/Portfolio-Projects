/**
 * Login screen. Authentication uses the OAuth 2.0 web-server flow:
 * the button hands off to the API server, which redirects the browser
 * to Salesforce's own login page. No credentials are entered here, and
 * Salesforce tokens never reach the browser.
 */
const LOGIN_ENDPOINT = 'http://localhost:5000/api/auth/login';

export default function LoginPage({ error }) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16v12H5.17L4 17.17V4z"></path>
            <line x1="8" y1="9" x2="16" y2="9"></line>
            <line x1="8" y1="12" x2="13" y2="12"></line>
          </svg>
        </div>
        <h1>ServiceDesk</h1>
        <p className="login-sub">Customer Support Portal</p>

        {error && <div className="error-box">{error}</div>}

        <a className="sf-login-btn" href={LOGIN_ENDPOINT}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18 10.2a4.3 4.3 0 0 0-8-1.5 3.2 3.2 0 0 0-4.6 2.9v.2A3.4 3.4 0 0 0 6 18.4h11.2a3.1 3.1 0 0 0 .8-6.1v-2.1z"></path>
          </svg>
          Log in with Salesforce
        </a>

        <p className="login-hint">
          You'll be redirected to Salesforce to sign in securely via
          <em> OAuth 2.0</em>. This app never sees your password.
        </p>
      </div>
    </div>
  );
}
