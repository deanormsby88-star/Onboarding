import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

export default async function PipsPage() {
  const admin = await requireAdmin();
  const pips = await db.pip.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      _count: { select: { reviews: true, supportActions: true } },
    },
  });

  return (
    <AppShell user={admin}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance improvement plans</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fairness turns on whether the person knew the standard, had a
            fair opportunity to meet it, and was supported. The record here
            is what proves it.
          </p>
        </div>
        <Link
          href="/admin/pips/new"
          className="rounded-lg bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
        >
          Initiate PIP
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">Person</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Period</th>
              <th className="px-4 py-2.5 font-medium">Support</th>
              <th className="px-4 py-2.5 font-medium">Reviews</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {pips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No PIPs. Good.
                </td>
              </tr>
            ) : (
              pips.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{p.user.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        p.status === "ACTIVE"
                          ? "text-amber-600"
                          : p.status === "CLOSED"
                            ? "text-gray-500"
                            : "text-gray-400"
                      }
                    >
                      {p.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {p.startDate.toISOString().slice(0, 10)}
                    {p.endDate ? ` → ${p.endDate.toISOString().slice(0, 10)}` : ""}
                  </td>
                  <td className="px-4 py-2.5">{p._count.supportActions}</td>
                  <td className="px-4 py-2.5">{p._count.reviews}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/pips/${p.id}`}
                      className="text-heya-blue hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
