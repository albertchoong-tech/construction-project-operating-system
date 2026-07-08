import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, TextInput } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { addBoqItem, deleteBoqItem } from "@/lib/actions/boq";
import { fmtRM } from "@/lib/format";
import type { BoqItem } from "@/lib/types";

export async function BoqTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("boq_items")
    .select("*")
    .eq("project_id", projectId)
    .order("section")
    .order("created_at");

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load BOQ: {error.message}</p>
      </Card>
    );
  }

  const boq = (items ?? []) as BoqItem[];
  const total = boq.reduce((a, i) => a + (Number(i.total_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <Card
        title="Bill of Quantities"
        action={<span className="text-sm font-semibold tabular-nums">{fmtRM(total)}</span>}
      >
        {!boq.length ? (
          <EmptyState message="No BOQ line items yet. Add the first line below." />
        ) : (
          <Table
            headers={["Section", "Description", "Unit", "Qty", "Rate (RM)", "Total (RM)", ""]}
            rightAlign={[3, 4, 5]}
          >
            {boq.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <Td className="text-slate-500">{item.section ?? "—"}</Td>
                <Td className="whitespace-normal max-w-md">{item.description}</Td>
                <Td>{item.unit ?? "—"}</Td>
                <Td right>{Number(item.quantity)}</Td>
                <Td right>{fmtRM(item.unit_rate)}</Td>
                <Td right className="font-medium">
                  {fmtRM(item.total_amount)}
                </Td>
                <Td right>
                  <ActionButton
                    label="Delete"
                    variant="danger"
                    confirmMessage="Delete this BOQ line item?"
                    action={deleteBoqItem.bind(null, item.id, projectId)}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Add BOQ Line Item">
        <ActionForm action={addBoqItem} submitLabel="Add Line Item">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <Field label="Section">
              <TextInput name="section" placeholder="e.g. Structure" />
            </Field>
            <Field label="Description" required className="col-span-2">
              <TextInput name="description" required placeholder="Work description" />
            </Field>
            <Field label="Unit">
              <TextInput name="unit" placeholder="m², lot…" />
            </Field>
            <Field label="Quantity">
              <TextInput name="quantity" type="number" step="0.01" min="0" placeholder="0" />
            </Field>
            <Field label="Unit rate (RM)">
              <TextInput name="unit_rate" type="number" step="0.01" min="0" placeholder="0.00" />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
