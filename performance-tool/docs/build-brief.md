# Heya Performance Tool - Build Brief

**Prepared for:** Claude Code
**Owner:** Dean Ormsby, COO, Heya
**Version:** 1.0
**Date:** 29 July 2026

---

## 1. What this is

An internal web application for running weekly balanced-scorecard performance check-ins across Heya's management and internal support team. Every measure is rated twice each week, once by the team member and once by their manager, and the tool tracks both scores and the gap between them over time.

This is not a client-facing product and not for placed agents. It is for Heya's own employees: managers, account managers, and internal support functions.

**Target initial user base:** 15-30 users, growing to roughly 40.

### The three jobs the tool must do well

1. Make the weekly check-in fast enough that it actually happens every week
2. Make the gap between self-rating and manager rating visible and discussable
3. Produce a defensible, exportable performance record for each employee

If a feature does not serve one of those three, leave it out of v1.

---

## 2. Recommended stack

Confirm with Dean before starting. Rationale is given so it can be argued with.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript | Single codebase, server actions keep the data layer simple |
| Database | PostgreSQL | Relational data with real integrity needs |
| ORM | Prisma | Readable schema file, good migration story |
| Auth | Auth.js v5 with Microsoft Entra ID provider | Heya is a Microsoft 365 shop. Do not build a password table. |
| Styling | Tailwind CSS | Fast, consistent |
| Charts | Recharts | Sufficient for the analytics in scope |
| Email | Microsoft Graph API (app registration) | Sends from a Heya mailbox, no third-party mail service |
| Hosting | Azure App Service | Already an Azure tenant, managed by IronPoint |
| Region | South Africa North (Johannesburg) | Data residency for POPIA comfort |

**Auth requirements:**
- Entra ID SSO only. No local password authentication.
- On first sign-in, match the Entra object ID to an existing user record. Do not auto-provision. Unmatched sign-ins get a clean "no access" screen.
- Deactivating a user in Entra must lock them out. Do not rely on a local status flag alone.

---

## 3. Roles and permissions

Three roles. Hierarchy is derived from `users.manager_id`, not hardcoded.

| Capability | Employee | Manager | Admin |
|---|---|---|---|
| Complete own self-evaluation | Yes | Yes | Yes |
| View own scores, history, analytics | Yes | Yes | Yes |
| Complete manager evaluation for direct reports | No | Yes | Yes |
| View direct reports' full records | No | Yes | Yes |
| View indirect reports (report of a report) | No | Yes | Yes |
| View any employee record | No | No | Yes |
| Create and edit scorecard templates | No | No | Yes |
| Assign a scorecard to a person | No | No | Yes |
| Manage users and hierarchy | No | No | Yes |
| View rating-distribution / calibration reports | No | No | Yes |
| Initiate a PIP | No | No | Yes |
| View access log | No | No | Yes |

**Hard rule:** a manager can never see a peer's record, and never their own manager's record. Enforce this at the data-access layer, not in the UI.

---

## 4. Scorecard model

### Structure

```
Scorecard (assigned to one person, versioned)
  └── Perspective (4 per scorecard, weighted, sums to 100%)
        └── Measure (2-5 per perspective, weighted within the perspective)
```

### The four perspectives

These are fixed across all roles so scores stay comparable:

1. **Delivery and Quality** - the core output of the role
2. **Client and Stakeholder** - internal or external, depending on role
3. **Commercial and Efficiency** - cost, throughput, resource discipline
4. **People and Growth** - own development, and contribution to others

Perspective weights vary by role. Measure weights default to equal within a perspective but must be editable.

### Rating scale

Single 1-5 scale, applied to every measure by both raters.

| Rating | Label | Generic meaning |
|---|---|---|
| 1 | Well below standard | Consistently short of the standard, immediate intervention needed |
| 2 | Below standard | Falls short more often than not |
| 3 | Meets standard | Does the job as it is meant to be done |
| 4 | Exceeds standard | Consistently better than the standard requires |
| 5 | Exceptional | Sets the standard for others |

