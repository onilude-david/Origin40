/**
 * ORIGIN40 — Build engine.
 * Reads SHEET_SPECS (Code.gs) and constructs every tab with headers,
 * data validation, number formats, conditional formatting, and seed rows.
 */

function buildWorkbook_(reset) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildListsTab_(ss);
  buildDeadlinesTab_(ss);

  SHEET_SPECS.forEach(function (spec) {
    let sh = ss.getSheetByName(spec.name);
    if (!sh) sh = ss.insertSheet(spec.name);
    if (reset) sh.clear();

    const headers = headersFor_(spec);
    // Title/intro row
    sh.getRange(1, 1, 1, Math.max(headers.length, 3)).clearFormat();

    // Write headers on row 1
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader_(sh, headers.length, spec);

    // Notes on header cells
    if (spec.note) {
      Object.keys(spec.note).forEach(function (h) {
        const c = headers.indexOf(h);
        if (c > -1) sh.getRange(1, c + 1).setNote(spec.note[h]);
      });
    }
    sh.getRange(1, 1).setNote(spec.intro || '');

    applyValidationAndFormats_(sh, spec, headers);
    writeFormulas_(sh, spec, headers);
    writeQuery_(sh, spec, headers);
    writeSeed_(sh, spec, headers);
    applyConditionalFormatting_(sh, spec, headers);

    sh.setFrozenRows(1);
    autosize_(sh, headers.length);
  });

  // Build the mission-control dashboard now that every system tab exists.
  buildDashboard_(ss);

  // Order tabs; put dashboard first, helper tabs last
  reorderTabs_(ss);
  ss.getSheetByName('00 · Dashboard').activate();
  SpreadsheetApp.getActive().toast('Origin40 workbook + dashboard ready.', 'Build complete', 5);
}

function headersFor_(spec) {
  if (spec.fields) return spec.fields.map(function (f) { return f[0]; });
  let h = (spec.headers || []).slice();
  if (spec.extraHeaders) h = h.concat(spec.extraHeaders);
  return h;
}

function styleHeader_(sh, n, spec) {
  const r = sh.getRange(1, 1, 1, n);
  r.setBackground(ORIGIN40.colors.ink).setFontColor('#FFFFFF').setFontWeight('bold')
    .setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1, 34);
}

function applyValidationAndFormats_(sh, spec, headers) {
  if (!spec.fields) return;
  const lastRow = 1000;
  spec.fields.forEach(function (f, i) {
    const col = i + 1;
    const type = f[1];
    const rng = sh.getRange(2, col, lastRow - 1, 1);
    if (type.indexOf('list:') === 0) {
      const key = type.split(':')[1];
      const items = LISTS[key] || [];
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(items, true)
        .setAllowInvalid(true).build();
      rng.setDataValidation(rule);
    } else if (type === 'date') {
      rng.setNumberFormat('yyyy-mm-dd');
    } else if (type === 'money') {
      rng.setNumberFormat('#,##0.00');
    } else if (type === 'pct') {
      rng.setNumberFormat('0%');
    } else if (type === 'num') {
      rng.setNumberFormat('0.##');
    }
  });
  // Percent-style formula columns
  ['Attendance %', '% Complete', 'Avg Engagement Rate', 'Completion Rate', 'Submissions Reviewed %'].forEach(function (h) {
    const c = headers.indexOf(h);
    if (c > -1) sh.getRange(2, c + 1, lastRow - 1, 1).setNumberFormat('0%');
  });
}

function writeFormulas_(sh, spec, headers) {
  if (!spec.formulas) return;
  Object.keys(spec.formulas).forEach(function (h) {
    const c = headers.indexOf(h);
    if (c > -1) sh.getRange(2, c + 1).setFormula(spec.formulas[h]);
  });
}

function writeQuery_(sh, spec, headers) {
  if (!spec.queryInto) return;
  // QUERY drives the first columns; extra headers stay manual.
  const colIdx = spec.queryInto.col.charCodeAt(0) - 65 + 1;
  sh.getRange(2, colIdx).setFormula(spec.queryInto.formula);
}

