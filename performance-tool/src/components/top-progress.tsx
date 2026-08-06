/**
 * Indeterminate progress bar pinned to the top of the viewport.
 *
 * Rendered from loading.tsx files, so it appears the instant a navigation
 * starts and vanishes when the server finishes rendering — no client-side
 * JavaScript and no router event wiring. Pages here are server-rendered
 * against a database, so a slow page is normal and silence is the problem
 * this solves.
 */
export function TopProgress() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-heya-blue/15"
    >
      <div className="animate-heya-progress h-full w-1/4 bg-heya-blue" />
    </div>
  );
}

/** Grey placeholder block used to sketch a page while it loads. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );
}
