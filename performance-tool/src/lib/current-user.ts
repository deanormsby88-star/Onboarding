import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CurrentUser = User;

/**
 * Resolve the signed-in user from the session, re-checking the database on
 * every request. Returns null when there is no session, when the Entra
 * refresh failed (account disabled in Entra), or when the local record is
 * missing or deactivated. Access control never trusts the cookie alone.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.userId || session.tokenError) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return user;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}
