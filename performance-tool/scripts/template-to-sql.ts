import { randomUUID } from "node:crypto";
import { SEED_TEMPLATES } from "../prisma/template-data";

/**
 * Emit INSERT statements for one seed template, for pasting into a hosted
 * database's SQL editor when there is no direct connection to run
 * `npm run seed` against it.
 *
 * Usage: npx tsx scripts/template-to-sql.ts "Software Developer"
 */

const name = process.argv[2];
const tpl = SEED_TEMPLATES.find((t) => t.name === name);
if (!tpl) {
  console.error(`Unknown template "${name}". Options: ${SEED_TEMPLATES.map((t) => t.name).join(", ")}`);
  process.exit(1);
}

const q = (s: string) => `'${s.replaceAll("'", "''")}'`;

const lines: string[] = [
  `-- Seed template: ${tpl.name} (idempotent: skipped if the name already exists)`,
  `DO $$`,
  `DECLARE tpl_id uuid; persp_id uuid;`,
  `BEGIN`,
  `IF EXISTS (SELECT 1 FROM scorecard_templates WHERE name = ${q(tpl.name)}) THEN`,
  `  RAISE NOTICE 'Template already exists, skipping';`,
  `  RETURN;`,
  `END IF;`,
  `tpl_id := ${q(randomUUID())};`,
  `INSERT INTO scorecard_templates (id, name, description, archived, created_at, updated_at)`,
  `VALUES (tpl_id, ${q(tpl.name)}, ${q(tpl.description ?? "")}, false, now(), now());`,
];

tpl.perspectives.forEach((p, pi) => {
  lines.push(
    `persp_id := ${q(randomUUID())};`,
    `INSERT INTO template_perspectives (id, template_id, kind, weight_pct, sort_order)`,
    `VALUES (persp_id, tpl_id, '${p.kind}'::"PerspectiveKind", ${p.weightPct}, ${pi});`
  );
  p.measures.forEach((m, mi) => {
    lines.push(
      `INSERT INTO template_measures (id, perspective_id, code, name, definition, anchor_3, weight, sort_order)`,
      `VALUES (${q(randomUUID())}, persp_id, ${q(m.code)}, ${q(m.name)}, ${q(m.definition)}, ${q(m.anchor3)}, ${m.weight}, ${mi});`
    );
  });
});

lines.push(`END $$;`);
console.log(lines.join("\n"));
