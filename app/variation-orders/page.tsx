import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { FileField } from "@/components/attachments";
import { createVO, actionVO, deleteVO, cancelVO } from "@/lib/actions/financial";
import { fmtRM, today } from "@/lib/format";
import type { VariationOrder } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VariationOrdersPage() {
  const supabase = await createClient();
  const [{ data: vos, error }, { data: projects }] = await Promise.all([
    supabase
      .from("variation_orders")
      .select("*, projects(name, project_code)")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, project_code")
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="Variation Orders" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load variation orders: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Variation Orders"
        subtitle="Contract changes — approved VOs update the revised contract value"
      />
      <div className="space-y-6">
        <Card title="All Variation Orders">
          {!vos?.length ? (
            <EmptyState message="No variation orders yet. Raise one below." />
          ) : (
            <Table
              headers={["VO No", "Project", "Description", "Amount", "Status", "Actions"]}
              rightAlign={[3]}
            >
              {(vos as VariationOrder[]).map((vo) => (
                <tr key={vo.id} className="hover:bg-slate-50 align-top">
                  <Td className="font-medium">{vo.vo_no}</Td>
                  <Td>
                    <Link href={`/projects/${vo.project_id}?tab=vos`} className="hover:underline">
                      {vo.projects?.name ?? "—"}
                    </Link>
                  </Td>
                  <Td className="whitespace-normal max-w-md">{vo.description}</Td>
                  <Td right>{fmtRM(vo.amount)}</Td>
                  <Td>
                    <StatusBadge status={vo.status} />
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Project" required>
                <Select name="project_id" required defaultValue="">
                  <option value="">— Select project —</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code ? `${p.project_code} · ` : ""}
                      {p.name}
                    </option>
                  ))}
                </Select>
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
              <Field label="Description" required className="sm:col-span-4">
                <TextArea name="description" required placeholder="e.g. Additional waterproofing works to wet areas" />
              </Field>
              <FileField label="Supporting documents / photos" className="sm:col-span-4" />
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
