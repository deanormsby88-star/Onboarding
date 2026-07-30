"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  assignTemplateToUser,
  saveTemplate,
  ScorecardValidationError,
  templateInputSchema,
} from "@/lib/scorecards";

export async function saveTemplateAction(
  templateId: string | null,
  payload: string
): Promise<{ error?: string; id?: string }> {
  await requireAdmin();
  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return { error: "Could not read the template data. Reload and try again." };
  }
  const parsed = templateInputSchema.safeParse(json);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid template." };
  }
  try {
    const id = await saveTemplate(templateId, parsed.data);
    revalidatePath("/admin/templates");
    return { id };
  } catch (e) {
    if (e instanceof ScorecardValidationError) return { error: e.message };
    throw e;
  }
}

export async function setTemplateArchivedAction(id: string, archived: boolean) {
  await requireAdmin();
  await db.scorecardTemplate.update({ where: { id }, data: { archived } });
  revalidatePath("/admin/templates");
}

export async function assignScorecardAction(
  _prev: { error?: string; done?: boolean },
  formData: FormData
): Promise<{ error?: string; done?: boolean }> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "");
  if (!userId || !templateId || !effectiveFrom) {
    return { error: "Pick a person, a template, and an effective date." };
  }
  const date = new Date(`${effectiveFrom}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { error: "That effective date is not a valid date." };
  }
  try {
    const scorecard = await assignTemplateToUser({
      userId,
      templateId,
      effectiveFrom: date,
      actorId: admin.id,
    });
    if (scorecard.version === 1) {
      // First-ever scorecard: welcome them. Fire-and-forget — a mail
      // failure must never fail the assignment.
      const { sendWelcomeEmail } = await import("@/lib/notifications");
      sendWelcomeEmail(userId).catch((e) =>
        console.error("welcome email failed:", e)
      );
    }
  } catch (e) {
    if (e instanceof ScorecardValidationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/assign");
  return { done: true };
}
