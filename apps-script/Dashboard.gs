/**
 * ORIGIN40 — Mission-Control Dashboard.
 *
 * Builds a proper, designed dashboard tab ("00 · Dashboard") that reads live from
 * every system tab. Follows KPI-dashboard best practice:
 *   - 8 headline KPI tiles with targets/context (top of page, scannable in 5s)
 *   - 4 breakdown charts (status funnel, score bands, sponsor pipeline, attendance)
 *   - an Alerts & actions strip (red when a threshold is breached, green when clear)
 *
 * All numbers are formulas — refresh by reopening the sheet or
 * Origin40 menu > "📊 Build / Refresh Dashboard". Chart data lives on hidden _DashData.
 */

function buildDashboard_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  buildDashData_(ss);

  const C = ORIGIN40.colors;
  const NCOLS = 12;
  const name = '00 · Dashboard';
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.clearConditionalFormatRules();
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.setHiddenGridlines(true);
  for (let c = 1; c <= NCOLS; c++) sh.setColumnWidth(c, 72);

  // ---- Banner ----
  sh.getRange(1, 1, 1, NCOLS).merge()
    .setValue('   ORIGIN40 — Mission Control')
    .setBackground(C.ink).setFontColor('#FFFFFF').setFontSize(16).setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.getRange(2, 1, 1, NCOLS).merge()
    .setFormula('="   Build the Product. Launch the Venture.    ·    4 Weeks · 40 Founders · Real Products"')
    .setBackground(C.ink).setFontColor('#CFE3D9').setFontSize(10).setVerticalAlignment('middle');
  sh.getRange(3, 1, 1, NCOLS).merge()
    .setFormula('="   Updated "&TEXT(NOW(),"ddd dd mmm yyyy, HH:mm")&"   ·   Where Africa’s Next Tech Founders Build"')
    .setFontColor(C.ink).setFontSize(10).setVerticalAlignment('middle');
  sh.setRowHeight(1, 34); sh.setRowHeight(2, 22); sh.setRowHeight(3, 20); sh.setRowHeight(4, 8);

  // ---- KPI tiles ----
  const A = '\'01 · Applicants\'';
  const tilesRow1 = [
    { label: 'Applications received', val: '=COUNTA(' + A + '!A2:A)', fmt: '#,##0', accent: C.accent,
      ctx: '="of 300 target  ·  "&TEXT(IFERROR(COUNTA(' + A + '!A2:A)/300,0),"0%")&" reached"' },
    { label: 'Founders selected', val: '=COUNTIF(' + A + '!R2:R,"Selected")', fmt: '0', accent: C.accent,
      ctx: '="of 40 seats  ·  "&TEXT(IFERROR(COUNTIF(' + A + '!R2:R,"Selected")/40,0),"0%")&" filled"' },
    { label: 'Avg attendance', val: '=IFERROR(AVERAGE(\'06 · Attendance\'!H2:H),0)', fmt: '0%', accent: C.accent,
      ctx: '="cohort average  ·  target 70%"' },
    { label: 'Completion rate', val: '=IFERROR(COUNTIF(\'05 · Progress Tracker\'!M2:M,"Yes")/COUNTIF(' + A + '!R2:R,"Selected"),0)', fmt: '0%', accent: C.accent,
      ctx: '="completers of selected"' }
  ];
  const tilesRow2 = [
    { label: 'Mentors confirmed', val: '=COUNTIF(\'11 · Mentor Directory\'!F2:F,"Confirmed")+COUNTIF(\'11 · Mentor Directory\'!F2:F,"Onboarded")+COUNTIF(\'11 · Mentor Directory\'!F2:F,"Active")', fmt: '0', accent: C.accent,
      ctx: '="across 8 mentor roles"' },
    { label: 'Funds committed', val: '=SUMIF(\'14 · Partner Pipeline\'!G2:G,"Committed",\'14 · Partner Pipeline\'!E2:E)', fmt: '#,##0', accent: C.accent,
      ctx: '="cash + in-kind  ·  "&COUNTIF(\'14 · Partner Pipeline\'!G2:G,"Committed")&" sponsors"' },
    { label: 'Open support tickets', val: '=COUNTIF(\'08 · Support Desk\'!G2:G,"Open")+COUNTIF(\'08 · Support Desk\'!G2:G,"In Progress")', fmt: '0', accent: C.warn,
      ctx: '="founder support desk"' },
    { label: 'Open risks', val: '=COUNTIF(\'21 · Risk Tracker\'!H2:H,"Open")', fmt: '0', accent: C.warn,
      ctx: '="needing mitigation"' }
  ];
  const cols = [1, 4, 7, 10];
  tilesRow1.forEach(function (t, i) { placeTile_(sh, 5, cols[i], t); });
  tilesRow2.forEach(function (t, i) { placeTile_(sh, 9, cols[i], t); });
  [5, 9].forEach(function (r) { sh.setRowHeight(r, 20); sh.setRowHeight(r + 1, 40); sh.setRowHeight(r + 2, 18); });
  sh.setRowHeight(8, 8); sh.setRowHeight(12, 14);

  // ---- Charts section ----
  sectionHeader_(sh, 13, NCOLS, 'Pipelines & trends');
  const dd = ss.getSheetByName('_DashData');
  insertChart_(sh, dd.getRange('A1:B7'), Charts.ChartType.BAR, 'Applicant status funnel', 14, 1, C.accent);
  insertChart_(sh, dd.getRange('D1:E6'), Charts.ChartType.COLUMN, 'Applications by score band', 14, 7, C.ink);
  insertChart_(sh, dd.getRange('G1:H8'), Charts.ChartType.BAR, 'Sponsor pipeline value by stage', 28, 1, C.accent);
  insertChart_(sh, dd.getRange('J1:K6'), Charts.ChartType.COLUMN, 'Attendance by session (Present)', 28, 7, C.ink);

  // ---- Alerts strip ----
  sectionHeader_(sh, 42, NCOLS, 'Alerts & actions');
  const alerts = [
    { label: 'At-risk founders', f: '=COUNTIF(\'05 · Progress Tracker\'!E2:E,"At Risk")' },
    { label: 'Aging support tickets (> 3 days open)', f: '=COUNTIF(\'08 · Support Desk\'!J2:J,">3")' },
    { label: 'Cold sponsor leads (> 10 days, no touch)', f: '=COUNTIF(\'14 · Partner Pipeline\'!K2:K,">10")' },
    { label: 'High-severity risks (severity ≥ 15)', f: '=COUNTIF(\'21 · Risk Tracker\'!E2:E,">=15")' },
    { label: 'Overdue Demo Day tasks', f: '=COUNTIF(\'16 · Demo Day Plan\'!H2:H,"<0")' }
  ];
  const alertNumRanges = [];
  alerts.forEach(function (a, i) {
    const r = 43 + i;
    sh.getRange(r, 1, 1, 9).merge().setValue('   ' + a.label)
      .setVerticalAlignment('middle').setFontColor(C.ink).setFontSize(11)
      .setBorder(true, true, true, true, false, false, C.line, SpreadsheetApp.BorderStyle.SOLID);
    const num = sh.getRange(r, 10, 1, 3).merge().setFormula(a.f)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setFontSize(13).setFontWeight('bold')
      .setBorder(true, true, true, true, false, false, C.line, SpreadsheetApp.BorderStyle.SOLID);
    alertNumRanges.push(sh.getRange(r, 10));
    sh.setRowHeight(r, 24);
  });
  const rules = [];
  alertNumRanges.forEach(function (rng) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0)
      .setBackground('#F7D9CE').setFontColor(C.warn).setRanges([rng]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(0)
      .setBackground(C.accentSoft).setFontColor(C.good).setRanges([rng]).build());
  });
  sh.setConditionalFormatRules(rules);

  sh.getRange(49, 1, 1, NCOLS).merge()
    .setValue('   Powered by Beere Softwares  ·  Partner: Equip Africa Initiative  ·  Supported by Dooke Innovation Center & Anfani  ·  In honor of David Oke Opeyemi at 40')
    .setFontColor('#888780').setFontSize(9).setVerticalAlignment('middle');
  sh.setRowHeight(49, 22);
}

