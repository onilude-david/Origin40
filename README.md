# Origin40 — Back-Office, Marketing, Curriculum & Operations Engine

**Build the Product. Launch the Venture.**
*4 Weeks. 40 Founders. Real Products.*
Where Africa's Next Tech Founders Build.

> A 4-week Founder Build Incubator helping 40 early-stage African tech founders move from
> idea → MVP/prototype → validation → pitch readiness → startup opportunities.
> Launched in honor of **David Oke Opeyemi** at 40.
> Powered by **Beere Softwares** · Partner: **Equip Africa Initiative** · Supported by **Dooke Innovation Center** and **Anfani**.

---

## What this repo is (and isn't)

This is the **back-office engine**. The public-facing platform is **WordPress**.

Public site: **https://beeresoftwares.com/origin40**
Registration form: **https://beeresoftwares.com/origin40/apply/**

| Built here (this repo) | Built in WordPress (not here) |
|---|---|
| Google Sheets ops workbook (Apps Script) | Public website |
| Local admin app for internal back-office work | Registration form (**Fluent Forms**) |
| Scoring, tracking, dashboards, automation | Founder portal / LMS delivery |
| Copy-ready curriculum for the LMS | — |
| Marketing content + outreach templates | Demo Day public page |
| Mentor / partner / Demo Day / impact systems | — |

**The Sheets system and local admin app work *with* WordPress / Fluent Forms data.**
Paste applicant exports into tab `01 · Applicants`, import CSVs into the local app, or connect
Fluent Forms intake once credentials are ready. The back-office engine scores, recommends, and
tracks from there.

Fluent Forms import pack:
- `wordpress/origin40-fluentform-founder-application.json` - upload this in Fluent Forms Import Forms.
- `wordpress/origin40-founder-application-questions.md` - review copy of every application question.

---

## Repo map

```
Origin40/
├─ README.md                     ← you are here (operations manual + deploy)
├─ app/                          ← local admin app (Node, SQLite, vanilla JS)
│  ├─ server.js                  ← REST API + static file server
│  ├─ src/                       ← scoring, datastore, intake, integrations
│  ├─ public/                    ← browser UI
│  └─ data/origin40.db           ← local SQLite datastore
├─ apps-script/                  ← the Google Sheets engine (paste into Apps Script)
│  ├─ Code.gs                    ← brand config + declarative spec of every tab
│  ├─ Builder.gs                 ← builds tabs: columns, validation, formats, formatting
│  ├─ Dashboard.gs               ← mission-control dashboard: KPI tiles + charts + alerts
│  ├─ ControlCenter.gs           ← cPanel launchpad (server) — links every tab + external URLs
│  ├─ ControlCenter.html         ← cPanel UI (Apps Script HTML file, name it "ControlCenter")
│  ├─ Automation.gs              ← onEdit auto-scoring/status + App IDs (manual override aware)
│  └─ Menu.gs                    ← "Origin40" menu in the Sheet
├─ curriculum/                   ← copy-ready 4-week LMS curriculum
│  ├─ overview.md
│  ├─ founder-build-schedule.md
│  ├─ week1-validate-the-problem.md
│  ├─ week2-design-and-build-mvp.md
│  ├─ week3-test-and-validate.md
│  └─ week4-pitch-and-launch.md
├─ marketing/                    ← campaign plan, calendar, content bank, messages
│  ├─ campaign-plan.md
│  ├─ content-bank.md
│  ├─ whatsapp-broadcasts.md
│  ├─ email-templates.md
│  └─ outreach-messages.md
├─ mentors/
│  └─ mentor-system.md
├─ founder-ops/
│  ├─ founder-operations.md
│  └─ discord-community-system.md
├─ partners/
│  └─ sponsor-system.md
├─ demo-day/
│  └─ demo-day-system.md
├─ impact/
│  └─ impact-system.md
└─ program-management/
   ├─ operations-manual.md
   └─ legal-consent-disclaimers.md
```

---

## Deploy the Sheets engine (10 minutes)

