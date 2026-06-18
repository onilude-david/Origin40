/**
 * ORIGIN40 — Local admin app server.
 * Zero external dependencies: Node built-ins only (http, fs, path, crypto, fetch, node:sqlite).
 * Real SQLite datastore. Integrations: WordPress/Fluent Forms intake, Email, Discord links, WhatsApp, Google Sheets.
 * Run:  node --no-warnings server.js   →   http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const S = require('./src/scoring');
const intake = require('./src/intake');
const email = require('./src/integrations/email');
const whatsapp = require('./src/integrations/whatsapp');
const google = require('./src/integrations/google');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const ROOT = path.join(__dirname, '..');

const DOC_SECTIONS = [
  { id: 'curriculum', label: 'Curriculum & Weekly Sprints', dir: 'curriculum', icon: 'ti-route', desc: 'The 4-week founder build curriculum, onsite rhythm, milestones, and week-by-week delivery.' },
  { id: 'founder-ops', label: 'Founder Operations', dir: 'founder-ops', icon: 'ti-users-group', desc: 'Founder onboarding, attendance, Discord operations, accountability, and cohort systems.' },
  { id: 'program-management', label: 'Program Management & Legal', dir: 'program-management', icon: 'ti-clipboard-check', desc: 'Runbook, quality checks, consent language, and practical legal/disclaimer templates.' },
  { id: 'wordpress', label: 'Admissions & Form Assets', dir: 'wordpress', icon: 'ti-forms', desc: 'Fluent Forms JSON, registration questions, WordPress install notes, and form styling files.' },
  { id: 'marketing', label: 'Marketing & Outreach', dir: 'marketing', icon: 'ti-speakerphone', desc: 'Campaign plan, email templates, WhatsApp broadcasts, social content, and outreach copy.' },
  { id: 'mentors', label: 'Mentor System', dir: 'mentors', icon: 'ti-chalkboard', desc: 'Mentor roles, matching model, session structure, and feedback operations.' },
  { id: 'partners', label: 'Partners & Sponsors', dir: 'partners', icon: 'ti-building-store', desc: 'Sponsor pipeline, partner positioning, tiers, and outreach support.' },
  { id: 'demo-day', label: 'Demo Day', dir: 'demo-day', icon: 'ti-presentation', desc: 'Demo Day schedule, judges, pitch flow, scoring, and readiness operations.' },
  { id: 'impact', label: 'Impact & Alumni', dir: 'impact', icon: 'ti-chart-arcs', desc: 'Follow-up, alumni tracking, funding outcomes, impact dashboard, and reporting system.' }
];

const ENTITIES = {
  applicants: 'O40', founders: 'F', mentors: 'M', facilitators: 'FAC', partners: 'P'
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function sendDownload(res, filename, body, type) {
  res.writeHead(200, {
    'Content-Type': type || 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="' + filename.replace(/"/g, '') + '"'
  });
  res.end(body);
}
function readBody(req) {
  return new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) { data += c; });
    req.on('end', function () { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); } });
  });
}

function docTitle(text, fallback) {
  const line = String(text || '').split(/\r?\n/).find(function (l) { return /^#\s+/.test(l); });
  return line ? line.replace(/^#\s+/, '').trim() : fallback.replace(/[-_]/g, ' ').replace(/\.md$/i, '');
}

function docSummary(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter(function (l) { return l.trim() && !/^#/.test(l.trim()) && !/^\|/.test(l.trim()) && !/^---$/.test(l.trim()); })
    .join(' ')
    .replace(/\*\*/g, '')
    .slice(0, 180);
}

function listMarkdown(dir) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .filter(function (name) { return /\.md$/i.test(name); })
    .sort()
    .map(function (name) {
      const rel = dir + '/' + name;
      const full = path.join(ROOT, rel);
      const text = fs.readFileSync(full, 'utf8');
      const stat = fs.statSync(full);
      return {
        id: rel.replace(/\\/g, '/'),
        title: docTitle(text, name),
        section: dir,
        path: rel.replace(/\\/g, '/'),
        words: (text.match(/\S+/g) || []).length,
        updated: stat.mtime.toISOString(),
        summary: docSummary(text)
      };
    });
}

