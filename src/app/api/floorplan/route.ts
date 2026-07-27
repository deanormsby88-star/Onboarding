import { NextResponse } from "next/server";
import { ensureSchema, fetchCustomEmployees, fetchOverrides, fetchRoomNames } from "@/lib/db";
import { allNames, effectiveRooms } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The floor plan as it currently stands: static plan + moves + new starters.
export async function GET() {
  try {
    await ensureSchema();
    const [overrides, custom, roomNames] = await Promise.all([
      fetchOverrides(),
      fetchCustomEmployees(),
      fetchRoomNames(),
    ]);
    return NextResponse.json({
      rooms: effectiveRooms(overrides, custom, roomNames),
      names: allNames(custom),
    });
  } catch (err) {
    console.error("GET /api/floorplan failed", err);
    return NextResponse.json({ error: "Failed to load floor plan" }, { status: 500 });
  }
}
