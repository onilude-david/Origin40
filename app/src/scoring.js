/**
 * Origin40 scoring engine — mirrors the Apps Script / Sheets logic so the
 * web app and the spreadsheet stay consistent.
 */

const FRAMEWORK = [
  { key: 'problem', label: 'Problem clarity', max: 20 },
  { key: 'founder', label: 'Founder seriousness', max: 20 },
  { key: 'product', label: 'Product potential', max: 20 },
  { key: 'market', label: 'Market relevance', max: 15 },
  { key: 'build', label: 'Build readiness', max: 15 },
  { key: 'availability', label: 'Availability', max: 10 }
];

const APPLICANT_STATUSES = ['Submitted', 'Under Review', 'Shortlisted', 'Selected', 'Waitlisted', 'Rejected'];
const MENTOR_ROLES = ['Guest Masterclass', 'Product', 'Technical', 'Business', 'Growth', 'Pitch', 'Design/UX', 'Fundraising', 'Legal/Operations'];
const MENTOR_STATUSES = ['Invited', 'Confirmed', 'Onboarded', 'Matched', 'Active', 'Declined'];
const FACILITATOR_STATUSES = ['Invited', 'Confirmed', 'Scheduled', 'Delivered', 'Declined'];
const SPONSOR_TIERS = ['Legacy Partner', 'Build Partner', 'Demo Day Partner', 'Opportunity Partner', 'Media Partner'];
const PARTNER_STAGES = ['Identified', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiating', 'Committed', 'Declined'];
const FOUNDER_STATUSES = ['Active', 'On Track', 'At Risk', 'Completed', 'Withdrawn'];

function textHasYes(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  return /\b(yes|agree|agreed|i agree|consent|available|can attend|confirmed|true)\b/.test(s);
}

function textHasNo(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  return /\b(no|not available|cannot|can't|unable|false)\b/.test(s);
}

function rawFind(a, patterns) {
  const raw = a && a.raw || {};
  const keys = Object.keys(raw);
  for (let i = 0; i < patterns.length; i++) {
    const re = patterns[i];
    const key = keys.find(function (k) { return re.test(String(k).toLowerCase()); });
    if (key && String(raw[key] || '').trim()) return String(raw[key]).trim();
  }
  return '';
}

function admissionCheck(id, label, pass, severity, detail) {
  return { id: id, label: label, pass: !!pass, severity: severity || 'required', detail: detail || '' };
}

function hasAnyScore(scores) {
  if (!scores) return false;
  return FRAMEWORK.some(function (f) { return scores[f.key] !== undefined && scores[f.key] !== null && scores[f.key] !== ''; });
}

function computeTotal(scores) {
  return FRAMEWORK.reduce(function (sum, f) {
    const v = Number(scores && scores[f.key]);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
}

function recommendation(total) {
  if (total >= 80) return 'Strong Yes';
  if (total >= 70) return 'Yes';
  if (total >= 55) return 'Maybe';
  if (total >= 40) return 'No';
  return 'Strong No';
}

function suggestedStatus(total, scored) {
  if (!scored) return 'Submitted';
  if (total >= 75) return 'Shortlisted';
  if (total >= 55) return 'Under Review';
  return 'Rejected';
}

function admissionsAssessment(a) {
  a = a || {};
  const raw = a.raw || {};
  const contactOk = !!(String(a.email || '').trim() || String(a.phone || '').trim());
  const profileOk = !!(String(a.name || '').trim() && contactOk && String(a.country || '').trim());
  const ideaOk = !!(String(a.startup || '').trim() || String(a.pitch || '').trim());
  const problemText = rawFind(a, [/problem/, /why does it matter/, /solving/]);
  const builderText = rawFind(a, [/who will build/, /drive the build/, /builder/]);
  const laptopText = rawFind(a, [/laptop/, /internet/]);
  const liveText = rawFind(a, [/monday.*friday/, /live online/, /attend live/]);
  const hoursText = rawFind(a, [/10.*15/, /hours weekly/, /commit/]);
  const discordText = rawFind(a, [/discord/]);
  const consentText = rawFind(a, [/data.*consent/, /application review consent/]);
  const accuracyText = rawFind(a, [/accuracy/, /true.*accurate/]);
  const legalConcern = rawFind(a, [/legal/, /compliance/, /ip/, /data/]);

  const checks = [
    admissionCheck('contact', 'Reachable applicant', profileOk, 'required', contactOk ? 'Contact captured.' : 'Missing email/phone.'),
    admissionCheck('idea', 'Clear startup or idea', ideaOk, 'required', ideaOk ? 'Startup/idea signal captured.' : 'Missing startup name and pitch.'),
    admissionCheck('problem', 'Problem clarity signal', !!problemText || (Number(a.scores && a.scores.problem) >= 10), 'important', problemText ? 'Problem answer present.' : 'Needs stronger problem evidence.'),
    admissionCheck('builder', 'Build ownership', !!builderText || (Number(a.scores && a.scores.build) >= 8), 'important', builderText ? 'Build owner answer present.' : 'Needs build owner or build readiness signal.'),
    admissionCheck('tools', 'Laptop/internet readiness', laptopText ? !textHasNo(laptopText) : true, 'required', laptopText || 'No negative signal captured.'),
    admissionCheck('availability', 'Monday/Friday live availability', liveText ? !textHasNo(liveText) : true, 'required', liveText || 'No negative signal captured.'),
    admissionCheck('weekly-hours', '10-15 hour weekly commitment', hoursText ? !textHasNo(hoursText) : true, 'important', hoursText || 'No negative signal captured.'),
    admissionCheck('discord', 'Discord communication readiness', discordText ? !textHasNo(discordText) : true, 'important', discordText || 'No negative signal captured.'),
    admissionCheck('consent', 'Review/data consent', consentText ? textHasYes(consentText) && !textHasNo(consentText) : true, 'required', consentText || 'No negative signal captured.'),
    admissionCheck('accuracy', 'Accuracy confirmation', accuracyText ? textHasYes(accuracyText) && !textHasNo(accuracyText) : true, 'required', accuracyText || 'No negative signal captured.')
  ];

  const requiredFailed = checks.filter(function (c) { return c.severity === 'required' && !c.pass; });
  const importantFailed = checks.filter(function (c) { return c.severity === 'important' && !c.pass; });
  const total = Number(a.total) || 0;
  const scored = hasAnyScore(a.scores);
  let recommendedMove = 'Needs Review';
  let reason = 'Score and checks need reviewer judgment.';

  if (requiredFailed.length) {
    recommendedMove = 'Reject / Fix Required';
    reason = 'Required admissions checks failed: ' + requiredFailed.map(function (c) { return c.label; }).join(', ');
  } else if (scored && total >= 80 && importantFailed.length <= 1) {
    recommendedMove = 'Select';
    reason = 'Strong score and admissions checks are mostly clear.';
  } else if ((scored && total >= 70) || (!scored && checks.filter(function (c) { return c.pass; }).length >= 8)) {
    recommendedMove = 'Shortlist';
    reason = 'Good founder/program fit; ready for deeper review.';
  } else if (scored && total < 45) {
    recommendedMove = 'Reject';
    reason = 'Score is below the minimum quality bar.';
  } else if (importantFailed.length >= 3) {
    recommendedMove = 'Hold / Clarify';
    reason = 'Multiple important checks need clarification.';
  }

  return {
    checks: checks,
    passed: checks.filter(function (c) { return c.pass; }).length,
    failed: checks.filter(function (c) { return !c.pass; }).length,
    requiredFailed: requiredFailed.length,
    importantFailed: importantFailed.length,
    recommendedMove: recommendedMove,
    reason: reason,
    legalFlag: !!legalConcern && !/^no\b|none|n\/a|not applicable/i.test(legalConcern),
    legalNote: legalConcern
  };
}

/** Recompute derived fields on an applicant, respecting manual override. */
function scoreApplicant(a) {
  const scored = hasAnyScore(a.scores);
  a.total = computeTotal(a.scores);
  a.recommendation = scored ? recommendation(a.total) : '';
  a.suggestedStatus = suggestedStatus(a.total, scored);
  a.admissions = admissionsAssessment(a);
  if (!a.manualOverride) {
    a.status = a.suggestedStatus;
  }
  return a;
}

module.exports = {
  FRAMEWORK, APPLICANT_STATUSES, MENTOR_ROLES, MENTOR_STATUSES,
  FACILITATOR_STATUSES, SPONSOR_TIERS, PARTNER_STAGES, FOUNDER_STATUSES,
  hasAnyScore, computeTotal, recommendation, suggestedStatus, admissionsAssessment, scoreApplicant
};
