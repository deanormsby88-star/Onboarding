"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROOMS as STATIC_ROOMS, Room, employeeName, PresenceStatus } from "@/lib/floorplan";

interface PersonState {
  presence: PresenceStatus;
  note: string;
  noteCategory: "follow_up" | "hr";
  noteOpen: boolean;
  moveOpen: boolean;
  moveTo: string;
}

const PRESENCE_OPTIONS: { value: PresenceStatus; label: string; active: string }[] = [
  { value: "present", label: "Present", active: "bg-green-600 text-white" },
  { value: "break", label: "On break", active: "bg-amber-500 text-white" },
  { value: "absent", label: "Absent", active: "bg-red-600 text-white" },
  { value: "not_started", label: "Shift hasn't started", active: "bg-slate-600 text-white" },
];

function freshPerson(): PersonState {
  return { presence: "present", note: "", noteCategory: "follow_up", noteOpen: false, moveOpen: false, moveTo: "" };
}

export default function WalkPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const search = useSearchParams();

  const [rooms, setRooms] = useState<Room[]>(STATIC_ROOMS);
  const [names, setNames] = useState<Record<number, string>>({});
  const roomIdx = Math.min(Math.max(Number(search.get("room") ?? 0) || 0, 0), rooms.length - 1);
  const room = rooms[roomIdx];

  const [walker, setWalker] = useState<string>("");
  const [people, setPeople] = useState<Record<number, PersonState>>({});
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const nameOf = useCallback(
    (num: number) => names[num] ?? employeeName(num),
    [names]
  );

  const defaultState = useCallback((r: Room): Record<number, PersonState> => {
    const s: Record<number, PersonState> = {};
    for (const num of r.employeeNumbers) s[num] = freshPerson();
    return s;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setNotice(null);
    setAddOpen(false);
    setAddName("");
    Promise.all([
      fetch(`/api/walks/${params.id}`).then((r) => r.json()),
      fetch(`/api/floorplan`).then((r) => r.json()),
    ])
      .then(([walkData, planData]) => {
        if (cancelled) return;
        const effRooms: Room[] = planData.rooms?.length ? planData.rooms : STATIC_ROOMS;
        setRooms(effRooms);
        if (planData.names) setNames(planData.names);
        if (walkData.walk) {
          if (walkData.walk.status !== "in_progress") {
            router.replace(`/walk/${params.id}/summary?done=1`);
            return;
          }
          setWalker(walkData.walk.walker);
        }
        const idx = Math.min(Math.max(Number(search.get("room") ?? 0) || 0, 0), effRooms.length - 1);
        const r = effRooms[idx];
        const base = defaultState(r);
        for (const e of walkData.entries ?? []) {
          if (e.room_id === r.id && base[e.employee_number]) {
            base[e.employee_number] = {
              ...freshPerson(),
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
          setPeople(defaultState(room));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, roomIdx]);

  const noteCount = useMemo(
    () => Object.values(people).filter((p) => p.note.trim()).length,
    [people]
  );

  function update(num: number, patch: Partial<PersonState>) {
    setPeople((prev) => ({ ...prev, [num]: { ...prev[num], ...patch } }));
  }

  async function movePerson(num: number) {
    const p = people[num];
    if (!p?.moveTo || p.moveTo === room.id || moving !== null) return;
    setMoving(num);
    setError(null);
    try {
      const res = await fetch(`/api/floorplan/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber: num, toRoomId: p.moveTo, walkId: Number(params.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move");
      const effRooms: Room[] = data.rooms;
      setRooms(effRooms);
      if (data.names) setNames(data.names);
      setPeople((prev) => {
        const next = { ...prev };
        delete next[num];
        return next;
      });
      const targetIdx = effRooms.findIndex((r) => r.id === p.moveTo);
      const targetName = effRooms[targetIdx]?.name ?? p.moveTo;
      setNotice(
        `${nameOf(num)} moved to Room ${targetName}. The floor plan is updated for all future walks.` +
          (targetIdx < roomIdx ? " You've already passed that room — go Back if you still need to check them today." : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move team member");
    } finally {
      setMoving(null);
    }
  }

  async function addPerson() {
    const name = addName.trim();
    if (!name || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, roomId: room.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add team member");
      setRooms(data.rooms);
      if (data.names) setNames(data.names);
      setPeople((prev) => ({ ...prev, [data.employee.number]: freshPerson() }));
      setAddName("");
      setAddOpen(false);
      setNotice(
        `${data.employee.name} (#${data.employee.number}) added to Room ${room.name} — they're on the floor plan for all future walks.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add team member");
    } finally {
      setAdding(false);
    }
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
          entries: room.employeeNumbers
            .filter((num) => people[num])
            .map((num) => ({
              employeeNumber: num,
              presence: people[num].presence,
              note: people[num].note,
              noteCategory: people[num].noteCategory,
            })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save room");
      }
      if (next >= rooms.length) {
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

  const isLast = roomIdx === rooms.length - 1;

  return (
    <main className="flex flex-col gap-4">
      <header className="sticky top-0 -mx-4 bg-slate-100/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            Walker: <strong className="text-slate-700">{walker || "…"}</strong>
          </span>
          <span>
            Room {roomIdx + 1} of {rooms.length}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((roomIdx + 1) / rooms.length) * 100}%` }}
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

      {notice && (
        <p className="rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-800 ring-1 ring-blue-200">
          {notice}
        </p>
      )}

      {!loaded ? (
        <p className="py-10 text-center text-slate-400">Loading…</p>
      ) : (
        <section className="flex flex-col gap-3">
          {room.employeeNumbers.filter((n) => people[n]).length === 0 && (
            <p className="py-6 text-center text-slate-400">No one is assigned to this room.</p>
          )}
          {room.employeeNumbers.map((num) => {
            const p = people[num];
            if (!p) return null;
            return (
              <div key={num} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{nameOf(num)}</div>
                    <div className="text-xs text-slate-400">#{num}</div>
                  </div>
                  <div className="flex flex-none gap-1.5">
                    <button
                      onClick={() => update(num, { moveOpen: !p.moveOpen, moveTo: "" })}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        p.moveOpen ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Move
                    </button>
                    <button
                      onClick={() => update(num, { noteOpen: !p.noteOpen })}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        p.note.trim() ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.note.trim() ? "Note ✓" : p.noteOpen ? "Hide note" : "+ Note"}
                    </button>
                  </div>
                </div>

                {p.moveOpen && (
                  <div className="mt-3 rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
                    <div className="text-xs font-semibold text-blue-900">
                      Sitting somewhere else? Move them to their actual room — this updates the
                      floor plan for future walks too.
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={p.moveTo}
                        onChange={(e) => update(num, { moveTo: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Choose room…</option>
                        {rooms
                          .filter((r) => r.id !== room.id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => movePerson(num)}
                        disabled={!p.moveTo || moving !== null}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                      >
                        {moving === num ? "Moving…" : "Move"}
                      </button>
                    </div>
                  </div>
                )}

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

          {addOpen ? (
            <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-900">
                New starter in this room? Add them to the floor plan.
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPerson()}
                  placeholder="Full name"
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={addPerson}
                  disabled={!addName.trim() || adding}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                >
                  {adding ? "Adding…" : "Add"}
                </button>
                <button
                  onClick={() => {
                    setAddOpen(false);
                    setAddName("");
                  }}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-2xl border-2 border-dashed border-slate-300 p-3.5 text-sm font-bold text-slate-500 transition hover:border-blue-400 hover:text-blue-600"
            >
              + Add a new team member to this room
            </button>
          )}
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
