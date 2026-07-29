import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { wouldCreateCycle, type Viewer } from "@/lib/authz";

/** Admin-only user management. Callers must already hold requireAdmin(). */

export const userInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required"),
  jobTitle: z.string().trim().max(200).optional().or(z.literal("")),
  role: z.enum(Role),
  managerId: z.uuid().nullable(),
});

export type UserInput = z.infer<typeof userInputSchema>;

export class UserValidationError extends Error {}

async function validateManager(userId: string | null, managerId: string | null) {
  if (!managerId) return;
  const manager = await db.user.findUnique({ where: { id: managerId } });
  if (!manager || !manager.isActive) {
    throw new UserValidationError("The selected manager does not exist or is deactivated.");
  }
  if (userId && (await wouldCreateCycle(userId, managerId))) {
    throw new UserValidationError(
      "That manager assignment would create a reporting loop."
    );
  }
}

export async function createUser(input: UserInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new UserValidationError("A user with that email already exists.");
  }
  await validateManager(null, input.managerId);
  return db.user.create({
    data: {
      name: input.name,
      email: input.email,
      jobTitle: input.jobTitle || null,
      role: input.role,
      managerId: input.managerId,
    },
  });
}

export async function updateUser(id: string, input: UserInput) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new UserValidationError("User not found.");
  const emailClash = await db.user.findUnique({ where: { email: input.email } });
  if (emailClash && emailClash.id !== id) {
    throw new UserValidationError("A user with that email already exists.");
  }
  await validateManager(id, input.managerId);
  return db.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      jobTitle: input.jobTitle || null,
      role: input.role,
      managerId: input.managerId,
    },
  });
}

export async function setUserActive(id: string, actor: Viewer, active: boolean) {
  if (id === actor.id && !active) {
    throw new UserValidationError("You cannot deactivate your own account.");
  }
  return db.user.update({
    where: { id },
    data: {
      isActive: active,
      deactivatedAt: active ? null : new Date(),
      // A revoked user must re-match on next sign-in if ever reactivated
      // under a new Entra identity; keep the binding, admins can clear it
      // by editing if the Entra account was recreated.
    },
  });
}

export async function listUsersWithReports() {
  return db.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { reports: true } },
    },
  });
}
