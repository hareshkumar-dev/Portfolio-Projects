/**
 * Service (integration user) connection.
 *
 * The public site — event listings and registrations — is served
 * without visitor login. Those operations run against Salesforce under
 * a service connection sourced from the Salesforce CLI's stored auth
 * for the configured org (SF_ORG), the local-development equivalent of
 * a dedicated integration user.
 *
 * The connection is cached and re-established once if Salesforce
 * invalidates the session.
 */
import { execFileSync } from 'child_process';
import jsforce from 'jsforce';

let conn = null;

/** Read access token + instance URL from the Salesforce CLI for SF_ORG. */
function orgAuth() {
  const org = process.env.SF_ORG || 'devhub2';
  let info;
  try {
    // `sf` is a shell script on Windows, so run it through the shell.
    const out = execFileSync('sf', ['org', 'display', '--target-org', org, '--json'], {
      encoding: 'utf8',
      shell: true,
    });
    info = JSON.parse(out).result;
  } catch (e) {
    const err = new Error(
      `Could not read Salesforce CLI auth for org "${org}". Run: sf org login web -a ${org}`
    );
    err.status = 503;
    throw err;
  }

  if (!info?.accessToken || !info?.instanceUrl) {
    const err = new Error(`Salesforce CLI returned no active session for org "${org}".`);
    err.status = 503;
    throw err;
  }
  return info;
}

function connect() {
  const { accessToken, instanceUrl } = orgAuth();
  return new jsforce.Connection({ instanceUrl, accessToken });
}

/** Run `fn` with the service connection, retrying once on session expiry */
export async function withServiceConnection(fn) {
  if (!conn) conn = connect();
  try {
    return await fn(conn);
  } catch (err) {
    if (err.errorCode === 'INVALID_SESSION_ID' || err.name === 'INVALID_SESSION_ID') {
      conn = connect();
      return fn(conn);
    }
    throw err;
  }
}

/** Escape a value for interpolation into a SOQL string literal */
export function soqlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Validate a Salesforce record ID (15 or 18 chars, alphanumeric) */
export function isRecordId(value) {
  return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value || '');
}
