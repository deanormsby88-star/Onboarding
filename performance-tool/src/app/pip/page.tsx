import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { pipInclude } from "@/lib/pips";
import { AppShell } from "@/components/app-shell";
import { PipView } from "@/components/pip-view";

/**
 * The person's own view of their performance improvement plan(s) —
 * deliberately transparent: the standard, the shortfalls, the support and
 * every review are visible to them for the whole life of the process.
 */
export default async function MyPipPage() {
  const user = await requireUser();
  const pips = await db.pip.findMany({
    where: { userId: user.id, status: { not: "DRAFT" } },
    include: pipInclude,
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">My performance improvement plan</h1>
      {pips.length === 0 ? (
        <p className="mt-4 max-w-lg text-sm text-gray-600">
          There is no performance improvement plan on your record.
        </p>
      ) : (
        <>
          <p className="mt-1 mb-6 max-w-2xl text-sm text-gray-600">
            Everything recorded in this process is visible to you here: the
            standard you&apos;re being measured against, the support provided,
            and the outcome of every review. Your weekly check-ins continue as
            normal and are linked below where a review used one. Questions
            belong in your weekly conversation with your manager, or with HR.
          </p>
          <div className="space-y-8">
            {pips.map((pip) => (
              <PipView key={pip.id} pip={pip} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