function docsIndex() {
  const sections = DOC_SECTIONS.map(function (s) {
    return Object.assign({}, s, { docs: listMarkdown(s.dir) });
  });
  const rootReadme = path.join(ROOT, 'README.md');
  const extras = fs.existsSync(rootReadme) ? [{
    id: 'README.md',
    title: docTitle(fs.readFileSync(rootReadme, 'utf8'), 'README.md'),
    section: 'root',
    path: 'README.md',
    words: (fs.readFileSync(rootReadme, 'utf8').match(/\S+/g) || []).length,
    updated: fs.statSync(rootReadme).mtime.toISOString(),
    summary: docSummary(fs.readFileSync(rootReadme, 'utf8'))
  }] : [];
  return {
    total: sections.reduce(function (sum, s) { return sum + s.docs.length; }, extras.length),
    sections: [{ id: 'root', label: 'Project Manual', dir: '.', icon: 'ti-book-2', desc: 'The top-level Origin40 system map and operating overview.', docs: extras }].concat(sections)
  };
}

function allDocs() {
  return docsIndex().sections.reduce(function (out, sec) {
    sec.docs.forEach(function (doc) { out.push(doc); });
    return out;
  }, []);
}

function readDoc(id) {
  id = decodeURIComponent(id || '').replace(/\\/g, '/');
  const allowed = ['README.md'].concat(DOC_SECTIONS.map(function (s) { return s.dir + '/'; }));
  const ok = allowed.some(function (prefix) { return id === prefix || id.indexOf(prefix) === 0; });
  if (!ok || id.indexOf('..') > -1 || !/\.md$/i.test(id)) return null;
  const full = path.join(ROOT, id);
  if (!fs.existsSync(full)) return null;
  const text = fs.readFileSync(full, 'utf8');
  return { id: id, title: docTitle(text, path.basename(id)), path: id, content: text };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function mdTable(rows) {
  const clean = rows.filter(function (r) { return !/^\|\s*-+/.test(r); });
  if (!clean.length) return '';
  const cells = clean.map(function (r) {
    return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return inlineMd(c.trim()); });
  });
  const head = cells[0] || [];
  const body = cells.slice(1);
  return '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' + body.map(function (r) {
      return '<tr>' + head.map(function (_, idx) { return '<td>' + (r[idx] || '') + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
}

function markdownToHtml(md) {
  const lines = String(md || '').split(/\r?\n/);
  let html = '', i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) { i++; continue; }
    if (/^---+$/.test(trimmed)) { html += '<hr>'; i++; continue; }
    if (/^# /.test(trimmed)) { html += '<h1>' + inlineMd(trimmed.replace(/^# /, '')) + '</h1>'; i++; continue; }
    if (/^## /.test(trimmed)) { html += '<h2>' + inlineMd(trimmed.replace(/^## /, '')) + '</h2>'; i++; continue; }
    if (/^### /.test(trimmed)) { html += '<h3>' + inlineMd(trimmed.replace(/^### /, '')) + '</h3>'; i++; continue; }
    if (/^> /.test(trimmed)) {
      const q = [];
      while (i < lines.length && /^> /.test(lines[i].trim())) { q.push(lines[i].trim().replace(/^> /, '')); i++; }
      html += '<blockquote>' + q.map(inlineMd).join('<br>') + '</blockquote>';
      continue;
    }
    if (/^\|/.test(trimmed)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      html += mdTable(rows);
      continue;
    }
    if (/^- /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^- /, '')); i++; }
      html += '<ul>' + items.map(function (x) { return '<li>' + inlineMd(x) + '</li>'; }).join('') + '</ul>';
      continue;
    }
    if (/^\d+\. /.test(trimmed)) {
      const nums = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { nums.push(lines[i].trim().replace(/^\d+\. /, '')); i++; }
      html += '<ol>' + nums.map(function (x) { return '<li>' + inlineMd(x) + '</li>'; }).join('') + '</ol>';
      continue;
    }
    const para = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|>|- |\d+\. |\||---)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    html += '<p>' + inlineMd(para.join(' ')) + '</p>';
  }
  return html;
}

