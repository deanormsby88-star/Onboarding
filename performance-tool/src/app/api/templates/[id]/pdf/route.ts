import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getTemplate, PERSPECTIVE_LABEL } from "@/lib/scorecards";
import { buildScorecardPdf } from "@/lib/scorecard-pdf";

/** Download a scorecard TEMPLATE as PDF (admin only). */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (viewer.role !== "ADMIN") {
    return NextResponse.json({ error: "no access" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const template = await getTemplate(id);
  if (!template) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pdf = await buildScorecardPdf({
    title: template.name,
    subtitle: "Scorecard template",
    description: template.description,
    perspectives: template.perspectives.map((p) => ({
      label: PERSPECTIVE_LABEL[p.kind],
      weightPct: p.weightPct,
      measures: p.measures,
    })),
  });

  const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="scorecard-template-${slug}.pdf"`,
    },
  });
}
