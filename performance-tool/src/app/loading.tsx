import { SkeletonBlock, TopProgress } from "@/components/top-progress";

/**
 * Fallback shown during any navigation that does not have a closer
 * loading.tsx. Next renders this the moment a link is clicked, so the app
 * always acknowledges the click even when the server render is slow.
 */
export default function Loading() {
  return (
    <div className="min-h-screen">
      <TopProgress />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-5 w-24" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <SkeletonBlock className="h-7 w-64" />
        <SkeletonBlock className="mt-3 h-4 w-80" />
        <div className="mt-8 space-y-3">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      </main>
    </div>
  );
}
