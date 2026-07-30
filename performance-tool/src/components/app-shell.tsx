import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { CurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  // The "My PIP" tab exists only for people who actually have one, so its
  // absence never raises questions for everyone else.
  const hasPip =
    (await db.pip.count({
      where: { userId: user.id, status: { not: "DRAFT" } },
    })) > 0;
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-5">
            <Link href="/" className="font-semibold text-heya-blue">
              Heya Performance
            </Link>
            <Link
              href="/check-in"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              This week
            </Link>
            <Link
              href="/team"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              My team
            </Link>
            <Link
              href="/history"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              History
            </Link>
            <Link
              href="/progress"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              My progress
            </Link>
            <Link
              href="/scorecard"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              My scorecard
            </Link>
            <Link
              href="/objectives"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              Objectives
            </Link>
            {hasPip ? (
              <Link
                href="/pip"
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                My PIP
              </Link>
            ) : null}
            {user.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="text-sm font-medium text-heya-purple hover:underline"
              >
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
