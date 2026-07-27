"use client";

import { useEffect, useMemo, useState } from "react";
import { ROOMS } from "@/lib/floorplan";

interface Entry {
  room_id: string;
  room_name: string;
  employee_number: number;
  employee_name: string;
  presence: string;
  note: string | null;
  note_category: string | null;
}

interface Walk {
  id: string;
  walker: string;
  started_at: string;
  submitted_at: string | null;
  status: string;
  email_status: string | null;
}

const PRESENCE_LABEL: Record<string, string> = {
  present: "Present",
  break: "On break",
  absent: "Absent",
  not_started: "Shift not started",
};

export default function SummaryPage({ params }: { params: { id: string } }) {
  const [walk, setWalk] = useState<Walk | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ emailSent: boolean; emailDetail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/walks/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.walk) setWalk(data.walk);
        setEntries(data.entries ?? []);
      })
      .catch(() => setError("Failed to load walk"));
  }

  useEffect(load, [params.id]);

  const counts = useMemo(() => {
    const c = { present: 0, break: 0, absent: 0, not_started: 0 };
    for (const e of entries) if (e.presence in c) c[e.presence as keyof typeof c]++;
    return c;
  }, [entries]);

  const notes = useMemo(() => entries.filter((e) => e.note && e.note.trim()), [entries]);
  const missedRooms = useMemo(() => {
    const covered = new Set(entries.map((e) => e.room_id));
    return ROOMS.filter((r) => !covered.has(r.id));
  }, [entries]);

  const submitted = walk?.status === "submitted";

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/walks/${params.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setResult({ emailSent: data.emailSent, emailDetail: data.emailDetail });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-blue-700">
          {submitted ? "Floor walk submitted" : "Review & submit"}
        </h1>
        {walk && (
          <p className="text-sm text-slate-500">
            Walk #{walk.id} by <strong>{walk.walker}</strong> —{" "}
            {new Date(walk.started_at).toLocaleString("en-ZA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </header>

      <section className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl bg-green-100 p-3">
          <div className="text-2xl font-bold text-green-700">{counts.present}</div>
          <div className="text-xs font-medium text-green-800">Present</div>
        </div>
        <div className="rounded-2xl bg-amber-100 p-3">
          <div className="text-2xl font-bold text-amber-700">{counts.break}</div>
          <div className="text-xs font-medium text-amber-800">On break</div>
        </div>
        <div className="rounded-2xl bg-red-100 p-3">
          <div className="text-2xl font-bold text-red-700">{counts.absent}</div>
          <div className="text-xs font-medium text-red-800">Absent</div>
        </div>
        <div className="rounded-2xl bg-slate-200 p-3">
          <div className="text-2xl font-bold text-slate-700">{counts.not_started}</div>
          <div className="text-xs font-medium text-slate-800">Not started</div>
        </div>
      </section>

      {missedRooms.length > 0 && !submitted && (
        <section className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          <strong>{missedRooms.length} room(s) not saved yet:</strong>{" "}
          {missedRooms.map((r) => r.name).join(", ")}. You can still submit, or go{" "}
          <a className="font-bold underline" href={`/walk/${params.id}?room=0`}>
            back to the walk
          </a>
          .
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-red-700">Notes &amp; follow-ups ({notes.length})</h2>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No notes recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {notes.map((e, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="font-semibold">
                  {e.employee_name}{" "}
                  <span className="font-normal text-slate-400">
                    #{e.employee_number} · {e.room_name}
                  </span>
                </div>
                {e.note_category && (
                  <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {e.note_category === "hr" ? "HR intervention" : "Follow-up"}
                  </span>
                )}
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{e.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-700">Everyone checked ({entries.length})</h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {entries.map((e, i) => (
            <li key={i} className="flex items-center justify-between py-1.5">
              <span>
                {e.employee_name}{" "}
                <span className="text-xs text-slate-400">· {e.room_name}</span>
              </span>
              <span
                className={`text-xs font-bold ${
                  e.presence === "present"
                    ? "text-green-600"
                    : e.presence === "break"
                      ? "text-amber-600"
                      : e.presence === "not_started"
                        ? "text-slate-500"
                        : "text-red-600"
                }`}
              >
                {PRESENCE_LABEL[e.presence] ?? e.presence}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

      {submitted ? (
        <section className="flex flex-col gap-3">
          {(result || walk?.email_status) && (
            <p
              className={`rounded-xl p-3 text-center text-sm font-medium ${
                (result ? result.emailSent : walk?.email_status?.startsWith("sent"))
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {result
                ? result.emailSent
                  ? `Report emailed. ${result.emailDetail}`
                  : `Report saved, but email not sent: ${result.emailDetail}`
                : `Email status: ${walk?.email_status}`}
            </p>
          )}
          <a
            href={`/api/walks/${params.id}/pdf`}
            className="rounded-xl bg-blue-600 p-4 text-center text-lg font-bold text-white shadow"
          >
            Download PDF report
          </a>
          <a href="/" className="text-center text-sm font-medium text-blue-600 underline">
            Back to start
          </a>
        </section>
      ) : (
        <button
          onClick={submit}
          disabled={submitting || entries.length === 0}
          className="rounded-xl bg-green-600 p-4 text-lg font-bold text-white shadow disabled:bg-slate-300"
        >
          {submitting ? "Submitting…" : "Submit floor walk"}
        </button>
      )}
    </main>
  );
}
