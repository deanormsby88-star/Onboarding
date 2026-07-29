import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { setTemplateArchivedAction } from "./actions";

export default async function TemplatesPage() {
  const admin = await requireAdmin();
  const templates = await db.scorecardTemplate.findMany({
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    include: {
      perspectives: { include: { _count: { select: { measures: true } } } },
      _count: { select: { scorecards: true } },
    },
  });

  return (
    <AppShell user={admin}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scorecard templates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Reusable per role. Assigning one copies it into an independent,
            versioned scorecard — editing a template never rewrites anyone&apos;s
            history.
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="rounded-lg bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
        >
          New template
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {templates.map((t) => {
          const measureCount = t.perspectives.reduce(
            (s, p) => s + p._count.measures,
            0
          );
          return (
            <div
              key={t.id}
              className={`rounded-lg border border-gray-200 bg-white p-5 ${
                t.archived ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{t.name}</h2>
                {t.archived ? (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    Archived
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {measureCount} measures · assigned to {t._count.scorecards}{" "}
                scorecard{t._count.scorecards === 1 ? "" : "s"}
              </p>
              {t.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                  {t.description}
                </p>
              ) : null}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <Link
                  href={`/admin/templates/${t.id}`}
                  className="font-medium text-heya-blue hover:underline"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await setTemplateArchivedAction(t.id, !t.archived);
                  }}
                >
                  <button type="submit" className="text-gray-500 hover:underline">
                    {t.archived ? "Restore" : "Archive"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No templates yet. Run <code>npm run seed</code> for the opening
            four, or build one from scratch.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