Each measure carries its own **"what a 3 looks like"** anchor text, stored on the measure and displayed inline next to the rating control at scoring time. This is the single most important UI detail in the app. Do not hide it behind a tooltip.

A comment box sits under every measure. Optional at rating 3-4, **required at 1, 2, and 5**. Enforce this in validation.

### Templates versus instances

Templates are reusable per role family. Assigning a template creates an independent **scorecard instance** with copied perspectives and measures, so editing a template never rewrites history.

Editing a live scorecard creates a new version with an `effective_from` date. Historical check-ins stay attached to the version that was live when they were completed.

Seed the four templates in `scorecard-templates.md`.

---

## 5. Check-in workflow

One check-in per person per ISO week. Weeks are Monday-Sunday and identified as `2026-W31`.

### Blind scoring

**The manager cannot see the self-ratings until they have submitted their own.** This is a deliberate design requirement, not an optional nicety. Without it the manager anchors on the self-score and the delta becomes meaningless.

Same in reverse: the employee cannot see the manager's ratings until both sides are submitted.

### State machine

```
not_started
  → self_in_progress        (employee opens and saves a draft)
  → awaiting_manager        (employee submits; self scores now locked)
  → awaiting_discussion     (manager submits; BOTH sides now visible to both)
  → awaiting_acknowledgement(manager marks the conversation as held)
  → complete                (employee acknowledges; record locks)

Any state → missed          (automatic, if the week closes incomplete)
```

Notes:
- The manager can complete their evaluation before the employee submits, but cannot see self-scores until the employee submits.
- `missed` is set by a scheduled job at 23:59 on the Sunday. Missed weeks stay visible in history and count against participation. Do not let them be quietly backfilled: reopening a missed week requires an Admin action and is logged.
- On `complete`, all scores lock. Later corrections go through the amendment trail (section 8), never a silent overwrite.

### What a check-in captures

**From the employee:**
- A 1-5 rating and optional comment per measure
- Win of the week (one field, free text)
- Focus for next week
- What is in the way
- Support needed

**From the manager:**
- A 1-5 rating and optional comment per measure
- Coaching note
- Agreed priorities for next week

**Blockers** raised in "what is in the way" can be promoted to a tracked blocker record with an owner, target date, and status. This matters: a blocker raised weekly with no owner and no movement will kill the team's faith in the tool faster than anything else.

### Other check-in types

Same structure, different `type` value and different reporting treatment:
- `weekly` - the default
- `probation_review` - flagged, exportable as a standalone probation record
- `pip_review` - linked to a PIP record

---

## 6. Scoring calculations

```
measure_score(rater)      = rating (1-5)

perspective_score(rater)  = Σ (measure_weight × measure_rating) / Σ measure_weight

overall_score(rater)      = Σ (perspective_weight% × perspective_score) / 100

delta                     = self_score − manager_score
```

Compute delta at measure, perspective, and overall level. A positive delta means the person rates themselves above their manager.

If a measure is skipped (not applicable that week), exclude it from both the numerator and denominator rather than scoring it zero. Add a "not applicable this week" option that requires a reason.

---

## 7. Screens

### Employee
- **This week** - the self-evaluation form. Landing page if incomplete.
- **My history** - list of check-ins by week with status and both scores once visible.
- **My progress** - own analytics (section 9).
- **My scorecard** - read-only view of measures, definitions, and anchors.
- **My development objectives** - current objectives and progress notes.

### Manager
Everything above for themselves, plus:
- **My team** - one row per direct report: current week status, latest overall score, delta, direction of travel, open blockers. This is the manager's landing page.
- **Rate [person]** - the manager evaluation form.
- **Person view** - full history, analytics, scorecard, development objectives, blockers for one report.

