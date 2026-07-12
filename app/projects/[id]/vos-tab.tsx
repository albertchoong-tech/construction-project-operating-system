import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { FileField, AttachmentChips, groupByEntity } from "@/components/attachments";
import { createVO, actionVO, deleteVO, cancelVO } from "@/lib/actions/financial";
import { fmtDate, fmtRM, today } from "@/lib/format";
import type { ProjectDocument, VariationOrder } from "@/lib/types";

export async function VosTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [{ data: vos, error }, { data: voDocs }] = await Promise.all([
    supabase
      .from("variation_orders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("entity_type", "variation_order"),
  ]);
  const docsByVO = groupByEntity((voDocs ?? []) as ProjectDocument[]);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load variation orders: {error.message}</p>
      </Card>
    );
  }

  const approvedTotal = (vos ?? [])
    .filter((v) => v.status === "approved")
    .reduce((a, v) => a + (Number(v.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <Card
        title="Variation Orders"
        action={
          <span className="text-sm text-slate-500">
            Approved VOs:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{fmtRM(approvedTotal)}</span>
          </span>
        }
      >
        {!vos?.length ? (
          <EmptyState message="No variation orders yet. Raise one below." />
        ) : (
          <Table
            headers={["VO No", "Description", "Requested By", "Date", "Amount", "Status", "Actions"]}
            rightAlign={[4]}
          >
            {(vos as VariationOrder[]).map((vo) => (
              <tr key={vo.id} className="hover:bg-slate-50 align-top">
                <Td className="font-medium">{vo.vo_no}</Td>
                <Td className="whitespace-normal max-w-md">
                  {vo.description}
                  <AttachmentChips docs={docsByVO.get(vo.id) ?? []} projectId={projectId} />
                </Td>
                <Td>{vo.requested_by ?? "—"}</Td>
                <Td>{fmtDate(vo.request_date)}</Td>
                <Td right>{fmtRM(vo.amount)}</Td>
                <Td>
                  <StatusBadge status={vo.status} />
                  {vo.status === "approved" && vo.approved_date && (
                    <span className="block text-xs text-slate-400 mt-1">
                      {vo.approved_by} · {fmtDate(vo.approved_date)}
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {["draft", "pending"].includes(vo.status) && (
                      <>
                        <ActionButton
                          label="Approve"
                          variant="approve"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionVO(vo.id, "approved", remarks);
                          }}
                        />
                        <ActionButton
                          label="Reject"
                          variant="reject"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionVO(vo.id, "rejected", remarks);
                          }}
                        />
                        <LinkButton href={`/variation-orders/${vo.id}/edit`} variant="secondary">
                          Edit
                        </LinkButton>
                        <ActionButton
                          label="Delete"
                          variant="danger"
                          confirmMessage={`Delete ${vo.vo_no}?`}
                          action={deleteVO.bind(null, vo.id)}
                        />
                      </>
                    )}
                    {vo.status === "approved" && (
                      <ActionButton
                        label="Cancel VO"
                        variant="danger"
                        promptRemarks
                        action={async (remarks: string) => {
                          "use server";
                          return cancelVO(vo.id, remarks);
                        }}
                      />
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Raise Variation Order">
        <ActionForm action={createVO} submitLabel="Create VO (pending approval)">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Description" required className="sm:col-span-3">
              <TextArea name="description" required placeholder="e.g. Additional waterproofing works to wet areas" />
            </Field>
            <Field label="Amount (RM)" required>
              <TextInput name="amount" type="number" step="0.01" required placeholder="0.00" />
            </Field>
            <Field label="Requested by">
              <TextInput name="requested_by" placeholder="Client / QS name" />
            </Field>
            <Field label="Request date">
              <TextInput name="request_date" type="date" defaultValue={today()} />
            </Field>
            <FileField label="Supporting documents / photos" className="sm:col-span-3" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
