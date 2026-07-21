import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { IssueCategoryField } from "@/components/issue-category-field";
import { PhotoField } from "@/components/photo-field";
import { DrawingSelect, type DrawingChoice } from "@/components/drawing-select";
import { updateInspection } from "@/lib/actions/site";
import type { InspectionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: rec } = await supabase
    .from("inspection_records")
    .select("*, projects(name)")
    .eq("id", id)
    .single<InspectionRecord & { projects?: { name?: string } }>();
  if (!rec) notFound();

  const { data: drawings } = await supabase
    .from("project_drawings")
    .select("id, drawing_no, revision_no, title, status")
    .eq("project_id", rec.project_id)
    .order("drawing_no");

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit Inspection" subtitle={rec.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updateInspection} submitLabel="Save Changes">
          <input type="hidden" name="id" value={rec.id} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Inspection date">
              <TextInput name="inspection_date" type="date" defaultValue={rec.inspection_date ?? ""} />
            </Field>
            <Field label="Inspector">
              <TextInput name="inspector" defaultValue={rec.inspector ?? ""} />
            </Field>
            <Field label="Area">
              <TextInput name="area" defaultValue={rec.area ?? ""} />
            </Field>
            <Field label="Result">
              <Select name="result" defaultValue={rec.result ?? "pass"}>
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 grid grid-cols-1 gap-4">
              <IssueCategoryField defaultValue={rec.issue_category ?? ""} />
            </div>
            <Field label="Corrective action required" className="sm:col-span-2">
              <TextInput
                name="corrective_action"
                defaultValue={rec.corrective_action ?? ""}
                placeholder="e.g. Re-skim and re-inspect"
              />
            </Field>
            <Field label="Responsible party" className="sm:col-span-2">
              <TextInput
                name="responsible_party"
                defaultValue={rec.responsible_party ?? ""}
                placeholder="e.g. Plastering subcontractor"
              />
            </Field>
            <Field label="Follow-up date" className="sm:col-span-2">
              <TextInput
                name="follow_up_date"
                type="date"
                defaultValue={rec.follow_up_date ?? ""}
              />
            </Field>
            <Field label="Drawing reference" className="sm:col-span-2">
              <DrawingSelect
                drawings={(drawings ?? []) as DrawingChoice[]}
                defaultValue={rec.drawing_id}
              />
            </Field>
            <Field label="Remarks" className="sm:col-span-4">
              <TextArea name="remarks" defaultValue={rec.remarks ?? ""} />
            </Field>
            <PhotoField label="Add more photos" className="sm:col-span-4" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
