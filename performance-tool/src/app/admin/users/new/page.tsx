import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { UserForm } from "@/components/user-form";
import { createUserAction } from "../actions";

export default async function NewUserPage() {
  const admin = await requireAdmin();
  const managers = await db.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Add person</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        They sign in with their Heya Microsoft account; no invite or password
        needed.
      </p>
      <UserForm
        action={createUserAction}
        managers={managers}
        submitLabel="Add person"
      />
    </AppShell>
  );
}
