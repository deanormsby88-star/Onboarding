import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Deployment health probe: confirms the database is reachable and seeded.
 * Returns no secrets and no personal data — only a status, a user count,
 * and a sanitised error class/summary on failure.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await db.user.count();
    const templates = await db.scorecardTemplate.count();
    return NextResponse.json({ db: "ok", users, templates });
  } catch (e) {
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message.replaceAll(/postgres(ql)?:\/\/\S+/g, "<url>").split("\n").filter(Boolean).slice(0, 4).join(" | ").slice(0, 400)}`
        : "unknown error";
    return NextResponse.json({ db: "error", detail }, { status: 500 });
  }
}
