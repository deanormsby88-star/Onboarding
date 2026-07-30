import Link from "next/link";
import type { Prisma } from "@prisma/client";
import type { pipInclude } from "@/lib/pips";
import { weekLabel } from "@/lib/weeks";

type PipFull = Prisma.PipGetPayload<{ include: typeof pipInclude }>;

const d = (date: Date | null | undefined) =>
  date ? date.toISOString().slice(0, 10) : null;

/**
 * Read-only PIP view, shared by the subject's own "My PIP" page and the
 * manager's person view. The process is transparent by design: what the
 * admin records is exactly what the person sees.
 */
export function PipView({ pip }: { pip: PipFull }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              pip.status === "ACTIVE"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {pip.status === "ACTIVE" ? "Active" : "Closed"}
          </span>
          <span className="ml-3 text-gray-600">
            Started {d(pip.startDate)}
            {pip.endDate ? ` · review period to ${d(pip.endDate)}` : ""}
            {" · opened by "}
            {pip.openedBy.name}
          </span>
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          The standard required
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm">{pip.standardRequired}</p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Where performance is falling short
        </h3>
        <ul className="mt-2 space-y-3 text-sm">
          {pip.measures.map((m) => (
            <li key={m.id}>
              <p className="font-medium">
                {m.measure.code} {m.measure.name}
              </p>
              <p className="text-gray-600">{m.shortfall}</p>
              <p className="mt-1 rounded-md bg-blue-50/60 px-3 py-1.5 text-xs text-gray-700">
                The standard (a 3): {m.measure.anchor3}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Support provided
        </h3>
        {pip.supportActions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {pip.supportActions.map((s) => (
              <li key={s.id}>
                {d(s.providedAt)} ·{" "}
                <span className="text-gray-500">{s.type.toLowerCase()}</span> —{" "}
                {s.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Reviews
        </h3>
        {pip.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No reviews yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {pip.reviews.map((r) => (
              <li key={r.id}>
                {d(r.reviewDate)}
                {r.checkIn ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      href={`/check-in/${r.checkIn.id}`}
                      className="text-heya-blue hover:underline"
                    >
                      {weekLabel({
                        isoYear: r.checkIn.isoYear,
                        isoWeek: r.checkIn.isoWeek,
                      })}
                    </Link>
                  </>
                ) : null}{" "}
                — {r.outcome}
              </li>
            ))}
          </ul>
        )}
      </section>

      {pip.status === "CLOSED" && pip.finalOutcome ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Final outcome
          </h3>
          <p className="mt-2 font-medium">{pip.finalOutcome}</p>
          {pip.outcomeReasoning ? (
            <p className="mt-1 whitespace-pre-line text-gray-600">
              {pip.outcomeReasoning}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
