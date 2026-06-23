/**
 * Discord auto-provisioner (bot token, no deps — Discord REST API v10).
 *
 * With a bot token + the server (guild) ID, this builds the Origin40 server from the
 * blueprint in ONE call: roles, categories, channels (with read-only / private locks),
 * and webhooks — then returns the webhook URLs so the app can save them automatically.
 *
 * It is IDEMPOTENT: re-running skips anything that already exists (matched by name),
 * so it's safe to run again after a partial/failed run.
 *
 * The bot must be invited to the server first with Manage Roles + Manage Channels +
 * Manage Webhooks. buildInviteUrl(appId) returns the exact OAuth link.
 */

const API = 'https://discord.com/api/v10';

// permission bits
const VIEW_CHANNEL = 1 << 10;   // 1024
const SEND_MESSAGES = 1 << 11;  // 2048
// invite perms = Manage Roles + Manage Channels + Manage Webhooks + View + Send
const INVITE_PERMS = (1 << 28) | (1 << 4) | (1 << 29) | VIEW_CHANNEL | SEND_MESSAGES; // 805309456

const ROLES = [
  { name: 'Program Team', color: 0x14745F, hoist: true },
  { name: 'Facilitator', color: 0xC9A227, hoist: true },
  { name: 'Mentor', color: 0x1F8A70, hoist: true },
  { name: 'Founder', color: 0x245C87, hoist: true },
  { name: 'Partner', color: 0x7A4E7F, hoist: true },
  { name: 'Alumni', color: 0x607080, hoist: false },
  { name: 'Applicant', color: 0xAAB2B8, hoist: false }
];

// hook: which webhook key this channel feeds (announcements | log | submissions)
const PLAN = [
  { cat: 'Start Here', channels: [
    { name: 'welcome', readonly: true }, { name: 'rules', readonly: true },
    { name: 'announcements', readonly: true, hook: 'announcements' },
    { name: 'introductions' }, { name: 'ask-the-team' }
  ]},
  { cat: 'The Build', channels: [
    { name: 'cohort-lounge' }, { name: 'week-1-validate' }, { name: 'week-2-build' },
    { name: 'week-3-test' }, { name: 'week-4-pitch' },
    { name: 'submissions', hook: 'submissions' }, { name: 'wins' }, { name: 'stuck' },
    { name: 'resources', readonly: true }
  ]},
  { cat: 'Mentorship', channels: [
    { name: 'mentor-lounge', private: true }, { name: 'mentor-matching', private: true }, { name: 'book-office-hours' }
  ]},
  { cat: 'Partners', channels: [
    { name: 'partner-lounge', private: true }, { name: 'opportunities', readonly: true }
  ]},
  { cat: 'Demo Day', channels: [
    { name: 'demo-day-prep' }, { name: 'demo-day-live' }
  ]},
  { cat: 'Alumni', channels: [
    { name: 'alumni-network', private: true }, { name: 'alumni-opportunities', private: true }
  ]},
  { cat: 'Team', channels: [
    { name: 'team-ops', private: true }, { name: 'applications', private: true },
    { name: 'automation-log', private: true, hook: 'log' }
  ]}
];

