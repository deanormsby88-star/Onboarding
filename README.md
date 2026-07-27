# Floor Walk

A mobile-first web app for doing office floor walks, built from the Heya floor
plan (`Floor_Plan.xlsx`).

## How it works

1. **Landing page** — the walker picks their name (Mo, Jesse, Dean, Zozo,
   Aidan, Demetri, Steph, Bongi or Tiago), the date/time is captured
   automatically, and they tap **Start floor walk**.
2. **Room by room** — the app tells the walker which room to go to next,
   starting just outside Management (Room 24) and working around the floor.
   Management, rooms 23 and 25 are excluded. Every person assigned to the room
   is listed; each defaults to **Present** and can be flipped to **On break**
   or **Absent** with one tap. A note (tagged *Follow-up* or *HR
   intervention*) can be added to any person.
3. **Review & submit** — a summary shows counts, all notes, and any rooms not
   yet saved. On submit the walk is finalised in the database, a PDF report is
   generated, and it is emailed to HR (Dean + Jesse) with every note — and who
   it belongs to — listed in the mail body. The PDF is also downloadable
   in-app.
4. **History** — every walk is stored in Postgres; past walks and their PDFs
   are available under **/history**. An interrupted walk can be resumed from
   there.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL via `pg` (schema auto-created on first request; `npm run migrate`
  also available)
- `pdf-lib` for the PDF report, `nodemailer` (SMTP) for the email

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, SMTP_* and REPORT_RECIPIENTS
npm install
npm run dev
```

Deploy like the other Heya apps: push to Vercel, set the same env vars in the
project settings. Without SMTP configured, submissions still save and the PDF
is still downloadable — only the email is skipped.

## Floor plan data

Rooms, walk order and person-to-room assignments live in
`src/lib/floorplan.ts`. They were extracted from the bordered regions of the
floor plan spreadsheet. To move someone or add a room, edit that one file —
desk moves don't need a database change (historic walks keep the names they
were recorded with).

Excluded from the walk: Management, 23B (IT), 23C (Tiago), 25 (AM & HR), and
unstaffed spaces (storerooms, bathrooms, canteen, kitchen, reception,
18-Sellsius which has no assigned desks).
