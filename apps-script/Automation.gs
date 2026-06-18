/**
 * ORIGIN40 — Automation (installable + simple triggers).
 *
 * What it automates:
 *   1. Applicants: when scores complete and "Manual override?" ≠ Yes, copy the
 *      Suggested Status into Status automatically.
 *   2. Stamps a timestamp on new Applicant rows + auto-generates App IDs.
 *   3. Auto-generates Ticket IDs on the Support Desk.
 *
 * Manual override is always respected: set "Manual override?" = Yes on any
 * Applicant row and the engine will never touch that row's Status again.
 *
 * Install the onEdit trigger once via the Origin40 menu > "⚙️ Install automation".
 */

function installTriggers_() {
  // Remove existing to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'origin40OnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('origin40OnEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit().create();
  SpreadsheetApp.getActive().toast('Automation installed.', 'Origin40', 4);
}

function origin40OnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const name = sh.getName();

  if (name === '01 · Applicants') handleApplicantEdit_(sh, e);
  if (name === '08 · Support Desk') handleTicketEdit_(sh, e);
}

function handleApplicantEdit_(sh, e) {
  const row = e.range.getRow();
  if (row < 2) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idC = headers.indexOf('App ID') + 1;
  const tsC = headers.indexOf('Timestamp') + 1;
  const nameC = headers.indexOf('Full Name') + 1;
  const suggestedC = headers.indexOf('Suggested Status') + 1;
  const statusC = headers.indexOf('Status') + 1;
  const overrideC = headers.indexOf('Manual override?') + 1;

  // Auto App ID + timestamp when a name first appears
  if (nameC && sh.getRange(row, nameC).getValue() !== '') {
    if (idC && sh.getRange(row, idC).getValue() === '') {
      sh.getRange(row, idC).setValue('O40-' + Utilities.formatString('%03d', row - 1));
    }
    if (tsC && sh.getRange(row, tsC).getValue() === '') {
      sh.getRange(row, tsC).setValue(new Date());
    }
  }

  // Auto-status from suggestion unless overridden
  if (suggestedC && statusC && overrideC) {
    const override = String(sh.getRange(row, overrideC).getValue()).trim();
    const suggested = sh.getRange(row, suggestedC).getValue();
    const current = sh.getRange(row, statusC).getValue();
    if (override !== 'Yes' && suggested !== '' && current === '') {
      sh.getRange(row, statusC).setValue(suggested);
    }
  }
}

function handleTicketEdit_(sh, e) {
  const row = e.range.getRow();
  if (row < 2) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idC = headers.indexOf('Ticket ID') + 1;
  const dateC = headers.indexOf('Date') + 1;
  const founderC = headers.indexOf('Founder') + 1;
  if (founderC && sh.getRange(row, founderC).getValue() !== '') {
    if (idC && sh.getRange(row, idC).getValue() === '') {
      sh.getRange(row, idC).setValue('T-' + Utilities.formatString('%03d', row - 1));
    }
    if (dateC && sh.getRange(row, dateC).getValue() === '') {
      sh.getRange(row, dateC).setValue(new Date());
    }
  }
}

/**
 * Batch helper: apply Suggested Status to ALL applicants without overrides.
 * Run from the menu after a bulk import/scoring session.
 */
function applySuggestedStatuses() {
  const sh = SpreadsheetApp.getActive().getSheetByName('01 · Applicants');
  const last = sh.getLastRow();
  if (last < 2) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const sC = headers.indexOf('Suggested Status');
  const stC = headers.indexOf('Status');
  const ovC = headers.indexOf('Manual override?');
  const data = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  let n = 0;
  data.forEach(function (r, i) {
    if (String(r[ovC]).trim() !== 'Yes' && r[sC] !== '') {
      sh.getRange(i + 2, stC + 1).setValue(r[sC]);
      n++;
    }
  });
  SpreadsheetApp.getActive().toast('Applied suggested status to ' + n + ' applicants.', 'Origin40', 5);
}
