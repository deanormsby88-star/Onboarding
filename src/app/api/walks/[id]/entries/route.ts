import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, fetchCustomEmployees, fetchOverrides, pool } from "@/lib/db";
import { allNames, effectiveRooms } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESENCE = new Set(["present", "break", "absent", "not_started"]);
const CATEGORIES = new Set(["follow_up", "hr"]);

// Saves all entries for one room (called when the walker taps "Next room").
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Bad walk id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const roomId = String(body?.roomId ?? "");
    const [overrides, custom] = await Promise.all([fetchOverrides(), fetchCustomEmployees()]);
    const names = allNames(custom);
    const room = effectiveRooms(overrides, custom).find((r) => r.id === roomId);
    if (!room || !Array.isArray(body?.entries)) {
      return NextResponse.json({ error: "Bad payload" }, { status: 400 });
    }

    const walkRes = await pool().query("SELECT status FROM floor_walks WHERE id = $1", [id]);
    if (walkRes.rowCount === 0) {
      return NextResponse.json({ error: "Walk not found" }, { status: 404 });
    }
    if (walkRes.rows[0].status !== "in_progress") {
      return NextResponse.json({ error: "Walk already submitted" }, { status: 409 });
    }

    const allowed = new Set(room.employeeNumbers);
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      for (const e of body.entries) {
        const num = Number(e?.employeeNumber);
        const presence = String(e?.presence ?? "");
        if (!allowed.has(num) || !PRESENCE.has(presence)) continue;
        const note = typeof e?.note === "string" && e.note.trim() ? e.note.trim().slice(0, 2000) : null;
        const category = note && CATEGORIES.has(e?.noteCategory) ? e.noteCategory : null;
        await client.query(
          `INSERT INTO floor_walk_entries
             (walk_id, room_id, room_name, employee_number, employee_name, presence, note, note_category, recorded_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
           ON CONFLICT (walk_id, room_id, employee_number)
           DO UPDATE SET presence = EXCLUDED.presence, note = EXCLUDED.note,
                         note_category = EXCLUDED.note_category, recorded_at = now()`,
          [id, room.id, room.name, num, names[num] ?? `Employee #${num}`, presence, note, category]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/walks/[id]/entries failed", err);
    return NextResponse.json({ error: "Failed to save room" }, { status: 500 });
  }
}
