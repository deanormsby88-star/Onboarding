"use client";

import { useActionState } from "react";
import { createPipAction } from "@/app/admin/pips/actions";

export function PipCreateForm({
  userId,
  userName,
  perspectives,
}: {
  userId: string;
  userName: string;
  perspectives: {
    label: string;
    measures: { id: string; code: string; name: string; anchor3: string }[];
  }[];
}) {
  const [state, formAction, pending] = useActionState(createPipAction, {});
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="mt-6 max-w-3xl space-y-6">
      <input type="hidden" name="userId" value={userId} />
      {state.error ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm font-medium" htmlFor="standardRequired">
          The standard required of {userName}, stated explicitly
        </label>
        <textarea
          id="standardRequired"
          name="standardRequired"
          rows={3}
          required
          placeholder="What does meeting the standard look like, concretely and measurably?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="text-sm">
            Start date
            <input
              type="date"
              name="startDate"
              defaultValue={today}
              required
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Review period ends
            <input
              type="date"
              name="endDate"
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-sm font-medium">
          Which scorecard measures are falling short?
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Tick each one and describe the shortfall. The measure&apos;s own
          &quot;3 = meets standard&quot; anchor is the standard.
        </p>
        <div className="mt-3 space-y-4">
          {perspectives.map((p) => (
            <div key={p.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {p.label}
              </p>
              {p.measures.map((m) => (
                <div key={m.id} className="mt-2 rounded-md border border-gray-200 p-3">
                  <input type="hidden" name="measureId" value={m.id} />
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" name={`include-${m.id}`} className="mt-0.5" />
                    <span>
                      <span className="font-medium">
                        {m.code} {m.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        Standard: {m.anchor3}
                      </span>
                    </span>
                  </label>
                  <input
                    name={`shortfall-${m.id}`}
                    placeholder="How is performance falling short of that standard?"
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-heya-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-heya-blue-dark disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create PIP"}
      </button>
    </form>
  );
}
