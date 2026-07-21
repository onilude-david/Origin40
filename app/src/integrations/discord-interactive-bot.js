/**
 * Origin40 interactive Discord responder.
 *
 * Zero-dependency Discord Gateway client. It listens for founder questions in
 * approved channels and replies with safe programme information from cPanel.
 */

const API = 'https://discord.com/api/v10';
const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

const BASE_INTENTS = 1 | 512; // Guilds + GuildMessages
const MESSAGE_CONTENT_INTENT = 32768;
const FULL_INTENTS = BASE_INTENTS | MESSAGE_CONTENT_INTENT;
const DEFAULT_CHANNEL_NAMES = ['general', 'cohort-lounge', 'ask-the-team', 'week-2-build', 'stuck', 'book-office-hours'];
const SENSITIVE_WORDS = [
  'password', 'token', 'secret', 'api key', 'private key', 'phone number', 'email address',
  'personal email', 'reject', 'rejected', 'waitlist', 'waitlisted', 'selected list',
  'score me', 'grade me', 'my score', 'why was i not selected'
];

let state = {
  running: false,
  starting: false,
  ws: null,
  heartbeat: null,
  seq: null,
  sessionId: '',
  userId: '',
  username: '',
  startedAt: '',
  lastEventAt: '',
  lastError: '',
  allowedChannels: [],
  replies: 0
};

let currentOptions = null;
let currentIntentMode = 'full';

function safeStatus() {
  return {
    running: state.running,
    starting: state.starting,
    username: state.username,
    startedAt: state.startedAt,
    lastEventAt: state.lastEventAt,
    lastError: state.lastError,
    allowedChannels: state.allowedChannels,
    replies: state.replies,
    intentMode: currentIntentMode
  };
}

function resetConnection() {
  if (state.heartbeat) clearInterval(state.heartbeat);
  state.heartbeat = null;
  if (state.ws) {
    try { state.ws.close(); } catch (e) {}
  }
  state.ws = null;
  state.running = false;
  state.starting = false;
}

