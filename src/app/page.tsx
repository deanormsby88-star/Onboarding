"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WALKERS, ROOMS } from "@/lib/floorplan";

export default function LandingPage() {
  const router = useRouter();
  const [walker, setWalker] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function start() {
    if (!walker || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/walks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walker }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      router.push(`/walk/${data.walk.id}?room=0`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start walk");
      setStarting(false);
    }
  }

  const totalPeople = ROOMS.reduce((n, r) => n + r.employeeNumbers.length, 0);

  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-blue-700">Floor Walk</h1>
        <p className="mt-1 text-sm text-slate-500">
          {ROOMS.length} rooms &middot; {totalPeople} people on the plan
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="walker">
          Who is doing the walk?
        </label>
        <select
          id="walker"
          value={walker}
          onChange={(e) => setWalker(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-base focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select your name…</option>
          {WALKERS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-sm text-slate-500">Date &amp; time (recorded automatically)</div>
          <div className="mt-1 font-mono text-lg font-semibold" suppressHydrationWarning>
            {now
              ? now.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "medium" })
              : "…"}
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <button
          onClick={start}
          disabled={!walker || starting}
          className="mt-5 w-full rounded-xl bg-blue-600 p-4 text-lg font-bold text-white shadow transition active:scale-[0.99] disabled:bg-slate-300"
        >
          {starting ? "Starting…" : "Start floor walk"}
        </button>
      </section>

      <a href="/history" className="text-center text-sm font-medium text-blue-600 underline">
        View past floor walks
      </a>
    </main>
  );
}