function buildInviteUrl(appId) {
  return 'https://discord.com/api/oauth2/authorize?client_id=' + encodeURIComponent(appId || '') +
    '&scope=bot&permissions=' + INVITE_PERMS;
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function call(token, method, path, body) {
  let lastErr = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch(API + path, {
        method: method,
        headers: { 'Authorization': 'Bot ' + token, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      // transient network blip (ECONNRESET / fetch failed) — back off and retry
      lastErr = String(e);
      await sleep(700 * (attempt + 1));
      continue;
    }
    if (res.status === 429) {
      const j = await res.json().catch(function () { return { retry_after: 1 }; });
      await sleep((j.retry_after || 1) * 1000 + 250);
      continue;
    }
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
    if (!res.ok) return { ok: false, status: res.status, error: (data && data.message) || text || ('HTTP ' + res.status) };
    return { ok: true, status: res.status, data: data };
  }
  return { ok: false, error: 'network error after retries: ' + lastErr };
}

const norm = function (s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, '-'); };

async function provision(cfg) {
  if (!cfg || !cfg.botToken || !cfg.guildId) {
    return { ok: false, error: 'Auto-setup needs a bot token + server (guild) ID in Settings.' };
  }
  const token = cfg.botToken, guild = cfg.guildId;
  const report = { ok: true, created: { roles: [], categories: [], channels: [], webhooks: [] }, skipped: 0, webhooks: {}, errors: [] };

  // existing roles + channels (idempotency)
  const rolesRes = await call(token, 'GET', '/guilds/' + guild + '/roles');
  if (!rolesRes.ok) return { ok: false, error: 'Cannot read server. Is the bot invited & token correct? (' + rolesRes.error + ')' };
  const existingRoles = {};
  rolesRes.data.forEach(function (r) { existingRoles[norm(r.name)] = r; });

  const chRes = await call(token, 'GET', '/guilds/' + guild + '/channels');
  if (!chRes.ok) return { ok: false, error: 'Cannot read channels (' + chRes.error + ')' };
  const existing = {}; // norm(name) -> channel
  chRes.data.forEach(function (c) { existing[norm(c.name) + '|' + (c.parent_id || '0') + '|' + c.type] = c; });
  const existingCats = {};
  chRes.data.forEach(function (c) { if (c.type === 4) existingCats[norm(c.name)] = c; });

  // 1) roles
  for (const role of ROLES) {
    if (existingRoles[norm(role.name)]) { report.skipped++; continue; }
    const r = await call(token, 'POST', '/guilds/' + guild + '/roles', { name: role.name, color: role.color, hoist: !!role.hoist, mentionable: false });
    if (r.ok) { report.created.roles.push(role.name); existingRoles[norm(role.name)] = r.data; }
    else report.errors.push('role ' + role.name + ': ' + r.error);
    await sleep(300);
  }

  // 2) categories + channels
  for (const group of PLAN) {
    let category = existingCats[norm(group.cat)];
    if (!category) {
      const cr = await call(token, 'POST', '/guilds/' + guild + '/channels', { name: group.cat, type: 4 });
      if (!cr.ok) { report.errors.push('category ' + group.cat + ': ' + cr.error); continue; }
      category = cr.data; existingCats[norm(group.cat)] = category; report.created.categories.push(group.cat);
      await sleep(300);
    }
    for (const ch of group.channels) {
      const key = norm(ch.name) + '|' + category.id + '|0';
      let channel = existing[key];
      if (!channel) {
        const overwrites = [];
        if (ch.private) overwrites.push({ id: guild, type: 0, deny: String(VIEW_CHANNEL) });
        else if (ch.readonly) overwrites.push({ id: guild, type: 0, deny: String(SEND_MESSAGES) });
        const body = { name: ch.name, type: 0, parent_id: category.id };
        if (overwrites.length) body.permission_overwrites = overwrites;
        const cr = await call(token, 'POST', '/guilds/' + guild + '/channels', body);
        if (!cr.ok) { report.errors.push('channel ' + ch.name + ': ' + cr.error); continue; }
        channel = cr.data; existing[key] = channel; report.created.channels.push(ch.name);
        await sleep(300);
      }
      // 3) webhook on hook channels
      if (ch.hook && channel) {
        const whRes = await call(token, 'GET', '/channels/' + channel.id + '/webhooks');
        let hook = whRes.ok && whRes.data.find(function (w) { return w.name === 'Origin40 App'; });
        if (!hook) {
          const wc = await call(token, 'POST', '/channels/' + channel.id + '/webhooks', { name: 'Origin40 App' });
          if (wc.ok) { hook = wc.data; report.created.webhooks.push(ch.name); }
          else report.errors.push('webhook ' + ch.name + ': ' + wc.error);
          await sleep(300);
        }
        if (hook && hook.id && hook.token) {
          report.webhooks[ch.hook] = 'https://discord.com/api/webhooks/' + hook.id + '/' + hook.token;
        }
      }
    }
  }

  report.ok = report.errors.length === 0 || Object.keys(report.webhooks).length > 0;
  return report;
}

module.exports = { provision, buildInviteUrl, INVITE_PERMS };
