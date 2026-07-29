import { requireUser } from "@/lib/current-user";
import { visibleUserIds } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

const roleLabel = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  ADMIN: "Admin",
} as const;

/**
 * Phase 1 landing page: shows who you are and exactly whose records you can
 * see, straight from the data-access layer — the screen used to verify the
 * permission boundaries at the Phase 1 gate. Replaced by "This week" /
 * "My team" in Phase 3.
 */
export default async function HomePage() {
  const user = await requireUser();
  const ids = await visibleUserIds(user);
  const visible = await db.user.findMany({
    where: ids === null ? {} : { id: { in: ids } },
    orderBy: { name: "asc" },
    include: { manager: { select: { name: true } } },
  });

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">
        Welcome, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Signed in as {user.email} · {roleLabel[user.role]}
        {user.jobTitle ? ` · ${user.jobTitle}` : ""}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Records you can see</h2>
        <p className="mt-1 text-sm text-gray-600">
          {user.role === "ADMIN"
            ? "You are an admin, so every record is visible to you."
            : "Yourself, plus everyone who reports up to you. Peers and your own manager are never visible."}
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Reports to</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5">
                    {v.name}
                    {v.id === user.id ? (
                      <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-heya-blue">
                        you
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">{roleLabel[v.role]}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {v.manager?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {v.isActive ? (
                      <span className="text-heya-green">Active</span>
                    ) : (
                      <span className="text-gray-400">Deactivated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-sm text-gray-500">
        Weekly check-ins arrive in Phase 3. This build is Phase 1: sign-in,
        people, hierarchy and access control.
      </p>
    </AppShell>
  );
}