function docHtml(doc) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(doc.title) + '</title>' +
    '<style>body{background:#f4f6f8;margin:0;padding:32px;font-family:Georgia,serif;color:#111827}.paper{background:#fff;max-width:760px;margin:0 auto;padding:48px;border:1px solid #e5e7eb;box-shadow:0 8px 24px rgba(11,19,43,.1)}.meta{font:10px Segoe UI,Arial,sans-serif;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:18px}h1,h2,h3{font-family:Segoe UI,Arial,sans-serif;color:#0B132B}h1{font-size:28px;line-height:1.15;margin:0 0 18px}h2{font-size:17px;margin:28px 0 10px;padding-top:12px;border-top:1px solid #e5e7eb}h3{font-size:14px;margin:20px 0 8px;color:#1C7C54}p,li{font-size:14px;line-height:1.65}table{width:100%;border-collapse:collapse;margin:14px 0 18px;font:12px Segoe UI,Arial,sans-serif}th{background:#eef4f1;color:#234238}th,td{border:1px solid #dbe3df;padding:8px 9px;vertical-align:top}blockquote{margin:14px 0;padding:10px 14px;border-left:4px solid #1C7C54;background:#f4faf7;color:#374151}code{font-family:Consolas,monospace;background:#f3f4f6;padding:1px 4px;border-radius:4px}@media print{body{background:#fff;padding:0}.paper{box-shadow:none;border:0;padding:0}}</style>' +
    '</head><body><article class="paper"><div class="meta">Origin40 Document Library · ' + escapeHtml(doc.path) + '</div>' +
    markdownToHtml(doc.content) + '</article></body></html>';
}

function slugName(id, ext) {
  return path.basename(id, '.md').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + ext;
}

const CRC_TABLE = Array.from({ length: 256 }, function (_, n) {
  let c = n;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  return c >>> 0;
});
function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  return (c ^ -1) >>> 0;
}
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }
function zipStore(files) {
  const locals = [], centrals = [];
  let offset = 0;
  files.forEach(function (f) {
    const name = Buffer.from(f.name.replace(/\\/g, '/'));
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
    const central = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    locals.push(local); centrals.push(central); offset += local.length;
  });
  const centralSize = centrals.reduce(function (s, b) { return s + b.length; }, 0);
  return Buffer.concat(locals.concat(centrals, [Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0)])]));
}

function docsZip() {
  const files = [];
  allDocs().forEach(function (meta) {
    const doc = readDoc(meta.path);
    if (!doc) return;
    files.push({ name: 'markdown/' + doc.path, data: doc.content });
    files.push({ name: 'html/' + doc.path.replace(/\.md$/i, '.html'), data: docHtml(doc) });
  });
  return zipStore(files);
}

/* ---- applicant intake helper (dedupe by email) ---- */
function addApplicant(rec) {
  const sourceRow = rec._sourceRow;
  delete rec._sourceRow;
  rec.name = (rec.name || '').trim();
  rec.email = (rec.email || '').trim().toLowerCase();
  rec.phone = (rec.phone || '').trim();
  const email = rec.email;
  const phone = rec.phone.replace(/[^0-9]/g, '');
  if (email) {
    const dupe = db.list('applicants').find(function (a) { return (a.email || '').toLowerCase() === email; });
    if (dupe) return { skipped: true, id: dupe.id, row: sourceRow };
  }
  if (!email && phone) {
    const dupe = db.list('applicants').find(function (a) { return String(a.phone || '').replace(/[^0-9]/g, '') === phone; });
    if (dupe) return { skipped: true, id: dupe.id, row: sourceRow };
  }
  if (!/[a-z0-9]/i.test(rec.name + email + phone)) return { rejected: true, reason: 'No recognizable name, email, or phone.', row: sourceRow };
  rec.id = db.nextId('applicants', 'O40');
  rec.scores = rec.scores || {};
  if (!rec.timestamp) rec.timestamp = new Date().toISOString().slice(0, 10);
  S.scoreApplicant(rec);
  db.put('applicants', rec);
  return { id: rec.id, added: true };
}

function meta() {
  return {
    brand: { name: 'Origin40', tagline: 'Build the Product. Launch the Venture.', campaign: '4 Weeks. 40 Founders. Real Products.' },
    framework: S.FRAMEWORK,
    lists: {
      applicantStatus: S.APPLICANT_STATUSES, mentorRole: S.MENTOR_ROLES, mentorStatus: S.MENTOR_STATUSES,
      facilitatorStatus: S.FACILITATOR_STATUSES, sponsorTier: S.SPONSOR_TIERS, partnerStage: S.PARTNER_STAGES,
      founderStatus: S.FOUNDER_STATUSES
    }
  };
}

