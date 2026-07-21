import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { DrawingSelect, type DrawingChoice } from "@/components/drawing-select";
import { updateProgressLog } from "@/lib/actions/site";
import type { SiteProgressLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditProgressLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("site_progress_logs")
    .select("*, projects(name)")
    .eq("id", id)
    .single<SiteProgressLog>();
  if (!log) notFound();

  const { data: drawings } = await supabase
    .from("project_drawings")
    .select("id, drawing_no, revision_no, title, status")
    .eq("project_id", log.project_id)
    .order("drawing_no");

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit Progress Log" subtitle={log.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updateProgressLog} submitLabel="Save Changes">
          <input type="hidden" name="id" value={log.id} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Completion %">
              <TextInput name="completion_pct" type="number" min="0" max="100" step="0.1" defaultValue={String(log.completion_pct ?? "")} />
            </Field>
            <Field label="Work done" required className="sm:col-span-3">
              <TextArea name="work_done" required defaultValue={log.work_done ?? ""} />
            </Field>
            <Field label="Workers on site">
              <TextInput name="workers_count" type="number" min="0" inputMode="numeric" defaultValue={String(log.workers_count ?? "")} />
            </Field>
            <Field label="Weather">
              <TextInput name="weather" defaultValue={log.weather ?? ""} />
            </Field>
            <Field label="Issues" className="sm:col-span-2">
              <TextInput name="issues" defaultValue={log.issues ?? ""} />
            </Field>
            <Field label="Log date">
              <TextInput name="log_date" type="date" defaultValue={log.log_date ?? ""} />
            </Field>
            <Field label="Reported by" className="sm:col-span-3">
              <TextInput name="reported_by" defaultValue={log.reported_by ?? ""} />
            </Field>
            <Field label="Area / location" className="sm:col-span-2">
              <TextInput name="area" defaultValue={log.area ?? ""} placeholder="e.g. Level 2 — east wing" />
            </Field>
            <Field label="Drawing reference" className="sm:col-span-2">
              <DrawingSelect
                drawings={(drawings ?? []) as DrawingChoice[]}
                defaultValue={log.drawing_id}
              />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
