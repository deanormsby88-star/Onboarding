"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { UserFormState } from "@/app/admin/users/actions";

export type ManagerOption = { id: string; name: string };

export function UserForm({
  action,
  managers,
  initial,
  submitLabel,
}: {
  action: (prev: UserFormState, formData: FormData) => Promise<UserFormState>;
  managers: ManagerOption[];
  initial?: {
    name: string;
    email: string;
    jobTitle: string | null;
    role: string;
    managerId: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      {state.error ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-heya-blue focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Heya email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={initial?.email}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-heya-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Must match their Microsoft 365 sign-in address — it is how their
          first sign-in is matched to this record.
        </p>
      </div>

      <div>
        <label htmlFor="jobTitle" className="block text-sm font-medium">
          Job title
        </label>
        <input
          id="jobTitle"
          name="jobTitle"
          defaultValue={initial?.jobTitle ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-heya-blue focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium">
          App role
        </label>
        <select
          id="role"
          name="role"
          defaultValue={initial?.role ?? "EMPLOYEE"}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-heya-blue focus:outline-none"
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Who a manager can see is derived from the reporting lines, not from
          this role.
        </p>
      </div>

      <div>
        <label htmlFor="managerId" className="block text-sm font-medium">
          Reports to
        </label>
        <select
          id="managerId"
          name="managerId"
          defaultValue={initial?.managerId ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-heya-blue focus:outline-none"
        >
          <option value="">— No manager (top of the tree) —</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-heya-blue px-4 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/users"
          className="text-sm text-gray-600 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
