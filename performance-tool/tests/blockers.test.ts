import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { CheckInError, setBlockerStatus } from "@/lib/checkins";

/**
 * setBlockerStatus was unreachable until the Blockers page shipped, so this
 * covers the behaviour that page now depends on: who may close a blocker,
 * and what closing records.
 */

const T = "blocker-test";
const ids = {} as Record<"admin" | "manager" | "employee" | "outsider", string>;

async function mkUser(
  key: keyof typeof ids,
  role: "EMPLOYEE" | "MANAGER" | "ADMIN",
  managerId: string | null
) {
  const u = await db.user.create({
    data: {
      email: `${key}.${T}@example.test`,
      name: `${key} (${T})`,
      role,
      managerId,
    },
  });
  ids[key] = u.id;
  return u.id;
}

async function mkBlocker(ownerId: string | null, userId: string) {
  const b = await db.blocker.create({
    data: { userId, ownerId, description: `blocker ${T}`, status: "OPEN" },
  });
  return b.id;
}

beforeAll(async () => {
  await mkUser("admin", "ADMIN", null);
  await mkUser("manager", "MANAGER", null);
  await mkUser("employee", "EMPLOYEE", ids.manager);
  await mkUser("outsider", "EMPLOYEE", null);
});

afterAll(async () => {
  await db.blocker.deleteMany({ where: { description: `blocker ${T}` } });
  await db.user.deleteMany({ where: { email: { contains: T } } });
});

const viewer = (k: keyof typeof ids, role: "EMPLOYEE" | "MANAGER" | "ADMIN") => ({
  id: ids[k],
  role,
});

describe("setBlockerStatus", () => {
  it("the owner can resolve, and the resolution is recorded", async () => {
    const id = await mkBlocker(ids.manager, ids.employee);
    await setBlockerStatus(id, viewer("manager", "MANAGER"), "RESOLVED", "fixed it");
    const after = await db.blocker.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("RESOLVED");
    expect(after.resolution).toBe("fixed it");
    expect(after.resolvedAt).not.toBeNull();
  });

  it("dropping records the closure the same way", async () => {
    const id = await mkBlocker(ids.manager, ids.employee);
    await setBlockerStatus(id, viewer("manager", "MANAGER"), "DROPPED", "no longer relevant");
    const after = await db.blocker.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("DROPPED");
    expect(after.resolvedAt).not.toBeNull();
  });

  it("reopening clears the resolution and the timestamp", async () => {
    const id = await mkBlocker(ids.manager, ids.employee);
    await setBlockerStatus(id, viewer("manager", "MANAGER"), "RESOLVED", "done");
    await setBlockerStatus(id, viewer("manager", "MANAGER"), "IN_PROGRESS");
    const after = await db.blocker.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("IN_PROGRESS");
    expect(after.resolution).toBeNull();
    expect(after.resolvedAt).toBeNull();
  });

  it("the person who raised it can close it", async () => {
    const id = await mkBlocker(ids.manager, ids.employee);
    await setBlockerStatus(id, viewer("employee", "EMPLOYEE"), "RESOLVED", "sorted");
    const after = await db.blocker.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("RESOLVED");
  });

  it("an admin can close anyone's", async () => {
    const id = await mkBlocker(ids.manager, ids.employee);
    await setBlockerStatus(id, viewer("admin", "ADMIN"), "RESOLVED", "admin close");
    const after = await db.blocker.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("RESOLVED");
  });

  it("an unrelated employee cannot", async () => {
    const id = await mkBlocker(ids.manager, ids.employee);
    await expect(
      setBlockerStatus(id, viewer("outsider", "EMPLOYEE"), "RESOLVED", "nope")
    ).rejects.toThrow(CheckInError);
    const after = await db.blocker.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("OPEN");
  });
});
