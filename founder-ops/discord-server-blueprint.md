# Origin40 — Discord Server Blueprint

The Origin40 cohort community. This is the build sheet for an **empty server**: roles, categories,
channels, permissions, onboarding, moderation, and copy — plus the webhook setup that lets the
admin app post here automatically.

**Community vibe:** a build room, not a chat lounge. Calm, focused, celebratory of shipping.
Tagline in the server: *Build the Product. Launch the Venture.*

---

## 1. First: turn on Community mode

In **Server Settings → Enable Community** (the server is created but empty, so do this first):
- Set a **Rules** channel and **Community Updates** channel (we create them below).
- **Verification level:** Medium (verified email + 5 min on Discord).
- Enable **Welcome Screen** and **Onboarding** (used in section 5).
- Turn on **AutoMod** (section 6).

---

## 2. Roles (create top → bottom; order = hierarchy)

| Role | Who | Color | Key powers |
|---|---|---|---|
| `🛡️ Program Team` | David + core admins | Green `#14745F` | Administrator |
| `🤖 Origin40 Bot` | Webhooks/bot | Gray | Manage messages (in its channels) |
| `🛠️ Facilitator` | Session leaders | Gold `#C9A227` | Manage threads/events, mute in voice |
| `🧭 Mentor` | Mentors | Teal `#1F8A70` | Access mentorship + program |
| `🚀 Founder` | The 40 | Blue `#245C87` | Full cohort access |
| `🤝 Partner` | Sponsors/partners | Plum `#7A4E7F` | Partner + opportunities only |
| `🌍 Alumni` | Past founders | Slate | Alumni area (granted after Demo Day) |
| `👋 Applicant` | Pre-selection guests | Light gray | Start-here + intros only |
| `@everyone` | Default | — | No channel access by default (lock it down) |

Rule of thumb: **deny View Channel on `@everyone` at the category level**, then grant per role.
Members get exactly one "tier" role (Applicant → Founder/Mentor/Partner → Alumni) plus optional tags.

**Optional tag roles** (self-serve, cosmetic/notifications): `Week-1…Week-4`, `Building in: AI`,
`Building in: Fintech`, `Building in: Health`, `🔔 Announcements`, `🌍 Country` tags.

---

## 3. Categories & channels

> 🔒 = private (role-gated). 📣 = read-only for members (team/webhook posts only).
> 🪝 = recommended **webhook** target for the admin app.

**📌 START HERE** — visible to everyone incl. Applicants
- `#welcome` 📣 — what Origin40 is + how the server works
- `#rules` 📣 — code of conduct (Community "Rules" channel)
- `#announcements` 📣 🪝 — program announcements (app posts here)
- `#introductions` — one-line intro template
- `#ask-the-team` — questions to Program Team

**🏛️ THE BUILD** — Founders, Mentors, Facilitators, Team
- `#cohort-lounge` — general cohort chat
- `#week-1-validate` — problem + customer validation
- `#week-2-build` — MVP build
- `#week-3-test` — user testing + traction
- `#week-4-pitch` — pitch + Demo Day prep
- `#submissions` 🪝 — weekly milestone drops (app can confirm receipts)
- `#wins` — ship-it celebrations (encourage 🎉 reactions)
- `#stuck` — help desk; one thread per blocker
- `#resources` 📣 — curriculum links, templates, recordings
- 🔊 `Live Session` (Stage) · 🔊 `Co-working` · 🔊 `Office Hours 1–2`

**🧭 MENTORSHIP** — Mentors, Facilitators, Team
- `#mentor-lounge` 🔒 — mentors + team only
- `#mentor-matching` 🔒 — pairing coordination
- `#book-office-hours` — founders request time

**🤝 PARTNERS** — Partners, Team
- `#partner-lounge` 🔒
- `#opportunities` 📣 — jobs, pilots, credits, grants (founders can read)

**🎤 DEMO DAY** — opens Week 4
- `#demo-day-prep`
- `#demo-day-live` 🪝 — run-of-show + live updates
- 🔊 `Demo Day Stage`

**🌍 ALUMNI** — Alumni, Team (unlock after Demo Day)
- `#alumni-network` · `#alumni-opportunities`

**🛠️ TEAM** 🔒 — Program Team + Facilitators only
- `#team-ops` · `#applications` 🪝 (intake notifications) · `#automation-log` 🪝 (app events)
- 🔊 `Team Room`

---

## 4. Permission cheatsheet

- `@everyone`: **View Channel OFF** everywhere except START HERE.
- `Applicant`: START HERE only (read), `#introductions` (write).
- `Founder`: START HERE + THE BUILD + read `#opportunities` + DEMO DAY.
- `Mentor`: Founder access (read THE BUILD) + MENTORSHIP.
- `Partner`: START HERE + PARTNERS only.
- `Facilitator`: everything except TEAM admin actions; can manage events/threads.
- `Program Team`: Administrator.
- Lock 📣 channels: deny `Send Messages` to member roles; allow Team + Bot.
- Sync channel permissions to their category, then override only where needed.