### Admin
Everything above, plus:
- **Users** - create, edit, set manager, set role, deactivate.
- **Templates** - build and edit templates, perspectives, measures, weights, anchors.
- **Assign scorecards** - assign a template to a person, set effective dates, version.
- **Org overview** - participation rate, completion status across all people, outstanding check-ins.
- **Calibration** - rating distribution per manager (section 9).
- **PIPs** - create and manage.
- **Exports** - per-person performance record PDF.
- **Access log** - who viewed what.

---

## 8. Compliance, audit, and POPIA

Build these in from the start. Retrofitting them is painful and the whole defensibility case rests on them.

### Audit trail
- Every score, comment, and status transition is timestamped with the acting user.
- Post-lock changes write to an `amendments` table capturing old value, new value, reason (required), and who changed it. The original value is never destroyed.
- Amendments are visible on the record, not hidden in an admin log.

### Access log
Log every read of another person's performance data: viewer, subject, entity, timestamp. Admin-viewable. This is a POPIA accountability requirement and it also keeps managers honest.

### Exportable record
Per-person, per-date-range PDF containing: the scorecard in force, every check-in in the period with both sets of scores and comments, blockers raised and their resolution, development objectives, and any PIP documentation. This is the artefact that gets handed to a labour consultant or a CCMA process.

### PIP module
South African context. Under the Code of Good Practice: Dismissal, fairness for poor performance turns on whether the employee knew the standard, was given a fair opportunity to meet it, and was given appropriate support. The PIP record must therefore capture:

- Which specific measures are falling short, linked to the actual scorecard measures
- The standard required, stated explicitly
- Support provided: training, guidance, counselling, with dates
- Review dates and the outcome of each review
- Final outcome and reasoning

Link PIP reviews to check-ins so the evidence chain is unbroken.

### Data handling
- Role-based access enforced server-side on every query. No client-side filtering of sensitive data.
- Retention period configurable per record type, default 5 years after employment ends.
- Employees can view and export their own full record without going through an admin.
- No performance data in email bodies. Notifications link to the app, they do not contain scores.

---

## 9. Analytics

Build these against seeded dummy data (section 11) so you can see whether the charts actually say anything before wiring them to live data.

### Individual view
- **Overall score over time** - two lines, self and manager, plotted by week. The headline chart.
- **Delta over time** - single line, zero-centred. A persistent positive delta is a coaching signal.
- **Current period by perspective** - grouped bars, self versus manager.
- **Per-measure trend** - small multiples or a selectable single-measure line.
- **Participation** - weeks completed, weeks missed, current streak.

### Manager team view
- **Team heatmap** - people down, perspectives across, current-period manager scores, coloured.
- **Direction of travel** - improving / flat / declining per person, based on a 4-week rolling average.
- **Largest deltas** - ranked, so the conversations that need having surface themselves.
- **Open blockers** - by owner and age.
- **Participation by person.**

### Admin calibration view
- **Rating distribution per manager** - histogram of ratings given, side by side across managers. Catches the generous rater and the harsh rater, which is the main fairness risk in a two-rater system.
- **Average manager score per person, ranked.**
- **Self-versus-manager delta distribution across the org.**

Avoid a single composite "company performance score". It hides everything useful.

**Do not build analytics until there are at least 8 weeks of data**, real or seeded. Charts built on two data points make bad design decisions look fine.

---

## 10. Notifications

Times are SAST. All notifications link to the app and contain no scores.

| When | To | Trigger |
|---|---|---|
| Thursday 14:00 | Employee | Self-evaluation for the week is open |
| Friday 16:00 | Employee | Reminder if self-evaluation not submitted |
| Monday 08:00 | Manager | Reports awaiting manager evaluation |
| Wednesday 08:00 | Manager | Reminder if any check-in from last week is incomplete |
| Wednesday 08:00 | Admin | Any check-in more than one week overdue |
| On both submitted | Both | Scores are now visible, book the conversation |
| Target date passed | Blocker owner | Blocker overdue |

Make the whole notification schedule config-driven, not hardcoded. Cadence will need tuning once it is live.

