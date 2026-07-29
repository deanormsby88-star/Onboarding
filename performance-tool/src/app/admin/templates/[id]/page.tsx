import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { getTemplate, PERSPECTIVE_LABEL } from "@/lib/scorecards";
import { AppShell } from "@/components/app-shell";
import { TemplateEditor } from "@/components/template-editor";
import { saveTemplateAction } from "../actions";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  const initial = {
    name: template.name,
    description: template.description ?? "",
    perspectives: template.perspectives.map((p) => ({
      kind: p.kind,
      label: PERSPECTIVE_LABEL[p.kind],
      weightPct: p.weightPct,
      measures: p.measures.map((m) => ({
        code: m.code,
        name: m.name,
        definition: m.definition,
        anchor3: m.anchor3,
        weight: m.weight,
      })),
    })),
  };

  async function onSave(payload: string) {
    "use server";
    return saveTemplateAction(id, payload);
  }

  return (
    <AppShell user={admin}>
      <h1 className="mb-1 text-2xl font-semibold">Edit template</h1>
      <p className="mb-6 text-sm text-gray-600">
        Changes apply to future assignments only; scorecards already assigned
        keep the content they were assigned with.
      </p>
      <TemplateEditor initial={initial} onSave={onSave} />
    </AppShell>
  );
}
