import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState, StatusBadge } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { addInspection, deleteInspection } from "@/lib/actions/site";
import { fmtDate, today } from "@/lib/format";
import type { InspectionRecord } from "@/lib/types";

export async function InspectionsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const { data: inspections, error } = await supabase
    .from("inspection_records")
    .select("*")
    .eq("project_id", projectId)
    .order("inspection_date", { ascending: false });

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load inspections: {error.message}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Inspection Records">
        {!inspections?.length ? (
          <EmptyState message="No inspections recorded for this project yet." />
        ) : (
          <Table headers={["Date", "Inspector", "Area", "Result", "Remarks", ""]}>
            {(inspections as InspectionRecord[]).map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 align-top">
                <Td>{fmtDate(i.inspection_date)}</Td>
                <Td>{i.inspector ?? "—"}</Td>
                <Td>{i.area ?? "—"}</Td>
                <Td>
                  <StatusBadge status={i.result} />
                </Td>
                <Td className="whitespace-normal max-w-md">{i.remarks ?? "—"}</Td>
                <Td right>
                  <ActionButton
                    label="Delete"
                    variant="danger"
                    confirmMessage="Delete this inspection record?"
                    action={deleteInspection.bind(null, i.id, projectId)}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Record Inspection">
        <ActionForm action={addInspection} submitLabel="Save Inspection">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Inspection date">
              <TextInput name="inspection_date" type="date" defaultValue={today()} />
            </Field>
            <Field label="Inspector">
              <TextInput name="inspector" placeholder="Name / authority" />
            </Field>
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
            <Field label="Remarks" className="col-span-2 sm:col-span-4">
              <TextArea name="remarks" placeholder="Findings, follow-up actions…" />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