function placeTile_(sh, r, c, t) {
  const C = ORIGIN40.colors;
  const w = 3;
  sh.getRange(r, c, 1, w).merge().setValue('  ' + t.label)
    .setBackground(C.accentSoft).setFontColor(C.ink).setFontSize(10).setFontWeight('bold')
    .setVerticalAlignment('middle');
  const v = sh.getRange(r + 1, c, 1, w).merge().setFormula(t.val)
    .setBackground('#FFFFFF').setFontColor(C.ink).setFontSize(24).setFontWeight('bold')
    .setVerticalAlignment('middle').setHorizontalAlignment('left');
  v.setNumberFormat(t.fmt || '0');
  sh.getRange(r + 2, c, 1, w).merge().setFormula(t.ctx)
    .setBackground('#FFFFFF').setFontColor('#5F5E5A').setFontSize(10).setVerticalAlignment('middle');
  // accent top border + tile outline
  sh.getRange(r, c, 1, w).setBorder(true, null, null, null, null, null, t.accent, SpreadsheetApp.BorderStyle.SOLID_THICK);
  sh.getRange(r, c, 3, w).setBorder(true, true, true, true, false, false, C.line, SpreadsheetApp.BorderStyle.SOLID);
}

function sectionHeader_(sh, r, ncols, text) {
  const C = ORIGIN40.colors;
  sh.getRange(r, 1, 1, ncols).merge().setValue('  ' + text)
    .setBackground(C.soft).setFontColor(C.ink).setFontSize(11).setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.setRowHeight(r, 24);
}

