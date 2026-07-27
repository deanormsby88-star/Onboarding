-- Floor walk schema. Also applied automatically by the app on first request.

CREATE TABLE IF NOT EXISTS floor_walks (
  id            BIGSERIAL PRIMARY KEY,
  walker        TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'in_progress',
  email_status  TEXT
);

CREATE TABLE IF NOT EXISTS floor_walk_entries (
  id               BIGSERIAL PRIMARY KEY,
  walk_id          BIGINT NOT NULL REFERENCES floor_walks(id) ON DELETE CASCADE,
  room_id          TEXT NOT NULL,
  room_name        TEXT NOT NULL,
  employee_number  INTEGER NOT NULL,
  employee_name    TEXT NOT NULL,
  presence         TEXT NOT NULL,
  note             TEXT,
  note_category    TEXT,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (walk_id, room_id, employee_number)
);

CREATE INDEX IF NOT EXISTS idx_entries_walk ON floor_walk_entries(walk_id);

-- Floor-plan corrections made during walks: employee -> room they now sit in.
CREATE TABLE IF NOT EXISTS room_overrides (
  employee_number  INTEGER PRIMARY KEY,
  room_id          TEXT NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
