import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

/**
 * POPIA access log (brief §8): every read of another person's performance
 * data — viewer, subject, what, when. It also keeps managers honest.
 */
export default async function AccessLogPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const admin = await requireAdmin();
  const { subject } = await searchParams;

  const [people, entries] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.accessLog.findMany({
      where: subject ? { subjectUserId: subject } : {},
      orderBy: { at: "desc" },
      take: 200,
      include: {
        viewer: { select: { name: true } },
        subjectUser: { select: { name: true } },
      },
    }),
  ]);

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Access log</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every read of someone else&apos;s performance data. Reads of one&apos;s
        own record are not logged. Latest 200 shown.
      </p>

      <form method="GET" className="mt-4">
        <select
          name="subject"
          defaultValue={subject ?? ""}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All subjects</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="ml-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">When (UTC)</th>
              <th className="px-4 py-2.5 font-medium">Viewer</th>
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">What</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Nothing logged yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 tabular-nums text-gray-600">
                    {e.at.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-2">{e.viewer.name}</td>
                  <td className="px-4 py-2">{e.subjectUser.name}</td>
                  <td className="px-4 py-2 text-gray-600">{e.entity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
