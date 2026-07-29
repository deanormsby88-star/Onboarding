import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { AccessDeniedError, assertCanViewUser } from "@/lib/authz";
import { buildPerformanceRecordPdf } from "@/lib/export-pdf";
import { db } from "@/lib/db";

/**
 * Per-person performance record PDF (brief §8). Employees can export their
 * own record without going through an admin; managers their subtree;
 * admins anyone. Every export of someone else's record is access-logged.
 *
 * GET /api/export/{userId}?from=2026-05-01&to=2026-07-31
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { userId } = await ctx.params;
  try {
    await assertCanViewUser(viewer, userId, "export_pdf");
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return NextResponse.json({ error: "no access" }, { status: 403 });
    }
    throw e;
  }

  const url = new URL(request.url);
  const parse = (key: string, fallback: Date) => {
    const raw = url.searchParams.get(key);
    if (!raw) return fallback;
    const date = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? fallback : date;
  };
  const from = parse("from", new Date("2020-01-01"));
  const toDay = parse("to", new Date());
  const to = new Date(toDay.getTime() + 86_399_000); // inclusive end of day

  const subject = await db.user.findUnique({ where: { id: userId } });
  if (!subject) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pdf = await buildPerformanceRecordPdf({
    userId,
    from,
    to,
    generatedByName: viewer.name,
  });

  const slug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="performance-record-${slug}-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
