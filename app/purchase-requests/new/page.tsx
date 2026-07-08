import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { PRItemsField } from "@/components/pr-items-field";
import { createPR } from "@/lib/actions/procurement";
import { today } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewPRPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <PageHeader title="New Purchase Request" subtitle="Request materials for a project — submit for approval" />
      <Card>
        <ActionForm action={createPR} submitLabel="Create Purchase Request">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Project" required>
              <Select name="project_id" defaultValue={project ?? ""} required>
                <option value="">— Select project —</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code ? `${p.project_code} · ` : ""}
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Requested by">
              <TextInput name="requested_by" placeholder="Your name" />
            </Field>
            <Field label="Request date">
              <TextInput name="request_date" type="date" defaultValue={today()} />
            </Field>
          </div>
          <Field label="Items" required>
            <PRItemsField />
          </Field>
          <Field label="Notes">
            <TextArea name="notes" placeholder="Anything the approver should know" />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
