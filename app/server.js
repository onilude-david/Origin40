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
const discord = require('./src/integrations/discord');
const discordBot = require('./src/integrations/discord-bot');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const ROOT = path.join(__dirname, '..');
const SEEDS = path.join(__dirname, 'seeds');
let bootstrapped = false;

const DOC_SECTIONS = [
  { id: 'curriculum', label: 'Curriculum & Weekly Sprints', dir: 'curriculum', icon: 'ti-route', desc: 'The 4-week online founder build curriculum, live sessions, milestones, and week-by-week delivery.' },
  { id: 'founder-ops', label: 'Founder Operations', dir: 'founder-ops', icon: 'ti-users-group', desc: 'Founder onboarding, attendance, Discord operations, accountability, and cohort systems.' },
  { id: 'program-management', label: 'Program Management & Legal', dir: 'program-management', icon: 'ti-clipboard-check', desc: 'Runbook, quality checks, consent language, and practical legal/disclaimer templates.' },
  { id: 'wordpress', label: 'Admissions & Form Assets', dir: 'wordpress', icon: 'ti-forms', desc: 'Fluent Forms JSON, registration questions, WordPress install notes, and form styling files.' },
  { id: 'marketing', label: 'Marketing & Outreach', dir: 'marketing', icon: 'ti-speakerphone', desc: 'Campaign plan, email templates, WhatsApp broadcasts, social content, and outreach copy.' },
  { id: 'mentors', label: 'Mentor System', dir: 'mentors', icon: 'ti-chalkboard', desc: 'Mentor roles, matching model, session structure, and feedback operations.' },
  { id: 'partners', label: 'Partners & Sponsors', dir: 'partners', icon: 'ti-building-store', desc: 'Sponsor pipeline, partner positioning, tiers, and outreach support.' },
  { id: 'demo-day', label: 'Demo Day', dir: 'demo-day', icon: 'ti-presentation', desc: 'Demo Day schedule, judges, pitch flow, scoring, and readiness operations.' },
  { id: 'impact', label: 'Impact & Alumni', dir: 'impact', icon: 'ti-chart-arcs', desc: 'Follow-up, alumni tracking, funding outcomes, impact dashboard, and reporting system.' }
];

