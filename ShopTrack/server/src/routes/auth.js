/**
 * Authentication routes (store operator console) — OAuth 2.0 Web Server
 * flow with PKCE.
 *
 * Operators authenticate on Salesforce's own login page (credentials
 * never touch this app). Salesforce redirects back with an authorization
 * code, which the server exchanges for an access token using a PKCE code
 * verifier. Salesforce tokens are held server-side only; the browser gets
 * an opaque session ID.
 */
import { Router } from 'express';
import crypto from 'crypto';
import jsforce from 'jsforce';

const router = Router();

const LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
const CLIENT_ID = process.env.SF_CLIENT_ID;
const CALLBACK_URL = process.env.SF_CALLBACK_URL || 'http://localhost:5003/api/auth/callback';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3003';

// sessionId -> authenticated jsforce connection.
const sessions = new Map();
// state -> PKCE code verifier for the in-flight handshake.
const pending = new Map();

const base64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** GET /api/auth/login — start the OAuth 2.0 web-server (PKCE) flow. */
router.get('/login', (req, res) => {
  const state = crypto.randomUUID();
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  pending.set(state, codeVerifier);
  setTimeout(() => pending.delete(state), 10 * 60 * 1000);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'api refresh_token',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  res.redirect(`${LOGIN_URL}/services/oauth2/authorize?${params.toString()}`);
});

/** GET /api/auth/callback — exchange the code for tokens and open a session. */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const fail = (msg) => res.redirect(`${CLIENT_URL}/?error=${encodeURIComponent(msg)}`);

  if (error) return fail(error_description || error);
  const codeVerifier = pending.get(state);
  if (!code || !codeVerifier) return fail('Login attempt expired — please try again.');
  pending.delete(state);

  try {
    const tokenRes = await fetch(`${LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        redirect_uri: CALLBACK_URL,
        code_verifier: codeVerifier,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || token.error) {
      throw new Error(token.error_description || token.error || 'Token exchange failed.');
    }

    const conn = new jsforce.Connection({
      instanceUrl: token.instance_url,
      accessToken: token.access_token,
    });
    const identity = await conn.identity();

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, conn);

    console.log(`Operator authenticated via OAuth: ${identity.username}`);
    const user = encodeURIComponent(JSON.stringify({
      displayName: identity.display_name,
      username: identity.username,
      orgId: identity.organization_id,
    }));
    res.redirect(`${CLIENT_URL}/?sessionId=${sessionId}&user=${user}`);
  } catch (err) {
    console.error('OAuth callback failed:', err.message);
    fail(err.message);
  }
});

/** POST /api/auth/logout */
router.post('/logout', (req, res) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (sessionId) sessions.delete(sessionId);
  res.json({ message: 'Logged out.' });
});

/**
 * Auth middleware: validates the Bearer session ID and attaches the
 * corresponding Salesforce connection to the request as `req.sf`.
 */
export function requireAuth(req, res, next) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  const conn = sessionId && sessions.get(sessionId);
  if (!conn) return res.status(401).json({ error: 'Authentication required.' });
  req.sf = conn;
  next();
}

export default router;
