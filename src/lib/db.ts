import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __floorwalkPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __floorwalkSchemaReady: Promise<void> | undefined;
}

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    max: 5,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });
}

export function pool(): Pool {
  if (!global.__floorwalkPool) {
    global.__floorwalkPool = makePool();
  }
  return global.__floorwalkPool;
}

const SCHEMA_SQL = `
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
`;

export async function ensureSchema(): Promise<void> {
  if (!global.__floorwalkSchemaReady) {
    global.__floorwalkSchemaReady = pool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        global.__floorwalkSchemaReady = undefined;
        throw err;
      });
  }
  return global.__floorwalkSchemaReady;
}

export interface WalkRow {
  id: string;
  walker: string;
  started_at: string;
  submitted_at: string | null;
  status: string;
  email_status: string | null;
}

export interface EntryRow {
  id: string;
  walk_id: string;
  room_id: string;
  room_name: string;
  employee_number: number;
  employee_name: string;
  presence: string;
  note: string | null;
  note_category: string | null;
  recorded_at: string;
}
