/**
 * Applicant intake — three paths into the app:
 *   1. Webhook   : Fluent Forms posts each new submission (mapToApplicant)
 *   2. API pull  : pull entries from the WordPress / Fluent Forms REST API
 *   3. CSV import: parse an exported CSV (parseCsv + mapRow)
 *
 * Field mapping is forgiving: we look for common field names/labels so it works
 * with typical Fluent Forms setups. Adjust FIELD_ALIASES to match your form.
 */

const FIELD_ALIASES = {
  name: ['name', 'full_name', 'fullname', 'full name', 'your_name', 'applicant_name', 'applicant', 'names', 'respondent', 'contact_name'],
  firstName: ['first_name', 'firstname', 'first name', 'given_name', 'given name'],
  lastName: ['last_name', 'lastname', 'last name', 'surname', 'family_name', 'family name'],
  email: ['email', 'email_address', 'email address', 'e-mail', 'your_email', 'mail'],
  phone: ['phone', 'phone_number', 'phone number', 'whatsapp', 'whatsapp_number', 'whatsapp number', 'mobile', 'mobile_number', 'tel', 'telephone'],
  country: ['country', 'location', 'nation', 'where are you based', 'country of residence', 'residence'],
  startup: ['startup', 'startup_name', 'startup name', 'idea', 'idea_name', 'idea name', 'business', 'business_name', 'business name', 'project', 'project name', 'company', 'company name', 'venture'],
  pitch: ['pitch', 'one_line_pitch', 'one line pitch', 'one-liner', 'tagline', 'description', 'summary', 'about', 'describe your idea', 'startup description', 'business description'],
  timestamp: ['timestamp', 'submitted at', 'submission date', 'date submitted', 'created_at', 'created at', 'date'],
  status: ['status', 'application status', 'applicant status'],
  problem: ['problem', 'problem clarity', 'problem_score', 'problem score'],
  founder: ['founder', 'founder seriousness', 'founder_score', 'founder score'],
  product: ['product', 'product potential', 'product_score', 'product score'],
  market: ['market', 'market relevance', 'market_score', 'market score'],
  build: ['build', 'build readiness', 'build_score', 'build score'],
  availability: ['availability', 'availability_score', 'availability score']
};

function normalizeKey(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/^\ufeff/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeHeader(s) {
  return String(s == null ? '' : s).replace(/^\ufeff/, '').trim();
}

function scalar(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v == null ? '' : String(v).trim();
}

function pick(obj, aliases) {
  const keys = Object.keys(obj);
  const wanted = aliases.map(normalizeKey);
  for (let i = 0; i < wanted.length; i++) {
    const hit = keys.find(function (k) { return normalizeKey(k) === wanted[i]; });
    if (hit && scalar(obj[hit]) !== '') return scalar(obj[hit]);
  }
  for (let i = 0; i < aliases.length; i++) {
    const a = normalizeKey(aliases[i]);
    if (a.length <= 4) continue;
    const hit = keys.find(function (k) {
      const nk = normalizeKey(k);
      return nk.indexOf(a) > -1;
    });
    if (hit && scalar(obj[hit]) !== '') return scalar(obj[hit]);
  }
  return '';
}

function toNumber(v) {
  if (v == null || String(v).trim() === '') return '';
  const n = Number(String(v || '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? '' : n;
}

function hasSignal() {
  return Array.prototype.slice.call(arguments).some(function (v) {
    return /[a-z0-9]/i.test(String(v || ''));
  });
}

function flatten(raw) {
  const flat = {};
  Object.keys(raw || {}).forEach(function (k) {
    const v = raw[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.keys(v).forEach(function (k2) { flat[k2] = v[k2]; });
    } else {
      flat[k] = v;
    }
  });
  return flat;
}

/** Normalize an arbitrary submission object → applicant fields (no scores yet). */
function mapToApplicant(raw) {
  // Fluent Forms may nest under .data or provide flat fields; flatten one level.
  const flat = flatten(raw);
  const first = pick(flat, FIELD_ALIASES.firstName);
  const last = pick(flat, FIELD_ALIASES.lastName);
  const status = pick(flat, FIELD_ALIASES.status);
  const scores = {};
  ['problem', 'founder', 'product', 'market', 'build', 'availability'].forEach(function (key) {
    const raw = pick(flat, FIELD_ALIASES[key]);
    // Only accept a real score cell: a small standalone number (e.g. "18"),
    // never a long free-text answer that merely happens to contain digits.
    if (/^\s*\d{1,3}(\.\d+)?\s*$/.test(String(raw))) {
      const v = toNumber(raw);
      if (v !== '') scores[key] = v;
    }
  });
  return {
    name: pick(flat, FIELD_ALIASES.name) || [first, last].filter(Boolean).join(' '),
    email: pick(flat, FIELD_ALIASES.email),
    phone: pick(flat, FIELD_ALIASES.phone).replace(/^['’\s]+/, ''), // strip CSV text-guard apostrophe
    country: pick(flat, FIELD_ALIASES.country),
    startup: pick(flat, FIELD_ALIASES.startup),
    pitch: pick(flat, FIELD_ALIASES.pitch),
    timestamp: pick(flat, FIELD_ALIASES.timestamp),
    status: status || 'Submitted',
    scores: scores, manualOverride: !!(status && String(status).trim().toLowerCase() !== 'submitted'), reviewer: '', notes: '',
    source: 'intake', raw: flat
  };
}

/* ---- CSV ---- */
function countDelims(line) {
  const counts = { ',': 0, '\t': 0, ';': 0 };
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i], n = line[i + 1];
    if (c === '"' && inQ && n === '"') { i++; continue; }
    if (c === '"') inQ = !inQ;
    else if (!inQ && counts[c] != null) counts[c]++;
  }
  return counts;
}

function detectDelimiter(text) {
  const first = String(text || '').split(/\r?\n/).find(function (l) { return l.trim(); }) || '';
  const counts = countDelims(first);
  return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0] || ',';
}

function parseCsv(text, delimiter) {
  delimiter = delimiter || detectDelimiter(text);
  const rows = [];
  let row = [], field = '', inQ = false;
  text = String(text || '').replace(/^\ufeff/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delimiter) { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (x) { return x !== ''; }); });
}

