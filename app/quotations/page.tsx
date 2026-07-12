import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton, StatusBadge, StatCard } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import {
  submitQuotation,
  actionQuotation,
  deleteQuotation,
  convertQuotation,
} from "@/lib/actions/quotations";
import { fmtDate, fmtRM } from "@/lib/format";
import type { Quotation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("*, clients(name), projects(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Quotations" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load quotations: {error.message}</p>
        </Card>
      </>
    );
  }

  const quotations = (data ?? []) as Quotation[];
  const pipeline = quotations
    .filter((q) => ["draft", "submitted", "approved"].includes(q.status))
    .reduce((a, q) => a + (Number(q.total_amount) || 0), 0);
  const won = quotations
    .filter((q) => q.status === "converted")
    .reduce((a, q) => a + (Number(q.total_amount) || 0), 0);

  return (
    <>
      <PageHeader
        title="Quotations"
        subtitle="Win the work here — approved quotations convert straight into projects with the BOQ pre-filled"
        action={<LinkButton href="/quotations/new">+ New Quotation</LinkButton>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Open Pipeline" value={fmtRM(pipeline)} hint="Draft, submitted & approved" />
        <StatCard label="Won (Converted)" value={fmtRM(won)} tone="good" />
        <StatCard label="Quotations" value={String(quotations.length)} />
      </div>

      <Card>
        {!quotations.length ? (
          <EmptyState
            message="No quotations yet."
            action={<LinkButton href="/quotations/new">Create your first quotation</LinkButton>}
          />
        ) : (
          <Table
            headers={["Quotation", "Client", "Issued", "Valid Until", "Total", "Status", "Actions"]}
            rightAlign={[4]}
          >
            {quotations.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50 align-top">
                <Td>
                  <Link href={`/quotations/${q.id}`} className="font-medium text-slate-900 hover:underline">
                    {q.quotation_no}
                  </Link>
                  <span className="block text-xs text-slate-400 whitespace-normal max-w-52">{q.title}</span>
                </Td>
                <Td>{q.clients?.name ?? "—"}</Td>
                <Td>{fmtDate(q.issue_date)}</Td>
                <Td>{fmtDate(q.valid_until)}</Td>
                <Td right className="font-medium">
                  {fmtRM(q.total_amount)}
                </Td>
                <Td>
                  <StatusBadge status={q.status} />
                  {q.status === "converted" && q.projects?.name && (
                    <Link
                      href={`/projects/${q.project_id}`}
                      className="block text-xs text-slate-400 hover:underline mt-0.5"
                    >
                      → {q.projects.name}
                    </Link>
                  )}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {q.status === "draft" && (
                      <>
                        <ActionButton
                          label="Submit for Approval"
                          variant="primary"
                          action={submitQuotation.bind(null, q.id)}
                        />
                        <LinkButton href={`/quotations/${q.id}/edit`} variant="secondary">
                          Edit
                        </LinkButton>
                        <ActionButton
                          label="Delete"
                          variant="danger"
                          confirmMessage={`Delete ${q.quotation_no}?`}
                          action={deleteQuotation.bind(null, q.id)}
                        />
                      </>
                    )}
                    {q.status === "submitted" && (
                      <>
                        <ActionButton
                          label="Approve"
                          variant="approve"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionQuotation(q.id, "approved", remarks);
                          }}
                        />
                        <ActionButton
                          label="Reject"
                          variant="reject"
                          promptRemarks
                          action={async (remarks: string) => {
                            "use server";
                            return actionQuotation(q.id, "rejected", remarks);
                          }}
                        />
                      </>
                    )}
                    {q.status === "approved" && (
                      <ActionButton
                        label="Convert to Project"
                        variant="approve"
                        confirmMessage={`Create a project from ${q.quotation_no}? The quotation lines become the project BOQ and the contract value is set to ${fmtRM(q.total_amount)}.`}
                        action={convertQuotation.bind(null, q.id)}
                      />
                    )}
                    {q.status === "rejected" && (
                      <ActionButton
                        label="Delete"
                        variant="danger"
                        confirmMessage={`Delete ${q.quotation_no}?`}
                        action={deleteQuotation.bind(null, q.id)}
                      />
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