function dashboard() {
  const apps = db.list('applicants');
  const founders = db.list('founders');
  const mentors = db.list('mentors');
  const facils = db.list('facilitators');
  const partners = db.list('partners');
  const cStatus = function (st) { return apps.filter(function (a) { return a.status === st; }).length; };
  const selected = cStatus('Selected');
  const mentorsConfirmed = mentors.filter(function (m) { return ['Confirmed', 'Onboarded', 'Active'].indexOf(m.status) > -1; }).length;
  const facilReady = facils.filter(function (f) { return ['Confirmed', 'Scheduled', 'Delivered'].indexOf(f.status) > -1; }).length;
  const committed = partners.filter(function (p) { return p.stage === 'Committed'; });
  const funds = committed.reduce(function (s, p) { return s + (Number(p.value) || 0); }, 0);
  const atRisk = founders.filter(function (f) { return f.status === 'At Risk'; }).length;
  const pending = apps.filter(function (a) { return a.status === 'Submitted' || a.status === 'Under Review'; }).length;
  const avgAttend = founders.length ? founders.reduce(function (s, f) { return s + (Number(f.attendancePct) || 0); }, 0) / founders.length : 0;
  const completed = founders.filter(function (f) { return f.status === 'Completed'; }).length;
  const band = function (lo, hi) { return apps.filter(function (a) { return S.hasAnyScore(a.scores) && a.total >= lo && a.total < hi; }).length; };

  return {
    kpis: [
      { label: 'Applications received', value: apps.length, ctx: 'of 300 target · ' + Math.round((apps.length / 300) * 100) + '% reached' },
      { label: 'Founders selected', value: selected, ctx: 'of 40 seats · ' + Math.round((selected / 40) * 100) + '% filled' },
      { label: 'Avg attendance', value: Math.round(avgAttend * 100) + '%', ctx: 'cohort average · target 70%' },
      { label: 'Completion rate', value: (selected ? Math.round((completed / selected) * 100) : 0) + '%', ctx: 'completers of selected' },
      { label: 'Mentors confirmed', value: mentorsConfirmed, ctx: 'across 8 mentor roles' },
      { label: 'Facilitators ready', value: facilReady, ctx: 'delivering sessions' },
      { label: 'Funds committed', value: '₦' + funds.toLocaleString(), ctx: committed.length + ' sponsors' },
      { label: 'Pending review', value: pending, ctx: 'applicants awaiting scoring', warn: pending > 0 }
    ],
    charts: {
      statusFunnel: S.APPLICANT_STATUSES.map(function (st) { return { label: st, value: cStatus(st) }; }),
      scoreBands: [
        { label: '80–100', value: band(80, 1000) }, { label: '70–79', value: band(70, 80) },
        { label: '55–69', value: band(55, 70) }, { label: '40–54', value: band(40, 55) }, { label: '0–39', value: band(0, 40) }
      ],
      pipeline: S.PARTNER_STAGES.map(function (st) {
        return { label: st, value: partners.filter(function (p) { return p.stage === st; }).reduce(function (s, p) { return s + (Number(p.value) || 0); }, 0) };
      }).filter(function (x) { return x.value > 0; })
    },
    alerts: [
      { label: 'Applicants pending review', n: pending },
      { label: 'At-risk founders', n: atRisk },
      { label: 'Seats remaining (of 40)', n: Math.max(0, 40 - selected) },
      { label: 'Sponsors not yet committed', n: partners.filter(function (p) { return p.stage !== 'Committed' && p.stage !== 'Declined'; }).length }
    ]
  };
}

