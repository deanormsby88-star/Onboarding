"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Mirrors TemplateInput in src/lib/scorecards.ts (client-safe copy). */
export type EditorMeasure = {
  code: string;
  name: string;
  definition: string;
  anchor3: string;
  weight: number;
};
export type EditorPerspective = {
  kind: string;
  label: string;
  weightPct: number;
  measures: EditorMeasure[];
};
export type EditorTemplate = {
  name: string;
  description: string;
  perspectives: EditorPerspective[];
};

const emptyMeasure = (): EditorMeasure => ({
  code: "",
  name: "",
  definition: "",
  anchor3: "",
  weight: 1,
});

export const ALL_SECTIONS: { kind: string; label: string }[] = [
  { kind: "DELIVERY_QUALITY", label: "Delivery and Quality" },
  { kind: "CLIENT_STAKEHOLDER", label: "Client and Stakeholder" },
  { kind: "COMMERCIAL_EFFICIENCY", label: "Commercial and Efficiency" },
  { kind: "PEOPLE_GROWTH", label: "People and Growth" },
];

/** Scale the remaining weights so they sum to 100, keeping proportions. */
function redistribute(perspectives: EditorPerspective[]): EditorPerspective[] {
  const sum = perspectives.reduce((s, p) => s + p.weightPct, 0);
  if (perspectives.length === 0) return perspectives;
  if (sum <= 0) {
    const equal = Math.floor(100 / perspectives.length);
    return perspectives.map((p, i) => ({
      ...p,
      weightPct: i === 0 ? 100 - equal * (perspectives.length - 1) : equal,
    }));
  }
  const scaled = perspectives.map((p) => ({
    ...p,
    weightPct: Math.round((p.weightPct * 100) / sum),
  }));
  const drift = 100 - scaled.reduce((s, p) => s + p.weightPct, 0);
  if (drift !== 0) {
    const biggest = scaled.reduce((a, b) => (b.weightPct > a.weightPct ? b : a));
    biggest.weightPct += drift;
  }
  return scaled;
}

