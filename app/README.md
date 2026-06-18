# Origin40 — Local Admin App

A real, functional admin control panel for Origin40 that runs on **localhost**. Zero external
dependencies — just Node.js. Data persists to a local SQLite database (`data/origin40.db`).

## Run it

```bash
cd app
node --no-warnings server.js
```

Then open **http://localhost:3000**. On PowerShell, change the port with
`$env:PORT=4000; node --no-warnings server.js`.

The app starts empty by design. To wipe records and start clean, `POST /api/reset`.

## What it does

- **Control Center** — the cPanel launchpad; tiles jump to each module + external links.
- **Dashboard** — live KPIs, charts, and alerts computed from your real data.
- **Applications** — full applicant management: add, search, and **score** (the six-part
  framework → auto total, recommendation, and status). "Manual override" respects hand-set status,
  exactly like the Sheets engine.
- **Founders · Mentors · Facilitators · Partners** — add / edit / delete with status tracking.
- **Documents Library** — browse and preview curriculum, marketing, mentor, partner, Demo Day,
  impact, legal, and operations docs from the repo.
- **Settings & integrations** — configure Fluent Forms/WordPress intake, CSV import, email,
  Discord links, WhatsApp backup/broadcast, and Google Sheets sync.

## Import real applicant data

Go to **Settings & integrations → Application intake → CSV import**. You can paste an export or
choose a `.csv`, `.tsv`, or `.txt` file.

The importer is intentionally forgiving. It detects comma, tab, or semicolon delimiters and maps
common Fluent Forms headers such as full name, first/last name, email address, WhatsApp number,
country/location, startup/business/project name, pitch/description, submission date, status, and
the six scoring fields. Blank or unreadable rows are rejected with row-level feedback; duplicates
are skipped by email, or by phone when no email is available.

## How it's built

| Part | Tech |
|---|---|
| Server + REST API | Node.js built-in `http` (no Express, no install) |
| Data | SQLite via Node's built-in `node:sqlite` (`data/origin40.db`) |
| Scoring logic | `src/scoring.js` — mirrors the Apps Script / Sheets rules |
| Frontend | Vanilla JS SPA (`public/`), no build step |

```
app/
├─ server.js          REST API + static file server
├─ src/scoring.js     scoring framework + status rules
├─ src/db.js          SQLite datastore
├─ src/intake.js      Fluent Forms webhook/API/CSV mapping
├─ src/integrations/  email · WhatsApp · Google Sheets hooks
├─ public/            index.html · styles.css · app.js (the SPA)
└─ data/origin40.db   local data
```

## Relationship to the Sheets engine

This app and the Google Sheets workbook share the **same scoring logic and structure**, so you can
run either (or both). The Sheets system is the low-cost, no-deploy option; this app is the richer
internal control panel for a team that wants a product-like workflow.

## Evolution path

- Auth (login) before exposing beyond localhost
- Deployment hardening for a small team server
- More complete attendance, submissions, Demo Day judging, and impact modules
- Export/sync reconciliation between the admin app and the Sheets engine
