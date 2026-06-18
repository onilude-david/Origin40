/**
 * Google Sheets integration via a service account (no deps — JWT signed with
 * Node's built-in crypto, then the Sheets REST API).
 *
 * Config in Settings: { serviceAccountJson: "<paste the JSON key>", spreadsheetId, sheetName }
 * Share the target spreadsheet with the service account's client_email (Editor).
 */

const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claim);
  const signature = b64url(signer.sign(sa.private_key));
  const jwt = header + '.' + claim + '.' + signature;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('Google token error: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

function parseSA(cfg) {
  if (!cfg || !cfg.serviceAccountJson) throw new Error('No service account JSON in Settings.');
  return typeof cfg.serviceAccountJson === 'string' ? JSON.parse(cfg.serviceAccountJson) : cfg.serviceAccountJson;
}

/** Overwrite a sheet/tab with header + rows (a simple mirror/sync). */
async function syncRows(cfg, sheetName, header, rows) {
  try {
    const sa = parseSA(cfg);
    const token = await getAccessToken(sa);
    const id = cfg.spreadsheetId;
    const tab = encodeURIComponent(sheetName || cfg.sheetName || 'Sheet1');
    // clear then write
    await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + tab + ':clear', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + token }
    });
    const values = [header].concat(rows);
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + tab + '?valueInputOption=RAW', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: values })
    });
    return { ok: res.ok, status: res.status, rows: rows.length, body: (await res.text()).slice(0, 200) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

module.exports = { syncRows };
