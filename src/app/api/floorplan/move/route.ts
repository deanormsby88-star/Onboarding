import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, fetchOverrides, pool } from "@/lib/db";
import { EMPLOYEES, effectiveRooms, getRoom, homeRoomId } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Moves a team member to a different room — a persistent floor-plan
// correction that applies to this walk and every future walk.
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => null);
    const num = Number(body?.employeeNumber);
    const toRoomId = String(body?.toRoomId ?? "");
    const walkId = body?.walkId != null ? Number(body.walkId) : null;

    if (!(num in EMPLOYEES) || !getRoom(toRoomId)) {
      return NextResponse.json({ error: "Unknown employee or room" }, { status: 400 });
    }

    if (homeRoomId(num) === toRoomId) {
      // Moving someone back to their original room clears the correction.
      await pool().query("DELETE FROM room_overrides WHERE employee_number = $1", [num]);
    } else {
      await pool().query(
        `INSERT INTO room_overrides (employee_number, room_id, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (employee_number)
         DO UPDATE SET room_id = EXCLUDED.room_id, updated_at = now()`,
        [num, toRoomId]
      );
    }

    // Drop any check already recorded for them in this walk (in their old
    // room) so they are counted once, in the room they actually sit in.
    if (walkId != null && Number.isInteger(walkId)) {
      await pool().query(
        "DELETE FROM floor_walk_entries WHERE walk_id = $1 AND employee_number = $2",
        [walkId, num]
      );
    }

    const overrides = await fetchOverrides();
    return NextResponse.json({ ok: true, rooms: effectiveRooms(overrides) });
  } catch (err) {
    console.error("POST /api/floorplan/move failed", err);
    return NextResponse.json({ error: "Failed to move team member" }, { status: 500 });
  }
}
