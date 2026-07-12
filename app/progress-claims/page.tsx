import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { ApproveClaimButton } from "@/components/approve-claim-button";
import { approveClaim, rejectClaim, deleteClaim, cancelClaim } from "@/lib/actions/financial";
import { fmtDate, fmtRM } from "@/lib/format";
import type { ProgressClaim } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProgressClaimsPage() {
  const supabase = await createClient();
  const { data: claims, error } = await supabase
    .from("progress_claims")
    .select("*, projects(name, project_code)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Progress Claims" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load claims: {error.message}</p>
        </Card>
      </>
    );
  }

  const outstanding = (claims ?? [])
    .filter((c) => c.status === "approved")
    .reduce((a, c) => a + (Number(c.approved_amount) || 0), 0);

  return (
    <>
      <PageHeader
        title="Progress Claims"
        subtitle={`Claims are generated from each project's Claims tab, pre-filled from site completion. Outstanding approved: ${fmtRM(outstanding)}`}
      />
      <Card>
        {!claims?.length ? (
          <EmptyState message="No progress claims yet. Open a project's Claims tab to generate one." />
        ) : (
          <Table
            headers={["Claim No", "Project", "Claim Date", "Period End", "Claimed", "Certified", "Status", "Actions"]}
            rightAlign={[4, 5]}
          >
            {(claims as ProgressClaim[]).map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 align-top">
                <Td className="font-medium">{c.claim_no}</Td>
                <Td>
                  <Link href={`/projects/${c.project_id}?tab=claims`} className="hover:underline">
                    {c.projects?.name ?? "—"}
                  </Link>
                </Td>
                <Td>{fmtDate(c.claim_date)}</Td>
                <Td>{fmtDate(c.period_end)}</Td>
                <Td right>{fmtRM(c.claimed_amount)}</Td>
                <Td right>{c.approved_amount ? fmtRM(c.approved_amount) : "—"}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {["draft", "submitted"].includes(c.status) && (
                      <>
                        <ApproveClaimButton
                          claimedAmount={Number(c.claimed_amount) || 0}
                          action={async (amount: number | null, remarks: string) => {
                            "use server";
                            return approveClaim(c.id, amount, remarks);
                          }}
                        />
                        {c.status === "submitted" && (
                          <ActionButton
                            label="Reject"
                            variant="reject"
                            promptRemarks
                            action={async (remarks: string) => {
                              "use server";
                              return rejectClaim(c.id, remarks);
                            }}
                          />
                        )}
                        <LinkButton href={`/progress-claims/${c.id}/edit`} variant="secondary">
                          Edit
                        </LinkButton>
                        <ActionButton
                          label="Delete"
                          variant="danger"
                          confirmMessage={`Delete ${c.claim_no}?`}
                          action={deleteClaim.bind(null, c.id)}
                        />
                      </>
                    )}
                    {c.status === "approved" && (
                      <>
                        <LinkButton href={`/projects/${c.project_id}?tab=claims`} variant="secondary">
                          Record payment →
                        </LinkButton>
                        <ActionButton
                          label="Cancel"
                          variant="danger"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return cancelClaim(c.id, remarks);
                          }}
                        />
                      </>
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