/* ---- integrations status (what's configured) ---- */
function integrationsStatus() {
  const s = db.allSettings();
  const has = function (o, keys) { return !!(o && keys.every(function (k) { return o[k]; })); };
  return {
    wordpress: { configured: has(s.wordpress, ['baseUrl', 'formId']), cfg: s.wordpress || {} },
    intake: { webhookToken: (s.intake && s.intake.webhookToken) || '' },
    email: { configured: has(s.email, ['apiKey', 'fromEmail']), provider: (s.email && s.email.provider) || 'brevo' },
    discord: { configured: !!(s.discord && (s.discord.inviteUrl || s.discord.serverUrl)), cfg: s.discord || {} },
    resources: { configured: !!(s.resources && s.resources.websiteUrl), cfg: s.resources || {} },
    whatsapp: { configured: !!(s.whatsapp && (s.whatsapp.token || s.whatsapp.accountSid)), provider: (s.whatsapp && s.whatsapp.provider) || 'meta' },
    google: { configured: !!(s.google && s.google.serviceAccountJson && s.google.spreadsheetId) }
  };
}

async function handleApi(req, res, fullUrl) {
  const pathname = fullUrl.split('?')[0];
  const parts = pathname.split('/').filter(Boolean); // ['api', a, b, c?]
  const a = parts[1], b = parts[2], c = parts[3];

  if (a === 'meta') return send(res, 200, meta());
  if (a === 'dashboard') return send(res, 200, dashboard());
  if (a === 'events') return send(res, 200, db.recentEvents(50));
  if (a === 'docs' && req.method === 'GET') {
    if (b === 'download-all') {
      return sendDownload(res, 'origin40-documents.zip', docsZip(), 'application/zip');
    }
    if (b) {
      const doc = readDoc([b, c].filter(Boolean).join('/'));
      if (!doc) return send(res, 404, { error: 'document not found' });
      const query = fullUrl.split('?')[1] || '';
      const format = new URLSearchParams(query).get('format');
      if (format === 'md') return sendDownload(res, slugName(doc.path, '.md'), doc.content, 'text/markdown; charset=utf-8');
      if (format === 'html') return sendDownload(res, slugName(doc.path, '.html'), docHtml(doc), 'text/html; charset=utf-8');
      return send(res, 200, doc);
    }
    return send(res, 200, docsIndex());
  }

  /* settings */
  if (a === 'settings') {
    if (req.method === 'GET') return send(res, 200, { settings: db.allSettings(), status: integrationsStatus() });
    if (req.method === 'POST') {
      const body = await readBody(req);
      Object.keys(body).forEach(function (k) { db.setSetting(k, body[k]); });
      // auto-generate a webhook token if missing
      const it = db.getSetting('intake', {});
      if (!it.webhookToken) { it.webhookToken = 'wht_' + Math.random().toString(36).slice(2, 12); db.setSetting('intake', it); }
      db.logEvent('settings.update', Object.keys(body));
      return send(res, 200, { ok: true, status: integrationsStatus() });
    }
  }

  if (a === 'reset' && req.method === 'POST') { db.clearAll(); db.logEvent('data.reset', 'all records cleared'); return send(res, 200, { ok: true }); }

  /* intake: webhook */
  if (a === 'intake' && b === 'fluentforms' && req.method === 'POST') {
    const token = (req.headers['x-origin40-token']) || (fullUrl.split('token=')[1] || '').split('&')[0];
    const conf = db.getSetting('intake', {});
    if (conf.webhookToken && token !== conf.webhookToken) return send(res, 401, { error: 'bad token' });
    const body = await readBody(req);
    const rec = intake.mapToApplicant(body);
    if (!rec.name && !rec.email) return send(res, 400, { error: 'no recognizable name/email in payload', got: Object.keys(body) });
    const r = addApplicant(rec);
    db.logEvent('intake.webhook', { email: rec.email, result: r });
    return send(res, 200, { ok: true, result: r });
  }

  /* intake: pull from WordPress */
  if (a === 'intake' && b === 'pull' && req.method === 'POST') {
    const r = await intake.pullFromWordPress(db.getSetting('wordpress', {}));
    if (!r.ok) return send(res, 400, r);
    let added = 0, skipped = 0;
    r.applicants.forEach(function (rec) { const x = addApplicant(rec); x.added ? added++ : skipped++; });
    db.logEvent('intake.pull', { added: added, skipped: skipped });
    return send(res, 200, { ok: true, added: added, skipped: skipped, total: r.applicants.length });
  }

  /* import: CSV */
  if (a === 'import' && b === 'applicants' && req.method === 'POST') {
    const body = await readBody(req);
    const imported = intake.importCsv(body.csv || '', { delimiter: body.delimiter });
    let added = 0, skipped = 0, rejected = imported.report.rejected;
    const skippedRows = [];
    imported.applicants.forEach(function (rec, i) {
      const x = addApplicant(rec);
      if (x.added) added++;
      else if (x.skipped) { skipped++; skippedRows.push({ row: x.row || i + 2, id: x.id }); }
      else if (x.rejected) { rejected++; imported.report.rejectedRows.push({ row: x.row || i + 2, reason: x.reason }); }
    });
    const report = Object.assign({}, imported.report, { added: added, skipped: skipped, rejected: rejected, skippedRows: skippedRows });
    db.logEvent('import.csv', { added: added, skipped: skipped, rejected: rejected, parsed: imported.applicants.length });
    return send(res, 200, { ok: true, added: added, skipped: skipped, rejected: rejected, parsed: imported.report.rows, report: report });
  }

  /* actions: send email */
  if (a === 'actions' && b === 'email' && req.method === 'POST') {
    const m = await readBody(req);
    const r = await email.send(db.getSetting('email', {}), m);
    db.logEvent('email.send', { to: m.to, ok: r.ok, error: r.error });
    return send(res, r.ok ? 200 : 400, r);
  }
  /* actions: send whatsapp */
  if (a === 'actions' && b === 'whatsapp' && req.method === 'POST') {
    const m = await readBody(req);
    const r = await whatsapp.send(db.getSetting('whatsapp', {}), m);
    db.logEvent('whatsapp.send', { to: m.to, ok: r.ok, error: r.error });
    return send(res, r.ok ? 200 : 400, r);
  }
  /* sync: google sheets */
  if (a === 'sync' && b === 'sheets' && req.method === 'POST') {
    const body = await readBody(req);
    const entity = body.entity || 'applicants';
    const rows = db.list(entity);
    const header = entity === 'applicants'
      ? ['ID', 'Name', 'Email', 'Country', 'Startup', 'Total', 'Recommendation', 'Status']
      : Object.keys(rows[0] || { id: '', name: '' });
    const data = entity === 'applicants'
      ? rows.map(function (a) { return [a.id, a.name, a.email, a.country, a.startup, a.total, a.recommendation, a.status]; })
      : rows.map(function (r) { return header.map(function (h) { return r[h]; }); });
    const r = await google.syncRows(db.getSetting('google', {}), entity, header, data);
    db.logEvent('sheets.sync', { entity: entity, ok: r.ok, rows: r.rows, error: r.error });
    return send(res, r.ok ? 200 : 400, r);
  }

  /* entities CRUD */
  if (ENTITIES[a]) {
    const entity = a, id = b;
    if (req.method === 'GET') return send(res, 200, db.list(entity));
    if (req.method === 'POST') {
      const body = await readBody(req);
      body.id = db.nextId(entity, ENTITIES[entity]);
      if (entity === 'applicants') { body.scores = body.scores || {}; if (!body.timestamp) body.timestamp = new Date().toISOString().slice(0, 10); S.scoreApplicant(body); }
      db.put(entity, body);
      return send(res, 201, body);
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const cur = db.get(entity, id);
      if (!cur) return send(res, 404, { error: 'not found' });
      const merged = Object.assign({}, cur, body);
      if (entity === 'applicants') S.scoreApplicant(merged);
      db.put(entity, merged);
      return send(res, 200, merged);
    }
    if (req.method === 'DELETE') { const r = db.remove(entity, id); return send(res, r ? 200 : 404, r || { error: 'not found' }); }
  }

  return send(res, 404, { error: 'unknown route' });
}

function serveStatic(req, res, url) {
  const rel = url === '/' ? '/index.html' : url;
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(file, function (err, buf) {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

function appHandler(req, res) {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) {
    handleApi(req, res, req.url).catch(function (e) { send(res, 500, { error: String(e) }); });
  } else {
    serveStatic(req, res, url);
  }
}

module.exports = appHandler;

if (require.main === module) {
  const server = http.createServer(appHandler);
  server.listen(PORT, '127.0.0.1', function () { console.log('Origin40 admin app → http://localhost:' + PORT); });
}
