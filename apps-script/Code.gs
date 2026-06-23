/**
 * ORIGIN40 — Back-Office Engine
 * Build the Product. Launch the Venture.  |  4 Weeks. 40 Founders. Real Products.
 *
 * One-click builder for the entire Google Sheets operations workbook.
 *
 * HOW TO DEPLOY
 *   1. Create a new blank Google Sheet (sheets.new).
 *   2. Extensions > Apps Script.
 *   3. Create files Code.gs, Scoring.gs, Automation.gs, Menu.gs and paste each.
 *   4. Save. Reload the Sheet. Use the new "Origin40" menu > "🚀 Build / Rebuild Workbook".
 *   5. Re-running is safe: it rebuilds structure without deleting your typed data
 *      unless you choose "Reset (wipe data)".
 *
 * DESIGN NOTES
 *   - Every tab is defined declaratively in SHEET_SPECS so the team can read,
 *     extend, or audit the whole system in one place.
 *   - Formula columns are written as ARRAYFORMULA where possible so new rows
 *     auto-fill. A "Manual override?" column lets the team override any computed
 *     field (the automation respects it — see Automation.gs).
 *   - Dropdown lists live on the _Lists tab. Edit there to change options globally.
 */

// ---------------------------------------------------------------------------
// BRAND + GLOBAL CONFIG
// ---------------------------------------------------------------------------
const ORIGIN40 = {
  name: 'Origin40',
  tagline: 'Build the Product. Launch the Venture.',
  campaign: '4 Weeks. 40 Founders. Real Products.',
  colors: {
    ink: '#0B132B',      // headers
    accent: '#1C7C54',   // Origin green
    accentSoft: '#E8F3EE',
    warn: '#C1440E',     // rejected / at-risk
    good: '#1C7C54',
    soft: '#F4F6F8',
    line: '#D7DCE1'
  }
};

