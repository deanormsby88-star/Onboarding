import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Role-based access, enforced at the data-access layer.
 *
 * Rules (build brief §3):
 *  - Everyone sees their own record.
 *  - A manager sees direct reports and indirect reports (the whole subtree
 *    under them via users.manager_id). Never a peer, never their own manager.
 *  - Admin sees everyone.
 *  - Hierarchy is derived from manager_id, not hardcoded.
 *
 * Every read of ANOTHER person's performance data must go through
 * assertCanViewUser(), which also writes the POPIA access log.
 */

export type Viewer = { id: string; role: Role };

const MAX_CHAIN_DEPTH = 50; // cycle/beyond-plausible-org guard

/** True when `ancestorId` appears in the manager chain above `userId`. */
export async function isInManagementChain(
  ancestorId: string,
  userId: string
): Promise<boolean> {
  let currentId: string | null = userId;
  for (let depth = 0; depth < MAX_CHAIN_DEPTH && currentId; depth++) {
    const row: { managerId: string | null } | null = await db.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });
    if (!row) return false;
    if (row.managerId === ancestorId) return true;
    currentId = row.managerId;
  }
  return false;
}

export async function canViewUser(
  viewer: Viewer,
  subjectUserId: string
): Promise<boolean> {
  if (viewer.id === subjectUserId) return true;
  if (viewer.role === "ADMIN") return true;
  return isInManagementChain(viewer.id, subjectUserId);
}

export class AccessDeniedError extends Error {
  constructor(message = "You do not have access to this record.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/**
 * Gate for reading someone's performance data. Throws when not allowed;
 * logs the access when the subject is another person.
 *
 * `entity` names what was read, e.g. "user_profile", "check_in_history".
 */
export async function assertCanViewUser(
  viewer: Viewer,
  subjectUserId: string,
  entity: string,
  entityId?: string
): Promise<void> {
  if (!(await canViewUser(viewer, subjectUserId))) {
    throw new AccessDeniedError();
  }
  if (viewer.id !== subjectUserId) {
    await db.accessLog.create({
      data: {
        viewerId: viewer.id,
        subjectUserId,
        entity,
        entityId: entityId ?? null,
      },
    });
  }
}

/**
 * The set of user IDs the viewer may read: self, plus their whole subtree
 * (direct and indirect reports), plus everyone for admins (returns null to
 * mean "no filter"). Used to scope list queries server-side.
 */
export async function visibleUserIds(viewer: Viewer): Promise<string[] | null> {
  if (viewer.role === "ADMIN") return null;
  const visible = new Set<string>([viewer.id]);
  let frontier = [viewer.id];
  for (let depth = 0; depth < MAX_CHAIN_DEPTH && frontier.length > 0; depth++) {
    const rows = await db.user.findMany({
      where: { managerId: { in: frontier } },
      select: { id: true },
    });
    frontier = rows.map((r) => r.id).filter((id) => !visible.has(id));
    for (const id of frontier) visible.add(id);
  }
  return [...visible];
}

/**
 * Guard for hierarchy edits: assigning `managerId` to `userId` must not
 * create a cycle (including self-management).
 */
export async function wouldCreateCycle(
  userId: string,
  managerId: string | null
): Promise<boolean> {
  if (!managerId) return false;
  if (managerId === userId) return true;
  // A cycle exists iff `userId` is already in the chain above `managerId`.
  return isInManagementChain(userId, managerId);
}
