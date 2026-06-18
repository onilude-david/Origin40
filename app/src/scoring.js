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

/** Recompute derived fields on an applicant, respecting manual override. */
function scoreApplicant(a) {
  const scored = hasAnyScore(a.scores);
  a.total = computeTotal(a.scores);
  a.recommendation = scored ? recommendation(a.total) : '';
  a.suggestedStatus = suggestedStatus(a.total, scored);
  if (!a.manualOverride) {
    a.status = a.suggestedStatus;
  }
  return a;
}

module.exports = {
  FRAMEWORK, APPLICANT_STATUSES, MENTOR_ROLES, MENTOR_STATUSES,
  FACILITATOR_STATUSES, SPONSOR_TIERS, PARTNER_STAGES, FOUNDER_STATUSES,
  hasAnyScore, computeTotal, recommendation, suggestedStatus, scoreApplicant
};
