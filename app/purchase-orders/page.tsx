import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { actionPO, deletePO } from "@/lib/actions/procurement";
import { fmtDate, fmtRM } from "@/lib/format";
import type { PurchaseOrder } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();
  const { data: pos, error } = await supabase
    .from("purchase_orders")
    .select("*, projects(name, project_code), suppliers(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Purchase Orders" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load purchase orders: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        subtitle="Committed orders to suppliers — approve, track delivery, settle payment"
        action={<LinkButton href="/purchase-orders/new">+ New Purchase Order</LinkButton>}
      />
      <Card>
        {!pos?.length ? (
          <EmptyState
            message="No purchase orders yet. Raise one from an approved purchase request."
            action={<LinkButton href="/purchase-orders/new">Create the first PO</LinkButton>}
          />
        ) : (
          <Table
            headers={["PO No", "Project", "Supplier", "Issue Date", "Delivery Due", "Amount", "Status", "Actions"]}
            rightAlign={[5]}
          >
            {(pos as PurchaseOrder[]).map((po) => (
              <tr key={po.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/purchase-orders/${po.id}`} className="font-medium text-slate-900 hover:underline">
                    {po.po_no ?? "—"}
                  </Link>
                </Td>
                <Td>{po.projects?.name ?? "—"}</Td>
                <Td>{po.suppliers?.name ?? "—"}</Td>
                <Td>{fmtDate(po.issue_date)}</Td>
                <Td>{fmtDate(po.delivery_date)}</Td>
                <Td right>{fmtRM(po.total_amount)}</Td>
                <Td>
                  <StatusBadge status={po.status} />
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {po.status === "draft" && (
                      <>
                        <ActionButton
                          label="Approve"
                          variant="approve"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionPO(po.id, "approved", remarks);
                          }}
                        />
                        <LinkButton href={`/purchase-orders/${po.id}/edit`} variant="secondary">
                          Edit
                        </LinkButton>
                        <ActionButton
                          label="Delete"
                          variant="danger"
                          confirmMessage={`Delete ${po.po_no}?`}
                          action={deletePO.bind(null, po.id)}
                        />
                      </>
                    )}
                    {po.status === "approved" && (
                      <LinkButton href={`/purchase-orders/${po.id}`} variant="secondary">
                        Record Delivery →
                      </LinkButton>
                    )}
                    {["delivered", "invoiced"].includes(po.status) && (
                      <LinkButton href={`/purchase-orders/${po.id}`} variant="secondary">
                        View / Pay →
                      </LinkButton>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
