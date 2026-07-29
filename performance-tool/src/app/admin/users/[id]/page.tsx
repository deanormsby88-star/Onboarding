import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { UserForm } from "@/components/user-form";
import { updateUserAction } from "../actions";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();

  const managers = await db.user.findMany({
    where: { isActive: true, id: { not: id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const boundAction = updateUserAction.bind(null, id);

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Edit {user.name}</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        {user.entraObjectId
          ? "Microsoft account linked."
          : "Not signed in yet — their first sign-in will link by email."}
      </p>
      <UserForm
        action={boundAction}
        managers={managers}
        initial={{
          name: user.name,
          email: user.email,
          jobTitle: user.jobTitle,
          role: user.role,
          managerId: user.managerId,
        }}
        submitLabel="Save changes"
      />
    </AppShell>
  );
}
