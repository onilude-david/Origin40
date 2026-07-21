# Origin40 LMS Setup — Tutor LMS

Founder-facing dashboard: course content, weekly milestones, and MVP/submission uploads, built on
WordPress with **Tutor LMS** (free core + free Assignments addon). This keeps the founder portal
inside WordPress per the repo's operating rule — this app/repo stays internal ops only.

**Timing note:** the cohort started Monday, July 13, 2026. The Week 1 milestone (Problem-Validation
Brief) is due **today, Friday, July 17** — before this LMS can realistically be live. Collect today's
Week 1 submissions through your current fallback (Discord / WhatsApp / a Google Form / Sheets tab
`07 · Submissions`) and backfill them into Tutor LMS once it's built, or simply start live LMS
submissions from Week 2 onward. Don't let setup block today's demo gate.

## Step 1 — Install the plugin

1. WordPress admin → **Plugins → Add New** → search "Tutor LMS" (by Themeum) → **Install → Activate**.
2. Run the setup wizard when prompted:
   - Course archive page: let it create one (e.g. `/courses/`).
   - Student registration: **enable** (founders need to log in).
   - Instructor registration: **disable** (you're the only instructor/admin).
   - Currency/monetization: skip — this is a free, non-sellable course.
3. **Tutor LMS → Addons** → enable:
   - **Assignments** (required — this is how founders submit their MVP link/file each week).
   - **Content Drip** (optional — lets you schedule each week's content to unlock on its Monday
     instead of showing all 4 weeks at once).

## Step 2 — Build one course, four topics

Create a single course: **"Origin40 — Founder Build Incubator (July 2026 Cohort)"**.
Inside it, add one **Topic** per curriculum week — this maps 1:1 to the files already written in
`curriculum/`, which are explicitly "copy-ready for WordPress LMS":

| Topic (Tutor LMS) | Source file | Milestone assignment |
|---|---|---|
| Week 1 — Validate the Problem | `curriculum/week1-validate-the-problem.md` | Problem-Validation Brief |
| Week 2 — Design & Build the MVP | `curriculum/week2-design-and-build-mvp.md` | MVP/Prototype v1 |
| Week 3 — Test & Validate | `curriculum/week3-test-and-validate.md` | Validation Report |
| Week 4 — Pitch & Launch | `curriculum/week4-pitch-and-launch.md` | Final deck + demo link |

Within each Topic, add one **Lesson** per `### Lesson X.Y.Z` heading in the matching file (paste
the lesson body as-is — it's already written as founder-facing copy, not internal notes).

## Step 3 — Add the weekly MVP/milestone assignment

At the end of each Topic, add one **Assignment** (Tutor LMS → lesson type "Assignment") using the
milestone name from the table above. Use the **standard submission format already defined** in
`curriculum/overview.md`:

> Submit via the WordPress LMS assignment upload. Include: (1) a link (Google Doc / Figma / live
> URL / Loom video as specified), (2) sharing set to "anyone with the link can view", (3) a 2–3
> sentence summary of what you did and learned.

Assignment settings:
- **Attachment**: allow file upload — but the real submission is almost always a **link field**
  (live product URL, Figma, GitHub, Loom), so make the text-answer box required and the file
  optional.
- **Total marks**: 10 (matches the curriculum's `/10` rubric grading).
- **Deadline**: set to that week's Friday demo gate date from `program-management/origin40-master-calendar.md`.

This is where founders' **MVP lives**: the Week 2 assignment submission *is* their MVP/Prototype v1
link. Weeks 3 and 4 let them re-submit an updated link as the product evolves, so their most recent
MVP is always the latest graded assignment.

## Step 4 — Founder accounts (20 founders)

Only 20 founders, so manual account creation is fast and avoids installing an extra CSV-import
plugin:

1. **Users → Add New** for each selected founder (name + email from the Selection tab / selected
   founder export). Role = **Subscriber** (Tutor LMS treats any logged-in user as a student once
   enrolled — no special "Student" role needed).
2. Send each founder their login (or use **Settings → General → Anyone can register** +
   `/register/` link and let them self-register with their application email, then you manually
   enroll them in the course).
3. **Enroll**: open the course → **Students** tab → add each founder, or bulk-enroll by sharing the
   course's public enrollment link if registration is open only to your applicant list.

## Step 5 — What founders see (their "info")

The Tutor LMS frontend student dashboard (`/dashboard/`) already shows, per founder, with no extra
build:
- Enrolled course + per-lesson **progress %**
- Submitted **assignments** (their MVP/milestone links) and grades/feedback once you mark them
- A certificate on 100% completion (optional — enable if useful for Demo Day)

This covers "their MVP and their info" without duplicating data entry: their profile is their
WordPress account, their milestones are their graded assignments, and their MVP is whatever link
sits in the current Week 2+ assignment submission.

## Step 6 — Wire it into the rest of the system

1. Give founders the direct link: `https://beeresoftwares.com/origin40/dashboard/` (or wherever
   Tutor LMS creates the dashboard page).
2. In the local admin app, set **Settings & integrations → LMS / founder portal** to that same URL
   so it shows up as a live link from the Control Center.
3. Keep grading in one place: use the Tutor LMS gradebook as the source of truth for milestone
   scores, and mirror the grade into Sheets tab `07 · Submissions` / the admin app's founder record
   only if you need it for the completion-eligibility calculation (≥75% progress, ≥70% attendance).

## Not building (by design)

- No custom user profile fields (startup name, bio, etc.) — that data already exists in the
  applicant/selection record; the LMS doesn't need to duplicate it.
- No custom plugin/code. Tutor LMS's free Assignments addon covers the MVP-submission need without
  writing anything.
