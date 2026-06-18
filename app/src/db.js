/**
 * Origin40 datastore — real SQLite via Node's built-in node:sqlite (zero deps).
 * Starts EMPTY: no demo data. Records are stored per entity as durable rows.
 * DB file: app/data/origin40.db
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'origin40.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    entity TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
    created TEXT, updated TEXT, PRIMARY KEY (entity, id)
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, kind TEXT, detail TEXT
  );
`);

/* ---- records ---- */
function list(entity) {
  return db.prepare('SELECT data FROM records WHERE entity=? ORDER BY id').all(entity)
    .map(function (r) { return JSON.parse(r.data); });
}
function get(entity, id) {
  const r = db.prepare('SELECT data FROM records WHERE entity=? AND id=?').get(entity, id);
  return r ? JSON.parse(r.data) : null;
}
function put(entity, rec) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO records (entity, id, data, created, updated) VALUES (?,?,?,?,?)
     ON CONFLICT(entity, id) DO UPDATE SET data=excluded.data, updated=excluded.updated`
  ).run(entity, rec.id, JSON.stringify(rec), now, now);
  return rec;
}
function remove(entity, id) {
  const existing = get(entity, id);
  db.prepare('DELETE FROM records WHERE entity=? AND id=?').run(entity, id);
  return existing;
}
function count(entity) {
  return db.prepare('SELECT COUNT(*) c FROM records WHERE entity=?').get(entity).c;
}
function nextId(entity, prefix) {
  let max = 0;
  list(entity).forEach(function (r) {
    const m = String(r.id || '').match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}
function clearAll() {
  db.prepare('DELETE FROM records').run();
}

/* ---- settings (key/value, JSON-encoded) ---- */
function getSetting(key, fallback) {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? JSON.parse(r.value) : (fallback === undefined ? null : fallback);
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}
function allSettings() {
  const out = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(function (r) { out[r.key] = JSON.parse(r.value); });
  return out;
}

/* ---- events / audit log ---- */
function logEvent(kind, detail) {
  db.prepare('INSERT INTO events (ts, kind, detail) VALUES (?,?,?)')
    .run(new Date().toISOString(), kind, typeof detail === 'string' ? detail : JSON.stringify(detail));
}
function recentEvents(n) {
  return db.prepare('SELECT ts, kind, detail FROM events ORDER BY id DESC LIMIT ?').all(n || 50);
}

module.exports = {
  list, get, put, remove, count, nextId, clearAll,
  getSetting, setSetting, allSettings, logEvent, recentEvents
};
