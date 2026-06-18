# Origin40 — Final Operations Manual

The single reference for running the program. Pair with the README (deploy) and each system doc.

---

## 1. Program Team Structure

| Role | Owns | Key tabs/docs |
|---|---|---|
| **Program Lead** (David Oke Opeyemi legacy lead) | Vision, partners, final decisions | Home, Selection, Budget |
| **Operations Manager** | Schedule, logistics, support desk, completion | 05–08, 16–17, 22 |
| **Marketing Lead** | Campaign, content calendar, outreach, storytelling | 10–10b + `marketing/` |
| **Curriculum/LMS Lead** | WordPress LMS build, weekly sessions | 09 + `curriculum/` |
| **Mentor Coordinator** | Recruit, onboard, match, feedback | 11–13 + `mentors/` |
| **Partnerships Lead** | Sponsors, partners, opportunity pipeline | 14–15 + `partners/` |
| **Impact Lead** | Follow-up, alumni, impact report | 19–19c + `impact/` |

Small team? One person can hold several roles — the Sheets engine does the heavy lifting.

---

## 2. Tech & Data Architecture

**Public website:** https://beeresoftwares.com/origin40
**Registration form:** https://beeresoftwares.com/origin40/apply/

- **WordPress** = public site, registration (**Fluent Forms**), founder portal, LMS, Demo Day page.
- **Google Sheets + Apps Script** (this repo) = back-office engine: scoring, tracking, dashboards.
- **Data flow:** Fluent Forms export (CSV) → paste into tab `01 · Applicants` A:H → engine scores &
  recommends → committee selects in `02`/`03` → selected founders managed in `04`–`08` → curriculum
  delivered via WordPress LMS (status in `09`) → Demo Day in `16`–`18b` → impact in `19`–`19c`.
- **Keep the Fluent Forms field order aligned** to tab 01 columns (App ID/Timestamp auto-fill if blank).

---

## 3. Build Phases (delivery order)

1. **Phase 1 — Application review & scoring:** deploy engine, import, score, select.
2. **Phase 2 — Marketing & outreach tracker:** load `marketing/`, run calendar (tab 10).
3. **Phase 3 — LMS curriculum & templates:** load `curriculum/` into LMS, track in tab 09.
4. **Phase 4 — Founder progress & mentor feedback:** run tabs 04–08, 11–13 during the 4 weeks.
5. **Phase 5 — Demo Day & impact reporting:** tabs 16–19c + `demo-day/`, `impact/`.

---

## 4. Master Timeline (template)

| Phase | Window | Owner |
|---|---|---|
| Pre-launch awareness | Day −21 → −8 | Marketing |
| Applications open | Day 0 | All |
| Recruitment (founders/mentors/sponsors) | Day 0 → +14 | Marketing/Mentor/Partnerships |
| Deadline push | Final 72h | Marketing |
| Review, score, select | Selection week | Ops + Lead |
| Onboarding (agreements, readiness) | Pre Week 1 | Ops |
| Program Weeks 1–4 | 4 weeks | Curriculum/Ops/Mentor |
| Demo Day | End of Week 4 | All |
| 30/60/90 follow-up + impact report | +90 days | Impact |

---

## 5. Budget (tab 20)

Lean by design. Categories: Platform (WordPress/LMS) · Tools (Google Workspace) · Marketing · Demo Day
(venue/AV/refreshments) · Awards · Contingency (10%). Track Budgeted vs Actual (auto Variance). Prefer
in-kind partners and free/low-cost tools. Cost-per-application auto-shows in tab `10b`.

---

## 6. Risk Management (tab 21)

Severity auto-scores (Likelihood × Impact). Seeded risks: low application volume · founder drop-off ·
sponsor shortfall · mentor unavailability · platform downtime. Each risk has a mitigation + owner.
Review weekly; anything Severity ≥ 15 gets escalated to the Program Lead.

---

## 7. Quality Control Checklist (tab 22)

- [ ] All sheets have validation + an owner
- [ ] WordPress registration tested end-to-end (Fluent Forms → export → tab 01)
- [ ] Scoring rubric agreed; reviewers calibrated on 3 sample applications
- [ ] Curriculum loaded into LMS; tab 09 reflects build status
- [ ] Mentors onboarded + matched before Week 1
- [ ] Demo Day logistics on track (tab 16)
- [ ] Consent + disclaimers on file before publishing founder content

---

## 8. Brand Asset Checklist (tab 22)

- [ ] Logo + lockups (Origin40 + Beere Softwares + Equip Africa Initiative + Dooke + Anfani)
- [ ] Tagline **"Build the Product. Launch the Venture."** + campaign line **"4 Weeks. 40 Founders. Real Products."**
- [ ] Positioning line **"Where Africa's Next Tech Founders Build."**
- [ ] Social templates: post · story · carousel · quote
- [ ] Certificate template + Demo Day deck/run-of-show template
- [ ] Email header/banner + WhatsApp display assets

---

## 9. Brand Quick-Reference

- **Name:** Origin40
- **Tagline:** Build the Product. Launch the Venture.
- **Campaign line:** 4 Weeks. 40 Founders. Real Products.
- **Positioning:** Where Africa's Next Tech Founders Build.
- **Legacy:** Launched in honor of David Oke Opeyemi at 40.
- **Powered by:** Beere Softwares · **Partner:** Equip Africa Initiative · **Supported by:** Dooke Innovation Center & Anfani.
