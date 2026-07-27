import { NextResponse } from "next/server";
import { ensureSchema, fetchCustomEmployees, fetchOverrides } from "@/lib/db";
import { allNames, effectiveRooms } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The floor plan as it currently stands: static plan + moves + new starters.
export async function GET() {
  try {
    await ensureSchema();
    const [overrides, custom] = await Promise.all([fetchOverrides(), fetchCustomEmployees()]);
    return NextResponse.json({
      rooms: effectiveRooms(overrides, custom),
      names: allNames(custom),
    });
  } catch (err) {
    console.error("GET /api/floorplan failed", err);
    return NextResponse.json({ error: "Failed to load floor plan" }, { status: 500 });
  }
}
