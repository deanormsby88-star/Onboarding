"use client";

import { useEffect, useState } from "react";

interface Walk {
  id: string;
  walker: string;
  started_at: string;
  submitted_at: string | null;
  status: string;
  email_status: string | null;
}

export default function HistoryPage() {
  const [walks, setWalks] = useState<Walk[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/walks")
      .then((r) => r.json())
      .then((data) => setWalks(data.walks ?? []))
      .catch(() => setError("Failed to load walks"));
  }, []);

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">Past floor walks</h1>
        <a href="/" className="text-sm font-medium text-blue-600 underline">
          New walk
        </a>
      </header>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {!walks && !error && <p className="py-8 text-center text-slate-400">Loading…</p>}
      {walks && walks.length === 0 && (
        <p className="py-8 text-center text-slate-400">No floor walks yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {walks?.map((w) => (
          <li key={w.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  #{w.id} — {w.walker}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(w.started_at).toLocaleString("en-ZA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  w.status === "submitted"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {w.status === "submitted" ? "Submitted" : "In progress"}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {w.status === "submitted" ? (
                <>
                  <a
                    href={`/api/walks/${w.id}/pdf`}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-center text-sm font-bold text-white"
                  >
                    Download PDF
                  </a>
                  <a
                    href={`/walk/${w.id}/summary`}
                    className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-sm font-bold text-slate-700"
                  >
                    View summary
                  </a>
                </>
              ) : (
                <a
                  href={`/walk/${w.id}?room=0`}
                  className="flex-1 rounded-lg bg-amber-500 py-2 text-center text-sm font-bold text-white"
                >
                  Continue walk
                </a>
              )}
            </div>
            {w.email_status && (
              <p className="mt-2 text-xs text-slate-400">Email: {w.email_status}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