export function TemplateEditor({
  initial,
  onSave,
}: {
  initial: EditorTemplate;
  onSave: (payload: string) => Promise<{ error?: string; id?: string }>;
}) {
  const router = useRouter();
  const [tpl, setTpl] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const weightTotal = tpl.perspectives.reduce((s, p) => s + p.weightPct, 0);

  const setPerspective = (i: number, patch: Partial<EditorPerspective>) =>
    setTpl((t) => ({
      ...t,
      perspectives: t.perspectives.map((p, pi) =>
        pi === i ? { ...p, ...patch } : p
      ),
    }));

  const removeSection = (i: number) =>
    setTpl((t) => ({
      ...t,
      perspectives: redistribute(t.perspectives.filter((_, pi) => pi !== i)),
    }));

  const addSection = (kind: string, label: string) =>
    setTpl((t) => {
      const order = ALL_SECTIONS.map((s) => s.kind);
      const next = [...t.perspectives, { kind, label, weightPct: 0, measures: [] }];
      next.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
      return { ...t, perspectives: next };
    });

  const missingSections = ALL_SECTIONS.filter(
    (s) => !tpl.perspectives.some((p) => p.kind === s.kind)
  );

  const setMeasure = (pi: number, mi: number, patch: Partial<EditorMeasure>) =>
    setTpl((t) => ({
      ...t,
      perspectives: t.perspectives.map((p, i) =>
        i === pi
          ? {
              ...p,
              measures: p.measures.map((m, j) =>
                j === mi ? { ...m, ...patch } : m
              ),
            }
          : p
      ),
    }));

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await onSave(
        JSON.stringify({
          name: tpl.name,
          description: tpl.description,
          perspectives: tpl.perspectives.map(({ label: _label, ...p }) => p),
        })
      );
      if (result.error) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/admin/templates");
        router.refresh();
      }
    });

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-heya-blue focus:outline-none";

  return (
    <div className="max-w-3xl space-y-8">
      {error ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div>
          <label className="block text-sm font-medium" htmlFor="tpl-name">
            Template name
          </label>
          <input
            id="tpl-name"
            className={`mt-1 ${inputCls}`}
            value={tpl.name}
            onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
            placeholder="e.g. Account Manager"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="tpl-desc">
            Description / scope notes
          </label>
          <textarea
            id="tpl-desc"
            className={`mt-1 ${inputCls}`}
            rows={2}
            value={tpl.description}
            onChange={(e) => setTpl({ ...tpl, description: e.target.value })}
          />
        </div>
      </div>

      <p
        className={`text-sm font-medium ${
          weightTotal === 100 ? "text-heya-green" : "text-amber-600"
        }`}
      >
        Perspective weights: {weightTotal}%{" "}
        {weightTotal === 100 ? "✓" : "— must sum to 100%"}
      </p>

      {tpl.perspectives.map((p, pi) => (
        <section
          key={p.kind}
          className="rounded-lg border border-gray-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{p.label}</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                Weight
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={p.weightPct}
                  onChange={(e) =>
                    setPerspective(pi, { weightPct: Number(e.target.value) })
                  }
                />
                %
              </label>
              <button
                type="button"
                onClick={() => removeSection(pi)}
                disabled={tpl.perspectives.length <= 1}
                className="text-sm text-gray-500 hover:text-red-600 disabled:text-gray-300"
                title="Remove this section; its weight is shared out across the rest"
              >
                Remove section
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {p.measures.map((mm, mi) => (
              <div
                key={mi}
                className="rounded-md border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs font-medium text-gray-600">
                    Code
                    <input
                      className="mt-1 block w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      value={mm.code}
                      onChange={(e) => setMeasure(pi, mi, { code: e.target.value })}
                      placeholder="1.1"
                    />
                  </label>
                  <label className="grow text-xs font-medium text-gray-600">
                    Measure
                    <input
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      value={mm.name}
                      onChange={(e) => setMeasure(pi, mi, { name: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Weight
                    <input
                      type="number"
                      min={1}
                      className="mt-1 block w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      value={mm.weight}
                      onChange={(e) =>
                        setMeasure(pi, mi, { weight: Number(e.target.value) })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPerspective(pi, {
                        measures: p.measures.filter((_, j) => j !== mi),
                      })
                    }
                    className="mb-1 text-sm text-gray-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
                <label className="mt-3 block text-xs font-medium text-gray-600">
                  What is being assessed
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    rows={2}
                    value={mm.definition}
                    onChange={(e) =>
                      setMeasure(pi, mi, { definition: e.target.value })
                    }
                  />
                </label>
                <label className="mt-3 block text-xs font-medium text-gray-600">
                  What a 3 looks like{" "}
                  <span className="font-normal text-gray-500">
                    (shown beside the rating control at scoring time)
                  </span>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    rows={2}
                    value={mm.anchor3}
                    onChange={(e) => setMeasure(pi, mi, { anchor3: e.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setPerspective(pi, { measures: [...p.measures, emptyMeasure()] })
            }
            disabled={p.measures.length >= 5}
            className="mt-4 text-sm font-medium text-heya-blue hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            + Add measure {p.measures.length >= 5 ? "(max 5)" : ""}
          </button>
        </section>
      ))}

      {missingSections.length > 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
          <p className="text-sm text-gray-600">
            Removed sections — add one back (it returns at 0%, set its weight
            after). Bear in mind the four fixed sections are what keep scores
            comparable across roles.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missingSections.map((s) => (
              <button
                key={s.kind}
                type="button"
                onClick={() => addSection(s.kind, s.label)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                + {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save template"}
        </button>
        <Link href="/admin/templates" className="text-sm text-gray-600 hover:underline">
          Cancel
        </Link>
      </div>
    </div>
  );
}
