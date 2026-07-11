import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortfolioSnapshot } from "@/lib/portfolio";
import { PageHeader, Card, Table, Td, EmptyState, StatCard, LinkButton } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";
import { fmtDate, fmtRM } from "@/lib/format";

/** Finance home — cash, labour, receivables and financial exceptions. */
export async function FinanceDashboard() {
  const supabase = await createClient();
  const [{ projects, perProject, totals }, { data: awaitingPayment }, { data: labourRecent }] =
    await Promise.all([
      getPortfolioSnapshot(),
      supabase
        .from("progress_claims")
        .select("id, claim_no, approved_amount, project_id, projects(name)")
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
      supabase
        .from("labour_costs")
        .select("id, worker_name, work_date, total_cost, projects(name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // Financial exceptions: negative margin or heavy unpaid certified claims
  const exceptions = projects
    .map((p) => ({ p, snap: perProject.get(p.id)! }))
    .filter(
      ({ p, snap }) =>
        p.status === "active" &&
        (snap.margin < 0 || (snap.revised > 0 && snap.receivable > 0.3 * snap.revised)),
    );

  return (
    <>
      <PageHeader title="Finance" subtitle="Cash, labour and receivables at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Cash Position"
          value={fmtRM(totals.received - totals.paidOut)}
          tone={totals.received - totals.paidOut >= 0 ? "good" : "bad"}
        />
        <StatCard label="Outstanding Receivables" value={fmtRM(totals.receivable)} tone="warn" />
        <StatCard label="Outstanding Payables" value={fmtRM(totals.payable)} tone="warn" />
        <StatCard label="Labour Cost to Date" value={fmtRM(totals.labour)} />
      </div>

      <div className="space-y-6">
        <Card
          title={`Claims Awaiting Payment (${awaitingPayment?.length ?? 0})`}
          action={<LinkButton href="/payments" variant="secondary">Record receipt →</LinkButton>}
        >
          {!awaitingPayment?.length ? (
            <EmptyState message="No approved claims awaiting customer payment." />
          ) : (
            <Table headers={["Claim", "Project", "Certified Amount"]}>
              {awaitingPayment.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium">{c.claim_no}</Td>
                  <Td>
                    <Link href={`/projects/${c.project_id}?tab=claims`} className="hover:underline">
                      {(c.projects as { name?: string } | null)?.name ?? "—"}
                    </Link>
                  </Td>
                  <Td className="font-medium">{fmtRM(c.approved_amount)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Financial Exceptions">
          {!exceptions.length ? (
            <EmptyState message="No projects with negative margin or heavy unpaid claims." />
          ) : (
            <Table headers={["Project", "Health", "Margin", "Unpaid Certified"]}>
              {exceptions.map(({ p, snap }) => (
                <tr key={p.id}>
                  <Td>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                  </Td>
                  <Td>
                    <HealthBadge health={snap.health} />
                  </Td>
                  <Td className={snap.margin < 0 ? "text-rose-600 font-semibold" : ""}>
                    {fmtRM(snap.margin)}
                  </Td>
                  <Td>{fmtRM(snap.receivable)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card
          title="Recent Labour Costs"
          action={<LinkButton href="/labour-costs" variant="secondary">Labour module →</LinkButton>}
        >
          {!labourRecent?.length ? (
            <EmptyState message="No labour cost entries yet." />
          ) : (
            <Table headers={["Date", "Worker", "Project", "Total"]}>
              {labourRecent.map((l) => (
                <tr key={l.id}>
                  <Td>{fmtDate(l.work_date)}</Td>
                  <Td>{l.worker_name}</Td>
                  <Td>{(l.projects as { name?: string } | null)?.name ?? "—"}</Td>
                  <Td className="font-medium">{fmtRM(l.total_cost)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
