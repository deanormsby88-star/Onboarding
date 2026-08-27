import { requireUser } from "@/lib/current-user";
import { visibleUserIds } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { setBlockerStatusFromListAction } from "./actions";

/**
 * Blockers you own or can see, with the controls to close them out.
 *
 * setBlockerStatus and its server action already existed but nothing ever
 * rendered a control for them, so a blocker could be raised and never
 * cleared — it just kept generating the daily "overdue" email with no way
 * out. This page is that way out.
 */

const OPEN_STATUSES = ["OPEN", "IN_PROGRESS"] as const;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function BlockersPage() {
  const user = await requireUser();
  const ids = await visibleUserIds(user);

  // Blockers you own (whoever raised them), plus blockers raised by anyone
  // your role lets you see. Admins get no hierarchy filter.
  const scope = {
    OR: [
      { ownerId: user.id },
      { userId: user.id },
      ...(ids === null ? [{}] : [{ userId: { in: ids } }]),
    ],
  };

  const blockers = await db.blocker.findMany({
    where: scope,
    orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  const open = blockers.filter((b) =>
    (OPEN_STATUSES as readonly string[]).includes(b.status)
  );
  const closed = blockers
    .filter((b) => !(OPEN_STATUSES as readonly string[]).includes(b.status))
    .slice(0, 20);

  const today = day(new Date())!;
  const mine = open.filter((b) => b.ownerId === user.id);
  const others = open.filter((b) => b.ownerId !== user.id);

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Blockers</h1>
      <p className="mt-1 text-sm text-gray-600">
        Anything raised in a check-in and promoted to a tracked blocker. Close
        it out here and the overdue reminders stop.
      </p>

      <Section
        title="Yours to clear"
        empty="Nothing assigned to you. The overdue emails come from this list, so an empty list means no more of them."
        blockers={mine}
        today={today}
        actionable
      />

      <Section
        title={user.role === "ADMIN" ? "Everyone else's" : "Your team's"}
        empty="Nothing open."
        blockers={others}
        today={today}
        actionable
      />

      {closed.length > 0 ? (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            Recently closed ({closed.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {closed.map((b) => (
              <li
                key={b.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
              >
                <span className="line-through">{b.description}</span>
                <span className="mt-1 block text-xs">
                  {b.status.toLowerCase()} ·{" "}
                  {b.resolvedAt ? day(b.resolvedAt) : "—"}
                  {b.resolution ? ` · ${b.resolution}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </AppShell>
  );
}

type Row = {
  id: string;
  description: string;
  status: string;
  targetDate: Date | null;
  resolution: string | null;
  user: { name: string };
  owner: { name: string } | null;
};

function Section({
  title,
  empty,
  blockers,
  today,
  actionable,
}: {
  title: string;
  empty: string;
  blockers: Row[];
  today: string;
  actionable: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium">
        {title}{" "}
        <span className="text-sm font-normal text-gray-500">
          ({blockers.length})
        </span>
      </h2>
      {blockers.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {blockers.map((b) => {
            const due = day(b.targetDate);
            const overdue = due !== null && due < today;
            return (
              <li
                key={b.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <p className="text-sm whitespace-pre-line">{b.description}</p>
                <p className="mt-1.5 text-xs text-gray-500">
                  Raised by {b.user.name} · owner{" "}
                  {b.owner?.name ?? "unassigned"}
                  {due ? " · due " : ""}
                  {due ? (
                    overdue ? (
                      <span className="font-medium text-red-600">
                        {due} (overdue)
                      </span>
                    ) : (
                      due
                    )
                  ) : (
                    " · no target date"
                  )}
                  {b.status === "IN_PROGRESS" ? " · in progress" : ""}
                </p>
                {actionable ? (
                  <form
                    action={setBlockerStatusFromListAction}
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="blockerId" value={b.id} />
                    <input
                      name="resolution"
                      placeholder="What changed? (saved on the record)"
                      className="grow rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <SubmitButton
                      name="status"
                      value="RESOLVED"
                      pendingLabel="Resolving…"
                      className="rounded-md bg-heya-green px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                    >
                      Resolve
                    </SubmitButton>
                    {b.status === "OPEN" ? (
                      <SubmitButton
                        name="status"
                        value="IN_PROGRESS"
                        pendingLabel="Saving…"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        In progress
                      </SubmitButton>
                    ) : null}
                    <SubmitButton
                      name="status"
                      value="DROPPED"
                      pendingLabel="Dropping…"
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Drop
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
