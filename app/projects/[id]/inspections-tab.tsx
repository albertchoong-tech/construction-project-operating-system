import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { IssueCategoryField } from "@/components/issue-category-field";
import { AttachmentChips, groupByEntity } from "@/components/attachments";
import { PhotoField } from "@/components/photo-field";
import { addInspection, deleteInspection } from "@/lib/actions/site";
import { fmtDate, today } from "@/lib/format";
import type { InspectionRecord, ProjectDocument } from "@/lib/types";

export async function InspectionsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const profile = await getSessionProfile();
  const [{ data: inspections, error }, { data: docs }] = await Promise.all([
    supabase
      .from("inspection_records")
      .select("*")
      .eq("project_id", projectId)
      .order("inspection_date", { ascending: false }),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("entity_type", "inspection_record"),
  ]);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load inspections: {error.message}</p>
      </Card>
    );
  }

  const docsByInspection = groupByEntity((docs ?? []) as ProjectDocument[]);

  return (
    <div className="space-y-6">
      <Card title="Inspection Records">
        {!inspections?.length ? (
          <EmptyState message="No inspections recorded for this project yet." />
        ) : (
          <Table headers={["Date", "Inspector", "Area", "Result", "Issue Category", "Remarks / Photos", ""]}>
            {(inspections as InspectionRecord[]).map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 align-top">
                <Td>{fmtDate(i.inspection_date)}</Td>
                <Td>{i.inspector ?? "—"}</Td>
                <Td>{i.area ?? "—"}</Td>
                <Td>
                  <StatusBadge status={i.result} />
                </Td>
                <Td className="whitespace-normal max-w-48">
                  {i.issue_category ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 px-2.5 py-0.5 text-xs font-medium">
                      {i.issue_category === "Others" && i.issue_detail
                        ? `Others — ${i.issue_detail}`
                        : i.issue_category}
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="whitespace-normal max-w-md">
                  {i.remarks ?? "—"}
                  <AttachmentChips
                    docs={docsByInspection.get(i.id) ?? []}
                    projectId={projectId}
                  />
                </Td>
                <Td right>
                  <span className="flex justify-end gap-1.5">
                    <LinkButton href={`/inspections/${i.id}/edit`} variant="secondary">
                      Edit
                    </LinkButton>
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage="Delete this inspection record?"
                      action={deleteInspection.bind(null, i.id, projectId)}
                    />
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Record Inspection">
        <ActionForm
          action={addInspection}
          submitLabel="Save Inspection"
          draftKey={`inspection-${projectId}`}
        >
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <PhotoField label="Photos" className="sm:col-span-4" />
            <Field label="Area">
              <TextInput name="area" placeholder="e.g. Wet areas, Level 2" />
            </Field>
            <Field label="Result">
              <Select name="result" defaultValue="pass">
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 grid grid-cols-1 gap-4">
              <IssueCategoryField />
            </div>
            <Field label="Remarks" className="sm:col-span-4">
              <TextArea name="remarks" placeholder="Findings, follow-up actions…" />
            </Field>
            <Field label="Inspection date">
              <TextInput name="inspection_date" type="date" defaultValue={today()} />
            </Field>
            <Field label="Inspector" className="sm:col-span-3">
              <TextInput name="inspector" defaultValue={profile?.fullName ?? ""} placeholder="Name / authority" />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
