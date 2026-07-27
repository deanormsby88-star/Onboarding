import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, fetchCustomEmployees, fetchOverrides, pool } from "@/lib/db";
import { allNames, effectiveRooms, getRoom } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adds a new team member (new starter) and assigns them to a room.
// Numbers continue from the spreadsheet's range; the room assignment is a
// room_overrides row, exactly like a mid-walk move.
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim().slice(0, 120);
    const roomId = String(body?.roomId ?? "");
    if (!name || !getRoom(roomId)) {
      return NextResponse.json({ error: "A name and a valid room are required" }, { status: 400 });
    }

    const client = await pool().connect();
    let num: number;
    try {
      await client.query("BEGIN");
      // Spreadsheet numbers stop at 127; new starters continue from 128.
      const { rows } = await client.query<{ next: number }>(
        "SELECT GREATEST(COALESCE(MAX(employee_number), 0), 127) + 1 AS next FROM custom_employees"
      );
      num = rows[0].next;
      await client.query(
        "INSERT INTO custom_employees (employee_number, name) VALUES ($1, $2)",
        [num, name]
      );
      await client.query(
        `INSERT INTO room_overrides (employee_number, room_id, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (employee_number)
         DO UPDATE SET room_id = EXCLUDED.room_id, updated_at = now()`,
        [num, roomId]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const [overrides, custom] = await Promise.all([fetchOverrides(), fetchCustomEmployees()]);
    return NextResponse.json(
      {
        ok: true,
        employee: { number: num, name },
        rooms: effectiveRooms(overrides, custom),
        names: allNames(custom),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/team failed", err);
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
  }
}
