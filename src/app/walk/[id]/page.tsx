"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROOMS, employeeName, PresenceStatus } from "@/lib/floorplan";

interface PersonState {
  presence: PresenceStatus;
  note: string;
  noteCategory: "follow_up" | "hr";
  noteOpen: boolean;
}

const PRESENCE_OPTIONS: { value: PresenceStatus; label: string; active: string }[] = [
  { value: "present", label: "Present", active: "bg-green-600 text-white" },
  { value: "break", label: "On break", active: "bg-amber-500 text-white" },
  { value: "absent", label: "Absent", active: "bg-red-600 text-white" },
  { value: "not_started", label: "Shift hasn't started", active: "bg-slate-600 text-white" },
];

export default function WalkPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const search = useSearchParams();
  const roomIdx = Math.min(Math.max(Number(search.get("room") ?? 0) || 0, 0), ROOMS.length - 1);
  const room = ROOMS[roomIdx];

  const [walker, setWalker] = useState<string>("");
  const [people, setPeople] = useState<Record<number, PersonState>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const defaultState = useCallback((): Record<number, PersonState> => {
    const s: Record<number, PersonState> = {};
    for (const num of room.employeeNumbers) {
      s[num] = { presence: "present", note: "", noteCategory: "follow_up", noteOpen: false };
    }
    return s;
  }, [room]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/walks/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.walk) {
          if (data.walk.status !== "in_progress") {
            router.replace(`/walk/${params.id}/summary?done=1`);
            return;
          }
          setWalker(data.walk.walker);
        }
        const base = defaultState();
        for (const e of data.entries ?? []) {
          if (e.room_id === room.id && base[e.employee_number]) {
            base[e.employee_number] = {
              presence: e.presence,
              note: e.note ?? "",
              noteCategory: e.note_category === "hr" ? "hr" : "follow_up",
              noteOpen: Boolean(e.note),
            };
          }
        }
        setPeople(base);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPeople(defaultState());
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, room.id, defaultState, router]);

  const noteCount = useMemo(
    () => Object.values(people).filter((p) => p.note.trim()).length,
    [people]
  );

  function update(num: number, patch: Partial<PersonState>) {
    setPeople((prev) => ({ ...prev, [num]: { ...prev[num], ...patch } }));
  }

  async function saveRoom(next: number) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/walks/${params.id}/entries`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          entries: room.employeeNumbers.map((num) => ({
            employeeNumber: num,
            presence: people[num]?.presence ?? "present",
            note: people[num]?.note ?? "",
            noteCategory: people[num]?.noteCategory ?? "follow_up",
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save room");
      }
      if (next >= ROOMS.length) {
        router.push(`/walk/${params.id}/summary`);
      } else {
        router.push(`/walk/${params.id}?room=${next}`);
        window.scrollTo({ top: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isLast = roomIdx === ROOMS.length - 1;

  return (
    <main className="flex flex-col gap-4">
      <header className="sticky top-0 -mx-4 bg-slate-100/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            Walker: <strong className="text-slate-700">{walker || "…"}</strong>
          </span>
          <span>
            Room {roomIdx + 1} of {ROOMS.length}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((roomIdx + 1) / ROOMS.length) * 100}%` }}
          />
        </div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          Go to <span className="text-blue-700">Room {room.name}</span>
        </h1>
        <p className="text-xs text-slate-500">
          {room.employeeNumbers.length} people should be here
          {noteCount > 0 && ` · ${noteCount} note${noteCount === 1 ? "" : "s"} in this room`}
        </p>
      </header>

      {!loaded ? (
        <p className="py-10 text-center text-slate-400">Loading…</p>
      ) : (
        <section className="flex flex-col gap-3">
          {room.employeeNumbers.map((num) => {
            const p = people[num];
            if (!p) return null;
            return (
              <div key={num} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{employeeName(num)}</div>
                    <div className="text-xs text-slate-400">#{num}</div>
                  </div>
                  <button
                    onClick={() => update(num, { noteOpen: !p.noteOpen })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      p.note.trim()
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.note.trim() ? "Note ✓" : p.noteOpen ? "Hide note" : "+ Note"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {PRESENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update(num, { presence: opt.value })}
                      className={`rounded-xl py-2.5 text-sm font-bold transition ${
                        p.presence === opt.value
                          ? opt.active
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {p.noteOpen && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex gap-2">
                      {(
                        [
                          ["follow_up", "Follow-up"],
                          ["hr", "HR intervention"],
                        ] as const
                      ).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => update(num, { noteCategory: val })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            p.noteCategory === val
                              ? "bg-red-600 text-white"
                              : "bg-white text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={p.note}
                      onChange={(e) => update(num, { note: e.target.value })}
                      placeholder="What needs to be followed up on?"
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-lg gap-2">
          {roomIdx > 0 && (
            <button
              onClick={() => saveRoom(roomIdx - 1)}
              disabled={saving || !loaded}
              className="rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-700 disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            onClick={() => saveRoom(roomIdx + 1)}
            disabled={saving || !loaded}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-lg font-bold text-white shadow disabled:bg-slate-300"
          >
            {saving ? "Saving…" : isLast ? "Save & review" : "Save & next room"}
          </button>
        </div>
      </footer>
    </main>
  );
}
