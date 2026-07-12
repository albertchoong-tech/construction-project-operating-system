import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { submitPR, actionPR, deletePR } from "@/lib/actions/procurement";
import { fmtDate, fmtRM } from "@/lib/format";
import type { PurchaseRequest, PRItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

function prTotal(items: PRItem[]): number {
  return (items ?? []).reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0), 0);
}

export default async function PurchaseRequestsPage() {
  const supabase = await createClient();
  const { data: prs, error } = await supabase
    .from("purchase_requests")
    .select("*, projects(name, project_code)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Purchase Requests" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load purchase requests: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Purchase Requests"
        subtitle="Site material requests — submit for approval, then convert to POs"
        action={<LinkButton href="/purchase-requests/new">+ New Purchase Request</LinkButton>}
      />
      <Card>
        {!prs?.length ? (
          <EmptyState
            message="No purchase requests yet."
            action={<LinkButton href="/purchase-requests/new">Create the first PR</LinkButton>}
          />
        ) : (
          <Table
            headers={["PR No", "Project", "Items", "Est. Total", "Requested By", "Date", "Status", "Actions"]}
            rightAlign={[3]}
          >
            {(prs as PurchaseRequest[]).map((pr) => (
              <tr key={pr.id} className="hover:bg-slate-50 align-top">
                <Td className="font-medium">{pr.pr_no ?? "—"}</Td>
                <Td>
                  <Link href={`/projects/${pr.project_id}?tab=procurement`} className="hover:underline">
                    {pr.projects?.name ?? "—"}
                  </Link>
                </Td>
                <Td className="whitespace-normal max-w-xs text-slate-600">
                  {(pr.items ?? []).map((i, idx) => (
                    <span key={idx} className="block">
                      {i.description} — {i.qty} {i.unit}
                    </span>
                  ))}
                </Td>
                <Td right>{fmtRM(prTotal(pr.items))}</Td>
                <Td>{pr.requested_by ?? "—"}</Td>
                <Td>{fmtDate(pr.request_date)}</Td>
                <Td>
                  <StatusBadge status={pr.status} />
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {pr.status === "draft" && (
                      <>
                        <ActionButton
                          label="Submit for Approval"
                          variant="primary"
                          action={submitPR.bind(null, pr.id)}
                        />
                        <LinkButton href={`/purchase-requests/${pr.id}/edit`} variant="secondary">
                          Edit
                        </LinkButton>
                        <ActionButton
                          label="Delete"
                          variant="danger"
                          confirmMessage={`Delete ${pr.pr_no}?`}
                          action={deletePR.bind(null, pr.id)}
                        />
                      </>
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
    </>
  );
}
