# Heya Performance

Weekly balanced-scorecard check-ins for Heya's management and internal
support team. Every measure is rated 1–5 by both the team member and their
manager; the tool tracks both scores and the gap between them over time.

Built to the build brief (`docs/build-brief.md`) and seeded from
`docs/scorecard-templates.md`.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Schema, migrations, Entra ID SSO, users & hierarchy, server-side RBAC, seed users | **Done — awaiting gate sign-off** |
| 2 | Template builder, four seeded templates, assignment, versioning | **Done — awaiting gate sign-off** |
| 3 | Check-in flow: blind scoring, state machine, sign-off, blockers | **Done — awaiting gate sign-off** |
| 4 | Seeded history data | **Done** (`npm run seed:history`) |
| 5 | Analytics: individual, team, calibration | **Done — awaiting gate sign-off** |
| 6 | Notifications (Graph API, config-driven) | **Done** |
| 7 | Compliance layer: PDF export, PIPs, amendments, access log, retention | **Done** |

All seven phases are built; gates 1, 2, 3 and 5 await Dean's sign-off (the
Phase 3 run-a-real-week gate is the make-or-break one). Scheduled jobs to
wire up in Azure, both with `Authorization: Bearer $CRON_SECRET`: hourly
`POST /api/jobs/notifications`, and `POST /api/jobs/close-week` early
Monday SAST.

Gate walkthroughs: Phase 1 — sign in as Dean (admin home lists every record
the viewer may see, straight from the data-access layer). Phase 2 — build a
template at /admin/templates and assign it at /admin/assign. Phase 3 — run a
full week end to end with two real people: self-rate, manager-rate (blind
both ways), reveal, conversation, acknowledge, lock.

### The weekly close-out job

Missed weeks are set by `POST /api/jobs/close-week` with
`Authorization: Bearer $CRON_SECRET` — schedule it for early Monday SAST
(it closes the week that just ended). Reopening a missed week is admin-only
from the check-in page and writes the amendment trail.

## Stack

Next.js 15 (App Router, strict TypeScript) · PostgreSQL · Prisma ·
Auth.js v5 with Microsoft Entra ID (SSO only, no passwords) · Tailwind CSS.
Deploys to Azure App Service (`output: "standalone"`), region South Africa
North.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_* values
npx prisma migrate deploy    # apply migrations
npm run seed                 # Dean + two test users + notification defaults
npm run dev                  # http://localhost:3000
```

### Entra ID app registration

1. Entra admin centre → App registrations → New. Single tenant.
2. Redirect URI (Web): `{AUTH_URL}/api/auth/callback/microsoft-entra-id`
3. Certificates & secrets → new client secret → `AUTH_MICROSOFT_ENTRA_ID_SECRET`
4. `AUTH_MICROSOFT_ENTRA_ID_ID` = Application (client) ID.
   `AUTH_MICROSOFT_ENTRA_ID_ISSUER` = `https://login.microsoftonline.com/<tenant-id>/v2.0`
5. API permissions: `openid profile email offline_access` (delegated,
   default Graph scopes — no admin consent needed).

`offline_access` matters: sessions revalidate against Entra when the access
token expires (~1 h), so disabling someone in Entra locks them out within
the hour without relying on the local status flag alone (brief §2).

### How sign-in access works

There is no invite flow and no auto-provisioning. An admin creates the user
record (Users → Add person) with the person's Microsoft 365 email. Their
first sign-in matches on that email and permanently binds their Entra object
ID; sign-ins with no matching active record land on a "no access" screen.

## Access control (brief §3)

- Everyone sees their own record.
- Managers see their whole subtree (direct + indirect reports), derived from
  `users.manager_id` — never a peer, never their own manager.
- Admins see everything.

Enforced in the data-access layer (`src/lib/authz.ts`), not the UI:
`assertCanViewUser()` throws on forbidden reads and writes the POPIA access
log for every read of another person's data. List queries are scoped by
`visibleUserIds()`. Hierarchy edits are cycle-checked.

## Development

```bash
npm run typecheck   # strict TS
npm test            # vitest — needs DATABASE_URL pointing at a dev Postgres
npm run build
```

The tests are integration tests against a real Postgres and create/remove
their own `*.authz-test@example.test` fixtures.

## Schema

The full data model (check-ins, ratings, blockers, PIPs, amendments, access
log) is designed and migrated now even though later phases build the
features, because the audit/compliance layer can't be retrofitted cheaply.
See `prisma/schema.prisma` — every table maps to a section of the brief.
