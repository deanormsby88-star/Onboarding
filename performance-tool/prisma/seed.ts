import { PrismaClient } from "@prisma/client";
import { SEED_TEMPLATES } from "./template-data";

const db = new PrismaClient();

/**
 * Phase 1 seed: Dean plus two test users forming a chain
 * (employee -> manager -> Dean), enough to verify every permission boundary:
 *  - Dean (admin) sees all three records
 *  - the manager sees themself + the employee, never Dean
 *  - the employee sees only themself
 * Also seeds the default notification schedule as config (tuned later, per
 * the brief the cadence must not be hardcoded).
 */
async function main() {
  const dean = await db.user.upsert({
    where: { email: "deano@heya.team" },
    update: {},
    create: {
      email: "deano@heya.team",
      name: "Dean Ormsby",
      jobTitle: "COO",
      role: "ADMIN",
    },
  });

  const manager = await db.user.upsert({
    where: { email: "test.manager@heya.team" },
    update: {},
    create: {
      email: "test.manager@heya.team",
      name: "Thandi Test-Manager",
      jobTitle: "Account Manager",
      role: "MANAGER",
      managerId: dean.id,
    },
  });

  await db.user.upsert({
    where: { email: "test.employee@heya.team" },
    update: {},
    create: {
      email: "test.employee@heya.team",
      name: "Eli Test-Employee",
      jobTitle: "HR Administrator",
      role: "EMPLOYEE",
      managerId: manager.id,
    },
  });

  const notificationDefaults = {
    // SAST, config-driven (build brief §10)
    self_evaluation_open: { day: "thursday", time: "14:00", enabled: true },
    self_evaluation_reminder: { day: "friday", time: "16:00", enabled: true },
    manager_awaiting: { day: "monday", time: "08:00", enabled: true },
    manager_incomplete_reminder: { day: "wednesday", time: "08:00", enabled: true },
    admin_overdue: { day: "wednesday", time: "08:00", enabled: true },
  };
  await db.appSetting.upsert({
    where: { key: "notification_schedule" },
    update: {},
    create: {
      key: "notification_schedule",
      value: JSON.stringify(notificationDefaults),
    },
  });
  await db.appSetting.upsert({
    where: { key: "retention_years_after_exit" },
    update: {},
    create: { key: "retention_years_after_exit", value: "5" },
  });

  // The four opening templates (idempotent by name; existing templates are
  // left alone so in-app edits survive re-seeding).
  for (const tpl of SEED_TEMPLATES) {
    const exists = await db.scorecardTemplate.findFirst({
      where: { name: tpl.name },
    });
    if (exists) continue;
    await db.scorecardTemplate.create({
      data: {
        name: tpl.name,
        description: tpl.description || null,
        perspectives: {
          create: tpl.perspectives.map((p, pi) => ({
            kind: p.kind,
            weightPct: p.weightPct,
            sortOrder: pi,
            measures: {
              create: p.measures.map((m, mi) => ({
                code: m.code,
                name: m.name,
                definition: m.definition,
                anchor3: m.anchor3,
                weight: m.weight,
                sortOrder: mi,
              })),
            },
          })),
        },
      },
    });
    console.log(`Seeded template: ${tpl.name}`);
  }

  console.log("Seeded: Dean Ormsby (admin), Thandi Test-Manager, Eli Test-Employee.");
}

main().finally(() => db.$disconnect());