function csvToApplicants(text, options) {
  const delimiter = options && options.delimiter ? options.delimiter : detectDelimiter(text);
  const rows = parseCsv(text, delimiter);
  if (rows.length < 2) return [];
  const header = rows[0].map(normalizeHeader);
  return rows.slice(1).map(function (r) {
    const obj = {};
    header.forEach(function (h, i) { obj[h || ('Column ' + (i + 1))] = scalar(r[i]); });
    return mapToApplicant(obj);
  });
}

function importCsv(text, options) {
  const delimiter = options && options.delimiter ? options.delimiter : detectDelimiter(text);
  const rows = parseCsv(text, delimiter);
  const report = {
    delimiter: delimiter === '\t' ? 'tab' : delimiter,
    rows: Math.max(0, rows.length - 1),
    headers: rows[0] ? rows[0].map(normalizeHeader) : [],
    accepted: 0,
    rejected: 0,
    rejectedRows: [],
    recognized: {}
  };
  if (rows.length < 2) return { applicants: [], report: report };

  const header = rows[0].map(normalizeHeader);
  Object.keys(FIELD_ALIASES).forEach(function (field) {
    const hit = header.find(function (h) { return pick({ [h]: 'x' }, FIELD_ALIASES[field]) === 'x'; });
    if (hit) report.recognized[field] = hit;
  });

  const applicants = [];
  rows.slice(1).forEach(function (r, idx) {
    const obj = {};
    header.forEach(function (h, i) { obj[h || ('Column ' + (i + 1))] = scalar(r[i]); });
    const rec = mapToApplicant(obj);
    if (!hasSignal(rec.name, rec.email, rec.phone)) {
      report.rejected++;
      report.rejectedRows.push({ row: idx + 2, reason: 'No recognizable name, email, or phone.' });
      return;
    }
    rec._sourceRow = idx + 2;
    report.accepted++;
    applicants.push(rec);
  });
  return { applicants: applicants, report: report };
}

/* ---- WordPress / Fluent Forms API pull ---- */
async function pullFromWordPress(cfg) {
  // cfg: { baseUrl, formId, username, appPassword }
  if (!cfg || !cfg.baseUrl || !cfg.formId) return { ok: false, error: 'WordPress pull needs Site URL + Form ID in Settings.' };
  const base = String(cfg.baseUrl).replace(/\/$/, '');
  const auth = cfg.username && cfg.appPassword
    ? 'Basic ' + Buffer.from(cfg.username + ':' + String(cfg.appPassword).replace(/\s+/g, '')).toString('base64')
    : null;
  const headers = auth ? { 'Authorization': auth, 'Accept': 'application/json' } : { 'Accept': 'application/json' };
  const perPage = 100;
  const all = [];
  let firstKeys = null, page = 1, pages = 0;
  try {
    while (page <= 50) { // safety cap = 5000 entries
      const url = base + '/wp-json/fluentform/v1/forms/' + cfg.formId + '/entries?per_page=' + perPage + '&page=' + page;
      let res;
      try { res = await fetch(url, { headers: headers }); }
      catch (e) { return { ok: false, error: 'Could not reach ' + base + ' (' + e + '). Check the Site URL and that the machine has internet.' }; }
      if (!res.ok) {
        const text = (await res.text()).slice(0, 200);
        let hint = '';
        if (res.status === 401 || res.status === 403) hint = ' — check the WP username + application password, and that this user can view Fluent Forms entries.';
        else if (res.status === 404) hint = ' — endpoint not found. Confirm Fluent Forms is active, the Form ID is right, and its REST API is enabled.';
        return { ok: false, status: res.status, error: 'WordPress returned ' + res.status + hint + ' [' + text + ']' };
      }
      let j;
      try { j = await res.json(); } catch (e) { return { ok: false, error: 'WordPress did not return JSON (is this the right Site URL?).' }; }
      const entries = j.data || j.entries || (Array.isArray(j) ? j : []) || [];
      if (!Array.isArray(entries) || !entries.length) break;
      entries.forEach(function (e) {
        let src = e.response || e.user_inputs || e.data || e;
        if (typeof src === 'string') src = safeJson(src);
        if (!firstKeys) firstKeys = Object.keys(src || {}).slice(0, 40);
        const merged = Object.assign({ created_at: e.created_at || e.created_at_human || e.created || '' }, src);
        all.push(mapToApplicant(merged));
      });
      pages = page;
      if (entries.length < perPage) break;
      page++;
    }
    return { ok: true, applicants: all, pages: pages, sampleKeys: firstKeys || [] };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

module.exports = { mapToApplicant, parseCsv, csvToApplicants, importCsv, pullFromWordPress, FIELD_ALIASES };