---

## 11. Build phases and decision gates

Stop at each gate. Do not run ahead.

**Phase 1 - Foundations**
Schema, migrations, Entra ID auth, user and hierarchy management, role-based access enforced server-side. Seed a small user set.
*Gate: Dean signs in, sees three test users, confirms the permission boundaries hold.*

**Phase 2 - Scorecards**
Template builder, the four seeded templates, assignment to people, versioning.
*Gate: Dean can build a template from scratch and assign it.*

**Phase 3 - Check-in flow**
Weekly self and manager evaluation forms, blind scoring, full state machine, sign-off, locking, notes fields, blockers.
*Gate: a full week is run end to end with two real people. This is the make-or-break gate. If the form is slow or fiddly, fix it here before going further.*

**Phase 4 - Seed data**
Generate 10-12 weeks of realistic history across 6-8 dummy users, including deliberate patterns: one person with a persistent positive delta, one declining, one improving, one with missed weeks, one generous manager and one harsh one.
*Gate: data looks plausible.*

**Phase 5 - Analytics**
Individual, team, and calibration views, built and critiqued against the seed data.
*Gate: Dean can look at a person's page and know what conversation to have.*

**Phase 6 - Notifications**
Graph API integration, scheduled jobs, config-driven schedule.

**Phase 7 - Compliance layer**
PDF export, PIP module, amendment trail surfaced in the UI, access log view, retention settings.

**Explicitly out of scope for v1:** peer and 360 feedback, HRIS or payroll integration, mobile app, goal cascading to company objectives, engagement surveys, compensation linkage, AI-drafted evaluations.

---

## 12. Design direction

An internal tool used weekly by people under time pressure. The job is legibility and speed, not impressing anyone. Every design decision should reduce the friction of filling in a form on a Friday afternoon.

**Palette** - Heya brand colours, used with discipline:
- Blue `#3D7CC9` - primary actions, self-rating series
- Green `#3BB54A` - positive states, completion, improving trend
- Purple `#8B3DAF` - manager-rating series, admin-only surfaces
- Neutral greys for structure. Amber and a muted red for warning and overdue states, kept away from the brand three so status never reads as brand.

Self is always blue and manager is always purple, everywhere, without exception. Once someone learns that pairing they can read any chart in the app at a glance.

**Type** - one clean, highly legible sans for the interface with a tabular-figure setting for all numerals so score columns align. Do not use a display face. There is no hero here.

**Layout** - the self-evaluation form is the app. Perspective as a section header with its weight shown, measures stacked, the "what a 3 looks like" anchor sitting directly beside the rating control in a quiet tinted panel. Rating as five labelled buttons, not a dropdown and not a slider. Comment box always present, never behind a "add comment" toggle. Progress indicator showing measures completed. Autosave, with a visible saved state.

**Signature element** - the delta. When both sides are submitted, the reveal is a single view showing self and manager ratings side by side per measure with the gap drawn between them, largest gaps sorted to the top. That view is the agenda for the conversation. It is the one screen worth spending real design effort on.

**Copy** - plain and active. "Submit your ratings", not "Submit evaluation form". Empty states say what to do: "No check-in yet this week. Rate your measures and submit by Friday." Errors say what happened and how to fix it.

**Quality floor** - responsive to mobile (people will fill this in on a phone), visible keyboard focus, reduced motion respected, forms fully keyboard navigable.

---

## 13. Things worth getting right

- **Speed of the form.** If a self-evaluation takes more than five minutes, the cadence will fail by week six. Optimise for this above everything.
- **Anchors visible at the point of rating.** Otherwise a 3 means nothing and the delta is noise.
- **Blind scoring.** Non-negotiable.
- **Blockers with owners.** The tool's credibility depends on raised issues going somewhere.
- **Locking with an amendment trail.** The difference between a nice dashboard and a defensible record.
- **Missed weeks stay visible.** Participation data is performance data.