// Central reference lists — edit here, they populate the _Lists tab + dropdowns.
const LISTS = {
  ApplicantStatus: ['Submitted', 'Under Review', 'Shortlisted', 'Selected', 'Waitlisted', 'Rejected'],
  Recommendation: ['Strong Yes', 'Yes', 'Maybe', 'No', 'Strong No'],
  ReadinessCategory: ['Ready to Build', 'Needs Refinement', 'Too Early', 'Not a Fit'],
  FounderStatus: ['Active', 'At Risk', 'On Track', 'Completed', 'Withdrawn'],
  Week: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  AttendanceStatus: ['Present', 'Late', 'Absent', 'Excused'],
  SubmissionStatus: ['Not Started', 'In Progress', 'Submitted', 'Reviewed', 'Needs Rework', 'Late'],
  YesNo: ['Yes', 'No'],
  Priority: ['Low', 'Medium', 'High', 'Critical'],
  TicketStatus: ['Open', 'In Progress', 'Waiting on Founder', 'Resolved', 'Closed'],
  MarketingPhase: [
    'Pre-launch Awareness', 'Application Announcement', 'Founder Recruitment',
    'Mentor Recruitment', 'Partner/Sponsor Campaign', 'Deadline Push',
    'Selected Founders Announcement', 'Weekly Updates', 'Demo Day Campaign',
    'Post-program Storytelling'
  ],
  Channel: ['Instagram', 'LinkedIn', 'X/Twitter', 'Discord', 'WhatsApp', 'Email', 'Facebook', 'TikTok', 'YouTube', 'Website', 'Press'],
  ContentStatus: ['Idea', 'Drafting', 'Designed', 'Scheduled', 'Published'],
  MentorRole: ['Product', 'Technical', 'Business', 'Growth', 'Pitch', 'Design/UX', 'Fundraising', 'Legal/Operations', 'Finance', 'Law', 'Operations'],
  GuestTrack: ['Business', 'Law/Compliance', 'Finance', 'Tech/Product', 'Product/UX', 'Growth/Sales', 'Pitch/Funding', 'Operations'],
  SessionStatus: ['Planned', 'Invited', 'Confirmed', 'Delivered', 'Follow-up Needed', 'Cancelled'],
  MentorStatus: ['Invited', 'Confirmed', 'Onboarded', 'Matched', 'Active', 'Declined'],
  SponsorTier: ['Legacy Partner', 'Build Partner', 'Demo Day Partner', 'Opportunity Partner', 'Media Partner'],
  PartnerStage: ['Identified', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiating', 'Committed', 'Declined'],
  FunderReadiness: ['Not Ready', 'Almost Ready', 'Ready for Warm Introduction', 'Demo Day Priority'],
  FollowUpStage: ['Day 30', 'Day 60', 'Day 90'],
  RiskStatus: ['Open', 'Mitigating', 'Monitored', 'Closed'],
  Likelihood: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'],
  Impact: ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'],
  Done: ['Not Started', 'In Progress', 'Done', 'Blocked'],
  FacilitatorStatus: ['Invited', 'Confirmed', 'Scheduled', 'Delivered', 'Declined']
};

/**
 * Declarative definition of every sheet/tab.
 * fields: [header, type]   type ∈ text|num|date|money|pct|formula|list:<ListKey>|check
 * For formula columns, supply `formulas: { 'Header': 'ARRAYFORMULA(...)' }` keyed by header.
 */
const SHEET_SPECS = [
  // NOTE: the "00 · Dashboard" tab is built separately by Dashboard.gs (KPI tiles +
  // charts + alerts), so it is intentionally not a declarative spec here.

  // ---- 1. APPLICATION MANAGEMENT ----------------------------------------
  {
    name: '01 · Applicants',
    group: 'Application Management',
    intro: 'Master applicant database. Paste exported Fluent Forms / WordPress rows into A:H. Scores + status auto-compute.',
    fields: [
      ['App ID', 'text'], ['Timestamp', 'date'], ['Full Name', 'text'], ['Email', 'text'],
      ['Phone/WhatsApp', 'text'], ['Country', 'text'], ['Startup/Idea Name', 'text'],
      ['One-line Pitch', 'text'],
      // scoring inputs (reviewer fills 0–max)
      ['Problem Clarity /20', 'num'], ['Founder Seriousness /20', 'num'], ['Product Potential /20', 'num'],
      ['Market Relevance /15', 'num'], ['Build Readiness /15', 'num'], ['Availability /10', 'num'],
      ['Total Score /100', 'formula'], ['Auto Recommendation', 'formula'], ['Suggested Status', 'formula'],
      ['Status', 'list:ApplicantStatus'], ['Manual override?', 'list:YesNo'],
      ['Reviewer', 'text'], ['Reviewer Notes', 'text']
    ],
    formulas: {
      'Total Score /100': '=ARRAYFORMULA(IF(ROW(I2:I)=ROW(I2),"Total Score /100",IF(I2:I="","",N(I2:I)+N(J2:J)+N(K2:K)+N(L2:L)+N(M2:M)+N(N2:N))))',
      'Auto Recommendation': '=ARRAYFORMULA(IF(ROW(O2:O)=ROW(O2),"Auto Recommendation",IF(O2:O="","",IFS(O2:O>=80,"Strong Yes",O2:O>=70,"Yes",O2:O>=55,"Maybe",O2:O>=40,"No",TRUE,"Strong No"))))',
      'Suggested Status': '=ARRAYFORMULA(IF(ROW(P2:P)=ROW(P2),"Suggested Status",IF(O2:O="","",IFS(O2:O>=75,"Shortlisted",O2:O>=55,"Under Review",TRUE,"Rejected"))))'
    },
    note: { 'Status': 'Use Suggested Status as default; set "Manual override?"=Yes before changing manually so automation leaves it alone.' }
  },
  {
    name: '02 · Shortlist',
    group: 'Application Management',
    intro: 'Auto-pulls every Shortlisted applicant from tab 01. Read-only view for the selection committee.',
    headers: ['App ID', 'Name', 'Startup', 'Total Score', 'Recommendation', 'Country', 'Committee Vote', 'Final Decision'],
    queryInto: { col: 'A', formula: '=QUERY(\'01 · Applicants\'!A2:R, "select A, C, G, O, P, F where R = \'Shortlisted\' order by O desc", 0)' },
    extraHeaders: ['Committee Vote', 'Final Decision']
  },
  {
    name: '03 · Selection',
    group: 'Application Management',
    intro: 'The final 40. Pull Selected applicants here; track onboarding of confirmed founders.',
    headers: ['App ID', 'Name', 'Startup', 'Total Score', 'Country', 'Email', 'Phone', 'Agreement Signed?', 'Onboarded?', 'Cohort Seat #'],
    queryInto: { col: 'A', formula: '=QUERY(\'01 · Applicants\'!A2:R, "select A, C, G, O, F, D, E where R = \'Selected\' order by O desc", 0)' },
    extraHeaders: ['Agreement Signed?', 'Onboarded?', 'Cohort Seat #']
  },

  // ---- 2. FOUNDER OPERATIONS --------------------------------------------
  {
    name: '04 · Founder Readiness',
    group: 'Founder Operations',
    intro: 'Readiness assessment scored at intake. Category auto-assigns from the readiness score.',
    fields: [
      ['App ID', 'text'], ['Founder', 'text'], ['Startup', 'text'],
      ['Problem Understanding /5', 'num'], ['Solution Clarity /5', 'num'], ['Commitment /5', 'num'],
      ['Time Availability /5', 'num'], ['Coachability /5', 'num'],
      ['Readiness Score /25', 'formula'], ['Readiness Category', 'formula'], ['Assessor Notes', 'text']
    ],
    formulas: {
      'Readiness Score /25': '=ARRAYFORMULA(IF(ROW(I2:I)=ROW(I2),"Readiness Score /25",IF(D2:D="","",N(D2:D)+N(E2:E)+N(F2:F)+N(G2:G)+N(H2:H))))',
      'Readiness Category': '=ARRAYFORMULA(IF(ROW(J2:J)=ROW(J2),"Readiness Category",IF(I2:I="","",IFS(I2:I>=20,"Ready to Build",I2:I>=14,"Needs Refinement",I2:I>=8,"Too Early",TRUE,"Not a Fit"))))'
    }
  },
  {
    name: '05 · Progress Tracker',
    group: 'Founder Operations',
    intro: 'One row per founder. % complete blends attendance, submissions, and milestones.',
    fields: [
      ['App ID', 'text'], ['Founder', 'text'], ['Startup', 'text'], ['Mentor', 'text'],
      ['Founder Status', 'list:FounderStatus'],
      ['Wk1 Milestone', 'list:Done'], ['Wk2 Milestone', 'list:Done'], ['Wk3 Milestone', 'list:Done'], ['Wk4 Milestone', 'list:Done'],
      ['Attendance %', 'formula'], ['Submissions Done', 'formula'], ['% Complete', 'formula'], ['Completion Eligible?', 'formula'], ['Notes', 'text']
    ],
    formulas: {
      'Attendance %': '=ARRAYFORMULA(IF(ROW(J2:J)=ROW(J2),"Attendance %",IF(A2:A="","",IFERROR(VLOOKUP(A2:A,\'06 · Attendance\'!A:H,8,FALSE),0))))',
      'Submissions Done': '=ARRAYFORMULA(IF(ROW(K2:K)=ROW(K2),"Submissions Done",IF(A2:A="","",COUNTIFS(\'07 · Submissions\'!A:A,A2:A,\'07 · Submissions\'!F:F,"Reviewed"))))',
      '% Complete': '=ARRAYFORMULA(IF(ROW(L2:L)=ROW(L2),"% Complete",IF(A2:A="","",( (COUNTIF(F2:I2,"Done")/4)*0.5 + N(J2:J)*0.25 + MIN(N(K2:K)/8,1)*0.25 ))))',
      'Completion Eligible?': '=ARRAYFORMULA(IF(ROW(M2:M)=ROW(M2),"Completion Eligible?",IF(A2:A="","",IF(AND(L2:L>=0.75,J2:J>=0.7),"Yes","No"))))'
    }
  },
  {
    name: '06 · Attendance',
    group: 'Founder Operations',
    intro: 'Mark each session. Attendance % auto-rolls into the Progress Tracker.',
    fields: [
      ['App ID', 'text'], ['Founder', 'text'],
      ['Wk1', 'list:AttendanceStatus'], ['Wk2', 'list:AttendanceStatus'],
      ['Wk3', 'list:AttendanceStatus'], ['Wk4', 'list:AttendanceStatus'],
      ['Demo Day', 'list:AttendanceStatus'], ['Attendance %', 'formula']
    ],
    formulas: {
      'Attendance %': '=ARRAYFORMULA(IF(ROW(H2:H)=ROW(H2),"Attendance %",IF(A2:A="","",(COUNTIF(C2:G2,"Present")+COUNTIF(C2:G2,"Late")*0.5)/5)))'
    }
  },
  {
    name: '07 · Submissions',
    group: 'Founder Operations',
    intro: 'One row per founder per assignment. Links to mentor feedback in tab 13.',
    fields: [
      ['App ID', 'text'], ['Founder', 'text'], ['Week', 'list:Week'], ['Assignment', 'text'],
      ['Link/File', 'text'], ['Status', 'list:SubmissionStatus'], ['Submitted On', 'date'],
      ['Reviewer', 'text'], ['Score /10', 'num'], ['Feedback', 'text'], ['Days Late', 'formula']
    ],
    formulas: {
      'Days Late': '=ARRAYFORMULA(IF(ROW(K2:K)=ROW(K2),"Days Late",IF(G2:G="","",MAX(0,G2:G-VLOOKUP(C2:C,\'_Deadlines\'!A:B,2,FALSE)))))'
    }
  },
  {
    name: '08 · Support Desk',
    group: 'Founder Operations',
    intro: 'Founder support tickets. Aging auto-calculates so nothing goes stale.',
    fields: [
      ['Ticket ID', 'text'], ['Date', 'date'], ['Founder', 'text'], ['Category', 'text'],
      ['Issue', 'text'], ['Priority', 'list:Priority'], ['Status', 'list:TicketStatus'],
      ['Owner', 'text'], ['Resolution', 'text'], ['Age (days)', 'formula']
    ],
    formulas: {
      'Age (days)': '=ARRAYFORMULA(IF(ROW(J2:J)=ROW(J2),"Age (days)",IF(B2:B="","",IF(G2:G="Resolved","-",IF(G2:G="Closed","-",TODAY()-B2:B)))))'
    }
  },

  // ---- 3. LMS / CURRICULUM ----------------------------------------------
  {
    name: '09 · Curriculum Map',
    group: 'Curriculum',
    intro: 'Mirror of the 4-week curriculum (full copy-ready text lives in /curriculum). Use to track build status of each lesson in WordPress LMS.',
    headers: ['Week', 'Module', 'Lesson', 'Learning Objective', 'Assignment', 'Worksheet/Template', 'Mentor Rubric', 'LMS Built?'],
    seedFromCurriculum: true
  },

  // ---- 4. MARKETING ------------------------------------------------------
  {
    name: '10 · Content Calendar',
    group: 'Marketing',
    intro: 'Editorial calendar across all channels and the 10 campaign phases.',
    fields: [
      ['Date', 'date'], ['Phase', 'list:MarketingPhase'], ['Channel', 'list:Channel'],
      ['Format', 'text'], ['Hook/Title', 'text'], ['Caption/Copy', 'text'],
      ['CTA', 'text'], ['Asset Link', 'text'], ['Owner', 'text'],
      ['Status', 'list:ContentStatus'], ['Published Link', 'text'],
      ['Reach', 'num'], ['Engagements', 'num'], ['Clicks/Applies', 'num']
    ]
  },
  {
    name: '10b · Marketing Dashboard',
    group: 'Marketing',
    intro: 'Campaign metrics roll-up by phase and channel.',
    headers: ['Metric', 'Value'],
    seed: [
      ['Total Posts Published', '=COUNTIF(\'10 · Content Calendar\'!J2:J,"Published")'],
      ['Total Reach', '=SUM(\'10 · Content Calendar\'!L2:L)'],
      ['Total Engagements', '=SUM(\'10 · Content Calendar\'!M2:M)'],
      ['Total Clicks/Applies', '=SUM(\'10 · Content Calendar\'!N2:N)'],
      ['Avg Engagement Rate', '=IFERROR(SUM(\'10 · Content Calendar\'!M2:M)/SUM(\'10 · Content Calendar\'!L2:L),0)'],
      ['Applications (target 300+)', '=COUNTA(\'01 · Applicants\'!A2:A)'],
      ['Cost per Application', '=IFERROR(\'20 · Budget\'!E2/COUNTA(\'01 · Applicants\'!A2:A),0)']
    ]
  },

  // ---- 5. MENTOR SYSTEM --------------------------------------------------
  {
    name: '11 · Mentor Directory',
    group: 'Mentor',
    intro: 'All mentors, their expertise, and onboarding status.',
    fields: [
      ['Mentor ID', 'text'], ['Name', 'text'], ['Email', 'text'], ['Org/Title', 'text'],
      ['Role', 'list:MentorRole'], ['Status', 'list:MentorStatus'], ['Capacity (founders)', 'num'],
      ['Assigned Count', 'formula'], ['Availability', 'text'], ['Notes', 'text']
    ],
    formulas: {
      'Assigned Count': '=ARRAYFORMULA(IF(ROW(H2:H)=ROW(H2),"Assigned Count",IF(A2:A="","",COUNTIF(\'12 · Mentor Matching\'!C:C,B2:B))))'
    }
  },
  {
    name: '12 · Mentor Matching',
    group: 'Mentor',
    intro: 'Match founders to mentors. Flags over-capacity automatically.',
    fields: [
      ['App ID', 'text'], ['Founder', 'text'], ['Mentor', 'text'], ['Mentor Role', 'text'],
      ['Match Reason', 'text'], ['Sessions Held', 'num'], ['Capacity Flag', 'formula']
    ],
    formulas: {
      'Capacity Flag': '=ARRAYFORMULA(IF(ROW(G2:G)=ROW(G2),"Capacity Flag",IF(C2:C="","",IF(COUNTIF(C:C,C2:C)>IFERROR(VLOOKUP(C2:C,\'11 · Mentor Directory\'!B:G,6,FALSE),99),"OVER CAPACITY","OK"))))'
    }
  },
  {
    name: '13 · Mentor Feedback',
    group: 'Mentor',
    intro: 'Structured mentor feedback per founder per week.',
    fields: [
      ['Date', 'date'], ['Mentor', 'text'], ['Founder', 'text'], ['Week', 'list:Week'],
      ['Progress /5', 'num'], ['Blocker(s)', 'text'], ['Strengths', 'text'],
      ['Next Steps', 'text'], ['Escalate?', 'list:YesNo']
    ]
  },
  {
    name: '13b · Guest Sessions',
    group: 'Mentor',
    intro: 'Special guest mentor masterclasses and clinics across business, law, finance, tech, growth, and pitch.',
    fields: [
      ['Session ID', 'text'], ['Week', 'list:Week'], ['Date', 'date'], ['Guest Mentor', 'text'],
      ['Track', 'list:GuestTrack'], ['Session Title', 'text'], ['Duration (hrs)', 'num'],
      ['Status', 'list:SessionStatus'], ['Founder Output', 'text'], ['Follow-up Founders', 'text'],
      ['Feedback Score /5', 'num'], ['Media Consent?', 'list:YesNo'], ['Notes', 'text']
    ],
    seed: [
      ['GS-001', 'Week 1', '', '', 'Business', 'Founder-Market Fit & Customer Discovery', 2, 'Planned', 'Problem statement + interview script', '', '', '', ''],
      ['GS-002', 'Week 1', '', '', 'Law/Compliance', 'Interview Consent, Privacy & Ethical Data Capture', 1, 'Planned', 'Consent note + data checklist', '', '', '', ''],
      ['GS-003', 'Week 2', '', '', 'Tech/Product', 'MVP Architecture & Rapid Prototyping', 2, 'Planned', 'MVP scope + stack decision', '', '', '', ''],
      ['GS-004', 'Week 2', '', '', 'Finance', 'Pricing Hypothesis, Build Cost & Unit Economics', 1, 'Planned', 'Pricing/cost note', '', '', '', ''],
      ['GS-005', 'Week 3', '', '', 'Growth/Sales', 'Validation, Traction & Sales Discovery', 2, 'Planned', 'Traction metric + growth experiment', '', '', '', ''],
      ['GS-006', 'Week 3', '', '', 'Law/Compliance', 'User Testing Consent & Data Handling', 1, 'Planned', 'User test consent note', '', '', '', ''],
      ['GS-007', 'Week 4', '', '', 'Pitch/Funding', 'Pitch, Fundraising Readiness & Storytelling', 2, 'Planned', 'Pitch story + ask slide', '', '', '', ''],
      ['GS-008', 'Week 4', '', '', 'Finance', 'Budget, Runway, Use of Funds & Funder Readiness', 1, 'Planned', '30/90-day budget + ask', '', '', '', ''],
      ['GS-009', 'Week 4', '', '', 'Law/Compliance', 'Legal Readiness Before Demo Day', 1, 'Planned', 'Legal readiness checklist', '', '', '', '']
    ]
  },

  // ---- 6. PARTNER / SPONSOR ---------------------------------------------
  {
    name: '14 · Partner Pipeline',
    group: 'Partner/Sponsor',
    intro: 'Sponsor & partner CRM. Track value, tier, and stage to close.',
    fields: [
      ['Org', 'text'], ['Contact', 'text'], ['Email', 'text'], ['Tier', 'list:SponsorTier'],
      ['Value (₦/$)', 'money'], ['Type (Cash/In-kind)', 'text'], ['Stage', 'list:PartnerStage'],
      ['Owner', 'text'], ['Last Touch', 'date'], ['Next Action', 'text'], ['Days Since Touch', 'formula']
    ],
    formulas: {
      'Days Since Touch': '=ARRAYFORMULA(IF(ROW(K2:K)=ROW(K2),"Days Since Touch",IF(I2:I="","",TODAY()-I2:I)))'
    }
  },
  {
    name: '15 · Sponsor Tiers',
    group: 'Partner/Sponsor',
    intro: 'Reference: tiers and benefits. Mirror of /partners/sponsor-tiers.md.',
    headers: ['Tier', 'Indicative Value', 'Logo Placement', 'Demo Day Benefits', 'Speaking/Judging', 'Founder Access', 'Content & PR', 'Seats'],
    seed: [
      ['Legacy Partner', 'Title sponsor', 'Lockup beside Origin40 logo everywhere', 'Headline naming + keynote slot', 'Keynote + lead judge', 'First access to all 40 founders', 'Co-branded launch + impact report', '6'],
      ['Build Partner', 'Major', 'Primary logo on site, deck, banners', 'Branded session + award', 'Panel + judge', 'Curated founder shortlist', 'Featured case study', '4'],
      ['Demo Day Partner', 'Event-focused', 'Logo on Demo Day assets', 'Award sponsorship + booth', 'Judge', 'Demo Day networking', 'Demo Day recap feature', '3'],
      ['Opportunity Partner', 'Opportunity / in-kind', 'Logo on opportunities page', 'Offer prize/credits/pilot', 'Optional', 'Pipeline of relevant founders', 'Joint announcement', '2'],
      ['Media Partner', 'In-kind reach', 'Media partner logo', 'Media coverage of Demo Day', 'Optional', 'Founder stories access', 'Coverage + amplification', '2']
    ]
  },

  // ---- 7. DEMO DAY -------------------------------------------------------
  {
    name: '16 · Demo Day Plan',
    group: 'Demo Day',
    intro: 'Master planning tracker for Demo Day.',
    fields: [
      ['Workstream', 'text'], ['Task', 'text'], ['Owner', 'text'], ['Due', 'date'],
      ['Status', 'list:Done'], ['Priority', 'list:Priority'], ['Notes', 'text'], ['Days to Due', 'formula']
    ],
    formulas: {
      'Days to Due': '=ARRAYFORMULA(IF(ROW(H2:H)=ROW(H2),"Days to Due",IF(D2:D="","",IF(E2:E="Done","-",D2:D-TODAY()))))'
    },
    seed: [
      ['Livestream', 'Confirm livestream platform + tech setup', '', '', 'Not Started', 'High', '', ''],
      ['Judges', 'Confirm 5 judges', '', '', 'Not Started', 'High', '', ''],
      ['Founders', 'Pitch rehearsals x2', '', '', 'Not Started', 'High', '', ''],
      ['Investors', 'Send investor pack + invites', '', '', 'Not Started', 'Critical', '', ''],
      ['Media', 'Press + livestream', '', '', 'Not Started', 'Medium', '', ''],
      ['Awards', 'Certificates + awards printed', '', '', 'Not Started', 'Medium', '', '']
    ]
  },
  {
    name: '17 · Demo Day Schedule',
    group: 'Demo Day',
    intro: 'Run-of-show. 3-min pitch + 2-min Q&A per founder.',
    headers: ['Time', 'Segment', 'Owner/Founder', 'Duration (min)', 'Notes'],
    seed: [
      ['09:00', 'Doors + Networking', 'Ops', '30', ''],
      ['09:30', 'Welcome — Origin40 story (David Oke Opeyemi tribute)', 'Host', '15', ''],
      ['09:45', 'Partner remarks', 'Legacy Partner', '10', ''],
      ['09:55', 'Pitch Block A (founders 1–8)', 'Founders', '40', '5 min each'],
      ['10:35', 'Break', '', '10', ''],
      ['10:45', 'Pitch Block B (founders 9–16)', 'Founders', '40', ''],
      ['11:25', 'Judges deliberate / founder expo', 'Judges', '20', ''],
      ['11:45', 'Awards + certificates', 'Host', '20', ''],
      ['12:05', 'Closing + investor mingle', 'All', '25', '']
    ]
  },
  {
    name: '18 · Judge Scoring',
    group: 'Demo Day',
    intro: 'One row per judge per founder. Weighted total auto-computes; tab feeds the leaderboard.',
    fields: [
      ['Judge', 'text'], ['Founder', 'text'], ['Startup', 'text'],
      ['Problem Clarity /10', 'num'], ['Product Progress /10', 'num'], ['Market Opportunity /10', 'num'],
      ['Validation /10', 'num'], ['Business Model /10', 'num'], ['Founder Strength /10', 'num'],
      ['Pitch Quality /10', 'num'], ['Impact Potential /10', 'num'], ['Total /80', 'formula']
    ],
    formulas: {
      'Total /80': '=ARRAYFORMULA(IF(ROW(L2:L)=ROW(L2),"Total /80",IF(D2:D="","",N(D2:D)+N(E2:E)+N(F2:F)+N(G2:G)+N(H2:H)+N(I2:I)+N(J2:J)+N(K2:K))))'
    }
  },
  {
    name: '18b · Demo Day Leaderboard',
    group: 'Demo Day',
    intro: 'Average judge score per founder.',
    headers: ['Founder', 'Avg Score /80', 'Judges Scored'],
    queryInto: { col: 'A', formula: '=QUERY(\'18 · Judge Scoring\'!B2:L, "select B, avg(L), count(L) where B is not null group by B order by avg(L) desc label avg(L) \'Avg Score /80\', count(L) \'Judges Scored\'", 0)' }
  },

  // ---- 8. IMPACT / FUNDING / FOLLOW-UP ----------------------------------
  {
    name: '19 · Follow-Up Tracker',
    group: 'Impact',
    intro: '30/60/90-day post-program check-ins per founder.',
    fields: [
      ['Founder', 'text'], ['Startup', 'text'], ['Stage', 'list:FollowUpStage'],
      ['Due Date', 'date'], ['Done?', 'list:YesNo'], ['MVP Live?', 'list:YesNo'],
      ['Users/Customers', 'num'], ['Revenue', 'money'], ['Funding Raised', 'money'],
      ['Funder Readiness', 'list:FunderReadiness'], ['Notes', 'text']
    ]
  },
  {
    name: '19b · Alumni Tracker',
    group: 'Impact',
    intro: 'Long-term alumni outcomes and opportunity pipeline.',
    fields: [
      ['Founder', 'text'], ['Startup', 'text'], ['Sector', 'text'], ['Still Building?', 'list:YesNo'],
      ['Current Stage', 'text'], ['Opportunity', 'text'], ['Funder Readiness', 'list:FunderReadiness'],
      ['Warm Intro Made?', 'list:YesNo'], ['Outcome', 'text']
    ]
  },
  {
    name: '19c · Impact Dashboard',
    group: 'Impact',
    intro: 'Headline impact numbers for funders and the impact report.',
    headers: ['Impact Metric', 'Value'],
    seed: [
      ['Founders Started', '=COUNTIF(\'01 · Applicants\'!J2:J,"Selected")'],
      ['Founders Completed', '=COUNTIF(\'05 · Progress Tracker\'!M2:M,"Yes")'],
      ['Completion Rate', '=IFERROR(COUNTIF(\'05 · Progress Tracker\'!M2:M,"Yes")/COUNTIF(\'01 · Applicants\'!J2:J,"Selected"),0)'],
      ['MVPs Live (Day 90)', '=COUNTIFS(\'19 · Follow-Up Tracker\'!C2:C,"Day 90",\'19 · Follow-Up Tracker\'!F2:F,"Yes")'],
      ['Total Users Reached', '=SUM(\'19 · Follow-Up Tracker\'!G2:G)'],
      ['Total Revenue (alumni)', '=SUM(\'19 · Follow-Up Tracker\'!H2:H)'],
      ['Total Funding Raised', '=SUM(\'19 · Follow-Up Tracker\'!I2:I)'],
      ['Demo Day Priority Founders', '=COUNTIF(\'19 · Follow-Up Tracker\'!J2:J,"Demo Day Priority")']
    ]
  },

  // ---- 9. PROGRAM MANAGEMENT --------------------------------------------
  {
    name: '20 · Budget',
    group: 'Program Management',
    intro: 'Lean budget. Variance auto-computes. Keep it low-cost.',
    fields: [
      ['Category', 'text'], ['Item', 'text'], ['Budgeted', 'money'], ['Actual', 'money'],
      ['Variance', 'formula'], ['Funded By', 'text'], ['Notes', 'text']
    ],
    formulas: {
      'Variance': '=ARRAYFORMULA(IF(ROW(E2:E)=ROW(E2),"Variance",IF(A2:A="","",N(C2:C)-N(D2:D))))'
    },
    seed: [
      ['Platform', 'WordPress hosting + LMS plugin', '', '', '', '', 'Public site/LMS'],
      ['Tools', 'Google Workspace / Sheets', '', '', '', '', 'Back-office (this system)'],
      ['Marketing', 'Design + boosted posts', '', '', '', '', ''],
      ['Demo Day', 'Venue + AV + refreshments', '', '', '', '', ''],
      ['Awards', 'Certificates + prizes', '', '', '', '', ''],
      ['Contingency', '10% buffer', '', '', '', '', '']
    ]
  },
  {
    name: '21 · Risk Tracker',
    group: 'Program Management',
    intro: 'Risks with auto-scored severity (Likelihood × Impact).',
    fields: [
      ['Risk', 'text'], ['Category', 'text'], ['Likelihood', 'list:Likelihood'], ['Impact', 'list:Impact'],
      ['Severity', 'formula'], ['Mitigation', 'text'], ['Owner', 'text'], ['Status', 'list:RiskStatus']
    ],
    formulas: {
      'Severity': '=ARRAYFORMULA(IF(ROW(E2:E)=ROW(E2),"Severity",IF(A2:A="","",IFERROR(MATCH(C2:C,{"Rare";"Unlikely";"Possible";"Likely";"Almost Certain"},0)*MATCH(D2:D,{"Negligible";"Minor";"Moderate";"Major";"Severe"},0),""))))'
    },
    seed: [
      ['Low application volume', 'Marketing', 'Possible', 'Major', '', 'Extend deadline push; mentor/partner amplification', '', 'Open'],
      ['Founder drop-off mid-program', 'Operations', 'Likely', 'Moderate', '', 'Weekly check-ins; support desk; accountability pairs', '', 'Open'],
      ['Sponsor funding shortfall', 'Finance', 'Possible', 'Major', '', 'Tiered asks; in-kind partners; lean budget', '', 'Open'],
      ['Mentor unavailability', 'Mentor', 'Possible', 'Moderate', '', 'Over-recruit mentors; backup pool', '', 'Open'],
      ['WordPress/LMS downtime', 'Tech', 'Unlikely', 'Major', '', 'Backups; hosting SLA; offline materials', '', 'Open']
    ]
  },
  {
    name: '22 · Team & Checklists',
    group: 'Program Management',
    intro: 'Team roles + quality-control and brand-asset checklists in one place.',
    headers: ['Section', 'Item', 'Owner', 'Status', 'Notes'],
    seed: [
      ['Team', 'Program Lead (David Oke Opeyemi legacy lead)', '', 'Done', ''],
      ['Team', 'Operations Manager', '', 'Not Started', ''],
      ['Team', 'Marketing Lead', '', 'Not Started', ''],
      ['Team', 'Curriculum/LMS Lead', '', 'Not Started', ''],
      ['Team', 'Mentor Coordinator', '', 'Not Started', ''],
      ['Team', 'Partnerships Lead', '', 'Not Started', ''],
      ['QC', 'All sheets have data validation + owners', '', 'Not Started', ''],
      ['QC', 'WordPress registration tested end-to-end', '', 'Not Started', ''],
      ['QC', 'Fluent Forms export maps to tab 01 columns', '', 'Not Started', ''],
      ['QC', 'Curriculum loaded into LMS (tab 09)', '', 'Not Started', ''],
      ['Brand', 'Logo + lockups (Beere Softwares / Equip Africa / Dooke / Anfani)', '', 'Not Started', ''],
      ['Brand', 'Tagline + campaign line on all assets', '', 'Not Started', ''],
      ['Brand', 'Social templates (post/story/carousel)', '', 'Not Started', ''],
      ['Brand', 'Certificate + Demo Day deck template', '', 'Not Started', '']
    ]
  },
  {
    name: '23 · Facilitators',
    group: 'Program Management',
    intro: 'People who deliver the live sessions and run the program (distinct from mentors, who advise founders 1:1).',
    fields: [
      ['Facilitator ID', 'text'], ['Name', 'text'], ['Email', 'text'], ['Org/Title', 'text'],
      ['Session/Topic', 'text'], ['Week', 'list:Week'], ['Date', 'date'],
      ['Status', 'list:FacilitatorStatus'], ['Notes', 'text']
    ]
  }
];