const PROGRAM_SCHEDULE = [
  {
    week: 1,
    label: 'Week 1',
    theme: 'Validate The Problem',
    outcome: 'Problem-Validation Brief with evidence from reachable customers.',
    days: [
      {
        day: 'Monday',
        programDay: 1,
        slots: [
          ['09:00-09:30', 'Alignment', 'Founder standup, onboarding, and weekly sprint alignment', 'David Onilude', 'Weekly focus locked', true],
          ['09:30-10:15', 'Legacy keynote', 'Origin40 Legacy Charge: Building With Standard, Courage, and Service', 'David Oke Opeyemi, confirmed guest mentor and honoree', 'Founder legacy pledge and cohort standard', true],
          ['10:30-12:00', 'Masterclass', 'Building From Local Pain / Founder-Market Fit', 'Samuel Afolabi or founder-execution guest needed', 'Problem lens and market pain mapped', true],
          ['12:00-13:00', 'Workshop', 'Problem statement and customer segment teardown', 'David Onilude, Kazeem Quadri', 'Problem-Validation Brief v1'],
          ['14:00-16:30', 'Build sprint', 'Interview plan, evidence tracker, and landing page/message draft', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'First visible validation asset'],
          ['16:30-17:00', 'Commitments', 'Blocker log and Tuesday fieldwork commitments', 'David Onilude', 'Build log updated']
        ]
      },
      {
        day: 'Tuesday',
        programDay: 2,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Fieldwork', 'Customer discovery interviews and evidence capture', 'Founders', '2-3 customer conversations logged'],
          ['16:00-17:00', 'Clinic', 'Interview script and insight-quality clinic', 'Customer discovery facilitator needed', 'Interview questions improved']
        ]
      },
      {
        day: 'Wednesday',
        programDay: 3,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Problem evidence synthesis and persona refinement', 'Founders', 'Evidence tracker updated'],
          ['17:00-18:00', 'Clinic', 'Legal/data basics for discovery, consent, and privacy', 'Damilola Obaro or legal mentor', 'Consent/data capture checklist']
        ]
      },
      {
        day: 'Thursday',
        programDay: 4,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Validation brief polish and customer proof packaging', 'Founders', 'Draft Week 1 submission'],
          ['16:00-17:00', 'Review', 'Async facilitator review window', 'David Onilude, Kazeem Quadri', 'Feedback comments returned'],
          ['17:00-18:00', 'Founder mentor', 'Overconfidence 101 For Founders: Confidence, Mindset, and Showing Up', 'Moh Sheriff', 'Founder confidence and public-facing courage strengthened', true]
        ]
      },
      {
        day: 'Friday',
        programDay: 5,
        slots: [
          ['09:00-09:45', 'Live review', 'Standup and build review', 'David Onilude', 'Demo focus set'],
          ['10:00-12:30', 'Build sprint', 'Final edits to Problem-Validation Brief', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'Submission ready'],
          ['13:30-15:00', 'Demo gate', 'Problem, customer, and evidence review', 'Review panel', 'Week 1 score', true],
          ['15:00-16:00', 'Feedback', 'Mentor/facilitator feedback and next actions', 'Program leads', 'Week 2 priorities'],
          ['16:00-16:30', 'Closeout', 'Risk flags and support desk updates', 'David Onilude', 'Support tickets assigned']
        ]
      }
    ]
  },
  {
    week: 2,
    label: 'Week 2',
    theme: 'Design And Build The MVP',
    outcome: 'A smallest usable product/prototype with core flow, stack decision, and pricing hypothesis.',
    days: [
      {
        day: 'Monday',
        programDay: 6,
        slots: [
          ['09:00-09:30', 'Alignment', 'MVP sprint alignment and Week 1 learning transfer', 'David Onilude', 'Build scope locked'],
          ['10:30-12:00', 'Workshop', 'MVP scope, core workflow, and build plan', 'David Onilude, Kazeem Quadri', 'MVP Core Flow v1'],
          ['16:00-17:30', 'Masterclass', 'Commerce, AI, Trust, and Product Credibility', 'Gbemi Adunbarin or product/AI trust guest needed', 'Trust Checklist', true]
        ]
      },
      {
        day: 'Tuesday',
        programDay: 7,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Prototype build and user path implementation', 'Founders', 'First working flow'],
          ['16:00-17:00', 'Clinic', 'Product/UX clinic', 'Product mentor needed', 'Core flow improved']
        ]
      },
      {
        day: 'Wednesday',
        programDay: 8,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Tech stack, automation, and prototype support', 'Stanley Anigbogu or technical mentor', 'Stack decision'],
          ['17:00-18:00', 'Clinic', 'Finance, pricing, unit economics, and business model clinic', 'Finance mentor needed', 'Pricing hypothesis']
        ]
      },
      {
        day: 'Thursday',
        programDay: 9,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Prototype testing prep and submission packaging', 'Founders', 'Draft MVP submission'],
          ['16:00-17:00', 'Review', 'Async facilitator review window', 'David Onilude, Kazeem Quadri', 'Feedback comments returned']
        ]
      },
      {
        day: 'Friday',
        programDay: 10,
        slots: [
          ['09:00-09:45', 'Live review', 'Standup and build review', 'David Onilude', 'Demo focus set'],
          ['10:00-12:30', 'Build sprint', 'MVP core flow repair and demo preparation', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'MVP/prototype v1'],
          ['13:30-15:00', 'Demo gate', 'Core flow works review', 'Review panel', 'Week 2 score', true],
          ['15:00-16:00', 'Feedback', 'Technical/product feedback and next actions', 'Program leads', 'Week 3 test priorities'],
          ['16:00-16:30', 'Closeout', 'Risk flags and support desk updates', 'David Onilude', 'Support tickets assigned']
        ]
      }
    ]
  },
  {
    week: 3,
    label: 'Week 3',
    theme: 'Test And Validate',
    outcome: 'Real user feedback, traction signal, risk map, and validation report.',
    days: [
      {
        day: 'Monday',
        programDay: 11,
        slots: [
          ['09:00-09:30', 'Alignment', 'Testing sprint alignment and traction metric selection', 'David Onilude', 'Test plan locked'],
          ['10:30-12:00', 'Masterclass', 'User Testing, Sales Discovery, and Growth Loops', 'Growth/testing guest needed', 'User Test Plan', true],
          ['12:00-13:00', 'Workshop', 'Test script, feedback log, and traction metric setup', 'David Onilude, Kazeem Quadri', 'Validation tracker ready'],
          ['14:00-16:30', 'Build sprint', 'User testing outreach and instrumentation', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'Test pipeline started'],
          ['16:30-17:00', 'Commitments', 'Blocker log and test targets', 'David Onilude', 'User test targets posted']
        ]
      },
      {
        day: 'Tuesday',
        programDay: 12,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Fieldwork', 'User tests, sales discovery, and behavior observation', 'Founders', 'Feedback log updated'],
          ['16:00-17:00', 'Clinic', 'Growth/sales clinic', 'Growth mentor needed', 'Sales/testing blockers resolved']
        ]
      },
      {
        day: 'Wednesday',
        programDay: 13,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Iteration from user feedback', 'Founders', 'Improved prototype'],
          ['17:00-18:30', 'Masterclass', 'Minimum Viable Security, Risk, and Credibility', 'Dr. Abiola Olamoyegun or security/risk guest needed', 'Product Risk Map + Security Checklist', true]
        ]
      },
      {
        day: 'Thursday',
        programDay: 14,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Validation report prep and product iteration', 'Founders', 'Draft Validation Report'],
          ['16:00-17:00', 'Founder mentor', 'Opportunity Readiness: Founder Communication, Confidence, and Positioning', 'Bukola Aladesulu', 'Founder positioning and communication improved', true]
        ]
      },
      {
        day: 'Friday',
        programDay: 15,
        slots: [
          ['09:00-09:45', 'Live review', 'Standup and build review', 'David Onilude', 'Demo focus set'],
          ['10:00-12:30', 'Build sprint', 'Final validation report and demo preparation', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'Validation Report ready'],
          ['13:30-15:00', 'Demo gate', 'Evidence from real users review', 'Review panel', 'Week 3 score', true],
          ['15:00-16:00', 'Feedback', 'Traction, risk, and iteration feedback', 'Program leads', 'Week 4 priorities'],
          ['16:00-16:30', 'Closeout', 'Risk flags and support desk updates', 'David Onilude', 'Support tickets assigned']
        ]
      }
    ]
  },
  {
    week: 4,
    label: 'Week 4',
    theme: 'Pitch And Launch',
    outcome: 'Final deck, demo, legal/finance readiness, launch roadmap, and demo readiness score.',
    days: [
      {
        day: 'Monday',
        programDay: 16,
        slots: [
          ['09:00-09:30', 'Alignment', 'Pitch and launch sprint alignment', 'David Onilude', 'Final sprint locked'],
          ['10:00-12:00', 'Masterclass', 'Impact That Strengthens The Venture Story', 'Prof. Carlos Azevedo or impact/storytelling guest needed', 'Impact Thesis + Demo Day narrative', true],
          ['12:00-13:00', 'Workshop', 'Pitch structure, venture story, and ask', 'David Onilude, Kazeem Quadri', 'Deck outline'],
          ['14:00-16:30', 'Build sprint', 'Deck, demo, and 30-day launch roadmap', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'Deck v1'],
          ['16:30-17:00', 'Commitments', 'Blocker log and final sprint commitments', 'David Onilude', 'Launch priorities posted']
        ]
      },
      {
        day: 'Tuesday',
        programDay: 17,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Deck and demo polish', 'Founders', 'Deck v2'],
          ['16:00-17:30', 'Founder mentor', 'Telling The Founder Story: Presence, Conviction, and Demo Day Delivery', 'Victory Ashaka', 'Pitch delivery and founder presence improved', true]
        ]
      },
      {
        day: 'Wednesday',
        programDay: 18,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Budget, ask, launch plan, and compliance cleanup', 'Founders', 'Investor/support ask draft'],
          ['17:00-18:30', 'Clinic', 'Legal, finance, IP, data privacy, and funding readiness', 'Damilola Obaro + finance mentor needed', 'Budget, ask, and legal checklist', true]
        ]
      },
      {
        day: 'Thursday',
        programDay: 19,
        slots: [
          ['09:00-09:15', 'Async check-in', 'Daily Discord standup', 'Origin40 Core Team', 'Daily commitments posted'],
          ['10:00-15:00', 'Build sprint', 'Final demo rehearsal and submission packaging', 'Founders', 'Final deck + demo link'],
          ['16:00-18:00', 'Rehearsal', 'Async review and final corrections', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'Final review comments closed']
        ]
      },
      {
        day: 'Friday',
        programDay: 20,
        slots: [
          ['09:00-09:45', 'Live review', 'Final standup and demo readiness check', 'David Onilude', 'Demo order confirmed'],
          ['10:00-12:30', 'Build sprint', 'Last-mile fixes and final submission', 'David Onilude, Kazeem Quadri, Origin40 Core Team', 'Final package ready'],
          ['13:30-15:30', 'Final demo gate', 'Final demo / pre-Demo Day review', 'Review panel', 'Demo Day readiness score', true],
          ['15:30-16:15', 'Feedback', 'Launch, funding, partner, and mentor next actions', 'Program leads', '30-day roadmap confirmed'],
          ['16:15-16:45', 'Closeout', 'Cohort close, alumni onboarding, and next-step assignments', 'David Onilude', 'Alumni support started']
        ]
      }
    ]
  }
];

