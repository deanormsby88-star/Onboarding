import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, fetchCustomEmployees, fetchOverrides, fetchRoomNames, pool } from "@/lib/db";
import { allNames, effectiveRooms, getRoom } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renames a room — a persistent floor-plan correction. Sending the room's
// original name (or an empty name) clears the override.
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => null);
    const roomId = String(body?.roomId ?? "");
    const name = String(body?.name ?? "").trim().slice(0, 120);
    const staticRoom = getRoom(roomId);
    if (!staticRoom) {
      return NextResponse.json({ error: "Unknown room" }, { status: 400 });
    }

    if (!name || name === staticRoom.name) {
      await pool().query("DELETE FROM room_name_overrides WHERE room_id = $1", [roomId]);
    } else {
      await pool().query(
        `INSERT INTO room_name_overrides (room_id, name, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (room_id)
         DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
        [roomId, name]
      );
    }

    const [overrides, custom, roomNames] = await Promise.all([
      fetchOverrides(),
      fetchCustomEmployees(),
      fetchRoomNames(),
    ]);
    return NextResponse.json({
      ok: true,
      rooms: effectiveRooms(overrides, custom, roomNames),
      names: allNames(custom),
    });
  } catch (err) {
    console.error("POST /api/floorplan/room-name failed", err);
    return NextResponse.json({ error: "Failed to rename room" }, { status: 500 });
  }
}
