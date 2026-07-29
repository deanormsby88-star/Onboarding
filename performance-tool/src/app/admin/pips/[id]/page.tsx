import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { pipInclude } from "@/lib/pips";
import { weekLabel } from "@/lib/weeks";
import { AppShell } from "@/components/app-shell";
import {
  addPipReviewAction,
  addSupportActionAction,
  closePipAction,
} from "../actions";

export default async function PipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const pip = await db.pip.findUnique({ where: { id }, include: pipInclude });
  if (!pip) notFound();

  const checkIns = await db.checkIn.findMany({
    where: { userId: pip.userId },
    orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
    take: 12,
    select: { id: true, isoYear: true, isoWeek: true },
  });
  const today = new Date().toISOString().slice(0, 10);
  const inputCls = "rounded-md border border-gray-300 px-3 py-1.5 text-sm";

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">
        PIP — {pip.user.name}
        <span
          className={`ml-3 align-middle text-sm font-medium ${
            pip.status === "ACTIVE" ? "text-amber-600" : "text-gray-500"
          }`}
        >
          {pip.status.toLowerCase()}
        </span>
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Opened by {pip.openedBy.name} · {pip.startDate.toISOString().slice(0, 10)}
        {pip.endDate ? ` → ${pip.endDate.toISOString().slice(0, 10)}` : ""} ·{" "}
        <Link href={`/team/${pip.user.id}`} className="text-heya-blue hover:underline">
          person view
        </Link>{" "}
        ·{" "}
        <a
          href={`/api/export/${pip.user.id}`}
          className="text-heya-blue hover:underline"
        >
          export full record (PDF)
        </a>
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          The standard required
        </h2>
        <p className="mt-2 text-sm whitespace-pre-line">{pip.standardRequired}</p>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Measures falling short
        </h2>
        <ul className="mt-2 space-y-3 text-sm">
          {pip.measures.map((m) => (
            <li key={m.id}>
              <p className="font-medium">
                {m.measure.code} {m.measure.name}
              </p>
              <p className="text-gray-600">Shortfall: {m.shortfall}</p>
              <p className="text-xs text-gray-500">Standard (3): {m.measure.anchor3}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Support provided
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {pip.supportActions.length === 0 ? (
            <li className="text-amber-600">
              None recorded yet — a PIP without documented support will not
              hold up.
            </li>
          ) : (
            pip.supportActions.map((s) => (
              <li key={s.id}>
                {s.providedAt.toISOString().slice(0, 10)} ·{" "}
                <span className="text-gray-500">{s.type.toLowerCase()}</span> —{" "}
                {s.description}
              </li>
            ))
          )}
        </ul>
        {pip.status === "ACTIVE" ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              await addSupportActionAction(id, formData);
            }}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <select name="type" className={inputCls} defaultValue="GUIDANCE">
              <option value="TRAINING">Training</option>
              <option value="GUIDANCE">Guidance</option>
              <option value="COUNSELLING">Counselling</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="date" name="providedAt" defaultValue={today} className={inputCls} />
            <input
              name="description"
              required
              placeholder="What support was given?"
              className={`${inputCls} grow`}
            />
            <button type="submit" className="rounded-md bg-heya-blue px-3 py-1.5 text-sm font-medium text-white">
              Record
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Reviews
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {pip.reviews.length === 0 ? (
            <li className="text-gray-500">No reviews yet.</li>
          ) : (
            pip.reviews.map((r) => (
              <li key={r.id}>
                {r.reviewDate.toISOString().slice(0, 10)}
                {r.checkIn ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      href={`/check-in/${r.checkIn.id}`}
                      className="text-heya-blue hover:underline"
                    >
                      {weekLabel({ isoYear: r.checkIn.isoYear, isoWeek: r.checkIn.isoWeek })}
                    </Link>
                  </>
                ) : null}{" "}
                — {r.outcome}
              </li>
            ))
          )}
        </ul>
        {pip.status === "ACTIVE" ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              await addPipReviewAction(id, formData);
            }}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input type="date" name="reviewDate" defaultValue={today} className={inputCls} />
            <select name="checkInId" className={inputCls} defaultValue="">
              <option value="">No linked check-in</option>
              {checkIns.map((c) => (
                <option key={c.id} value={c.id}>
                  {weekLabel({ isoYear: c.isoYear, isoWeek: c.isoWeek })}
                </option>
              ))}
            </select>
            <input
              name="outcome"
              required
              placeholder="Outcome of this review"
              className={`${inputCls} grow`}
            />
            <button type="submit" className="rounded-md bg-heya-blue px-3 py-1.5 text-sm font-medium text-white">
              Record review
            </button>
          </form>
        ) : null}
      </section>

      {pip.status === "ACTIVE" ? (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Close this PIP
          </h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              await closePipAction(id, formData);
            }}
            className="mt-2 space-y-2"
          >
            <input
              name="finalOutcome"
              required
              placeholder="Final outcome (e.g. standard met; extended; proceeded to incapacity process)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              name="outcomeReasoning"
              required
              rows={2}
              placeholder="Reasoning, with reference to the reviews above"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white">
              Close PIP
            </button>
          </form>
        </section>
      ) : pip.finalOutcome ? (
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Final outcome
          </h2>
          <p className="mt-2 font-medium">{pip.finalOutcome}</p>
          <p className="mt-1 whitespace-pre-line text-gray-600">{pip.outcomeReasoning}</p>
        </section>
      ) : null}
    </AppShell>
  );
}
