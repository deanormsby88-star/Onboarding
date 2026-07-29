import { requireAdmin } from "@/lib/current-user";
import { PERSPECTIVE_LABEL, PERSPECTIVE_ORDER } from "@/lib/scorecards";
import { AppShell } from "@/components/app-shell";
import { TemplateEditor } from "@/components/template-editor";
import { saveTemplateAction } from "../actions";

export default async function NewTemplatePage() {
  const admin = await requireAdmin();

  const blank = {
    name: "",
    description: "",
    perspectives: PERSPECTIVE_ORDER.map((kind) => ({
      kind,
      label: PERSPECTIVE_LABEL[kind],
      weightPct: 25,
      measures: [],
    })),
  };

  async function onSave(payload: string) {
    "use server";
    return saveTemplateAction(null, payload);
  }

  return (
    <AppShell user={admin}>
      <h1 className="mb-6 text-2xl font-semibold">New template</h1>
      <TemplateEditor initial={blank} onSave={onSave} />
    </AppShell>
  );
}
