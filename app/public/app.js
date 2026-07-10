/* Origin40 admin SPA — vanilla JS, no build step. */
'use strict';

var META = null;
var app = document.getElementById('app');

var ROUTES = [
  { id: 'control', label: 'Control Center', short: 'Control', icon: 'ti-apps', group: 'Command' },
  { id: 'dashboard', label: 'Dashboard', short: 'Dash', icon: 'ti-layout-dashboard', group: 'Command' },
  { id: 'calendar', label: 'Calendar', short: 'Calendar', icon: 'ti-calendar-time', group: 'Command' },
  { id: 'applicants', label: 'Applications', short: 'Apps', icon: 'ti-file-text', group: 'Admissions' },
  { id: 'onboarding', label: 'Onboarding', short: 'Onboard', icon: 'ti-user-check', group: 'Admissions' },
  { id: 'founders', label: 'Founders', short: 'Founders', icon: 'ti-rocket', group: 'Admissions' },
  { id: 'mentors', label: 'Founder Mentors', short: 'Mentors', icon: 'ti-users', group: 'People' },
  { id: 'guest-mentors', label: 'Featured Speakers', short: 'Speakers', icon: 'ti-microphone-2', group: 'People' },
  { id: 'facilitators', label: 'Program Leads', short: 'Leads', icon: 'ti-school', group: 'People' },
  { id: 'partners', label: 'Partners', short: 'Partners', icon: 'ti-building-store', group: 'Growth' },
  { id: 'documents', label: 'Documents', short: 'Docs', icon: 'ti-folders', group: 'Growth' },
  { id: 'settings', label: 'Settings', short: 'Settings', icon: 'ti-settings', group: 'System' }
];

/* ---------- api ---------- */
function api(method, path, body) {
  return fetch('/api/' + path, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) { return r.json(); });
}
var getJSON = function (p) { return api('GET', p); };

/* ---------- helpers ---------- */
function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function statusBadge(s) { return '<span class="badge s-' + esc(String(s || '').replace(/[^A-Za-z]/g, '')) + '">' + esc(s || '—') + '</span>'; }
function money(n) { return '₦' + (Number(n) || 0).toLocaleString(); }
function opts(arr, sel) { return arr.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); }
function normStatus(s) { return String(s || 'Submitted'); }
function applicantRank(a) {
  if (a.total >= 75 || a.status === 'Shortlisted' || a.status === 'Selected') return 'High potential';
  if (a.total >= 55 || a.status === 'Under Review') return 'Review closely';
  if (a.status === 'Rejected') return 'Low fit';
  return 'Needs scoring';
}
function applicantStats(list) {
  var out = { total: list.length, pending: 0, shortlisted: 0, selected: 0, rejected: 0, avg: 0, move: 0, clarify: 0, rejectSuggested: 0 };
  var scored = 0, score = 0;
  list.forEach(function (a) {
    var st = normStatus(a.status);
    if (st === 'Submitted' || !(a.total > 0)) out.pending++;
    if (st === 'Shortlisted') out.shortlisted++;
    if (st === 'Selected') out.selected++;
    if (st === 'Rejected') out.rejected++;
    if (a.total > 0) { scored++; score += Number(a.total) || 0; }
    var move = a.admissions && a.admissions.recommendedMove;
    if (move === 'Select' || move === 'Shortlist') out.move++;
    if (move === 'Hold / Clarify' || move === 'Needs Review') out.clarify++;
    if (move && move.indexOf('Reject') === 0) out.rejectSuggested++;
  });
  out.avg = scored ? Math.round(score / scored) : 0;
  out.seatsLeft = Math.max(0, 40 - out.selected);
  return out;
}
function rawPreview(raw) {
  var keys = Object.keys(raw || {}).filter(function (k) {
    return raw[k] != null && String(raw[k]).trim();
  }).slice(0, 10);
  if (!keys.length) return '';
  return keys.map(function (k) {
    return '<div><b>' + esc(k) + '</b><span>' + esc(raw[k]) + '</span></div>';
  }).join('');
}

function moveClass(move) {
  move = String(move || '');
  if (move === 'Select' || move === 'Shortlist') return 'ok';
  if (move.indexOf('Reject') === 0) return 'bad';
  if (move === 'Hold / Clarify') return 'warn';
  return 'neutral';
}

function admissionMove(a) {
  return (a.admissions && a.admissions.recommendedMove) || 'Needs Review';
}

function applicantOutreach(a) {
  if (a.selectionEmail) return Object.assign({ label: 'Selection email' }, a.selectionEmail);
  if (a.conditionalEmail) return Object.assign({ label: 'Conditional email' }, a.conditionalEmail);
  if (a.waitlistEmail) return Object.assign({ label: 'Waitlist email' }, a.waitlistEmail);
  return null;
}

/* ---------- nav + router ---------- */
function renderNav() {
  var cur = location.hash.replace('#/', '') || 'control';
  var current = ROUTES.find(function (r) { return r.id === cur; }) || ROUTES[0];
  var title = document.getElementById('routeTitle');
  if (title) title.textContent = current.label;
  var groups = [];
  ROUTES.forEach(function (r) {
    if (groups.indexOf(r.group) === -1) groups.push(r.group);
  });
  document.getElementById('nav').innerHTML = groups.map(function (group) {
    var links = ROUTES.filter(function (r) { return r.group === group; }).map(function (r) {
      return '<a href="#/' + r.id + '" title="' + esc(r.label) + '" aria-label="' + esc(r.label) + '" class="' + (r.id === cur ? 'active' : '') + '"><i class="ti ' + r.icon + '"></i><span>' + esc(r.label) + '</span><small>' + esc(r.short || r.label) + '</small></a>';
    }).join('');
    return '<div class="nav-section"><div class="nav-label">' + esc(group) + '</div>' + links + '</div>';
  }).join('');
}

function router() {
  renderNav();
  var route = location.hash.replace('#/', '') || 'control';
  if (route === 'control') return viewControl();
  if (route === 'dashboard') return viewDashboard();
  if (route === 'calendar') return viewCalendar();
  if (route === 'applicants') return viewApplicants();
  if (route === 'documents') return viewDocuments();
  if (route === 'settings') return viewSettings();
  if (ENTITY_VIEWS[route]) return viewEntity(route);
  app.innerHTML = '<p class="sub">Not found.</p>';
}
window.addEventListener('hashchange', router);

/* ---------- Control Center ---------- */
function viewControl() {
  Promise.all([getJSON('dashboard'), getJSON('settings')]).then(function (all) {
    var d = all[0], s = (all[1] && all[1].settings) || {};
    var discord = s.discord || {};
    var resources = s.resources || {};
    var k = {};
    d.kpis.forEach(function (x) { k[x.label] = x.value; });
    var sections = [
      { cat: 'Overview', tiles: [
        { icon: 'ti-layout-dashboard', t: 'Dashboard', s: 'KPIs · charts · alerts', go: 'dashboard' },
        { icon: 'ti-calendar-time', t: 'Programme Calendar', s: 'July 13-August 3 · official schedule', go: 'calendar' }
      ] },
      { cat: 'People', tiles: [
        { icon: 'ti-file-text', t: 'Applications', s: k['Applications received'] + ' received', go: 'applicants' },
        { icon: 'ti-rocket', t: 'Founders', s: 'progress tracker', go: 'founders' },
        { icon: 'ti-users', t: 'Founder Mentors', s: k['Founder mentors'] + ' confirmed', go: 'mentors' },
        { icon: 'ti-microphone-2', t: 'Featured Speakers', s: (k['Featured speakers'] || 0) + ' speakers', go: 'guest-mentors' },
        { icon: 'ti-school', t: 'Program Leads', s: k['Program leads ready'] + ' ready', go: 'facilitators' }
      ]},
      { cat: 'Growth', tiles: [
        { icon: 'ti-building-store', t: 'Partners & Sponsors', s: k['Funds committed'] + ' committed', go: 'partners' }
      ]},
      { cat: 'Knowledge base', tiles: [
        { icon: 'ti-folders', t: 'Documents Library', s: 'curriculum · ops · templates', go: 'documents' }
      ]},
      { cat: 'Resources & links', link: true, tiles: [
        { icon: 'ti-browser', t: 'Public website', s: 'WordPress', url: resources.websiteUrl || '#' },
        { icon: 'ti-forms', t: 'Registration form', s: 'Fluent Forms', url: resources.registrationUrl || '#' },
        { icon: 'ti-device-laptop', t: 'LMS / portal', s: 'WordPress LMS', url: resources.lmsUrl || '#' },
        { icon: 'ti-folder', t: 'Documents', s: 'Drive folder', url: resources.docsUrl || '#' },
        { icon: 'ti-brand-discord', t: 'Cohort Discord', s: 'official community', url: discord.inviteUrl || discord.serverUrl || '#' },
        { icon: 'ti-confetti', t: 'Demo Day page', s: 'public', url: resources.demoDayUrl || '#' }
      ]}
    ];
    var html = '<div class="ops-hero"><div><div class="eyebrow">Program command room</div><h2 class="page">Control Center</h2><p class="sub">A single operating surface for admissions, founder delivery, faculty, partners, documents, and external program tools.</p></div>' +
      '<div class="ops-timeline"><span>Week 1 validate</span><span>Week 2 build</span><span>Week 3 test</span><span>Week 4 launch</span></div></div>';
    sections.forEach(function (sec) {
      html += '<div class="cat">' + sec.cat + '</div><div class="grid">';
      sec.tiles.forEach(function (t) {
        if (t.go) html += '<a class="tile" href="#/' + t.go + '"><i class="ti ' + t.icon + '"></i><div class="t">' + t.t + '</div><div class="s">' + t.s + '</div></a>';
        else html += '<a class="tile link" href="' + t.url + '"><i class="ti ' + t.icon + '"></i><div class="t">' + t.t + '</div><div class="s">' + t.s + '</div></a>';
      });
      html += '</div>';
    });
    app.innerHTML = html;
  });
}

