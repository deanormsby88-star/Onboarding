import { NextResponse } from "next/server";
import { ensureSchema, fetchCustomEmployees, fetchOverrides, fetchRoomNames } from "@/lib/db";
import { allNames, effectiveRooms } from "@/lib/floorplan";
import { buildFloorPlanPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const [overrides, custom, roomNames] = await Promise.all([
      fetchOverrides(),
      fetchCustomEmployees(),
      fetchRoomNames(),
    ]);
    const pdf = await buildFloorPlanPdf(effectiveRooms(overrides, custom, roomNames), allNames(custom));
    const today = new Date().toISOString().slice(0, 10);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="floor-plan-${today}.pdf"`,
      },
    });
  } catch (err) {
    console.error("GET /api/floorplan/pdf failed", err);
    return NextResponse.json({ error: "Failed to build floor plan PDF" }, { status: 500 });
  }
}