function insertChart_(sh, range, type, title, anchorRow, anchorCol, color) {
  const chart = sh.newChart()
    .addRange(range)
    .setChartType(type)
    .setPosition(anchorRow, anchorCol, 0, 0)
    .setNumHeaders(1)
    .setOption('title', title)
    .setOption('titleTextStyle', { color: ORIGIN40.colors.ink, fontSize: 12, bold: true })
    .setOption('legend', { position: 'none' })
    .setOption('colors', [color])
    .setOption('width', 430)
    .setOption('height', 260)
    .setOption('backgroundColor', '#FFFFFF')
    .build();
  sh.insertChart(chart);
}

function buildDashData_(ss) {
  const d = ss.getSheetByName('_DashData') || ss.insertSheet('_DashData');
  d.clear();
  const A = '\'01 · Applicants\'';

  // Status funnel (A1:B7)
  d.getRange('A1').setValue('Status'); d.getRange('B1').setValue('Applicants');
  LISTS.ApplicantStatus.forEach(function (s, i) {
    d.getRange(i + 2, 1).setValue(s);
    d.getRange(i + 2, 2).setFormula('=COUNTIF(' + A + '!R2:R,"' + s + '")');
  });

  // Score bands (D1:E6)
  d.getRange('D1').setValue('Score band'); d.getRange('E1').setValue('Applicants');
  const O = A + '!O2:O';
  const bands = [
    ['80–100', '=COUNTIFS(' + O + ',">=80")'],
    ['70–79', '=COUNTIFS(' + O + ',">=70",' + O + ',"<80")'],
    ['55–69', '=COUNTIFS(' + O + ',">=55",' + O + ',"<70")'],
    ['40–54', '=COUNTIFS(' + O + ',">=40",' + O + ',"<55")'],
    ['0–39', '=COUNTIFS(' + O + ',">0",' + O + ',"<40")']
  ];
  bands.forEach(function (b, i) { d.getRange(i + 2, 4).setValue(b[0]); d.getRange(i + 2, 5).setFormula(b[1]); });

  // Sponsor pipeline value by stage (G1:H8)
  d.getRange('G1').setValue('Stage'); d.getRange('H1').setValue('Value');
  const P = '\'14 · Partner Pipeline\'';
  LISTS.PartnerStage.forEach(function (s, i) {
    d.getRange(i + 2, 7).setValue(s);
    d.getRange(i + 2, 8).setFormula('=SUMIF(' + P + '!G2:G,"' + s + '",' + P + '!E2:E)');
  });

  // Attendance by session (J1:K6)
  d.getRange('J1').setValue('Session'); d.getRange('K1').setValue('Present');
  const AT = '\'06 · Attendance\'';
  const sessions = [['Week 1', 'C'], ['Week 2', 'D'], ['Week 3', 'E'], ['Week 4', 'F'], ['Demo Day', 'G']];
  sessions.forEach(function (s, i) {
    d.getRange(i + 2, 10).setValue(s[0]);
    d.getRange(i + 2, 11).setFormula('=COUNTIF(' + AT + '!' + s[1] + '2:' + s[1] + ',"Present")');
  });

  d.getRange('H2:H8').setNumberFormat('#,##0');
  d.hideSheet();
}
