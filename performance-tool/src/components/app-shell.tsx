import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { CurrentUser } from "@/lib/current-user";

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
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
              href="/scorecard"
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              My scorecard
            </Link>
            {user.role === "ADMIN" ? (
              <>
                <Link
                  href="/admin/users"
                  className="text-sm font-medium text-heya-purple hover:underline"
                >
                  Users
                </Link>
                <Link
                  href="/admin/templates"
                  className="text-sm font-medium text-heya-purple hover:underline"
                >
                  Templates
                </Link>
                <Link
                  href="/admin/assign"
                  className="text-sm font-medium text-heya-purple hover:underline"
                >
                  Assign
                </Link>
              </>
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
