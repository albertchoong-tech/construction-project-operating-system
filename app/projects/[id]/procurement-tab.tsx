import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { submitPR, actionPR, actionPO } from "@/lib/actions/procurement";
import { fmtDate, fmtRM } from "@/lib/format";
import type { PurchaseOrder, PurchaseRequest } from "@/lib/types";

export async function ProcurementTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [{ data: prs }, { data: pos }, { data: deliveries }] = await Promise.all([
    supabase
      .from("purchase_requests")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("material_deliveries")
      .select("*, purchase_orders(po_no)")
      .eq("project_id", projectId)
      .order("delivery_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <Card
        title="Purchase Requests"
        action={
          <LinkButton href={`/purchase-requests/new?project=${projectId}`} variant="secondary">
            + New PR
          </LinkButton>
        }
      >
        {!prs?.length ? (
          <EmptyState message="No purchase requests for this project yet." />
        ) : (
          <Table headers={["PR No", "Requested By", "Date", "Status", "Actions"]}>
            {(prs as PurchaseRequest[]).map((pr) => (
              <tr key={pr.id} className="hover:bg-slate-50">
                <Td className="font-medium">{pr.pr_no}</Td>
                <Td>{pr.requested_by ?? "—"}</Td>
                <Td>{fmtDate(pr.request_date)}</Td>
                <Td>
                  <StatusBadge status={pr.status} />
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {pr.status === "draft" && (
                      <ActionButton label="Submit" variant="primary" action={submitPR.bind(null, pr.id)} />
                    )}
                    {pr.status === "pending" && (
                      <>
                        <ActionButton
                          label="Approve"
                          variant="approve"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionPR(pr.id, "approved", remarks);
                          }}
                        />
                        <ActionButton
                          label="Reject"
                          variant="reject"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionPR(pr.id, "rejected", remarks);
                          }}
                        />
                      </>
                    )}
                    {pr.status === "approved" && (
                      <LinkButton href={`/purchase-orders/new?pr=${pr.id}`} variant="secondary">
                        Raise PO →
                      </LinkButton>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Purchase Orders">
        {!pos?.length ? (
          <EmptyState message="No purchase orders for this project yet." />
        ) : (
          <Table headers={["PO No", "Supplier", "Issue Date", "Amount", "Status", "Actions"]} rightAlign={[3]}>
            {(pos as PurchaseOrder[]).map((po) => (
              <tr key={po.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/purchase-orders/${po.id}`} className="font-medium text-slate-900 hover:underline">
                    {po.po_no}
                  </Link>
                </Td>
                <Td>{po.suppliers?.name ?? "—"}</Td>
                <Td>{fmtDate(po.issue_date)}</Td>
                <Td right>{fmtRM(po.total_amount)}</Td>
                <Td>
                  <StatusBadge status={po.status} />
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {po.status === "draft" && (
                      <ActionButton
                        label="Approve"
                        variant="approve"
                        promptRemarks
                        action={async (remarks: string) => {
                          "use server";
                          return actionPO(po.id, "approved", remarks);
                        }}
                      />
                    )}
                    {po.status === "approved" && (
                      <LinkButton href={`/purchase-orders/${po.id}`} variant="secondary">
                        Record Delivery →
                      </LinkButton>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Material Deliveries">
        {!deliveries?.length ? (
          <EmptyState message="No deliveries recorded for this project yet." />
        ) : (
          <Table headers={["Date", "PO", "Note No", "Received By", "Notes"]}>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <Td>{fmtDate(d.delivery_date)}</Td>
                <Td>{(d.purchase_orders as { po_no?: string } | null)?.po_no ?? "—"}</Td>
                <Td>{d.delivery_note_no ?? "—"}</Td>
                <Td>{d.received_by ?? "—"}</Td>
                <Td className="whitespace-normal">{d.notes ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
