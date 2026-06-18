/**
 * ORIGIN40 — Menu + entry points.
 * Adds the "Origin40" menu to the Sheet on open.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Origin40')
    .addItem('🧭 Open Control Center', 'openControlCenter')
    .addSeparator()
    .addItem('🚀 Build / Rebuild Workbook', 'menuBuild_')
    .addItem('📊 Build / Refresh Dashboard', 'menuDashboard_')
    .addItem('♻️  Reset (wipe data) & Rebuild', 'menuReset_')
    .addSeparator()
    .addItem('⚙️  Install automation (onEdit)', 'installTriggers_')
    .addItem('✅ Apply suggested statuses (bulk)', 'applySuggestedStatuses')
    .addSeparator()
    .addItem('ℹ️  About Origin40', 'menuAbout_')
    .addToUi();
}

function menuBuild_() {
  buildWorkbook_(false);
}

function menuDashboard_() {
  buildDashboard_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getActive().getSheetByName('00 · Dashboard').activate();
}

function menuReset_() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Reset Origin40 workbook',
    'This wipes data in all Origin40 tabs and rebuilds them. Continue?',
    ui.ButtonSet.YES_NO);
  if (r === ui.Button.YES) buildWorkbook_(true);
}

function menuAbout_() {
  SpreadsheetApp.getUi().alert(
    ORIGIN40.name,
    ORIGIN40.tagline + '\n' + ORIGIN40.campaign +
    '\n\nWhere Africa’s Next Tech Founders Build.' +
    '\nLaunched in honor of David Oke Opeyemi at 40.' +
    '\n\nPowered by Beere Softwares · Partner: Equip Africa Initiative' +
    '\nSupported by Dooke Innovation Center and Anfani.' +
    '\n\nThis workbook is the back-office engine. The public site, registration ' +
    '(Fluent Forms), founder portal, LMS and Demo Day page live in WordPress.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
