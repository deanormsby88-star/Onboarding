import { NextResponse } from "next/server";
import { ensureSchema, fetchOverrides } from "@/lib/db";
import { effectiveRooms } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The floor plan as it currently stands: static plan + any moves made during walks.
export async function GET() {
  try {
    await ensureSchema();
    const overrides = await fetchOverrides();
    return NextResponse.json({ rooms: effectiveRooms(overrides) });
  } catch (err) {
    console.error("GET /api/floorplan failed", err);
    return NextResponse.json({ error: "Failed to load floor plan" }, { status: 500 });
  }
}
