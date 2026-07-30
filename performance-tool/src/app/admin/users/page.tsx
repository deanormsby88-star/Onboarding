import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { listUsersWithReports } from "@/lib/users";
import { AppShell } from "@/components/app-shell";
import { resendWelcomeAction, setUserActiveAction } from "./actions";

const roleLabel = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  ADMIN: "Admin",
} as const;

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await listUsersWithReports();

  return (
    <AppShell user={admin}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            People, roles and the reporting hierarchy. Sign-in access follows
            these records — there is no separate invite step.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-lg bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
        >
          Add person
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Reports to</th>
              <th className="px-4 py-2.5 font-medium">Direct reports</th>
              <th className="px-4 py-2.5 font-medium">Entra link</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      u.role === "ADMIN" ? "text-heya-purple" : undefined
                    }
                  >
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {u.manager?.name ?? "—"}
                </td>
                <td className="px-4 py-2.5">{u._count.reports}</td>
                <td className="px-4 py-2.5">
                  {u.entraObjectId ? (
                    <span className="text-heya-green">Linked</span>
                  ) : (
                    <span className="text-gray-400">Awaiting first sign-in</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {u.isActive ? (
                    <span className="text-heya-green">Active</span>
                  ) : (
                    <span className="text-gray-400">Deactivated</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium text-heya-blue hover:underline"
                    >
                      Edit
                    </Link>
                    {u.isActive ? (
                      <form
                        action={async () => {
                          "use server";
                          await resendWelcomeAction(u.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-gray-500 hover:underline"
                          title="Email them the sign-in link and a one-paragraph intro"
                        >
                          Send welcome
                        </button>
                      </form>
                    ) : null}
                    {u.id !== admin.id ? (
                      <form
                        action={async () => {
                          "use server";
                          await setUserActiveAction(u.id, !u.isActive);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-gray-500 hover:underline"
                        >
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Deactivating here blocks the next request. Also disable the account in
        Entra ID — an Entra-disabled account is locked out as soon as its
        token expires, within the hour.
      </p>
    </AppShell>
  );
}
