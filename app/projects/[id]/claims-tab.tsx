import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { ApproveClaimButton } from "@/components/approve-claim-button";
import {
  createClaim,
  approveClaim,
  rejectClaim,
  deleteClaim,
  cancelClaim,
  recordCustomerPayment,
} from "@/lib/actions/financial";
import { fmtDate, fmtRM, fmtPct, today } from "@/lib/format";
import type { ProjectFinancials } from "@/lib/financials";
import type { CustomerPayment, ProgressClaim, Project } from "@/lib/types";

export async function ClaimsTab({
  project,
  fin,
  completion,
}: {
  project: Project;
  fin: ProjectFinancials;
  completion: number;
}) {
  const supabase = await createClient();
  const [{ data: claims, error }, { data: payments }] = await Promise.all([
    supabase
      .from("progress_claims")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_payments")
      .select("*, progress_claims(claim_no)")
      .eq("project_id", project.id)
      .order("payment_date", { ascending: false }),
  ]);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load claims: {error.message}</p>
      </Card>
    );
  }

  // Pre-fill: work certified to date minus everything already claimed
  const earnedToDate = (completion / 100) * fin.revisedContractValue;
  const suggestion = Math.max(0, Math.round((earnedToDate - fin.claimedTotal) * 100) / 100);
  const approvedClaims = (claims ?? []).filter((c) => ["approved", "paid"].includes(c.status));

  return (
    <div className="space-y-6">
      <Card title="Progress Claims">
        {!claims?.length ? (
          <EmptyState message="No progress claims yet. Generate one below." />
        ) : (
          <Table
            headers={["Claim No", "Claim Date", "Period End", "Claimed", "Certified", "Status", "Actions"]}
            rightAlign={[3, 4]}
          >
            {(claims as ProgressClaim[]).map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 align-top">
                <Td className="font-medium">{c.claim_no}</Td>
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
                      <ActionButton
                        label="Cancel"
                        variant="danger"
                        promptRemarks
                        action={async (remarks: string) => {
                          "use server";
                          return cancelClaim(c.id, remarks);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="New Progress Claim">
          <p className="text-sm text-slate-500 mb-4">
            Work certified to date: <strong>{fmtPct(completion)}</strong> of{" "}
            <strong>{fmtRM(fin.revisedContractValue)}</strong> ={" "}
            <strong>{fmtRM(earnedToDate)}</strong>. Previously claimed:{" "}
            <strong>{fmtRM(fin.claimedTotal)}</strong>. Suggested claim below — adjust as needed.
          </p>
          <ActionForm action={createClaim} submitLabel="Submit Claim">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Claimed amount (RM)" required>
                <TextInput
                  name="claimed_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={suggestion > 0 ? suggestion : ""}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Claim date">
                <TextInput name="claim_date" type="date" defaultValue={today()} />
              </Field>
              <Field label="Period end">
                <TextInput name="period_end" type="date" defaultValue={today()} />
              </Field>
              <Field label="Notes" className="sm:col-span-3">
                <TextArea name="notes" placeholder="Basis of claim, supporting documents…" />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card title="Record Customer Payment">
          {!approvedClaims.length ? (
            <p className="text-sm text-slate-500">
              No approved claims awaiting payment. Approve a claim first.
            </p>
          ) : (
            <ActionForm action={recordCustomerPayment} submitLabel="Record Receipt">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Against claim" required>
                  <select
                    name="claim_id"
                    required
                    defaultValue={approvedClaims[0]?.id ?? ""}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {approvedClaims.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.claim_no} · certified {fmtRM(c.approved_amount)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount (RM)" required>
                  <TextInput name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
                </Field>
                <Field label="Payment date">
                  <TextInput name="payment_date" type="date" defaultValue={today()} />
                </Field>
                <Field label="Method">
                  <TextInput name="payment_method" placeholder="Bank Transfer" />
                </Field>
                <Field label="Reference no." className="sm:col-span-2">
                  <TextInput name="reference_no" placeholder="TT-…" />
                </Field>
              </div>
            </ActionForm>
          )}
        </Card>
      </div>

      <Card title="Customer Payments Received">
        {!payments?.length ? (
          <EmptyState message="No customer payments recorded yet." />
        ) : (
          <Table headers={["Date", "Claim", "Amount", "Method", "Reference"]} rightAlign={[2]}>
            {(payments as CustomerPayment[]).map((p) => (
              <tr key={p.id}>
                <Td>{fmtDate(p.payment_date)}</Td>
                <Td>{p.progress_claims?.claim_no ?? "—"}</Td>
                <Td right>{fmtRM(p.amount)}</Td>
                <Td>{p.payment_method ?? "—"}</Td>
                <Td>{p.reference_no ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
