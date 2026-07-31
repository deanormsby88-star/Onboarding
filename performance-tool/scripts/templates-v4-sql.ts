import { randomUUID } from "node:crypto";
import { SEED_TEMPLATES } from "../prisma/template-data";

/**
 * Emit the v4 template migration as a single SQL script for a hosted
 * database's SQL editor:
 *
 *  1. Archives every pre-v4 template (renamed "<name> (v1 archived)",
 *     archived = true) so existing assignments keep their reference and
 *     the old content stays inspectable.
 *  2. Inserts all nine v4 templates fresh.
 *
 * Idempotent: guarded on the existence of "Chief Operating Officer",
 * which only exists from v4 onwards.
 *
 * Usage: npx tsx scripts/templates-v4-sql.ts > v4.sql
 */

const OLD_NAMES = [
  "HR Administrator",
  "Account Manager",
  "IT Technician",
  "Head of HR and Recruitment",
  "Software Developer",
];

const q = (s: string) => `'${s.replaceAll("'", "''")}'`;

const lines: string[] = [
  "-- Heya scorecard templates v4 (31 July 2026)",
  "-- Archives pre-v4 templates and installs the nine v4 templates.",
  "-- Safe to run twice: skips itself once v4 is present.",
  "DO $$",
  "DECLARE tpl_id uuid; persp_id uuid;",
  "BEGIN",
  "IF EXISTS (SELECT 1 FROM scorecard_templates WHERE name = 'Chief Operating Officer') THEN",
  "  RAISE NOTICE 'v4 templates already installed, skipping';",
  "  RETURN;",
  "END IF;",
  "",
  "-- 1. Archive the old set (assignments keep their references).",
];
for (const name of OLD_NAMES) {
  lines.push(
    `UPDATE scorecard_templates SET name = ${q(name + " (v1 archived)")}, archived = true, updated_at = now()`,
    `  WHERE name = ${q(name)} AND archived = false;`
  );
}
lines.push("", "-- 2. Install v4.");

for (const tpl of SEED_TEMPLATES) {
  lines.push(
    "",
    `-- ${tpl.name}`,
    `tpl_id := ${q(randomUUID())};`,
    "INSERT INTO scorecard_templates (id, name, description, archived, created_at, updated_at)",
    `VALUES (tpl_id, ${q(tpl.name)}, ${q(tpl.description ?? "")}, false, now(), now());`
  );
  tpl.perspectives.forEach((p, pi) => {
    lines.push(
      `persp_id := ${q(randomUUID())};`,
      "INSERT INTO template_perspectives (id, template_id, kind, weight_pct, sort_order)",
      `VALUES (persp_id, tpl_id, '${p.kind}'::"PerspectiveKind", ${p.weightPct}, ${pi});`
    );
    p.measures.forEach((mm, mi) => {
      lines.push(
        "INSERT INTO template_measures (id, perspective_id, code, name, definition, anchor_3, weight, sort_order)",
        `VALUES (${q(randomUUID())}, persp_id, ${q(mm.code)}, ${q(mm.name)}, ${q(mm.definition)}, ${q(mm.anchor3)}, ${mm.weight}, ${mi});`
      );
    });
  });
}

lines.push("END $$;");
console.log(lines.join("\n"));
