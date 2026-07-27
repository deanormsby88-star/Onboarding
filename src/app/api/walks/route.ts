import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, pool, WalkRow } from "@/lib/db";
import { WALKERS } from "@/lib/floorplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walker = String(body.walker ?? "");
    if (!(WALKERS as readonly string[]).includes(walker)) {
      return NextResponse.json({ error: "Unknown walker" }, { status: 400 });
    }
    await ensureSchema();
    const { rows } = await pool().query<WalkRow>(
      "INSERT INTO floor_walks (walker) VALUES ($1) RETURNING *",
      [walker]
    );
    return NextResponse.json({ walk: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("POST /api/walks failed", err);
    return NextResponse.json({ error: "Failed to start walk" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await pool().query<WalkRow>(
      "SELECT * FROM floor_walks ORDER BY started_at DESC LIMIT 100"
    );
    return NextResponse.json({ walks: rows });
  } catch (err) {
    console.error("GET /api/walks failed", err);
    return NextResponse.json({ error: "Failed to list walks" }, { status: 500 });
  }
}
