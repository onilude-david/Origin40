/**
 * ORIGIN40 — Control Center (the cPanel).
 *
 * A visual launchpad that opens inside the Sheet (HtmlService modal). One place to
 * see and reach EVERYTHING: applications, founders, mentors, facilitators, curriculum,
 * documents, marketing, partners, Demo Day, impact, operations.
 *
 * - Each tile shows a live count and jumps you to the matching tab (or opens an
 *   external link: WordPress LMS, registration form, Drive docs, Discord, etc.).
 * - Open it from Origin40 menu > "🧭 Open Control Center".
 *
 * SET YOUR LINKS: edit CC_LINKS below with your real URLs. Empty links show as
 * "add link" tiles and are safe to leave blank.
 */

const CC_LINKS = {
  website: 'https://beeresoftwares.com/origin40', // Public Origin40 website (WordPress)
  registration: 'https://beeresoftwares.com/origin40/apply/', // Application form (Fluent Forms) URL
  lms: '',            // WordPress LMS / founder portal URL
  docsFolder: '',     // Google Drive folder holding all docs/templates/curriculum
  discord: '',        // Official cohort Discord server invite
  whatsapp: '',       // Optional WhatsApp broadcast/backup group invite
  demoDay: ''         // Demo Day public page
};

function openControlCenter() {
  const t = HtmlService.createTemplateFromFile('ControlCenter');
  t.data = getControlData_();
  const html = t.evaluate().setWidth(1000).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, 'Origin40 — Control Center');
}

/** Called from the dialog: activate a tab, then the dialog closes itself. */
function ccGoto(sheetName) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (sh) SpreadsheetApp.getActive().setActiveSheet(sh);
  return true;
}

function getControlData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const applicants = ccCount_(ss, '01 · Applicants', 1);
  const shortlisted = ccCountIf_(ss, '01 · Applicants', 18, ['Shortlisted']);
  const selected = ccCountIf_(ss, '01 · Applicants', 18, ['Selected']);
  const founders = ccCount_(ss, '05 · Progress Tracker', 1);
  const mentors = ccCount_(ss, '11 · Mentor Directory', 1);
  const facilitators = ccCount_(ss, '23 · Facilitators', 1);
  const tickets = ccCountIf_(ss, '08 · Support Desk', 7, ['Open', 'In Progress']);
  const sponsors = ccCountIf_(ss, '14 · Partner Pipeline', 7, ['Committed']);

  const stats = {
    applications: applicants + ' received',
    shortlist: shortlisted + ' shortlisted',
    selection: selected + ' / 40 selected',
    founders: founders + ' founders',
    mentors: mentors + ' mentors',
    facilitators: facilitators + ' facilitators',
    tickets: tickets + ' open',
    sponsors: sponsors + ' committed'
  };

  const sections = [
    { cat: 'Overview', tiles: [
      { icon: 'ti-layout-dashboard', title: 'Dashboard', sub: 'KPIs · charts · alerts', sheet: '00 · Dashboard' }
    ]},
    { cat: 'People', tiles: [
      { icon: 'ti-file-text', title: 'Applications', sub: stats.applications, sheet: '01 · Applicants' },
      { icon: 'ti-list-check', title: 'Shortlist', sub: stats.shortlist, sheet: '02 · Shortlist' },
      { icon: 'ti-user-check', title: 'Selection', sub: stats.selection, sheet: '03 · Selection' },
      { icon: 'ti-rocket', title: 'Founders', sub: stats.founders, sheet: '05 · Progress Tracker' },
      { icon: 'ti-users', title: 'Mentors', sub: stats.mentors, sheet: '11 · Mentor Directory' },
      { icon: 'ti-school', title: 'Facilitators', sub: stats.facilitators, sheet: '23 · Facilitators' }
    ]},
    { cat: 'Program', tiles: [
      { icon: 'ti-book-2', title: 'Curriculum', sub: '4-week build sprint', sheet: '09 · Curriculum Map' },
      { icon: 'ti-calendar-check', title: 'Attendance', sub: 'per session', sheet: '06 · Attendance' },
      { icon: 'ti-upload', title: 'Submissions', sub: 'milestones', sheet: '07 · Submissions' },
      { icon: 'ti-lifebuoy', title: 'Support Desk', sub: stats.tickets, sheet: '08 · Support Desk' },
      { icon: 'ti-message-2', title: 'Mentor Feedback', sub: 'weekly', sheet: '13 · Mentor Feedback' }
    ]},
    { cat: 'Growth', tiles: [
      { icon: 'ti-speakerphone', title: 'Marketing', sub: 'content calendar', sheet: '10 · Content Calendar' },
      { icon: 'ti-chart-bar', title: 'Marketing Metrics', sub: 'dashboard', sheet: '10b · Marketing Dashboard' },
      { icon: 'ti-building-store', title: 'Partners & Sponsors', sub: stats.sponsors, sheet: '14 · Partner Pipeline' },
      { icon: 'ti-presentation', title: 'Demo Day', sub: 'plan · schedule · scoring', sheet: '16 · Demo Day Plan' }
    ]},
    { cat: 'Operations', tiles: [
      { icon: 'ti-coin', title: 'Budget', sub: 'budget vs actual', sheet: '20 · Budget' },
      { icon: 'ti-alert-triangle', title: 'Risk Tracker', sub: 'severity heat', sheet: '21 · Risk Tracker' },
      { icon: 'ti-checklist', title: 'Team & Checklists', sub: 'roles · QC · brand', sheet: '22 · Team & Checklists' },
      { icon: 'ti-world', title: 'Impact', sub: 'outcomes', sheet: '19c · Impact Dashboard' }
    ]},
    { cat: 'Resources & links', tiles: [
      { icon: 'ti-browser', title: 'Public website', sub: 'WordPress', url: CC_LINKS.website },
      { icon: 'ti-forms', title: 'Registration form', sub: 'Fluent Forms', url: CC_LINKS.registration },
      { icon: 'ti-device-laptop', title: 'LMS / portal', sub: 'WordPress LMS', url: CC_LINKS.lms },
      { icon: 'ti-folder', title: 'Documents & templates', sub: 'Drive folder', url: CC_LINKS.docsFolder },
      { icon: 'ti-brand-discord', title: 'Cohort Discord', sub: 'official community', url: CC_LINKS.discord },
      { icon: 'ti-brand-whatsapp', title: 'WhatsApp backup', sub: 'broadcast only', url: CC_LINKS.whatsapp },
      { icon: 'ti-confetti', title: 'Demo Day page', sub: 'public', url: CC_LINKS.demoDay }
    ]}
  ];

  return { stats: stats, sections: sections };
}

function ccCount_(ss, sheetName, col) {
  try {
    const sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return 0;
    const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
    return vals.filter(function (r) { return r[0] !== '' && r[0] !== null; }).length;
  } catch (e) { return 0; }
}

function ccCountIf_(ss, sheetName, col, matches) {
  try {
    const sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return 0;
    const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
    return vals.filter(function (r) { return matches.indexOf(r[0]) > -1; }).length;
  } catch (e) { return 0; }
}
