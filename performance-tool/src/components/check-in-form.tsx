"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveManagerDraftAction,
  saveSelfDraftAction,
  submitManagerAction,
  submitSelfAction,
} from "@/app/check-in/actions";

const RATING_LABELS: Record<number, string> = {
  1: "Well below",
  2: "Below",
  3: "Meets",
  4: "Exceeds",
  5: "Exceptional",
};

export type FormMeasure = {
  id: string;
  code: string;
  name: string;
  definition: string;
  anchor3: string;
};
export type FormPerspective = {
  id: string;
  label: string;
  weightPct: number;
  measures: FormMeasure[];
};
export type FormEntry = {
  rating: number | null;
  notApplicable: boolean;
  naReason: string;
  comment: string;
};
export type NarrativeField = { key: string; label: string; hint?: string };

export function CheckInForm({
  checkInId,
  rater,
  perspectives,
  initialEntries,
  narrativeFields,
  initialNarrative,
  subjectName,
}: {
  checkInId: string;
  rater: "SELF" | "MANAGER";
  perspectives: FormPerspective[];
  initialEntries: Record<string, FormEntry>;
  narrativeFields: NarrativeField[];
  initialNarrative: Record<string, string>;
  subjectName?: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, FormEntry>>(initialEntries);
  const [narrative, setNarrative] = useState(initialNarrative);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ entries, narrative });
  latest.current = { entries, narrative };

  const allMeasures = useMemo(
    () => perspectives.flatMap((p) => p.measures),
    [perspectives]
  );
  const doneCount = allMeasures.filter((m) => {
    const e = entries[m.id];
    return e && (e.rating != null || (e.notApplicable && e.naReason.trim()));
  }).length;

  const buildPayload = useCallback(() => {
    const { entries: e, narrative: n } = latest.current;
    const ratings = allMeasures.map((m) => {
      const entry = e[m.id] ?? {
        rating: null,
        notApplicable: false,
        naReason: "",
        comment: "",
      };
      return {
        measureId: m.id,
        rating: entry.notApplicable ? null : entry.rating,
        notApplicable: entry.notApplicable,
        naReason: entry.naReason || null,
        comment: entry.comment || null,
      };
    });
    const narrativeOut = Object.fromEntries(
      narrativeFields.map((f) => [f.key, n[f.key]?.trim() ? n[f.key] : null])
    );
    return JSON.stringify({ ratings, ...narrativeOut });
  }, [allMeasures, narrativeFields]);

  const save = useCallback(async () => {
    setSaveState("saving");
    const action = rater === "SELF" ? saveSelfDraftAction : saveManagerDraftAction;
    const result = await action(checkInId, buildPayload());
    setSaveState(result.error ? "error" : "saved");
  }, [rater, checkInId, buildPayload]);

  const queueSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 900);
  }, [save]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const setEntry = (measureId: string, patch: Partial<FormEntry>) => {
    setEntries((prev) => ({
      ...prev,
      [measureId]: {
        ...(prev[measureId] ?? {
          rating: null,
          notApplicable: false,
          naReason: "",
          comment: "",
        }),
        ...patch,
      },
    }));
    queueSave();
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    if (timer.current) clearTimeout(timer.current);
    const saveAction = rater === "SELF" ? saveSelfDraftAction : saveManagerDraftAction;
    const saved = await saveAction(checkInId, buildPayload());
    if (saved.error) {
      setSubmitError(saved.error);
      setSubmitting(false);
      return;
    }
    const submitAction = rater === "SELF" ? submitSelfAction : submitManagerAction;
    const result = await submitAction(checkInId);
    if (result.error) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }
    router.push(`/check-in/${checkInId}`);
    router.refresh();
  };

  const accent = rater === "SELF" ? "text-heya-blue" : "text-heya-purple";

  return (
    <div className="space-y-8 pb-24">
      {rater === "MANAGER" && subjectName ? (
        <p className="rounded-md bg-purple-50 px-4 py-3 text-sm text-heya-purple">
          You are rating <strong>{subjectName}</strong>. Their self-ratings stay
          hidden until you submit yours — that is the point.
        </p>
      ) : null}

      {perspectives.map((p) => (
        <section key={p.id}>
          <h2 className="flex items-baseline justify-between border-b border-gray-200 pb-2 text-lg font-medium">
            {p.label}
            <span className="text-sm font-normal text-gray-500">{p.weightPct}%</span>
          </h2>
          <div className="mt-4 space-y-6">
            {p.measures.map((m) => {
              const e = entries[m.id] ?? {
                rating: null,
                notApplicable: false,
                naReason: "",
                comment: "",
              };
              const commentRequired =
                e.rating != null && [1, 2, 5].includes(e.rating);
              return (
                <fieldset
                  key={m.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5"
                >
                  <legend className="sr-only">
                    {m.code} {m.name}
                  </legend>
                  <p className="font-medium">
                    <span className="mr-2 text-gray-400">{m.code}</span>
                    {m.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{m.definition}</p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <div
                        role="radiogroup"
                        aria-label={`Rating for ${m.name}`}
                        className="grid grid-cols-5 gap-1.5"
                      >
                        {[1, 2, 3, 4, 5].map((r) => {
                          const active = !e.notApplicable && e.rating === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() =>
                                setEntry(m.id, { rating: r, notApplicable: false })
                              }
                              className={`rounded-md border px-1 py-2 text-center focus:outline-2 focus:outline-offset-2 focus:outline-heya-blue ${
                                active
                                  ? rater === "SELF"
                                    ? "border-heya-blue bg-heya-blue text-white"
                                    : "border-heya-purple bg-heya-purple text-white"
                                  : "border-gray-300 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <span className="block text-base font-semibold">{r}</span>
                              <span className="block text-[10px] leading-tight sm:text-xs">
                                {RATING_LABELS[r]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={e.notApplicable}
                          onChange={(ev) =>
                            setEntry(m.id, {
                              notApplicable: ev.target.checked,
                              rating: ev.target.checked ? null : e.rating,
                            })
                          }
                        />
                        Not applicable this week
                      </label>
                      {e.notApplicable ? (
                        <input
                          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Why does this measure not apply this week? (required)"
                          value={e.naReason}
                          onChange={(ev) => setEntry(m.id, { naReason: ev.target.value })}
                        />
                      ) : null}
                    </div>

                    <div className="rounded-md bg-blue-50/60 px-3 py-2 text-sm text-gray-700">
                      <span className={`font-medium ${accent}`}>3 — meets standard:</span>{" "}
                      {m.anchor3}
                    </div>
                  </div>

                  <textarea
                    className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    placeholder={
                      commentRequired
                        ? `A rating of ${e.rating} needs a comment — say what happened.`
                        : "Comment (optional)"
                    }
                    aria-label={`Comment for ${m.name}`}
                    value={e.comment}
                    onChange={(ev) => setEntry(m.id, { comment: ev.target.value })}
                  />
                  {commentRequired && !e.comment.trim() ? (
                    <p className="mt-1 text-xs text-amber-600">
                      Required at ratings 1, 2 and 5.
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="border-b border-gray-200 pb-2 text-lg font-medium">
          {rater === "SELF" ? "Your week" : "Coaching"}
        </h2>
        {narrativeFields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm font-medium">{f.label}</span>
            {f.hint ? <span className="ml-2 text-xs text-gray-500">{f.hint}</span> : null}
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={narrative[f.key] ?? ""}
              onChange={(ev) => {
                setNarrative((n) => ({ ...n, [f.key]: ev.target.value }));
                queueSave();
              }}
            />
          </label>
        ))}
      </section>

      {submitError ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Not submitted yet:</p>
          <ul className="mt-1 list-inside list-disc whitespace-pre-line">
            {submitError.split("\n").map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm text-gray-600">
            {doneCount}/{allMeasures.length} measures rated
            <span className="ml-3 text-gray-400">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Draft saved"
                  : saveState === "error"
                    ? "Save failed — will retry on next change"
                    : ""}
            </span>
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
              rater === "SELF"
                ? "bg-heya-blue hover:bg-heya-blue-dark"
                : "bg-heya-purple hover:opacity-90"
            }`}
          >
            {submitting ? "Submitting…" : "Submit your ratings"}
          </button>
        </div>
      </div>
    </div>
  );
}
