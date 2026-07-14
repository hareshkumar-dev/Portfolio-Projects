/**
 * Service (integration user) connection + commerce helpers.
 *
 * The public storefront — catalog, checkout, order lookup — is served
 * without shopper login. Those operations run against Salesforce under
 * a dedicated integration user configured in .env.
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

// ---- Commerce lookups (cached per process) -----------------

let standardPricebookId = null;
let storefrontAccountId = null;

/**
 * The org's standard Price Book. Orders and their line items must
 * reference a price book; the standard one exists in every org.
 * Activated on first use so PricebookEntry / OrderItem inserts work.
 */
export async function getStandardPricebookId(c) {
  if (standardPricebookId) return standardPricebookId;

  const result = await c.query(
    'SELECT Id, IsActive FROM Pricebook2 WHERE IsStandard = true LIMIT 1'
  );
  const pb = result.records[0];
  if (!pb) throw new Error('No standard Price Book found in this org.');

  if (!pb.IsActive) {
    await c.sobject('Pricebook2').update({ Id: pb.Id, IsActive: true });
  }
  standardPricebookId = pb.Id;
  return standardPricebookId;
}

/**
 * A single "ShopTrack Online Store" Account that all web orders are
 * attached to (Orders require an Account). Individual shopper details
 * live on the Order's custom Customer_Name__c / Customer_Email__c
 * fields. Find-or-create, cached.
 */
export async function getStorefrontAccountId(c) {
  if (storefrontAccountId) return storefrontAccountId;

  const name = 'ShopTrack Online Store';
  const existing = await c.query(
    `SELECT Id FROM Account WHERE Name = '${soqlString(name)}' LIMIT 1`
  );
  if (existing.records[0]) {
    storefrontAccountId = existing.records[0].Id;
  } else {
    const created = await c.sobject('Account').create({ Name: name });
    storefrontAccountId = created.id;
  }
  return storefrontAccountId;
}