function clean(text) {
  return String(text || '').toLowerCase().replace(/[^\w\s:/.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesAny(text, words) {
  return words.some(function (word) { return text.indexOf(word) > -1; });
}

function tokenSet(text) {
  const ignore = {
    the: true, and: true, for: true, with: true, what: true, when: true, where: true,
    how: true, does: true, this: true, that: true, are: true, you: true, can: true,
    origin40: true, o40: true, please: true, need: true, will: true, should: true
  };
  return clean(text).split(' ').filter(function (w) { return w.length > 2 && !ignore[w]; });
}

function searchKnowledge(query, entries) {
  const words = tokenSet(query);
  if (!words.length || !entries || !entries.length) return null;
  const scored = entries.map(function (entry) {
    const hay = clean([entry.title, entry.summary, entry.content, entry.tags && entry.tags.join(' ')].filter(Boolean).join(' '));
    let score = 0;
    words.forEach(function (word) {
      if (hay.indexOf(word) > -1) score += 1;
      if (entry.title && clean(entry.title).indexOf(word) > -1) score += 2;
    });
    return { entry: entry, score: score };
  }).filter(function (row) { return row.score > 0; }).sort(function (a, b) { return b.score - a.score; });
  return scored[0] && scored[0].score >= 2 ? scored[0].entry : null;
}

function todaySlotSummary(ctx) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const slots = (ctx.schedule && ctx.schedule.slots || []).filter(function (slot) { return slot.dateIso === today; });
  if (!slots.length) return '';
  return slots.map(function (slot) {
    return '- ' + slot.time + ': ' + slot.title + ' (' + slot.owner + ')';
  }).join('\n');
}

function nextSlotSummary(ctx) {
  const now = new Date();
  const slots = (ctx.schedule && ctx.schedule.slots || []).map(function (slot) {
    const start = String(slot.time || '09:00-10:00').split('-')[0] || '09:00';
    return Object.assign({}, slot, { startsAt: new Date(slot.dateIso + 'T' + start + ':00+01:00') });
  }).filter(function (slot) {
    return slot.startsAt >= now;
  }).sort(function (a, b) {
    return a.startsAt - b.startsAt;
  });
  const next = slots[0];
  if (!next) return '';
  return next.date + ' by ' + next.time + ': ' + next.title + ' (' + next.owner + ')';
}

function listFounderGroup(title, founders) {
  if (!founders || !founders.length) return '';
  return title + '\n' + founders.map(function (f) {
    return '- ' + f.name + ' - ' + f.startup;
  }).join('\n');
}

function structureReply(ctx) {
  const portal = (ctx.resources && ctx.resources.lmsUrl) || 'https://beeresoftwares.com/origin40/dashboard/';
  return [
    'Origin40 is a founder build programme, not just a class.',
    '',
    'The structure is:',
    '- Live sessions for teaching, critique, and mentor support.',
    '- Independent build days for execution, customer work, and testing.',
    '- Build Labs for MVP scope, product decisions, and blockers.',
    '- Weekly submissions through the founder portal.',
    '- Attendance and milestones count toward completion.',
    '',
    'Founder portal: ' + portal
  ].join('\n');
}

function communicationReply(ctx) {
  const meetingLink = (ctx.resources && ctx.resources.meetingUrl) || 'https://meet.google.com/txs-wfib-grs';
  const portal = (ctx.resources && ctx.resources.lmsUrl) || 'https://beeresoftwares.com/origin40/dashboard/';
  return [
    'Official Origin40 communication flow:',
    '- Discord: announcements, questions, build updates, blockers, and quick support.',
    '- Founder portal: lessons, assignments, MVP links, and progress tracking.',
    '- Live sessions: teaching, review, Build Labs, and mentor clinics.',
    '- Programme team: private issues, grading, personal feedback, and final decisions.',
    '',
    'Meeting link: ' + meetingLink,
    'Portal: ' + portal
  ].join('\n');
}

function buildReply(message, ctx) {
  const text = clean(message.content);
  const mentionsBot = state.userId && String(message.content || '').indexOf('<@' + state.userId + '>') > -1;
  const directCommand = text.indexOf('origin40') > -1 || text.indexOf('o40') > -1 || text.indexOf('portal') > -1 || text.indexOf('bot') > -1;
  const looksLikeQuestion = /(\?|what|when|where|how|link|schedule|today|tomorrow|submit|mvp|attendance|meeting|class|session|build|deadline|portal|assignment|mentor|facilitator|calendar|structure)/.test(text);
  if (!mentionsBot && !directCommand && !looksLikeQuestion) return '';

  const resources = ctx.resources || {};
  const meetingLink = resources.meetingUrl || 'https://meet.google.com/txs-wfib-grs';
  const portal = resources.lmsUrl || 'https://beeresoftwares.com/origin40/dashboard/';
  const website = resources.websiteUrl || 'https://beeresoftwares.com/origin40';
  const founders = ctx.founders || {};

  if (includesAny(text, SENSITIVE_WORDS)) {
    return [
      'I can help with public programme information, but this needs the programme team:',
      '- private records',
      '- admissions decisions',
      '- personal grading or scores',
      '- passwords, tokens, emails, or sensitive founder details',
      '',
      'Please tag the programme team for this one.'
    ].join('\n');
  }

  if (includesAny(text, ['help', 'what can you do', 'commands'])) {
    return [
      'I can help with Origin40 communication and programme questions:',
      '- today\'s schedule',
      '- next session',
      '- meeting link',
      '- founder portal link',
      '- MVP/submission guidance',
      '- who needs MVP build support',
      '- who already has an MVP/prototype',
      '- programme structure',
      '- attendance reminder',
      '- mentor/session basics',
      '',
      'For personal feedback, selection issues, grading, or private founder matters, please wait for the programme team.'
    ].join('\n');
  }

  if (includesAny(text, ['meeting link', 'meet link', 'google meet', 'join link', 'class link', 'session link'])) {
    return 'Origin40 meeting link:\n' + meetingLink + '\n\nPlease join a few minutes before the session starts.';
  }

  if (includesAny(text, ['portal', 'dashboard', 'lms', 'course', 'login'])) {
    return 'Founder portal / LMS:\n' + portal + '\n\nUse it for lessons, assignments, MVP links, and progress tracking.';
  }

  if (includesAny(text, ['structure', 'how does origin40 work', 'how origin40 works', 'programme work', 'program work'])) {
    return structureReply(ctx);
  }

  if (includesAny(text, ['communication', 'where do we talk', 'discord for', 'announcement', 'updates'])) {
    return communicationReply(ctx);
  }

  if (includesAny(text, ['today schedule', 'today\'s schedule', 'schedule today', 'what is today', 'class today', 'session today'])) {
    const summary = todaySlotSummary(ctx);
    if (summary) return 'Today\'s Origin40 schedule:\n\n' + summary + '\n\nMeeting link:\n' + meetingLink;
    return 'Today is mainly an independent execution/build day unless the programme team announces a live session. Portal: ' + portal;
  }

  if (includesAny(text, ['tomorrow', 'next session', 'next class', 'next meeting'])) {
    const next = nextSlotSummary(ctx);
    if (next) return 'Next scheduled Origin40 block: ' + next + '\n\nMeeting link:\n' + meetingLink;
    return 'I do not see a future scheduled block in the local calendar right now. Please watch announcements for updates.';
  }

  if (includesAny(text, ['submit', 'submission', 'assignment', 'upload'])) {
    return [
      'Submit your Origin40 work through the founder portal:',
      portal,
      '',
      'Include the required link or file, make sure sharing access is open, and add a short summary of what you built or learned.'
    ].join('\n');
  }

  if (includesAny(text, ['who needs mvp', 'need mvp', 'mvp support', 'build support', 'helping build'])) {
    const list = listFounderGroup('Founders currently marked for direct MVP build support:', founders.mvpSupport);
    return list || 'I do not have the MVP support list loaded right now. Please ask the programme team.';
  }

  if (includesAny(text, ['who has mvp', 'already have mvp', 'has an mvp', 'have prototype', 'already has product'])) {
    const list = listFounderGroup('Founders currently marked as having an MVP, product, or prototype:', founders.hasMvp);
    return list || 'I do not have the MVP/prototype list loaded right now. Please ask the programme team.';
  }

  if (includesAny(text, ['mvp', 'prototype', 'build'])) {
    return [
      'For MVP work, focus on one usable flow first:',
      '1. Who is the user?',
      '2. What painful action are you helping them complete?',
      '3. What is the smallest demoable version?',
      '4. What proof can you collect this week?',
      '',
      'Post blockers clearly so the team can help.'
    ].join('\n');
  }

  if (includesAny(text, ['attendance', 'attend', 'present'])) {
    return 'Attendance counts toward Origin40 progress and completion. Join on time, stay through the session, and participate properly.';
  }

  if (includesAny(text, ['website', 'origin40 link', 'apply'])) {
    return 'Origin40 website:\n' + website;
  }

  const match = searchKnowledge(text, ctx.knowledge || []);
  if (match) {
    return [
      match.title,
      '',
      match.answer || match.summary || String(match.content || '').slice(0, 800),
      match.path ? '\nSource: ' + match.path : ''
    ].join('\n').slice(0, 1900);
  }

  if (mentionsBot || directCommand) {
    return 'I am here. Ask me for the schedule, meeting link, portal link, submission guidance, MVP build guidance, attendance, or programme structure.';
  }

  return '';
}

async function rest(token, method, path, body) {
  const res = await fetch(API + path, {
    method: method,
    headers: { Authorization: 'Bot ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  if (!res.ok) return { ok: false, status: res.status, error: data.message || text || ('HTTP ' + res.status), data: data };
  return { ok: true, status: res.status, data: data };
}

async function resolveAllowedChannels(token, guildId, configuredIds) {
  if (configuredIds && configuredIds.length) return configuredIds.map(String);
  const channels = await rest(token, 'GET', '/guilds/' + guildId + '/channels');
  if (!channels.ok) throw new Error('Cannot read Discord channels: ' + channels.error);
  return channels.data.filter(function (ch) {
    return ch.type === 0 && DEFAULT_CHANNEL_NAMES.indexOf(ch.name) > -1;
  }).map(function (ch) { return ch.id; });
}

async function sendMessage(token, channelId, content, replyTo) {
  const payload = { content: String(content).slice(0, 1900), allowed_mentions: { parse: [] } };
  if (replyTo) payload.message_reference = { message_id: replyTo, fail_if_not_exists: false };
  return rest(token, 'POST', '/channels/' + channelId + '/messages', payload);
}

async function handleMessage(message) {
  if (!currentOptions || !message || !message.content) return;
  if (message.author && message.author.bot) return;
  if (state.allowedChannels.length && state.allowedChannels.indexOf(String(message.channel_id)) === -1) return;
  const reply = buildReply(message, currentOptions.contextProvider());
  if (!reply) return;
  const r = await sendMessage(currentOptions.token, message.channel_id, reply, message.id);
  state.lastEventAt = new Date().toISOString();
  if (r.ok) {
    state.replies++;
    if (currentOptions.logEvent) currentOptions.logEvent('discord.bot.reply', {
      channelId: message.channel_id,
      author: message.author && message.author.username,
      messageId: message.id,
      replyType: reply.split('\n')[0].slice(0, 80)
    });
  } else {
    state.lastError = r.error;
    if (currentOptions.logEvent) currentOptions.logEvent('discord.bot.reply_failed', { channelId: message.channel_id, status: r.status, error: r.error });
  }
}

async function start(options) {
  if (state.running || state.starting) return { ok: true, status: safeStatus(), note: 'Bot already running or starting.' };
  if (typeof WebSocket === 'undefined') return { ok: false, error: 'This Node runtime does not expose WebSocket. Use Node 22+ or add a Discord bot worker package.' };
  if (!options || !options.token || !options.guildId) return { ok: false, error: 'Interactive bot needs a valid bot token and guild ID.' };

  state.starting = true;
  state.lastError = '';
  currentOptions = options;

  const me = await rest(options.token, 'GET', '/users/@me');
  if (!me.ok) {
    state.starting = false;
    state.lastError = me.error;
    return { ok: false, error: 'Discord rejected the bot token: ' + me.error };
  }
  state.userId = me.data.id;
  state.username = me.data.username;

  try {
    state.allowedChannels = await resolveAllowedChannels(options.token, options.guildId, options.channelIds || []);
  } catch (e) {
    state.starting = false;
    state.lastError = String(e.message || e);
    return { ok: false, error: state.lastError };
  }

  currentIntentMode = options.intentMode || 'full';
  const ws = new WebSocket(GATEWAY);
  state.ws = ws;

  ws.addEventListener('message', function (event) {
    let packet;
    try { packet = JSON.parse(event.data); } catch (e) { return; }
    if (packet.s != null) state.seq = packet.s;
    if (packet.op === 10) {
      const interval = packet.d.heartbeat_interval;
      if (state.heartbeat) clearInterval(state.heartbeat);
      state.heartbeat = setInterval(function () {
        try { ws.send(JSON.stringify({ op: 1, d: state.seq })); } catch (e) {}
      }, interval);
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: options.token,
          intents: currentIntentMode === 'limited' ? BASE_INTENTS : FULL_INTENTS,
          properties: { os: 'windows', browser: 'origin40-cpanel', device: 'origin40-cpanel' }
        }
      }));
    }
    if (packet.op === 0 && packet.t === 'READY') {
      state.running = true;
      state.starting = false;
      state.sessionId = packet.d.session_id;
      state.startedAt = new Date().toISOString();
      state.lastEventAt = state.startedAt;
      if (currentOptions && currentOptions.logEvent) currentOptions.logEvent('discord.bot.started', {
        username: state.username,
        allowedChannels: state.allowedChannels.length
      });
    }
    if (packet.op === 0 && packet.t === 'MESSAGE_CREATE') {
      handleMessage(packet.d).catch(function (e) {
        state.lastError = String(e.message || e);
      });
    }
  });

  ws.addEventListener('close', function (event) {
    if (state.heartbeat) clearInterval(state.heartbeat);
    state.heartbeat = null;
    state.ws = null;
    state.running = false;
    state.starting = false;
    const code = event && event.code;
    const reason = event && (event.reason || event.code) ? ('gateway closed: ' + event.code + (event.reason ? ' ' + event.reason : '')) : 'gateway closed';
    state.lastError = reason;
    if (currentOptions && currentOptions.logEvent) currentOptions.logEvent('discord.bot.stopped', { reason: reason });
    if (code === 4014 && currentIntentMode !== 'limited' && currentOptions && currentOptions.allowLimitedIntentFallback !== false) {
      state.lastError = 'Full message-content mode was rejected; retrying limited tagged-response mode.';
      setTimeout(function () {
        const retry = Object.assign({}, currentOptions, { intentMode: 'limited' });
        start(retry).catch(function (e) {
          state.lastError = String(e.message || e);
        });
      }, 1000);
    }
  });

  ws.addEventListener('error', function () {
    state.lastError = 'Discord Gateway connection error.';
    if (currentOptions && currentOptions.logEvent) currentOptions.logEvent('discord.bot.error', { error: state.lastError });
  });

  return { ok: true, status: safeStatus() };
}

function stop() {
  resetConnection();
  return { ok: true, status: safeStatus() };
}

module.exports = { start, stop, status: safeStatus, buildReply };
