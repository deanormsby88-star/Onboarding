import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, pool, WalkRow, EntryRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Bad walk id" }, { status: 400 });
    }
    const walkRes = await pool().query<WalkRow>("SELECT * FROM floor_walks WHERE id = $1", [id]);
    if (walkRes.rowCount === 0) {
      return NextResponse.json({ error: "Walk not found" }, { status: 404 });
    }
    const entriesRes = await pool().query<EntryRow>(
      "SELECT * FROM floor_walk_entries WHERE walk_id = $1 ORDER BY id",
      [id]
    );
    return NextResponse.json({ walk: walkRes.rows[0], entries: entriesRes.rows });
  } catch (err) {
    console.error("GET /api/walks/[id] failed", err);
    return NextResponse.json({ error: "Failed to load walk" }, { status: 500 });
  }
}
