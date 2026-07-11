import Link from "next/link";
import { getPortfolioSnapshot } from "@/lib/portfolio";
import { PageHeader, Card, Table, Td, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";
import { ActionButton } from "@/components/action-button";
import { ApproveClaimButton } from "@/components/approve-claim-button";
import { actionPR, actionPO } from "@/lib/actions/procurement";
import { actionVO, approveClaim } from "@/lib/actions/financial";
import { fmtDate, fmtRM, fmtPct } from "@/lib/format";

type QueueItem = {
  kind: "pr" | "po" | "vo" | "claim";
  id: string;
  docNo: string;
  projectName: string;
  description: string;
  amount: number;
  createdAt: string;
};

export async function DirectorDashboard() {
  const { projects, perProject, totals, raw } = await getPortfolioSnapshot();

  const activeProjects = projects.filter((p) => p.status === "active");
  const todayStr = new Date().toISOString().slice(0, 10);

  // Approval queue, oldest first
  const queue: QueueItem[] = [
    ...raw.pendingPRs.map((pr) => ({
      kind: "pr" as const,
      id: pr.id,
      docNo: pr.pr_no ?? "PR",
      projectName: pr.projects?.name ?? "—",
      description: ((pr.items as { description?: string }[]) ?? [])
        .map((i) => i.description)
        .join(", "),
      amount: ((pr.items as { qty?: number; est_rate?: number }[]) ?? []).reduce(
        (a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0),
        0,
      ),
      createdAt: pr.created_at,
    })),
    ...raw.pos
      .filter((po) => po.status === "draft")
      .map((po) => ({
        kind: "po" as const,
        id: po.id,
        docNo: po.po_no ?? "PO",
        projectName: po.projects?.name ?? "—",
        description: `Supplier: ${po.suppliers?.name ?? "—"}`,
        amount: Number(po.total_amount) || 0,
        createdAt: po.created_at,
      })),
    ...raw.vos
      .filter((vo) => ["draft", "pending"].includes(vo.status))
      .map((vo) => ({
        kind: "vo" as const,
        id: vo.id,
        docNo: vo.vo_no ?? "VO",
        projectName: vo.projects?.name ?? "—",
        description: vo.description,
        amount: Number(vo.amount) || 0,
        createdAt: vo.created_at,
      })),
    ...raw.claims
      .filter((c) => c.status === "submitted")
      .map((c) => ({
        kind: "claim" as const,
        id: c.id,
        docNo: c.claim_no ?? "Claim",
        projectName: c.projects?.name ?? "—",
        description: "Progress claim awaiting certification",
        amount: Number(c.claimed_amount) || 0,
        createdAt: c.created_at,
      })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const KIND_LABEL = { pr: "Purchase Request", po: "Purchase Order", vo: "Variation Order", claim: "Progress Claim" };
  const ageDays = (iso: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

  // Rank projects worst-first by health
  const rank = { critical: 0, attention: 1, healthy: 2 };
  const health = activeProjects
    .map((p) => ({ p, snap: perProject.get(p.id)! }))
    .sort((a, b) => rank[a.snap.health.status] - rank[b.snap.health.status]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Director view — cash, approvals and project health across the company"
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Active Projects" value={String(activeProjects.length)} />
        <StatCard label="Pending Approvals" value={String(queue.length)} tone={queue.length ? "warn" : "default"} />
        <StatCard label="Outstanding Receivables" value={fmtRM(totals.receivable)} tone="warn" hint="Approved claims not yet received" />
        <StatCard label="Outstanding Payables" value={fmtRM(totals.payable)} tone="warn" hint="Delivered POs not yet paid" />
        <StatCard label="Labour Cost" value={fmtRM(totals.labour)} hint="All projects to date" />
        <StatCard
          label="Cash Position"
          value={fmtRM(totals.received - totals.paidOut)}
          tone={totals.received - totals.paidOut >= 0 ? "good" : "bad"}
          hint="Receipts minus supplier payments"
        />
      </div>

      <div className="space-y-6">
        <Card title={`Pending Approvals (${queue.length}) — oldest first`}>
          {!queue.length ? (
            <EmptyState message="Nothing awaiting approval. All clear." />
          ) : (
            <Table headers={["Type", "Doc", "Project", "Details", "Amount", "Age", "Actions"]} rightAlign={[4, 5]}>
              {queue.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="hover:bg-slate-50 align-top">
                  <Td>
                    <span className="text-xs font-medium text-slate-500">{KIND_LABEL[item.kind]}</span>
                  </Td>
                  <Td className="font-medium">{item.docNo}</Td>
                  <Td>{item.projectName}</Td>
                  <Td className="whitespace-normal max-w-sm">{item.description}</Td>
                  <Td right>{fmtRM(item.amount)}</Td>
                  <Td right>
                    <span className={ageDays(item.createdAt) > 7 ? "text-rose-600 font-medium" : ""}>
                      {ageDays(item.createdAt)}d
                    </span>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1.5">
                      {item.kind === "pr" && (
                        <>
                          <ActionButton label="Approve" variant="approve" promptRemarks
                            action={async (remarks: string) => { "use server"; return actionPR(item.id, "approved", remarks); }} />
                          <ActionButton label="Reject" variant="reject" promptRemarks
                            action={async (remarks: string) => { "use server"; return actionPR(item.id, "rejected", remarks); }} />
                        </>
                      )}
                      {item.kind === "po" && (
                        <ActionButton label="Approve" variant="approve" promptRemarks
                          action={async (remarks: string) => { "use server"; return actionPO(item.id, "approved", remarks); }} />
                      )}
                      {item.kind === "vo" && (
                        <>
                          <ActionButton label="Approve" variant="approve" promptRemarks
                            action={async (remarks: string) => { "use server"; return actionVO(item.id, "approved", remarks); }} />
                          <ActionButton label="Reject" variant="reject" promptRemarks
                            action={async (remarks: string) => { "use server"; return actionVO(item.id, "rejected", remarks); }} />
                        </>
                      )}
                      {item.kind === "claim" && (
                        <ApproveClaimButton claimedAmount={item.amount}
                          action={async (amount: number | null, remarks: string) => { "use server"; return approveClaim(item.id, amount, remarks); }} />
                      )}
                    </span>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Project Health — worst first">
          {!health.length ? (
            <EmptyState message="No active projects." />
          ) : (
            <Table
              headers={["Project", "Health", "Completion", "Budget", "Committed (incl. labour)", "Margin", "Notes"]}
              rightAlign={[3, 4, 5]}
            >
              {health.map(({ p, snap }) => (
                <tr key={p.id} className="hover:bg-slate-50 align-top">
                  <Td>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-slate-400">{(p.clients as { name?: string } | null)?.name}</span>
                  </Td>
                  <Td>
                    <HealthBadge health={snap.health} />
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <span className="block h-full bg-emerald-500" style={{ width: `${Math.min(100, Number(p.completion_pct) || 0)}%` }} />
                      </span>
                      {fmtPct(p.completion_pct)}
                    </span>
                  </Td>
                  <Td right>{fmtRM(snap.budget)}</Td>
                  <Td right>{fmtRM(snap.committed)}</Td>
                  <Td right>
                    <span className={snap.margin < 0 ? "text-rose-600 font-semibold" : snap.marginPct < 10 ? "text-amber-600" : "text-emerald-600"}>
                      {fmtRM(snap.margin)}
                    </span>
                  </Td>
                  <Td className="whitespace-normal max-w-56 text-xs text-slate-500">
                    {snap.health.reasons.length ? snap.health.reasons.join(" · ") : "On track"}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Upcoming Milestones — projects by end date">
          {!activeProjects.length ? (
            <EmptyState message="No active projects." />
          ) : (
            <Table headers={["Project", "PM", "Status", "Start", "End", "Contract Value"]} rightAlign={[5]}>
              {[...activeProjects]
                .sort((a, b) => (a.end_date ?? "9999").localeCompare(b.end_date ?? "9999"))
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.name}
                      </Link>
                    </Td>
                    <Td>{p.project_manager ?? "—"}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td>{fmtDate(p.start_date)}</Td>
                    <Td className={p.end_date && p.end_date < todayStr ? "text-rose-600 font-medium" : ""}>
                      {fmtDate(p.end_date)}
                    </Td>
                    <Td right>{fmtRM(p.contract_value)}</Td>
                  </tr>
                ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