1. Open **[sheets.new](https://sheets.new)** → rename it `Origin40 — Ops Engine`.
2. **Extensions → Apps Script.**
3. Create the script files and paste the matching file from `apps-script/`:
   `Code.gs`, `Builder.gs`, `Dashboard.gs`, `ControlCenter.gs`, `Automation.gs`, `Menu.gs`.
   Then add **one HTML file** (＋ → HTML) named exactly **`ControlCenter`** and paste
   `ControlCenter.html` into it. Save (Ctrl/Cmd-S).
4. Return to the Sheet and **reload the tab**. A new **Origin40** menu appears.
5. **Origin40 → 🚀 Build / Rebuild Workbook.** Approve the permission prompt
   (it only touches this spreadsheet). All ~30 tabs build with columns, dropdowns,
   formulas, conditional formatting — plus the **`00 · Dashboard`** (KPI tiles, charts, alerts).
6. **Origin40 → ⚙️ Install automation.** This enables auto App-IDs and auto-status.

Re-run the dashboard any time with **Origin40 → 📊 Build / Refresh Dashboard** (it also
rebuilds with the full workbook).

### The Control Center (your cPanel)

**Origin40 → 🧭 Open Control Center** opens a visual launchpad inside the Sheet — grouped
tiles (Overview · People · Program · Growth · Operations · Resources) with live counts. Click
a tile to jump to its tab; the "Resources & links" tiles open your external tools (website,
registration form, LMS, documents Drive folder, cohort Discord, Demo Day page). Set those URLs
once at the top of `ControlCenter.gs` (`CC_LINKS`). A search box filters every tile. This is the
single "see and reach everything" surface — the spreadsheet stays the database underneath.

Re-running **Build** is safe — it refreshes structure without wiping typed data.
Use **Reset (wipe data)** only for a clean start.

---

## Run the local admin app

The local app is the richer internal control panel. It mirrors the same scoring model as the
Sheets engine, persists data in SQLite, and adds CSV import, WordPress/Fluent Forms intake,
email, Discord links, WhatsApp backup/broadcast, and Google Sheets sync hooks.

```bash
cd app
node --no-warnings server.js
```

Then open **http://localhost:3000**.

Keep it on localhost until authentication and deployment hardening are added.

---

## How the engine works

- **Single source of truth:** edit dropdown options on the `_Lists` tab — every menu in
  the workbook updates. Set weekly deadlines on `_Deadlines`.
- **Scoring:** reviewers type the six sub-scores on `01 · Applicants`; **Total Score**,
  **Auto Recommendation**, and **Suggested Status** compute automatically (scoring framework
  = 20/20/20/15/15/10 = 100). Automation copies Suggested Status into **Status** unless you
  set **Manual override? = Yes** on that row.
- **Roll-ups:** `02 · Shortlist`, `03 · Selection`, and `18b · Leaderboard` are live `QUERY`
  views — they refresh themselves. `00 · Dashboard` (KPI tiles + charts + alerts), `10b`, and
  `19c` are dashboards that read live from the system tabs.
- **Founder progress** blends milestones (50%) + attendance (25%) + reviewed submissions (25%)
  and flags **Completion Eligible** at ≥75% with ≥70% attendance.
- **Every sheet provides:** columns · formula suggestions (built in) · automation ideas
  (Automation.gs) · a **Manual override** path · and a usage note (hover the header cell, or
  see each `intro`).
- **Local app parity:** the admin app uses the same applicant scoring framework and status rules,
  while storing operational records in `app/data/origin40.db`.

### Tabs at a glance

| # | Tab | System |
|---|---|---|
| 00 | **Dashboard** | Mission control — 8 KPI tiles, 4 charts, alerts strip |
| 01–03 | Applicants · Shortlist · Selection | Application management |
| 04–08 | Founder Readiness · Progress · Attendance · Submissions · Support Desk | Founder operations |
| 09 | Curriculum Map | LMS |
| 10–10b | Content Calendar · Marketing Dashboard | Marketing |
| 11–13b | Mentor Directory · Matching · Feedback · Guest Sessions | Mentor |
| 14–15 | Partner Pipeline · Sponsor Tiers | Partner/Sponsor |
| 16–18b | Demo Day Plan · Schedule · Judge Scoring · Leaderboard | Demo Day |
| 19–19c | Follow-Up · Alumni · Impact Dashboard | Impact |
| 20–23 | Budget · Risk Tracker · Team & Checklists · Facilitators | Program management |

---

## Build phases (recommended order)

1. **Phase 1 — Application review & scoring** → deploy engine, import applicants, score.
2. **Phase 2 — Marketing & outreach tracker** → load `marketing/`, run the content calendar.
3. **Phase 3 — LMS curriculum & templates** → load `curriculum/` into WordPress LMS, tick tab 09.
4. **Phase 4 — Founder progress & mentor feedback** → run tabs 04–08, 11–13 during the 4 weeks.
5. **Phase 5 — Demo Day & impact reporting** → tabs 16–19c + `demo-day/` and `impact/`.

## Operating rules (kept by design)

- Start with Google Sheets + Apps Script · keep it low-cost · easy for a small team.
- Everything is copy-ready · don't overbuild · don't replace WordPress.
- **Registration is handled by WordPress + Fluent Forms** — this repo never builds it.
