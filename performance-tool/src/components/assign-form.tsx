"use client";

import { useActionState } from "react";
import { assignScorecardAction } from "@/app/admin/templates/actions";

export function AssignForm({
  userId,
  templates,
}: {
  userId: string;
  templates: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignScorecardAction, {});
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="templateId"
        required
        defaultValue=""
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
        aria-label="Template"
      >
        <option value="" disabled>
          Choose template…
        </option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        name="effectiveFrom"
        required
        defaultValue={today}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
        aria-label="Effective from"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-heya-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-heya-blue-dark disabled:opacity-50"
      >
        {pending ? "Assigning…" : "Assign"}
      </button>
      {state.error ? (
        <span className="w-full text-sm text-red-600">{state.error}</span>
      ) : state.done ? (
        <span className="w-full text-sm text-heya-green">Assigned ✓</span>
      ) : null}
    </form>
  );
}