function writeSeed_(sh, spec, headers) {
  if (!spec.seed || !spec.seed.length) return;
  const rows = spec.seed.map(function (r) {
    const out = r.slice(0, headers.length);
    while (out.length < headers.length) out.push('');
    return out;
  });
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function applyConditionalFormatting_(sh, spec, headers) {
  const rules = [];
  const c = ORIGIN40.colors;
  function colRange(h) { const i = headers.indexOf(h); return i > -1 ? sh.getRange(2, i + 1, 1000, 1) : null; }

  // Status colour bands
  const statusMap = {
    'Status': [['Selected', c.accentSoft], ['Shortlisted', '#FFF6D6'], ['Rejected', '#F7D9CE'], ['Resolved', c.accentSoft], ['Closed', c.soft]],
    'Founder Status': [['At Risk', '#F7D9CE'], ['On Track', c.accentSoft], ['Completed', c.accentSoft], ['Withdrawn', c.soft]],
    'Capacity Flag': [['OVER CAPACITY', '#F7D9CE'], ['OK', c.accentSoft]],
    'Completion Eligible?': [['Yes', c.accentSoft], ['No', '#F7D9CE']],
    'Escalate?': [['Yes', '#F7D9CE']]
  };
  Object.keys(statusMap).forEach(function (h) {
    const rng = colRange(h);
    if (!rng) return;
    statusMap[h].forEach(function (pair) {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(pair[0]).setBackground(pair[1]).setRanges([rng]).build());
    });
  });

  // Risk severity heat (>=15 red, >=8 amber)
  const sev = colRange('Severity');
  if (sev) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(15).setBackground('#F7D9CE').setRanges([sev]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(8, 14).setBackground('#FFF6D6').setRanges([sev]).build());
  }
  // Aging tickets / overdue
  const age = colRange('Age (days)');
  if (age) rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(3).setBackground('#FFF6D6').setRanges([age]).build());
  const dtd = colRange('Days to Due');
  if (dtd) rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setBackground('#F7D9CE').setRanges([dtd]).build());

  if (rules.length) sh.setConditionalFormatRules(sh.getConditionalFormatRules().concat(rules));
}

function buildListsTab_(ss) {
  const name = '_Lists';
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  const keys = Object.keys(LISTS);
  sh.getRange(1, 1, 1, keys.length).setValues([keys]).setFontWeight('bold')
    .setBackground(ORIGIN40.colors.ink).setFontColor('#FFFFFF');
  keys.forEach(function (k, i) {
    const vals = LISTS[k].map(function (v) { return [v]; });
    sh.getRange(2, i + 1, vals.length, 1).setValues(vals);
  });
  sh.setFrozenRows(1);
  sh.getRange(1, 1).setNote('Edit options here; dropdowns across the workbook read from these columns.');
}

function buildDeadlinesTab_(ss) {
  const name = '_Deadlines';
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 2).setValues([['Week', 'Deadline']]).setFontWeight('bold');
  sh.getRange(2, 1, 4, 2).setValues([
    ['Week 1', ''], ['Week 2', ''], ['Week 3', ''], ['Week 4', '']
  ]);
  sh.getRange(2, 2, 4, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(1, 1).setNote('Set each week\'s submission deadline; tab 07 uses it to flag late work.');
}

function autosize_(sh, n) {
  for (let c = 1; c <= n; c++) {
    sh.autoResizeColumn(c);
    const w = sh.getColumnWidth(c);
    if (w > 320) sh.setColumnWidth(c, 320);
    if (w < 90) sh.setColumnWidth(c, 90);
  }
}

function reorderTabs_(ss) {
  const order = ['00 · Dashboard']
    .concat(SHEET_SPECS.map(function (s) { return s.name; }))
    .concat(['_Lists', '_Deadlines', '_DashData']);
  order.forEach(function (name, idx) {
    const sh = ss.getSheetByName(name);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(idx + 1); }
  });
}