const ENTITIES = {
  applicants: 'O40', founders: 'F', mentors: 'M', 'guest-mentors': 'GM', facilitators: 'FAC', partners: 'P'
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

function programSchedule() {
  const start = new Date(Date.UTC(2026, 6, 6));
  const isoForProgramDay = function (programDay) {
    const week = Math.floor((programDay - 1) / 5);
    const day = (programDay - 1) % 5;
    const d = new Date(start.getTime() + ((week * 7) + day) * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  };
  const dateForProgramDay = function (programDay) {
    const d = new Date(isoForProgramDay(programDay) + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };
  const weeks = PROGRAM_SCHEDULE.map(function (week) {
    return Object.assign({}, week, {
      days: week.days.map(function (day) {
        return Object.assign({}, day, {
          mode: /Monday|Friday/.test(day.day) ? 'Live online' : 'Remote/build',
          dateIso: isoForProgramDay(day.programDay),
          date: dateForProgramDay(day.programDay),
          slots: day.slots.map(function (slot) {
            return {
              time: slot[0],
              type: slot[1],
              title: slot[2],
              owner: slot[3],
              output: slot[4],
              anchor: !!slot[5]
            };
          })
        });
      })
    });
  });
  const slots = [];
  weeks.forEach(function (week) {
    week.days.forEach(function (day) {
      day.slots.forEach(function (slot) {
        slots.push(Object.assign({
          week: week.label,
          weekNumber: week.week,
          theme: week.theme,
          day: day.day,
          programDay: day.programDay,
          mode: day.mode,
          dateIso: day.dateIso,
          date: day.date
        }, slot));
      });
    });
  });
  return {
    title: 'Origin40 Final Online Schedule',
    timezone: 'WAT (UTC+1, Lagos)',
    delivery: '100% online',
    dateStatus: 'Locked: Monday, July 6, 2026 to Friday, July 31, 2026',
    startDate: '2026-07-06',
    endDate: '2026-07-31',
    exactDateRule: 'Week 1 Monday is July 6, 2026. Week 4 Friday is July 31, 2026.',
    defaultLivePlatform: 'Zoom / Google Meet for live rooms; Discord for daily operations and async check-ins',
    totals: {
      weeks: weeks.length,
      operatingDays: weeks.reduce(function (sum, week) { return sum + week.days.length; }, 0),
      slots: slots.length,
      demoGates: slots.filter(function (s) { return /Demo gate|Final demo gate/.test(s.type); }).length,
      anchorSlots: slots.filter(function (s) { return s.anchor; }).length
    },
    weeks: weeks,
    slots: slots,
    anchors: slots.filter(function (s) { return s.anchor; })
  };
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function scheduleCsv() {
  const s = programSchedule();
  const rows = [['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Description', 'Location']];
  s.slots.forEach(function (slot) {
    const times = String(slot.time || '').split('-');
    rows.push([
      'Origin40: ' + slot.title,
      slot.dateIso,
      times[0] || '',
      slot.dateIso,
      times[1] || '',
      slot.week + ' · ' + slot.theme + '\nOwner: ' + slot.owner + '\nOutput: ' + slot.output,
      'Online / Discord'
    ]);
  });
  return rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
}

function icsDateTime(dateIso, time) {
  const parts = String(time || '09:00').split(':');
  const d = new Date(dateIso + 'T' + String(parts[0] || '09').padStart(2, '0') + ':' + String(parts[1] || '00').padStart(2, '0') + ':00+01:00');
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsText(v) {
  return String(v == null ? '' : v)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function scheduleIcs() {
  const s = programSchedule();
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Origin40//Founder Build Incubator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Origin40 Founder Build Incubator',
    'X-WR-TIMEZONE:Africa/Lagos'
  ];
  s.slots.forEach(function (slot, idx) {
    const times = String(slot.time || '09:00-10:00').split('-');
    lines.push(
      'BEGIN:VEVENT',
      'UID:origin40-' + slot.dateIso + '-' + idx + '@origin40',
      'DTSTAMP:' + now,
      'DTSTART:' + icsDateTime(slot.dateIso, times[0]),
      'DTEND:' + icsDateTime(slot.dateIso, times[1] || times[0]),
      'SUMMARY:' + icsText('Origin40: ' + slot.title),
      'DESCRIPTION:' + icsText(slot.week + ' · ' + slot.theme + '\nOwner: ' + slot.owner + '\nOutput: ' + slot.output),
      'LOCATION:' + icsText('Online / Discord'),
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
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

function seedEntityIfEmpty(entity, filename) {
  if (db.count(entity) > 0) return 0;
  const file = path.join(SEEDS, filename);
  if (!fs.existsSync(file)) return 0;
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  records.forEach(function (rec) { db.put(entity, rec); });
  return records.length;
}

function seedApplicantsFromEnv() {
  if (db.count('applicants') > 0) return { added: 0, skipped: 0, rejected: 0 };
  const encoded = process.env.ORIGIN40_APPLICANTS_CSV_B64;
  const plain = process.env.ORIGIN40_APPLICANTS_CSV;
  const csv = encoded ? Buffer.from(encoded, 'base64').toString('utf8') : plain;
  if (!csv || !csv.trim()) return { added: 0, skipped: 0, rejected: 0 };
  const imported = intake.importCsv(csv);
  let added = 0, skipped = 0, rejected = imported.report.rejected;
  imported.applicants.forEach(function (rec, i) {
    const x = addApplicant(rec);
    if (x.added) added++;
    else if (x.skipped) skipped++;
    else if (x.rejected) {
      rejected++;
      imported.report.rejectedRows.push({ row: x.row || i + 2, reason: x.reason });
    }
  });
  return { added: added, skipped: skipped, rejected: rejected };
}

function ensureBootstrapped() {
  if (bootstrapped) return;
  bootstrapped = true;
  const report = {
    mentors: seedEntityIfEmpty('mentors', 'confirmed-mentors.json'),
    guestMentors: seedEntityIfEmpty('guest-mentors', 'guest-masterclass-faculty.json'),
    facilitators: seedEntityIfEmpty('facilitators', 'confirmed-facilitators.json'),
    applicants: seedApplicantsFromEnv()
  };
  if (report.mentors || report.guestMentors || report.facilitators || report.applicants.added) {
    db.logEvent('data.bootstrap', report);
  }
}

function enrichApplicant(a) {
  return S.scoreApplicant(Object.assign({}, a, { scores: Object.assign({}, a.scores || {}) }));
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
  const apps = db.list('applicants').map(enrichApplicant);
  const founders = db.list('founders');
  const mentors = db.list('mentors');
  const guestMentors = db.list('guest-mentors');
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
  const readyToMove = apps.filter(function (a) { return a.admissions && (a.admissions.recommendedMove === 'Select' || a.admissions.recommendedMove === 'Shortlist'); }).length;
  const rejectRecommended = apps.filter(function (a) { return a.admissions && /^Reject/.test(a.admissions.recommendedMove); }).length;
  const avgAttend = founders.length ? founders.reduce(function (s, f) { return s + (Number(f.attendancePct) || 0); }, 0) / founders.length : 0;
  const completed = founders.filter(function (f) { return f.status === 'Completed'; }).length;
  const band = function (lo, hi) { return apps.filter(function (a) { return S.hasAnyScore(a.scores) && a.total >= lo && a.total < hi; }).length; };

  return {
    kpis: [
      { label: 'Applications received', value: apps.length, ctx: 'of 300 target · ' + Math.round((apps.length / 300) * 100) + '% reached' },
      { label: 'Founders selected', value: selected, ctx: 'of 40 seats · ' + Math.round((selected / 40) * 100) + '% filled' },
      { label: 'Avg attendance', value: Math.round(avgAttend * 100) + '%', ctx: 'cohort average · target 70%' },
      { label: 'Completion rate', value: (selected ? Math.round((completed / selected) * 100) : 0) + '%', ctx: 'completers of selected' },
      { label: 'Founder mentors', value: mentorsConfirmed, ctx: 'regular founder support' },
      { label: 'Featured speakers', value: guestMentors.length, ctx: guestMentors.filter(function (m) { return m.status === 'Confirmed'; }).length + ' confirmed sessions' },
      { label: 'Program leads ready', value: facilReady, ctx: 'delivering sessions' },
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
      { label: 'Sponsors not yet committed', n: partners.filter(function (p) { return p.stage !== 'Committed' && p.stage !== 'Declined'; }).length },
      { label: 'Ready to move forward', n: readyToMove },
      { label: 'Reject/fix recommended', n: rejectRecommended }
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
    discord: {
      configured: !!(s.discord && (s.discord.inviteUrl || s.discord.serverUrl || s.discord.webhookAnnouncements || s.discord.webhookLog)),
      webhook: !!(s.discord && (s.discord.webhookAnnouncements || s.discord.webhookLog || s.discord.webhookSubmissions)),
      cfg: s.discord || {}
    },
    resources: { configured: !!(s.resources && s.resources.websiteUrl), cfg: s.resources || {} },
    whatsapp: { configured: !!(s.whatsapp && (s.whatsapp.token || s.whatsapp.accountSid)), provider: (s.whatsapp && s.whatsapp.provider) || 'meta' },
    google: { configured: !!(s.google && s.google.serviceAccountJson && s.google.spreadsheetId) }
  };
}

async function handleApi(req, res, fullUrl) {
  ensureBootstrapped();
  const pathname = fullUrl.split('?')[0];
  const parts = pathname.split('/').filter(Boolean); // ['api', a, b, c?]
  const a = parts[1], b = parts[2], c = parts[3];

  if (a === 'meta') return send(res, 200, meta());
  if (a === 'dashboard') return send(res, 200, dashboard());
  if (a === 'schedule') {
    if (b === 'ics') return sendDownload(res, 'origin40-program-calendar.ics', scheduleIcs(), 'text/calendar; charset=utf-8');
    if (b === 'csv') return sendDownload(res, 'origin40-program-calendar.csv', scheduleCsv(), 'text/csv; charset=utf-8');
    return send(res, 200, programSchedule());
  }
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
    db.logEvent('intake.pull', { added: added, skipped: skipped, pages: r.pages });
    discord.notify(db.getSetting('discord', {}), 'log', '🔄 WordPress pull — ' + added + ' new, ' + skipped + ' already in system (' + r.applicants.length + ' fetched).');
    return send(res, 200, { ok: true, added: added, skipped: skipped, total: r.applicants.length, pages: r.pages, sampleKeys: r.sampleKeys });
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
    discord.notify(db.getSetting('discord', {}), 'log', '📥 Application import — ' + added + ' added, ' + skipped + ' duplicates, ' + rejected + ' rejected.');
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
  /* actions: auto-provision the discord server (bot token) */
  if (a === 'actions' && b === 'discord' && c === 'provision' && req.method === 'POST') {
    const cfg = db.getSetting('discord', {});
    const r = await discordBot.provision({ botToken: cfg.botToken, guildId: cfg.guildId });
    if (r.webhooks && Object.keys(r.webhooks).length) {
      const next = Object.assign({}, cfg);
      if (r.webhooks.announcements) next.webhookAnnouncements = r.webhooks.announcements;
      if (r.webhooks.log) next.webhookLog = r.webhooks.log;
      if (r.webhooks.submissions) next.webhookSubmissions = r.webhooks.submissions;
      db.setSetting('discord', next);
    }
    db.logEvent('discord.provision', { created: r.created, errors: (r.errors || []).length });
    return send(res, r.ok ? 200 : 400, r);
  }
  /* actions: discord bot invite link */
  if (a === 'actions' && b === 'discord' && c === 'invite' && req.method === 'GET') {
    const cfg = db.getSetting('discord', {});
    return send(res, 200, { url: discordBot.buildInviteUrl(cfg.appId || ''), permissions: discordBot.INVITE_PERMS });
  }
  /* actions: send discord (webhook) */
  if (a === 'actions' && b === 'discord' && req.method === 'POST') {
    const m = await readBody(req);
    const r = await discord.send(db.getSetting('discord', {}), m);
    db.logEvent('discord.send', { channel: m.channel || 'announcements', ok: r.ok, error: r.error });
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
    if (req.method === 'GET') {
      const rows = db.list(entity);
      return send(res, 200, entity === 'applicants' ? rows.map(enrichApplicant) : rows);
    }
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
