import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { AccessDeniedError, assertCanViewUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { getLiveScorecard, PERSPECTIVE_LABEL } from "@/lib/scorecards";
import { buildScorecardPdf } from "@/lib/scorecard-pdf";

/**
 * Download a person's LIVE scorecard as PDF. Own scorecard always; other
 * people's via the RBAC gate, which also writes the access log.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { userId } = await ctx.params;
  try {
    await assertCanViewUser(viewer, userId, "export_scorecard_pdf");
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return NextResponse.json({ error: "no access" }, { status: 403 });
    }
    throw e;
  }

  const subject = await db.user.findUnique({ where: { id: userId } });
  const scorecard = await getLiveScorecard(userId);
  if (!subject || !scorecard) {
    return NextResponse.json({ error: "no live scorecard" }, { status: 404 });
  }

  const pdf = await buildScorecardPdf({
    title: subject.name,
    subtitle: `${scorecard.template?.name ?? "Custom scorecard"} · version ${scorecard.version} · in force since ${scorecard.effectiveFrom.toISOString().slice(0, 10)}`,
    perspectives: scorecard.perspectives.map((p) => ({
      label: PERSPECTIVE_LABEL[p.kind],
      weightPct: p.weightPct,
      measures: p.measures,
    })),
  });

  const slug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="scorecard-${slug}-v${scorecard.version}.pdf"`,
    },
  });
}
