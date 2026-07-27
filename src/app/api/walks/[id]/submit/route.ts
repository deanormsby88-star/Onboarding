import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, pool, WalkRow, EntryRow } from "@/lib/db";
import { buildWalkPdf } from "@/lib/pdf";
import { sendWalkReport } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Bad walk id" }, { status: 400 });
    }

    const walkRes = await pool().query<WalkRow>("SELECT * FROM floor_walks WHERE id = $1", [id]);
    if (walkRes.rowCount === 0) {
      return NextResponse.json({ error: "Walk not found" }, { status: 404 });
    }
    let walk = walkRes.rows[0];
    const alreadySent = Boolean(walk.email_status?.startsWith("sent"));
    if (walk.status === "in_progress") {
      const upd = await pool().query<WalkRow>(
        "UPDATE floor_walks SET status = 'submitted', submitted_at = now() WHERE id = $1 RETURNING *",
        [id]
      );
      walk = upd.rows[0];
    } else if (alreadySent) {
      // Re-submitting an already-emailed walk must not spam HR.
      return NextResponse.json({
        ok: true,
        emailSent: true,
        emailDetail: walk.email_status,
        pdfUrl: `/api/walks/${id}/pdf`,
      });
    }

    const entriesRes = await pool().query<EntryRow>(
      "SELECT * FROM floor_walk_entries WHERE walk_id = $1 ORDER BY id",
      [id]
    );
    const entries = entriesRes.rows;

    const pdf = await buildWalkPdf(walk, entries);
    let emailResult: { sent: boolean; detail: string };
    try {
      emailResult = await sendWalkReport(walk, entries, pdf);
    } catch (err) {
      console.error("Email send failed", err);
      emailResult = { sent: false, detail: `Email failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    await pool().query("UPDATE floor_walks SET email_status = $2 WHERE id = $1", [
      id,
      emailResult.sent ? `sent: ${emailResult.detail}` : `not sent: ${emailResult.detail}`,
    ]);

    return NextResponse.json({
      ok: true,
      emailSent: emailResult.sent,
      emailDetail: emailResult.detail,
      pdfUrl: `/api/walks/${id}/pdf`,
    });
  } catch (err) {
    console.error("POST /api/walks/[id]/submit failed", err);
    return NextResponse.json({ error: "Failed to submit walk" }, { status: 500 });
  }
}