---

## 5. Onboarding flow (Discord "Onboarding")

1. **Welcome Screen** buttons → `#welcome`, `#rules`, `#introductions`.
2. **Onboarding questions:**
   - "I am a…" → assigns a starting role: Founder / Mentor / Partner / Just exploring (Applicant).
     *(Founder/Mentor/Partner self-select is fine pre-verification; Team confirms real role on selection.)*
   - "What are you building in?" → AI / Fintech / Health / Commerce / Other (tag roles).
   - "Notify me about" → `🔔 Announcements`.
3. **Default channels:** new members see START HERE immediately.
4. **Verification gate:** Membership Screening (agree to rules) before posting.

**Role granting on selection:** when the 40 are chosen, Team assigns `🚀 Founder` (removes `👋 Applicant`).
This can be manual, or automated later with the bot using the app's selection data.

---

## 6. Moderation & safety (AutoMod)

- Block invite links + @everyone pings from non-team.
- Spam/mention-raid protection ON.
- Keyword filter for slurs/harassment.
- `#rules` content (see copy below); 3-strike policy; Team can timeout.
- Founders' unreleased ideas are **confidential** — state it in the rules.

---

## 7. Copy (paste-ready)

**#welcome**
> # Welcome to Origin40 🌍
> **Build the Product. Launch the Venture.** 4 weeks. 40 founders. Real products.
> This is our build room — where Africa's next tech founders ship.
> 1. Read **#rules** and accept them. 2. Say hi in **#introductions**. 3. Watch **#announcements**.
> Your week channels live under **THE BUILD**. Stuck? Post in **#stuck**. Shipped something? **#wins** 🎉

**#rules**
> **Origin40 Community Code**
> 1. Build in good faith. Be generous with help, honest about progress.
> 2. Respect everyone — zero tolerance for harassment or discrimination.
> 3. **Confidentiality:** what founders share here stays here. Don't copy or pursue others' ideas.
> 4. No spam, no unsolicited DMs, no self-promo outside #opportunities.
> 5. English in shared channels so everyone can follow.
> 6. Team decisions are final. Issues → **#ask-the-team**.
> Breaking these → warning → timeout → removal.

**#introductions template**
> 👋 I'm **[name]** from **[city, country]**, building **[startup]** — *[one-line pitch]*.
> This week I want help with: **[___]**.

**Selected-founder welcome (post in #announcements / DM)**
> 🎉 Welcome to the Origin40 cohort, **[name]**! You're one of the 40.
> You now have the **🚀 Founder** role and full access to **THE BUILD**.
> Week 1 kicks off **[date]** in **🔊 Live Session**. Drop your intro in #introductions and let's build.

**Weekly kickoff (tie to curriculum)**
> 📣 **Week [n] — [theme]** is live.
> 🎯 This week's milestone: **[milestone]** (due Fri, drop it in #submissions).
> 🔊 Live session: [time]. 🧭 Office hours: [times]. Let's go.

**Deadline push**
> ⏳ **Reminder:** **[milestone]** is due **Friday [time]** in #submissions. Stuck? #stuck — we've got you.

**Demo Day**
> 🎤 **Demo Day is [date]!** 3-min pitch + 2-min Q&A. Run-of-show in #demo-day-prep. Rehearse twice. 🔥

---

## 8. Webhooks (connect the admin app)

The Origin40 admin app posts to Discord via **incoming webhooks** (no bot needed to start).

For each channel you want the app to post to, do:
**Channel → Edit → Integrations → Webhooks → New Webhook → name it `Origin40 App` → Copy URL.**

Create webhooks for:
| Channel | Used for |
|---|---|
| `#announcements` | broadcasts, deadline pushes, selected-founder announcements, weekly kickoffs |
| `#automation-log` | app events (imports, new applications, status changes) |
| `#submissions` *(optional)* | milestone receipt confirmations |

Then paste the URLs into the admin app: **Settings → Integrations → Discord**:
- **Announcements webhook** → `#announcements` URL
- **Log webhook** → `#automation-log` URL
- (optional) **Submissions webhook** → `#submissions` URL
- **Invite link / Server URL** → for the Control Center "Cohort Discord" tile

Webhooks are write-only and safe to store locally. To later automate **role assignment, invites, and
DMs** (e.g., auto-grant Founder on selection), upgrade to a **bot token** — section 2's `🤖 Origin40 Bot`
role is already reserved for it.

---

## 9. Build checklist

- [ ] Enable Community + Welcome Screen + Onboarding + AutoMod
- [ ] Create the 9 roles in order; lock `@everyone`
- [ ] Create categories/channels; set 📣 read-only + 🔒 private
- [ ] Configure Onboarding questions → starting roles
- [ ] Paste rules/welcome copy
- [ ] Create webhooks for #announcements, #automation-log (+ #submissions)
- [ ] Paste webhook URLs + invite link into the admin app Settings
- [ ] Test: send a broadcast from the app → confirm it lands in #announcements
