import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getLiveScorecard, PERSPECTIVE_LABEL } from "@/lib/scorecards";
import { AppShell } from "@/components/app-shell";
import { PipCreateForm } from "@/components/pip-create-form";

/**
 * Initiating a PIP is a two-step page: pick the person (GET param), then
 * link the specific live-scorecard measures that are falling short.
 */
export default async function NewPipPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const admin = await requireAdmin();
  const { userId } = await searchParams;

  const people = await db.user.findMany({
    where: { isActive: true, role: { not: "ADMIN" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const subject = userId ? people.find((p) => p.id === userId) : undefined;
  const scorecard = subject ? await getLiveScorecard(subject.id) : null;

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Initiate a PIP</h1>

      <form method="GET" className="mt-4 flex items-center gap-2">
        <select
          name="userId"
          defaultValue={userId ?? ""}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Choose person…
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Load scorecard
        </button>
      </form>

      {subject && !scorecard ? (
        <p className="mt-6 text-sm text-red-600">
          {subject.name} has no live scorecard —{" "}
          <Link href="/admin/assign" className="underline">
            assign one
          </Link>{" "}
          before initiating a PIP, or there is no standard to measure against.
        </p>
      ) : null}

      {subject && scorecard ? (
        <PipCreateForm
          userId={subject.id}
          userName={subject.name}
          perspectives={scorecard.perspectives.map((p) => ({
            label: PERSPECTIVE_LABEL[p.kind],
            measures: p.measures.map((m) => ({
              id: m.id,
              code: m.code,
              name: m.name,
              anchor3: m.anchor3,
            })),
          }))}
        />
      ) : null}
    </AppShell>
  );
}
