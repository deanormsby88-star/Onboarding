import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  AccessDeniedError,
  assertCanViewUser,
  canViewUser,
  visibleUserIds,
  wouldCreateCycle,
} from "@/lib/authz";

/**
 * Integration tests against a real Postgres (DATABASE_URL). They build this
 * org and check every boundary in build brief §3:
 *
 *   admin (ADMIN, no manager)
 *   ceo (EMPLOYEE role, top of tree)
 *     └── managerA (MANAGER)
 *           ├── emp1 (EMPLOYEE)
 *           └── midManager (MANAGER)
 *                 └── emp2 (EMPLOYEE)      <- indirect report of managerA
 *     └── managerB (MANAGER)               <- peer of managerA
 *           └── emp3 (EMPLOYEE)
 */

const T = "authz-test";
const ids = {} as Record<
  "admin" | "ceo" | "managerA" | "managerB" | "midManager" | "emp1" | "emp2" | "emp3",
  string
>;

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

async function cleanup() {
  await db.accessLog.deleteMany({
    where: { viewer: { email: { contains: T } } },
  });
  await db.user.deleteMany({ where: { email: { contains: T } } });
}

beforeAll(async () => {
  await cleanup();
  await mkUser("admin", "ADMIN", null);
  const ceo = await mkUser("ceo", "EMPLOYEE", null);
  const a = await mkUser("managerA", "MANAGER", ceo);
  const b = await mkUser("managerB", "MANAGER", ceo);
  const mid = await mkUser("midManager", "MANAGER", a);
  await mkUser("emp1", "EMPLOYEE", a);
  await mkUser("emp2", "EMPLOYEE", mid);
  await mkUser("emp3", "EMPLOYEE", b);
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

const viewer = (key: keyof typeof ids, role: "EMPLOYEE" | "MANAGER" | "ADMIN") => ({
  id: ids[key],
  role,
});

describe("canViewUser", () => {
  it("everyone sees their own record", async () => {
    expect(await canViewUser(viewer("emp1", "EMPLOYEE"), ids.emp1)).toBe(true);
  });

  it("an employee sees nobody else", async () => {
    expect(await canViewUser(viewer("emp1", "EMPLOYEE"), ids.emp2)).toBe(false);
    expect(await canViewUser(viewer("emp1", "EMPLOYEE"), ids.managerA)).toBe(false);
  });

  it("a manager sees direct reports", async () => {
    expect(await canViewUser(viewer("managerA", "MANAGER"), ids.emp1)).toBe(true);
  });

  it("a manager sees indirect reports (report of a report)", async () => {
    expect(await canViewUser(viewer("managerA", "MANAGER"), ids.emp2)).toBe(true);
  });

  it("a manager never sees a peer", async () => {
    expect(await canViewUser(viewer("managerA", "MANAGER"), ids.managerB)).toBe(false);
  });

  it("a manager never sees a peer's report", async () => {
    expect(await canViewUser(viewer("managerA", "MANAGER"), ids.emp3)).toBe(false);
  });

  it("a manager never sees their own manager", async () => {
    expect(await canViewUser(viewer("managerA", "MANAGER"), ids.ceo)).toBe(false);
  });

  it("admin sees everyone", async () => {
    for (const key of ["ceo", "managerA", "emp2", "emp3"] as const) {
      expect(await canViewUser(viewer("admin", "ADMIN"), ids[key])).toBe(true);
    }
  });
});

describe("assertCanViewUser", () => {
  it("throws AccessDeniedError for a forbidden read and logs nothing", async () => {
    await expect(
      assertCanViewUser(viewer("managerB", "MANAGER"), ids.emp1, "user_profile")
    ).rejects.toBeInstanceOf(AccessDeniedError);
    const logs = await db.accessLog.findMany({
      where: { viewerId: ids.managerB, subjectUserId: ids.emp1 },
    });
    expect(logs).toHaveLength(0);
  });

  it("writes the access log when reading another person's data", async () => {
    await assertCanViewUser(
      viewer("managerA", "MANAGER"),
      ids.emp2,
      "check_in_history"
    );
    const logs = await db.accessLog.findMany({
      where: { viewerId: ids.managerA, subjectUserId: ids.emp2 },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.entity).toBe("check_in_history");
  });

  it("does not log reads of your own record", async () => {
    await assertCanViewUser(viewer("emp1", "EMPLOYEE"), ids.emp1, "user_profile");
    const logs = await db.accessLog.findMany({
      where: { viewerId: ids.emp1, subjectUserId: ids.emp1 },
    });
    expect(logs).toHaveLength(0);
  });
});

describe("visibleUserIds", () => {
  it("employee: only self", async () => {
    expect(await visibleUserIds(viewer("emp1", "EMPLOYEE"))).toEqual([ids.emp1]);
  });

  it("manager: self plus whole subtree, nothing above or beside", async () => {
    const got = await visibleUserIds(viewer("managerA", "MANAGER"));
    expect(new Set(got)).toEqual(
      new Set([ids.managerA, ids.emp1, ids.midManager, ids.emp2])
    );
  });

  it("admin: null (no filter)", async () => {
    expect(await visibleUserIds(viewer("admin", "ADMIN"))).toBeNull();
  });
});

describe("wouldCreateCycle", () => {
  it("rejects self-management", async () => {
    expect(await wouldCreateCycle(ids.managerA, ids.managerA)).toBe(true);
  });

  it("rejects reporting to your own (indirect) report", async () => {
    expect(await wouldCreateCycle(ids.managerA, ids.emp2)).toBe(true);
    expect(await wouldCreateCycle(ids.ceo, ids.emp1)).toBe(true);
  });

  it("allows legitimate moves", async () => {
    expect(await wouldCreateCycle(ids.emp1, ids.managerB)).toBe(false);
    expect(await wouldCreateCycle(ids.emp1, null)).toBe(false);
  });
});