/* ---------- Dashboard ---------- */
function bars(items, ink, fmt) {
  var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
  return items.map(function (i) {
    var w = Math.round((i.value / max) * 100);
    return '<div class="bar"><span class="name">' + esc(i.label) + '</span>' +
      '<span class="track"><span class="fill' + (ink ? ' ink' : '') + '" style="width:' + w + '%"></span></span>' +
      '<span class="val">' + (fmt ? fmt(i.value) : i.value) + '</span></div>';
  }).join('');
}
function viewDashboard() {
  getJSON('dashboard').then(function (d) {
    var html = '<h2 class="page">Dashboard</h2><p class="sub">Live operating signals from the cPanel. Every number updates as applicant, founder, mentor, and partner records change.</p>';
    html += '<div class="kpis">' + d.kpis.map(function (x) {
      return '<div class="kpi' + (x.warn ? ' warn' : '') + '"><div class="l">' + esc(x.label) + '</div><div class="v">' + esc(x.value) + '</div><div class="c">' + esc(x.ctx) + '</div></div>';
    }).join('') + '</div>';
    html += '<div class="sech">Pipelines &amp; trends</div><div class="cards2">';
    html += '<div class="card"><h3>Applicant status funnel</h3>' + bars(d.charts.statusFunnel, false) + '</div>';
    html += '<div class="card"><h3>Applications by score band</h3>' + bars(d.charts.scoreBands, true) + '</div>';
    html += '<div class="card"><h3>Sponsor pipeline value by stage</h3>' + (d.charts.pipeline.length ? bars(d.charts.pipeline, false, money) : '<div class="empty-state"><b>No sponsor pipeline yet</b><span>Add partners or sponsors to see value by stage.</span></div>') + '</div>';
    html += '<div class="card"><h3>Alerts &amp; actions</h3>' + d.alerts.map(function (a) {
      var bad = a.n > 0;
      return '<div class="alert"><span>' + esc(a.label) + '</span><span class="pill ' + (bad ? 'bad' : 'ok') + '">' + a.n + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="card schedule-card" id="scheduleCard"><h3>Official Programme Calendar</h3><p class="sub">Loading programme calendar...</p></div>';
    html += '<div class="card" id="docCard"><h3>Documents Library</h3><p class="sub">Loading curriculum and operations docs...</p></div>';
    html += '</div>';
    app.innerHTML = html;
    renderDashboardSchedule();
    renderDashboardDocs();
  });
}

function renderDashboardSchedule() {
  getJSON('schedule').then(function (s) {
    var card = document.getElementById('scheduleCard');
    if (!card) return;
    var anchors = (s.anchors || []).slice(0, 6);
    card.innerHTML =
      '<div class="schedule-head">' +
        '<div><h3>Official Programme Calendar</h3><p>' + esc(s.delivery) + ' · ' + esc(s.timezone) + '</p></div>' +
        '<span class="status-chip ok">Dates locked</span>' +
      '</div>' +
      '<div class="schedule-stats">' +
        '<div><b>' + s.totals.weeks + '</b><span>weeks</span></div>' +
        '<div><b>' + s.totals.operatingDays + '</b><span>days</span></div>' +
        '<div><b>' + s.totals.demoGates + '</b><span>demo gates</span></div>' +
      '</div>' +
      '<div class="schedule-note">' + esc(s.dateStatus) + '</div>' +
      '<div class="schedule-list">' + anchors.map(function (slot) {
        return '<div class="schedule-item">' +
          '<span class="slot-time">' + esc(slot.date) + '<b>' + esc(slot.time) + '</b></span>' +
          '<span><strong>' + esc(slot.title) + '</strong><small>' + esc(slot.owner) + '</small></span>' +
          '<em>' + esc(slot.output) + '</em>' +
        '</div>';
      }).join('') + '</div>' +
      '<a class="inline-link" href="#/calendar"><i class="ti ti-calendar-time"></i> Open full calendar</a>';
  });
}

/* ---------- Calendar ---------- */
function viewCalendar() {
  getJSON('schedule').then(function (s) {
    window.__schedule = s;
    window.__scheduleWeek = window.__scheduleWeek || 0;
    var current = s.weeks[window.__scheduleWeek] || s.weeks[0];
    var html =
      '<div class="calendar-hero">' +
        '<div><div class="eyebrow">Official programme calendar</div><h2 class="page">' + esc(s.title) + '</h2>' +
        '<p class="sub">' + esc(s.dateStatus) + ' · ' + esc(s.delivery) + ' · ' + esc(s.timezone) + '</p>' +
        '<div class="calendar-actions"><a class="button-link primary" href="/api/schedule/ics"><i class="ti ti-calendar-plus"></i> Download ICS</a>' +
        '<a class="button-link" href="/api/schedule/csv"><i class="ti ti-table-export"></i> Download CSV</a></div></div>' +
        '<div class="calendar-datebox"><span>Start</span><b>Jul 13</b><em>Monday, 2026</em></div>' +
        '<div class="calendar-datebox"><span>Showcase Day</span><b>Aug 3</b><em>Monday · Lagos</em></div>' +
      '</div>' +
      '<div class="calendar-metrics">' +
        '<div><b>' + s.totals.weeks + '</b><span>weeks</span></div>' +
        '<div><b>' + s.totals.operatingDays + '</b><span>program days</span></div>' +
        '<div><b>' + s.totals.slots + '</b><span>timed blocks</span></div>' +
        '<div><b>' + s.totals.demoGates + '</b><span>demo gates</span></div>' +
      '</div>' +
      '<div class="calendar-tabs">' + s.weeks.map(function (week, idx) {
        return '<button class="' + (idx === window.__scheduleWeek ? 'active' : '') + '" onclick="setScheduleWeek(' + idx + ')"><span>' + esc(week.label) + '</span><b>' + esc(week.theme) + '</b></button>';
      }).join('') + '</div>' +
      '<section class="calendar-week">' +
        '<div class="calendar-week-head"><div><h3>' + esc(current.label) + ': ' + esc(current.theme) + '</h3><p>' + esc(current.outcome) + '</p></div><span class="status-chip ok">Dates locked</span></div>' +
        '<div class="calendar-days">' + current.days.map(renderCalendarDay).join('') + '</div>' +
      '</section>';
    app.innerHTML = html;
  });
}

function setScheduleWeek(idx) {
  window.__scheduleWeek = idx;
  viewCalendar();
}

function renderCalendarDay(day) {
  return '<article class="calendar-day">' +
    '<div class="calendar-day-head"><span>Day ' + esc(day.programDay) + '</span><h4>' + esc(day.date) + '</h4><em>' + esc(day.mode) + '</em></div>' +
    '<div class="calendar-slots">' + day.slots.map(function (slot) {
      return '<div class="calendar-slot">' +
        '<time>' + esc(slot.time) + '</time>' +
        '<div><b>' + esc(slot.title) + '</b><span>' + esc(slot.type) + ' · ' + esc(slot.owner) + '</span><small>' + esc(slot.output) + '</small></div>' +
      '</div>';
    }).join('') + '</div>' +
  '</article>';
}

function renderDashboardDocs() {
  getJSON('docs').then(function (d) {
    var card = document.getElementById('docCard');
    if (!card) return;
    var sections = d.sections.filter(function (s) { return s.docs.length; });
    card.innerHTML = '<h3>Documents Library</h3>' +
      '<div class="doc-kpi"><b>' + d.total + '</b><span>copy-ready docs</span></div>' +
      '<div class="mini-list">' + sections.map(function (s) { return esc(s.label) + ' (' + s.docs.length + ')'; }).join(' · ') + '</div>' +
      '<a class="inline-link" href="#/documents"><i class="ti ti-folders"></i> Open library</a>';
  });
}

/* ---------- Applicants (full scoring) ---------- */
function viewApplicants() {
  getJSON('applicants').then(function (list) {
    window.__apps = list;
    window.__appFilter = window.__appFilter || 'All';
    var st = applicantStats(list);
    var html = '<div class="row"><h2 class="page">Applications</h2><div class="spacer"></div>' +
      '<input class="search" id="aq" placeholder="Search name / startup / country...">' +
      '<button class="primary" onclick="openApplicant(null)"><i class="ti ti-plus"></i> Add applicant</button></div>' +
      '<p class="sub">Import real applications or add one manually. Scores calculate the recommendation and suggested status automatically.</p>' +
      '<div class="admissions-strip">' +
        '<div><b>' + st.total + '</b><span>Total applications</span></div>' +
        '<div><b>' + st.pending + '</b><span>Need review</span></div>' +
        '<div><b>' + st.shortlisted + '</b><span>Shortlisted</span></div>' +
        '<div><b>' + st.selected + '</b><span>Selected</span></div>' +
        '<div><b>' + st.seatsLeft + '</b><span>Seats left</span></div>' +
        '<div><b>' + st.avg + '</b><span>Avg score</span></div>' +
      '</div>' +
      '<div class="admissions-gates">' +
        '<div><span class="gate-dot ok"></span><b>' + st.move + '</b><em>Ready to move forward</em></div>' +
        '<div><span class="gate-dot warn"></span><b>' + st.clarify + '</b><em>Needs review / clarify</em></div>' +
        '<div><span class="gate-dot bad"></span><b>' + st.rejectSuggested + '</b><em>Reject or fix required</em></div>' +
      '</div>' +
      '<div class="filterbar" id="appFilters">' +
        ['All'].concat(META.lists.applicantStatus).map(function (s) {
          return '<button class="filter-chip' + (window.__appFilter === s ? ' active' : '') + '" onclick="setApplicantFilter(\'' + esc(s) + '\')">' + esc(s) + '</button>';
        }).join('') +
      '</div>' +
      '<div id="atable"></div>';
    app.innerHTML = html;
    document.getElementById('aq').addEventListener('input', function () { renderApplicantTable(this.value); });
    renderApplicantTable('');
  });
}
function setApplicantFilter(status) {
  window.__appFilter = status || 'All';
  document.querySelectorAll('#appFilters .filter-chip').forEach(function (b) {
    b.classList.toggle('active', b.textContent === window.__appFilter);
  });
  renderApplicantTable(document.getElementById('aq') ? document.getElementById('aq').value : '');
}
function renderApplicantTable(q) {
  q = (q || '').toLowerCase();
  var rows = window.__apps.filter(function (a) {
    var hay = (a.name + ' ' + a.startup + ' ' + a.country + ' ' + a.email + ' ' + a.pitch + ' ' + a.status).toLowerCase();
    var passSearch = !q || hay.indexOf(q) > -1;
    var passFilter = !window.__appFilter || window.__appFilter === 'All' || normStatus(a.status) === window.__appFilter;
    return passSearch && passFilter;
  }).sort(function (x, y) { return (y.total || 0) - (x.total || 0); });
  var html = '<div class="table-tools"><span>' + rows.length + ' shown</span><span>' + (window.__appFilter || 'All') + '</span></div>';
  html += '<table><thead><tr><th>Applicant</th><th>Startup / pitch</th><th>Country</th><th>Score</th><th>Gate</th><th>Decision</th><th>Outreach</th><th>Status</th></tr></thead><tbody>';
  html += rows.map(function (a) {
    var move = admissionMove(a);
    return '<tr class="clickable" onclick="openApplicant(\'' + a.id + '\')">' +
      '<td><div class="person-cell"><b>' + esc(a.name || 'Unnamed applicant') + '</b><span>' + esc(a.id || '') + ' · ' + esc(a.email || a.phone || 'no contact') + '</span></div></td>' +
      '<td><div class="pitch-cell"><b>' + esc(a.startup || 'No startup name') + '</b><span>' + esc(a.pitch || 'No pitch captured yet') + '</span></div></td>' +
      '<td>' + esc(a.country || '—') + '</td>' +
      '<td><div class="score-pill"><b>' + (a.total || 0) + '</b><span>/100</span></div></td>' +
      '<td><span class="move-pill ' + moveClass(move) + '">' + esc(move) + '</span></td>' +
      '<td><div class="decision-cell"><b>' + esc(a.recommendation || '—') + '</b><span>' + esc(applicantRank(a)) + '</span></div></td>' +
      '<td>' + (applicantOutreach(a) && applicantOutreach(a).status === 'Sent'
        ? '<span class="move-pill move-select">' + esc(applicantOutreach(a).template || 'Email sent') + '</span>'
        : '<span class="muted">Not sent</span>') + '</td>' +
      '<td>' + statusBadge(a.status) + '</td></tr>';
  }).join('');
  if (!rows.length) html += '<tr><td colspan="8"><div class="empty-state table-empty"><b>No matching applications</b><span>Change the status filter, search something broader, import a Fluent Forms CSV from Settings, or add an applicant manually.</span></div></td></tr>';
  html += '</tbody></table>';
  document.getElementById('atable').innerHTML = html;
}

function renderAdmissionsChecks(a) {
  var ad = a.admissions || { checks: [], recommendedMove: 'Needs Review', reason: 'No admissions assessment yet.' };
  var checks = ad.checks || [];
  return '<section class="review-panel admissions-check-panel"><div class="review-panel-head"><h4>Admissions checks</h4>' +
    '<span class="move-pill ' + moveClass(ad.recommendedMove) + '">' + esc(ad.recommendedMove) + '</span></div>' +
    '<p class="admission-reason">' + esc(ad.reason || '') + '</p>' +
    '<div class="check-list">' + checks.map(function (c) {
      return '<div class="check-item ' + (c.pass ? 'pass' : 'fail') + '">' +
        '<i class="ti ' + (c.pass ? 'ti-check' : 'ti-alert-triangle') + '"></i>' +
        '<span><b>' + esc(c.label) + '</b><small>' + esc(c.detail || '') + '</small></span>' +
        '<em>' + esc(c.severity || '') + '</em>' +
      '</div>';
    }).join('') + '</div>' +
    (ad.legalFlag ? '<div class="admission-flag"><b>Legal/risk note:</b> ' + esc(ad.legalNote) + '</div>' : '') +
    '</section>';
}

function renderIndividualReview(a) {
  var r = a.individualReview;
  if (!r) return '';
  return '<section class="review-panel"><h4>Individual review</h4>' +
    '<div class="check-list">' +
      '<div class="check-item pass"><i class="ti ti-sparkles"></i><span><b>Strengths</b><small>' + esc(r.strengths || '—') + '</small></span></div>' +
      '<div class="check-item fail"><i class="ti ti-alert-triangle"></i><span><b>Concerns</b><small>' + esc(r.concerns || '—') + '</small></span></div>' +
      '<div class="check-item"><i class="ti ti-arrow-right"></i><span><b>Next action</b><small>' + esc(r.nextAction || r.decisionRationale || '—') + '</small></span></div>' +
    '</div></section>';
}

function renderApplicantCommunication(a) {
  var m = applicantOutreach(a);
  if (!m && !a.acceptanceStatus) return '';
  return '<section class="review-panel"><div class="review-panel-head"><h4>Admission communication</h4>' +
    (m && m.status === 'Sent' ? '<span class="move-pill move-select">Delivered</span>' : '<span class="move-pill">Pending</span>') +
    '</div><div class="check-list">' +
      '<div class="check-item"><i class="ti ti-mail"></i><span><b>' + esc((m && m.label) || 'Admission email') + '</b><small>' +
        esc(m ? ((m.provider || m.channel || 'Email') + ' · ' + (m.sentAt || 'date not recorded')) : 'Not sent') +
      '</small></span></div>' +
      '<div class="check-item"><i class="ti ti-user-check"></i><span><b>Acceptance</b><small>' + esc(a.acceptanceStatus || 'Pending') + '</small></span></div>' +
      (m && m.subject ? '<div class="check-item"><i class="ti ti-message"></i><span><b>Subject</b><small>' + esc(m.subject) + '</small></span></div>' : '') +
    '</div></section>';
}

function openApplicant(id) {
  var a = id ? window.__apps.find(function (x) { return x.id === id; }) : { name: '', email: '', phone: '', country: '', startup: '', pitch: '', scores: {}, manualOverride: false, reviewer: '', notes: '', status: 'Submitted' };
  var sc = a.scores || {};
  var scoreInputs = META.framework.map(function (f) {
    return '<div class="sl">' + f.label + ' /' + f.max + '</div><input type="number" min="0" max="' + f.max + '" data-score="' + f.key + '" value="' + (sc[f.key] != null ? sc[f.key] : '') + '">';
  }).join('');
  var quick = ['Under Review', 'Shortlisted', 'Selected', 'Waitlisted', 'Rejected'].map(function (s) {
    return '<button class="' + (normStatus(a.status) === s ? 'active' : '') + '" onclick="setReviewStatus(\'' + s + '\')">' + esc(s) + '</button>';
  }).join('');
  var raw = rawPreview(a.raw);
  var body =
    '<div class="review-shell">' +
      '<div class="review-hero"><div class="row"><div><h3>' + (id ? esc(a.name || 'Unnamed applicant') : 'New applicant') + '</h3><p class="muted">' + (id ? esc(a.id) + ' · ' + esc(a.startup || 'No startup yet') : 'Add a founder to the admissions pipeline') + '</p></div><div class="spacer"></div>' + statusBadge(a.status || 'Submitted') + '</div>' +
        '<div class="review-meta"><span><i class="ti ti-map-pin"></i>' + esc(a.country || 'No country') + '</span><span><i class="ti ti-mail"></i>' + esc(a.email || a.phone || 'No contact') + '</span><span><i class="ti ti-award"></i>' + esc(applicantRank(a)) + '</span></div></div>' +
      '<div class="quick-status">' + quick + '</div>' +
      '<div class="review-grid">' +
        '<section class="review-panel"><h4>Applicant profile</h4>' +
          field('Full name', '<input id="f-name" value="' + esc(a.name) + '">') +
          twoCol(field('Email', '<input id="f-email" value="' + esc(a.email) + '">'), field('Country', '<input id="f-country" value="' + esc(a.country) + '">')) +
          twoCol(field('Phone / WhatsApp', '<input id="f-phone" value="' + esc(a.phone) + '">'), field('Startup / idea', '<input id="f-startup" value="' + esc(a.startup) + '">')) +
          field('One-line pitch', '<input id="f-pitch" value="' + esc(a.pitch) + '">') +
        '</section>' +
        '<section class="review-panel"><h4>Decision & review</h4>' +
          '<div class="totalrow"><div><div class="mini-label">TOTAL</div><div class="big" id="liveTotal">' + (a.total || 0) + '</div></div>' +
          '<div><div class="mini-label">RECOMMENDATION</div><div id="liveRec" class="rec-text">' + esc(a.recommendation || '—') + '</div><div id="liveSug" class="suggest-text">suggested: ' + esc(a.suggestedStatus || '—') + '</div></div></div>' +
          field('', '<label class="inline-check"><input type="checkbox" id="f-override" ' + (a.manualOverride ? 'checked' : '') + '> Manual override</label>') +
          field('Status', '<select id="f-status">' + opts(META.lists.applicantStatus, a.status) + '</select>') +
          field('Reviewer', '<input id="f-reviewer" value="' + esc(a.reviewer || '') + '">') +
          field('Reviewer notes', '<textarea id="f-notes" rows="4">' + esc(a.notes || '') + '</textarea>') +
        '</section>' +
      '</div>' +
      renderAdmissionsChecks(a) +
      renderIndividualReview(a) +
      renderApplicantCommunication(a) +
      '<section class="review-panel"><h4>Scoring rubric</h4><div class="scoregrid" id="scoregrid">' + scoreInputs + '</div></section>' +
      (raw ? '<section class="review-panel"><h4>Imported answers</h4><div class="raw-box">' + raw + '</div></section>' : '') +
      '<div class="row review-actions">' +
    '<button class="primary" onclick="saveApplicant(' + (id ? '\'' + id + '\'' : 'null') + ')"><i class="ti ti-device-floppy"></i> Save</button>' +
    (id ? '<button class="danger" onclick="deleteRec(\'applicants\',\'' + id + '\')"><i class="ti ti-trash"></i> Delete</button>' : '') +
    '<div class="spacer"></div><button onclick="closeDrawer()">Cancel</button></div></div>';
  openDrawer(body, 'review');
  // live recompute
  var grid = document.getElementById('scoregrid');
  grid.addEventListener('input', recomputeLive);
}
function setReviewStatus(status) {
  var select = document.getElementById('f-status');
  var override = document.getElementById('f-override');
  if (select) select.value = status;
  if (override) override.checked = true;
  document.querySelectorAll('.quick-status button').forEach(function (b) {
    b.classList.toggle('active', b.textContent === status);
  });
}
function recomputeLive() {
  var total = 0;
  document.querySelectorAll('#scoregrid input[data-score]').forEach(function (i) { total += Number(i.value) || 0; });
  var any = Array.prototype.some.call(document.querySelectorAll('#scoregrid input[data-score]'), function (i) { return i.value !== ''; });
  var rec = total >= 80 ? 'Strong Yes' : total >= 70 ? 'Yes' : total >= 55 ? 'Maybe' : total >= 40 ? 'No' : 'Strong No';
  var sug = !any ? 'Submitted' : total >= 75 ? 'Shortlisted' : total >= 55 ? 'Under Review' : 'Rejected';
  document.getElementById('liveTotal').textContent = total;
  document.getElementById('liveRec').textContent = any ? rec : '—';
  document.getElementById('liveSug').textContent = 'suggested: ' + sug;
  if (!document.getElementById('f-override').checked) document.getElementById('f-status').value = sug;
}
function saveApplicant(id) {
  var scores = {};
  document.querySelectorAll('#scoregrid input[data-score]').forEach(function (i) { if (i.value !== '') scores[i.getAttribute('data-score')] = Number(i.value); });
  var rec = {
    name: val('f-name'), email: val('f-email'), phone: val('f-phone'), country: val('f-country'),
    startup: val('f-startup'), pitch: val('f-pitch'), scores: scores,
    manualOverride: document.getElementById('f-override').checked,
    status: val('f-status'), reviewer: val('f-reviewer'), notes: val('f-notes')
  };
  var p = id ? api('PUT', 'applicants/' + id, rec) : api('POST', 'applicants', rec);
  p.then(function () { closeDrawer(); viewApplicants(); });
}

/* ---------- Documents Library ---------- */
function viewDocuments() {
  getJSON('docs').then(function (d) {
    window.__docs = d;
    var sections = d.sections.filter(function (s) { return s.docs.length; });
    var html = '<div class="row"><h2 class="page">Knowledge Base</h2><div class="spacer"></div>' +
      '<a class="button-link primary" href="/api/docs/download-all"><i class="ti ti-download"></i> Download all</a>' +
      '<input class="search" id="dq" placeholder="Search docs, templates, forms..."></div>' +
      '<p class="sub">The operating library for Origin40: curriculum, admissions assets, founder operations, mentors, sponsors, Demo Day, impact, and legal runbooks.</p>' +
      '<div class="doc-overview">' +
        '<div class="doc-stat"><b>' + d.total + '</b><span>documents</span></div>' +
        '<div class="doc-stat"><b>' + sections.length + '</b><span>sections</span></div>' +
        '<div class="doc-stat"><b>' + (sections.find(function (s) { return s.id === 'wordpress'; }) || { docs: [] }).docs.length + '</b><span>admissions assets</span></div>' +
      '</div>' +
      '<div id="docsWrap"></div>';
    app.innerHTML = html;
    document.getElementById('dq').addEventListener('input', function () { renderDocs(this.value); });
    renderDocs('');
  });
}

function renderDocs(q) {
  q = (q || '').toLowerCase();
  var d = window.__docs || { sections: [] };
  var matches = 0;
  var html = '<div class="doc-result-line">' + (q ? 'Search results for "' + esc(q) + '"' : 'Browse by operating area') + '</div>';
  html += '<div class="doc-sections">';
  d.sections.forEach(function (sec) {
    var docs = sec.docs.filter(function (doc) {
      return !q || (doc.title + ' ' + doc.path + ' ' + doc.summary + ' ' + sec.label).toLowerCase().indexOf(q) > -1;
    });
    if (!docs.length) return;
    matches += docs.length;
    html += '<section class="doc-section"><div class="doc-section-head"><div><i class="ti ' + esc(sec.icon || 'ti-folder') + '"></i><h3>' + esc(sec.label) + '</h3><p>' + esc(sec.desc || '') + '</p></div><span>' + docs.length + '</span></div>';
    html += '<div class="doc-list">' + docs.map(function (doc) {
      return '<button class="doc-item" onclick="openDoc(\'' + encodeURIComponent(doc.path) + '\')">' +
        '<i class="ti ti-file-text"></i><span><b>' + esc(doc.title) + '</b><small>' + esc(doc.path) + ' · ' + doc.words + ' words</small>' +
        '<em>' + esc(doc.summary || 'No preview available.') + '</em></span></button>';
    }).join('') + '</div></section>';
  });
  html += '</div>';
  if (!matches) {
    html += '<div class="empty-state"><b>No matching documents</b><span>Try a broader search like curriculum, Discord, mentor, sponsor, legal, form, or Demo Day.</span></div>';
  }
  document.getElementById('docsWrap').innerHTML = html;
}

function openDoc(encodedPath) {
  getJSON('docs/' + encodedPath).then(function (doc) {
    if (doc.error) return toast('Document not found', false);
    window.__currentDoc = doc;
    var dl = '/api/docs/' + encodeURIComponent(doc.path);
    openDrawer('<div class="doc-actions">' +
      '<a class="button-link" href="' + dl + '?format=html"><i class="ti ti-file-type-html"></i> Download HTML</a>' +
      '<a class="button-link" href="' + dl + '?format=md"><i class="ti ti-markdown"></i> Download Markdown</a>' +
      '<button onclick="printCurrentDoc()"><i class="ti ti-printer"></i> Print / Save PDF</button>' +
      '<button onclick="closeDrawer()">Close</button></div>' +
      '<article class="doc-paper"><div class="doc-meta">Origin40 Document Library · ' + esc(doc.path) + '</div>' +
      markdownPreview(doc.content) + '</article>', 'document');
  });
}

function markdownPreview(md) {
  var lines = String(md || '').split(/\r?\n/);
  var html = '', i = 0;
  while (i < lines.length) {
    var line = lines[i], trimmed = line.trim();
    if (!trimmed) { i++; continue; }
    if (/^---+$/.test(trimmed)) { html += '<hr>'; i++; continue; }
    if (/^# /.test(trimmed)) { html += '<h1>' + inlineMd(trimmed.replace(/^# /, '')) + '</h1>'; i++; continue; }
    if (/^## /.test(trimmed)) { html += '<h2>' + inlineMd(trimmed.replace(/^## /, '')) + '</h2>'; i++; continue; }
    if (/^### /.test(trimmed)) { html += '<h3>' + inlineMd(trimmed.replace(/^### /, '')) + '</h3>'; i++; continue; }
    if (/^> /.test(trimmed)) {
      var q = [];
      while (i < lines.length && /^> /.test(lines[i].trim())) { q.push(lines[i].trim().replace(/^> /, '')); i++; }
      html += '<blockquote>' + q.map(inlineMd).join('<br>') + '</blockquote>';
      continue;
    }
    if (/^\|/.test(trimmed)) {
      var rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      html += markdownTable(rows);
      continue;
    }
    if (/^- /.test(trimmed)) {
      var items = [];
      while (i < lines.length && /^- /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^- /, '')); i++; }
      html += '<ul>' + items.map(function (x) { return '<li>' + inlineMd(x) + '</li>'; }).join('') + '</ul>';
      continue;
    }
    if (/^\d+\. /.test(trimmed)) {
      var nums = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { nums.push(lines[i].trim().replace(/^\d+\. /, '')); i++; }
      html += '<ol>' + nums.map(function (x) { return '<li>' + inlineMd(x) + '</li>'; }).join('') + '</ol>';
      continue;
    }
    var para = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|>|- |\d+\. |\||---)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    html += '<p>' + inlineMd(para.join(' ')) + '</p>';
  }
  return html;
}

function inlineMd(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function markdownTable(rows) {
  var clean = rows.filter(function (r) { return !/^\|\s*-+/.test(r); });
  if (!clean.length) return '';
  var cells = clean.map(function (r) {
    return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return inlineMd(c.trim()); });
  });
  var head = cells[0] || [];
  var body = cells.slice(1);
  return '<table class="md-table"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' + body.map(function (r) {
      return '<tr>' + head.map(function (_, idx) { return '<td>' + (r[idx] || '') + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
}

function printCurrentDoc() {
  if (!window.__currentDoc) return;
  window.print();
}

/* ---------- generic entities ---------- */
var ENTITY_VIEWS = {
  onboarding: {
    title: 'Founder Onboarding', sub: 'Details submitted by selected founders before the cohort begins.',
    cols: [['name', 'Founder'], ['venture', 'Venture'], ['email', 'Email'], ['availability', 'Availability', statusBadge], ['status', 'Status', statusBadge]],
    fields: [['name', 'Full name', 'text'], ['preferredName', 'Preferred name', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone / WhatsApp', 'text'], ['venture', 'Venture', 'text'], ['ventureSummary', 'Venture summary', 'textarea'], ['discord', 'Discord username', 'text'], ['availability', 'Availability', 'text'], ['mediaConsent', 'Media consent', 'text'], ['status', 'Status', 'text']]
  },
  founders: {
    title: 'Founders', sub: 'Cohort progress tracker.',
    cols: [['name', 'Founder'], ['startup', 'Startup'], ['mentor', 'Mentor'], ['attendancePct', 'Attendance', pct], ['status', 'Status', statusBadge]],
    fields: [['name', 'Name', 'text'], ['startup', 'Startup', 'text'], ['mentor', 'Mentor', 'text'], ['status', 'Status', 'founderStatus'], ['attendancePct', 'Attendance (0–1)', 'number'], ['notes', 'Notes', 'textarea']]
  },
  mentors: {
    title: 'Founder Mentors', sub: 'Regular founder-support mentors who can be matched to founders for office hours, review, and follow-up.',
    cols: [['name', 'Name'], ['org', 'Org'], ['role', 'Role'], ['capacity', 'Capacity'], ['status', 'Status', statusBadge]],
    fields: [['name', 'Name', 'text'], ['email', 'Email', 'text'], ['org', 'Org / title', 'text'], ['role', 'Role', 'mentorRole'], ['status', 'Status', 'mentorStatus'], ['capacity', 'Capacity (founders)', 'number']]
  },
  'guest-mentors': {
    title: 'Featured Speakers', sub: 'Special speakers for keynotes, masterclasses, and clinics. They teach focused 1-2 hour sessions.',
    cols: [['name', 'Name'], ['org', 'Org / profile'], ['topic', 'Session topic'], ['week', 'Week'], ['status', 'Status', statusBadge]],
    fields: [['name', 'Name', 'text'], ['email', 'Email', 'text'], ['org', 'Org / profile', 'text'], ['topic', 'Session topic', 'text'], ['week', 'Week', 'week'], ['date', 'Date', 'date'], ['status', 'Status', 'facilitatorStatus'], ['notes', 'Notes', 'textarea']]
  },
  facilitators: {
    title: 'Program Leads', sub: 'The core delivery leads running live sessions, Discord check-ins, reviews, and founder operations.',
    cols: [['name', 'Name'], ['org', 'Org'], ['topic', 'Session / topic'], ['week', 'Week'], ['status', 'Status', statusBadge]],
    fields: [['name', 'Name', 'text'], ['email', 'Email', 'text'], ['org', 'Org / title', 'text'], ['topic', 'Session / topic', 'text'], ['week', 'Week', 'week'], ['date', 'Date', 'date'], ['status', 'Status', 'facilitatorStatus']]
  },
  partners: {
    title: 'Partners & Sponsors', sub: 'Sponsor pipeline.',
    cols: [['org', 'Org'], ['tier', 'Tier'], ['value', 'Value', money], ['type', 'Type'], ['stage', 'Stage', statusBadge]],
    fields: [['org', 'Org', 'text'], ['contact', 'Contact', 'text'], ['email', 'Email', 'text'], ['tier', 'Tier', 'sponsorTier'], ['value', 'Value (₦)', 'number'], ['type', 'Type (Cash/In-kind)', 'text'], ['stage', 'Stage', 'partnerStage'], ['owner', 'Owner', 'text']]
  }
};
function pct(v) { return Math.round((Number(v) || 0) * 100) + '%'; }

function viewEntity(name) {
  var cfg = ENTITY_VIEWS[name];
  getJSON(name).then(function (list) {
    window['__' + name] = list;
    var html = '<div class="row"><h2 class="page">' + cfg.title + '</h2><div class="spacer"></div>' +
      '<button class="primary" onclick="openEntity(\'' + name + '\',null)"><i class="ti ti-plus"></i> Add</button></div>' +
      '<p class="sub">' + cfg.sub + '</p><div class="table-tools entity-tools"><span>' + list.length + ' record' + (list.length === 1 ? '' : 's') + '</span><span>' + esc(cfg.title) + '</span></div><div class="data-table"><table><thead><tr>' +
      cfg.cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '<th></th></tr></thead><tbody>';
    html += list.map(function (r) {
      return '<tr class="clickable" onclick="openEntity(\'' + name + '\',\'' + r.id + '\')">' +
        cfg.cols.map(function (c) { var v = r[c[0]]; return '<td>' + (c[2] ? c[2](v) : esc(v == null ? '—' : v)) + '</td>'; }).join('') +
        '<td style="color:#bbb"><i class="ti ti-chevron-right"></i></td></tr>';
    }).join('') || '<tr><td colspan="' + (cfg.cols.length + 1) + '"><div class="empty-state table-empty"><b>No records yet</b><span>Add the first ' + esc(cfg.title.toLowerCase().replace(/s$/, '')) + ' when you are ready.</span></div></td></tr>';
    html += '</tbody></table></div>';
    app.innerHTML = html;
  });
}
function openEntity(name, id) {
  var cfg = ENTITY_VIEWS[name];
  var r = id ? window['__' + name].find(function (x) { return x.id === id; }) : {};
  var body = '<h3>' + (id ? esc(r.name || r.org) : 'New ' + cfg.title.replace(/s$/, '')) + '</h3><p class="muted">' + (id ? esc(r.id) : 'Add a record') + '</p>';
  cfg.fields.forEach(function (f) {
    var key = f[0], label = f[1], type = f[2], v = r[key] != null ? r[key] : '';
    var input;
    if (META.lists[type]) input = '<select data-k="' + key + '">' + opts(META.lists[type], v) + '</select>';
    else if (type === 'week') input = '<select data-k="' + key + '">' + opts(['', 'Week 1', 'Week 2', 'Week 3', 'Week 4'], v) + '</select>';
    else if (type === 'textarea') input = '<textarea data-k="' + key + '" rows="3">' + esc(v) + '</textarea>';
    else input = '<input data-k="' + key + '" type="' + (type === 'number' ? 'number' : type === 'date' ? 'date' : 'text') + '" value="' + esc(v) + '">';
    body += field(label, input);
  });
  body += '<div class="row" style="margin-top:14px"><button class="primary" onclick="saveEntity(\'' + name + '\',' + (id ? '\'' + id + '\'' : 'null') + ')"><i class="ti ti-device-floppy"></i> Save</button>' +
    (id ? '<button class="danger" onclick="deleteRec(\'' + name + '\',\'' + id + '\')"><i class="ti ti-trash"></i> Delete</button>' : '') +
    '<div class="spacer"></div><button onclick="closeDrawer()">Cancel</button></div>';
  openDrawer(body);
}
function saveEntity(name, id) {
  var rec = {};
  document.querySelectorAll('.drawer [data-k]').forEach(function (i) {
    var k = i.getAttribute('data-k');
    rec[k] = i.type === 'number' ? (i.value === '' ? '' : Number(i.value)) : i.value;
  });
  var p = id ? api('PUT', name + '/' + id, rec) : api('POST', name, rec);
  p.then(function () { closeDrawer(); viewEntity(name); });
}
function deleteRec(name, id) {
  if (!confirm('Delete this record?')) return;
  api('DELETE', name + '/' + id).then(function () { closeDrawer(); location.hash === '#/applicants' || name === 'applicants' ? viewApplicants() : viewEntity(name); });
}

/* ---------- drawer + form bits ---------- */
function field(label, input) { return '<div class="field">' + (label ? '<label>' + label + '</label>' : '') + input + '</div>'; }
function twoCol(a, b) { return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + a + b + '</div>'; }
function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
function openDrawer(html, mode) {
  closeDrawer();
  var bg = el('<div class="drawer-bg" id="drawerbg"><div class="drawer' + (mode ? ' drawer-' + mode : '') + '"></div></div>');
  bg.querySelector('.drawer').innerHTML = html;
  bg.addEventListener('click', function (e) { if (e.target === bg) closeDrawer(); });
  document.body.appendChild(bg);
}
function closeDrawer() { var d = document.getElementById('drawerbg'); if (d) d.remove(); }

/* ---------- Settings + integrations ---------- */
function toast(msg, ok) {
  var t = el('<div style="position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:' + (ok === false ? '#993C1D' : '#0F6E56') + ';color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:99;box-shadow:0 4px 14px rgba(0,0,0,.2)">' + esc(msg) + '</div>');
  document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
}
function viewSettings() {
  getJSON('settings').then(function (r) {
    var s = r.settings || {}, st = r.status || {};
    var wp = s.wordpress || {}, em = s.email || {}, di = s.discord || {}, wa = s.whatsapp || {}, go = s.google || {}, it = s.intake || {}, rs = s.resources || {};
    var origin = location.origin;
    var dot = function (on) { return '<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:' + (on ? '#E1F5EE;color:#0F6E56' : '#F7D9CE;color:#993C1D') + '">' + (on ? 'configured' : 'not set') + '</span>'; };

    var html = '<h2 class="page">Settings &amp; integrations</h2><p class="sub">All data stays on this machine (localhost). Paste credentials below; nothing is sent anywhere except to the providers you configure.</p>';

    html += '<div class="sech">Resource links ' + dot(st.resources && st.resources.configured) + '</div><div class="card">';
    html += '<p class="sub" style="margin-top:0">These links power the Control Center resource tiles.</p>';
    html += twoCol(field('Public website', '<input data-s="resources.websiteUrl" value="' + esc(rs.websiteUrl || '') + '" placeholder="https://beeresoftwares.com/origin40">'),
      field('Registration form', '<input data-s="resources.registrationUrl" value="' + esc(rs.registrationUrl || '') + '">'));
    html += twoCol(field('LMS / founder portal', '<input data-s="resources.lmsUrl" value="' + esc(rs.lmsUrl || '') + '">'),
      field('Documents Drive folder', '<input data-s="resources.docsUrl" value="' + esc(rs.docsUrl || '') + '">'));
    html += field('Demo Day page', '<input data-s="resources.demoDayUrl" value="' + esc(rs.demoDayUrl || '') + '">');
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<a class="button-link" href="' + esc(rs.websiteUrl || '#') + '" target="_blank"><i class="ti ti-browser"></i> Open website</a></div></div>';

    html += '<div class="sech">Application intake</div><div class="card">';
    html += '<p class="sub" style="margin-top:0">Three ways to bring in real applications from WordPress + Fluent Forms.</p>';
    html += '<div class="field"><label>1 · Webhook URL (point Fluent Forms here on submit)</label>' +
      '<input readonly value="' + origin + '/api/intake/fluentforms?token=' + esc(it.webhookToken || '(save settings to generate)') + '"></div>';
    html += '<div class="field"><label>2 · WordPress (for API pull)</label></div>' +
      twoCol(field('Site base URL', '<input data-s="wordpress.baseUrl" value="' + esc(wp.baseUrl || '') + '" placeholder="https://yoursite.com">'),
             field('Fluent Form ID', '<input data-s="wordpress.formId" value="' + esc(wp.formId || '') + '" placeholder="e.g. 3">')) +
      twoCol(field('WP username', '<input data-s="wordpress.username" value="' + esc(wp.username || '') + '">'),
             field('Application password', '<input data-s="wordpress.appPassword" type="password" value="' + esc(wp.appPassword || '') + '">'));
    html += '<div class="note-info" style="margin:4px 0 10px"><b>To enable pull:</b> in WordPress, <b>Users → Profile → Application Passwords</b> → add one named "Origin40" and paste it above (with your WP username). <b>Form ID</b> is in Fluent Forms → your form (the number in the URL). Mapped automatically to your form\'s fields.</div>';
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<button onclick="doAction(\'intake/pull\',{},\'Pulled applications\')"><i class="ti ti-cloud-download"></i> Pull applications now</button>' +
      '<span class="spacer"></span>' + dot(st.wordpress && st.wordpress.configured) + '</div>';
    html += '<div class="field" style="margin-top:14px"><label>3 · CSV import (paste an export or choose a file)</label>' +
      '<textarea id="csvbox" rows="4" placeholder="name,email,phone,country,startup,pitch"></textarea></div>' +
      '<div class="row"><input id="csvfile" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values">' +
      '<button onclick="importCsv()" class="primary"><i class="ti ti-upload"></i> Import applicants</button></div>' +
      '<div id="importReport"></div>';
    html += '</div>';

    html += '<div class="sech">Email ' + dot(st.email && st.email.configured) + '</div><div class="card">';
    html += twoCol(field('Provider', '<select data-s="email.provider">' + opts(['brevo', 'sendgrid', 'resend'], em.provider || 'brevo') + '</select>'),
      field('API key', '<input data-s="email.apiKey" type="password" value="' + esc(em.apiKey || '') + '">'));
    html += twoCol(field('From email', '<input data-s="email.fromEmail" value="' + esc(em.fromEmail || '') + '" placeholder="hello@origin40.org">'),
      field('From name', '<input data-s="email.fromName" value="' + esc(em.fromName || 'Origin40') + '">'));
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<input id="testEmail" placeholder="send test to…" style="width:200px">' +
      '<button onclick="testEmail()">Send test</button></div></div>';

    html += '<div class="sech">Discord ' + dot(st.discord && st.discord.configured) + '</div><div class="card">';
    html += '<p class="sub" style="margin-top:0">Official Origin40 communication hub. Use auto-setup to build the whole server, or add links/webhooks manually.</p>';
    html += '<div class="note-info" style="margin:0 0 12px"><b>Auto-setup (one click):</b> create an app at <a href="https://discord.com/developers/applications" target="_blank">discord.com/developers</a> → add a <b>Bot</b> → copy the <b>Application ID</b> + <b>Bot Token</b>. Paste below, Save, click <b>Get bot invite link</b> and authorize it into your server, then <b>Provision server</b> — it builds every role, channel, and webhook for you.</div>';
    html += twoCol(field('Application ID', '<input data-s="discord.appId" value="' + esc(di.appId || '') + '" placeholder="numbers only">'),
      field('Server (guild) ID', '<input data-s="discord.guildId" value="' + esc(di.guildId || '') + '" placeholder="enable Developer Mode → right-click server → Copy Server ID">'));
    html += field('Bot token', '<input data-s="discord.botToken" type="password" value="' + esc(di.botToken || '') + '" placeholder="kept on this machine only">');
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<button onclick="discordInvite()"><i class="ti ti-robot"></i> Get bot invite link</button>' +
      '<button onclick="provisionDiscord()"><i class="ti ti-wand"></i> Provision server</button></div>';
    html += '<div id="discProvision"></div>';
    html += '<div class="field" style="margin-top:14px"><label>Or wire it manually — links + webhooks</label></div>';
    html += twoCol(field('Server / invite URL', '<input data-s="discord.inviteUrl" value="' + esc(di.inviteUrl || '') + '" placeholder="https://discord.gg/...">'),
      field('Server URL', '<input data-s="discord.serverUrl" value="' + esc(di.serverUrl || '') + '" placeholder="https://discord.com/channels/...">'));
    html += twoCol(field('Announcements channel', '<input data-s="discord.announcementsUrl" value="' + esc(di.announcementsUrl || '') + '">'),
      field('Support channel', '<input data-s="discord.supportUrl" value="' + esc(di.supportUrl || '') + '">'));
    html += twoCol(field('Build log channel', '<input data-s="discord.buildLogUrl" value="' + esc(di.buildLogUrl || '') + '">'),
      field('Demo / showcase channel', '<input data-s="discord.demoUrl" value="' + esc(di.demoUrl || '') + '">'));
    html += '<div class="field" style="margin-top:6px"><label>Channel webhooks (the app posts through these) ' + dot(st.discord && st.discord.webhook) + '</label></div>';
    html += twoCol(field('Announcements webhook', '<input data-s="discord.webhookAnnouncements" type="password" value="' + esc(di.webhookAnnouncements || '') + '" placeholder="https://discord.com/api/webhooks/...">'),
      field('Automation-log webhook', '<input data-s="discord.webhookLog" type="password" value="' + esc(di.webhookLog || '') + '">'));
    html += field('Submissions webhook (optional)', '<input data-s="discord.webhookSubmissions" type="password" value="' + esc(di.webhookSubmissions || '') + '">');
    html += '<div class="note-info" style="margin:4px 0 12px">Create a webhook in Discord: <b>Channel → Edit → Integrations → Webhooks → New Webhook → Copy URL</b>. Full setup is in <a href="#/documents">Documents → Founder Operations → Discord Server Blueprint</a>.</div>';
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<input id="discordTest" placeholder="test message to #announcements" style="width:220px">' +
      '<button onclick="testDiscord()"><i class="ti ti-send"></i> Send test</button>' +
      '<a class="button-link" href="' + esc(di.inviteUrl || di.serverUrl || '#') + '" target="_blank"><i class="ti ti-brand-discord"></i> Open Discord</a></div></div>';

    html += '<div class="sech">WhatsApp ' + dot(st.whatsapp && st.whatsapp.configured) + '</div><div class="card">';
    html += '<p class="sub" style="margin-top:0">Optional broadcast / backup channel. Discord is the official day-to-day cohort hub.</p>';
    html += field('Provider', '<select data-s="whatsapp.provider">' + opts(['meta', 'twilio'], wa.provider || 'meta') + '</select>');
    html += '<p class="sub" style="margin:0 0 8px">Meta Cloud API:</p>' +
      twoCol(field('Access token', '<input data-s="whatsapp.token" type="password" value="' + esc(wa.token || '') + '">'),
             field('Phone number ID', '<input data-s="whatsapp.phoneNumberId" value="' + esc(wa.phoneNumberId || '') + '">'));
    html += '<p class="sub" style="margin:6px 0 8px">…or Twilio:</p>' +
      twoCol(field('Account SID', '<input data-s="whatsapp.accountSid" value="' + esc(wa.accountSid || '') + '">'),
             field('Auth token', '<input data-s="whatsapp.authToken" type="password" value="' + esc(wa.authToken || '') + '">')) +
      field('From number', '<input data-s="whatsapp.from" value="' + esc(wa.from || '') + '" placeholder="+234...">');
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<input id="testWa" placeholder="send test to +234…" style="width:200px">' +
      '<button onclick="testWa()">Send test</button></div></div>';

    html += '<div class="sech">Google Sheets ' + dot(st.google && st.google.configured) + '</div><div class="card">';
    html += '<p class="sub" style="margin-top:0">Paste a service-account JSON key, then share the spreadsheet with its <code>client_email</code> as Editor.</p>';
    html += field('Service account JSON', '<textarea data-s="google.serviceAccountJson" rows="4" placeholder=\'{ "type":"service_account", ... }\'>' + esc(go.serviceAccountJson || '') + '</textarea>');
    html += twoCol(field('Spreadsheet ID', '<input data-s="google.spreadsheetId" value="' + esc(go.spreadsheetId || '') + '">'),
      field('Default tab name', '<input data-s="google.sheetName" value="' + esc(go.sheetName || 'applicants') + '">'));
    html += '<div class="row"><button onclick="saveSettings()" class="primary">Save</button>' +
      '<button onclick="doAction(\'sync/sheets\',{entity:\'applicants\'},\'Synced applicants to Google Sheets\')">Sync applicants → Sheets</button></div></div>';

    html += '<div class="note-info" style="margin-top:16px">This is the “what I need from you” panel. Fill what you have, save, and the matching tiles light up. You can add credentials anytime.</div>';
    app.innerHTML = html;
  });
}
function collectSettings() {
  var out = {};
  document.querySelectorAll('[data-s]').forEach(function (i) {
    var p = i.getAttribute('data-s').split('.');
    out[p[0]] = out[p[0]] || {};
    out[p[0]][p[1]] = i.value;
  });
  return out;
}
function saveSettings() {
  return api('POST', 'settings', collectSettings()).then(function () { toast('Settings saved'); });
}
function importCsv() {
  var box = document.getElementById('csvbox');
  var file = document.getElementById('csvfile').files[0];
  var run = function (csv) {
    if (!csv.trim()) return toast('Paste or choose a CSV first', false);
    api('POST', 'import/applicants', { csv: csv }).then(function (r) {
      renderImportReport(r);
      toast('Imported ' + r.added + ' applicants' + (r.skipped ? ' · skipped ' + r.skipped : '') + (r.rejected ? ' · rejected ' + r.rejected : ''), r.ok);
    });
  };
  if (file) {
    file.text().then(function (text) {
      box.value = text;
      run(text);
    });
  } else {
    run(box.value);
  }
}
function renderImportReport(r) {
  var target = document.getElementById('importReport');
  if (!target) return;
  var report = r.report || {};
  var recognized = report.recognized || {};
  var recKeys = Object.keys(recognized);
  var html = '<div class="import-report">' +
    '<div class="import-stats">' +
    '<span><b>' + (r.added || 0) + '</b> added</span>' +
    '<span><b>' + (r.skipped || 0) + '</b> duplicates</span>' +
    '<span><b>' + (r.rejected || 0) + '</b> rejected</span>' +
    '<span><b>' + esc(report.delimiter || ',') + '</b> delimiter</span>' +
    '</div>';
  html += '<div class="mini-list"><b>Recognized headers:</b> ' + (recKeys.length ? recKeys.map(function (k) { return esc(k) + ' → ' + esc(recognized[k]); }).join(' · ') : 'none yet') + '</div>';
  if (report.rejectedRows && report.rejectedRows.length) {
    html += '<div class="mini-list warn"><b>Rejected rows:</b> ' + report.rejectedRows.slice(0, 6).map(function (x) { return 'row ' + x.row + ' (' + esc(x.reason) + ')'; }).join(' · ') + '</div>';
  }
  if (report.skippedRows && report.skippedRows.length) {
    html += '<div class="mini-list"><b>Duplicate rows:</b> ' + report.skippedRows.slice(0, 6).map(function (x) { return 'row ' + x.row + ' → ' + esc(x.id); }).join(' · ') + '</div>';
  }
  html += '</div>';
  target.innerHTML = html;
  if (r.added) {
    getJSON('dashboard').then(function () { /* warm the dashboard route after import */ });
  }
}
function doAction(path, body, okMsg) {
  saveSettings().then(function () {
    api('POST', path, body || {}).then(function (r) {
      if (r.ok) toast(okMsg + (r.added != null ? ' — added ' + r.added + ', skipped ' + r.skipped : ''));
      else toast('Failed: ' + (r.error || r.status || 'check credentials'), false);
    });
  });
}
function testEmail() {
  var to = document.getElementById('testEmail').value; if (!to) return toast('Enter an email', false);
  saveSettings().then(function () {
    api('POST', 'actions/email', { to: to, subject: 'Origin40 test email', html: '<p>It works. Build the Product. Launch the Venture.</p>' })
      .then(function (r) { toast(r.ok ? 'Email sent' : 'Email failed: ' + (r.error || r.body || r.status), r.ok); });
  });
}
function testWa() {
  var to = document.getElementById('testWa').value; if (!to) return toast('Enter a number', false);
  saveSettings().then(function () {
    api('POST', 'actions/whatsapp', { to: to, text: 'Origin40 test. Build the Product. Launch the Venture.' })
      .then(function (r) { toast(r.ok ? 'WhatsApp sent' : 'WhatsApp failed: ' + (r.error || r.body || r.status), r.ok); });
  });
}
function testDiscord() {
  var box = document.getElementById('discordTest');
  var msg = (box && box.value) || '✅ Origin40 admin app connected. Build the Product. Launch the Venture.';
  saveSettings().then(function () {
    api('POST', 'actions/discord', { channel: 'announcements', content: msg })
      .then(function (r) { toast(r.ok ? 'Posted to Discord' : 'Discord failed: ' + (r.error || r.body || r.status), r.ok); });
  });
}
function discordInvite() {
  saveSettings().then(function () {
    getJSON('actions/discord/invite').then(function (r) {
      if (!r.url || r.url.indexOf('client_id=&') > -1) return toast('Enter the Application ID first, then Save', false);
      window.open(r.url, '_blank');
      toast('Opening Discord — authorize the bot into your server');
    });
  });
}
function provisionDiscord() {
  var target = document.getElementById('discProvision');
  if (target) target.innerHTML = '<div class="import-report">Provisioning server… creating roles, channels, and webhooks. This can take ~30s.</div>';
  saveSettings().then(function () {
    api('POST', 'actions/discord/provision', {}).then(function (r) {
      var c = r.created || { roles: [], categories: [], channels: [], webhooks: [] };
      var hooks = r.webhooks || {};
      var html = '<div class="import-report"><div class="import-stats">' +
        '<span><b>' + c.roles.length + '</b> roles</span>' +
        '<span><b>' + c.categories.length + '</b> categories</span>' +
        '<span><b>' + c.channels.length + '</b> channels</span>' +
        '<span><b>' + c.webhooks.length + '</b> webhooks</span></div>';
      html += '<div class="mini-list"><b>Webhooks wired:</b> ' + (Object.keys(hooks).length ? Object.keys(hooks).join(' · ') : 'none') + '</div>';
      if (r.errors && r.errors.length) html += '<div class="mini-list warn"><b>Issues:</b> ' + r.errors.slice(0, 6).map(esc).join(' · ') + '</div>';
      html += '</div>';
      if (target) target.innerHTML = html;
      toast(r.ok ? 'Server provisioned — webhooks saved' : 'Provision had issues: ' + (r.error || 'see report'), r.ok);
      if (Object.keys(hooks).length) setTimeout(viewSettings, 1200);
    });
  });
}

/* ---------- boot ---------- */
getJSON('meta').then(function (m) { META = m; if (!location.hash) location.hash = '#/control'; router(); });
