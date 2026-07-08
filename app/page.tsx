import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { ApproveClaimButton } from "@/components/approve-claim-button";
import { actionPR, actionPO } from "@/lib/actions/procurement";
import { actionVO, approveClaim } from "@/lib/actions/financial";
import { fmtDate, fmtRM, fmtPct } from "@/lib/format";
import { PO_ACTUAL_STATUSES, PO_COMMITTED_STATUSES } from "@/lib/financials";

export const dynamic = "force-dynamic";

type QueueItem = {
  kind: "pr" | "po" | "vo" | "claim";
  id: string;
  docNo: string;
  projectName: string;
  description: string;
  amount: number;
  createdAt: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: projects },
    { data: budgets },
    { data: pos },
    { data: vos },
    { data: claims },
    { data: receipts },
    { data: supplierPays },
    { data: pendingPRs },
  ] = await Promise.all([
    supabase.from("projects").select("*, clients(name)").order("end_date"),
    supabase.from("budgets").select("project_id, budgeted_amount"),
    supabase.from("purchase_orders").select("id, po_no, project_id, status, total_amount, delivery_date, created_at, projects(name), suppliers(name)"),
    supabase.from("variation_orders").select("id, vo_no, project_id, status, amount, description, created_at, projects(name)"),
    supabase.from("progress_claims").select("id, claim_no, project_id, status, claimed_amount, approved_amount, created_at, projects(name)"),
    supabase.from("customer_payments").select("amount"),
    supabase.from("supplier_payments").select("amount"),
    supabase.from("purchase_requests").select("id, pr_no, project_id, status, items, created_at, projects(name)").eq("status", "pending"),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeProjects = (projects ?? []).filter((p) => p.status === "active");

  // Company-wide KPIs
  const totalReceived = (receipts ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const totalPaidOut = (supplierPays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const approvedClaimTotal = (claims ?? [])
    .filter((c) => ["approved", "paid"].includes(c.status))
    .reduce((a, c) => a + (Number(c.approved_amount) || 0), 0);
  const outstandingReceivable = Math.max(0, approvedClaimTotal - totalReceived);
  const actualCost = (pos ?? [])
    .filter((po) => PO_ACTUAL_STATUSES.includes(po.status))
    .reduce((a, po) => a + (Number(po.total_amount) || 0), 0);
  const outstandingPayable = Math.max(0, actualCost - totalPaidOut);

  // Approval queue, oldest first
  const queue: QueueItem[] = [
    ...(pendingPRs ?? []).map((pr) => ({
      kind: "pr" as const,
      id: pr.id,
      docNo: pr.pr_no ?? "PR",
      projectName: (pr.projects as { name?: string } | null)?.name ?? "—",
      description: ((pr.items as { description?: string }[]) ?? [])
        .map((i) => i.description)
        .join(", "),
      amount: ((pr.items as { qty?: number; est_rate?: number }[]) ?? []).reduce(
        (a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0),
        0,
      ),
      createdAt: pr.created_at,
    })),
    ...(pos ?? [])
      .filter((po) => po.status === "draft")
      .map((po) => ({
        kind: "po" as const,
        id: po.id,
        docNo: po.po_no ?? "PO",
        projectName: (po.projects as { name?: string } | null)?.name ?? "—",
        description: `Supplier: ${(po.suppliers as { name?: string } | null)?.name ?? "—"}`,
        amount: Number(po.total_amount) || 0,
        createdAt: po.created_at,
      })),
    ...(vos ?? [])
      .filter((vo) => ["draft", "pending"].includes(vo.status))
      .map((vo) => ({
        kind: "vo" as const,
        id: vo.id,
        docNo: vo.vo_no ?? "VO",
        projectName: (vo.projects as { name?: string } | null)?.name ?? "—",
        description: vo.description,
        amount: Number(vo.amount) || 0,
        createdAt: vo.created_at,
      })),
    ...(claims ?? [])
      .filter((c) => c.status === "submitted")
      .map((c) => ({
        kind: "claim" as const,
        id: c.id,
        docNo: c.claim_no ?? "Claim",
        projectName: (c.projects as { name?: string } | null)?.name ?? "—",
        description: "Progress claim awaiting certification",
        amount: Number(c.claimed_amount) || 0,
        createdAt: c.created_at,
      })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const KIND_LABEL = { pr: "Purchase Request", po: "Purchase Order", vo: "Variation Order", claim: "Progress Claim" };
  const ageDays = (iso: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

  // Per-project health
  const budgetByProject = new Map<string, number>();
  for (const b of budgets ?? []) {
    budgetByProject.set(
      b.project_id,
      (budgetByProject.get(b.project_id) ?? 0) + (Number(b.budgeted_amount) || 0),
    );
  }
  const committedByProject = new Map<string, number>();
  const overduePOsByProject = new Map<string, number>();
  for (const po of pos ?? []) {
    if (PO_COMMITTED_STATUSES.includes(po.status)) {
      committedByProject.set(
        po.project_id,
        (committedByProject.get(po.project_id) ?? 0) + (Number(po.total_amount) || 0),
      );
    }
    if (
      po.delivery_date &&
      po.delivery_date < todayStr &&
      !["delivered", "invoiced", "paid"].includes(po.status)
    ) {
      overduePOsByProject.set(po.project_id, (overduePOsByProject.get(po.project_id) ?? 0) + 1);
    }
  }

  const health = activeProjects.map((p) => {
    const budget = budgetByProject.get(p.id) ?? 0;
    const committed = committedByProject.get(p.id) ?? 0;
    const variancePct = budget > 0 ? ((budget - committed) / budget) * 100 : null;
    const delayed = !!p.end_date && p.end_date < todayStr;
    const overduePOs = overduePOsByProject.get(p.id) ?? 0;
    // Rank worst-first: over budget, then delayed, then overdue POs
    const risk = (variancePct !== null && variancePct < 0 ? 100 : 0) + (delayed ? 50 : 0) + overduePOs * 10;
    return { p, budget, committed, variancePct, delayed, overduePOs, risk };
  });
  health.sort((a, b) => b.risk - a.risk);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Director view — cash, approvals and project health across the company"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Projects" value={String(activeProjects.length)} />
        <StatCard label="Pending Approvals" value={String(queue.length)} tone={queue.length ? "warn" : "default"} />
        <StatCard label="Outstanding Receivables" value={fmtRM(outstandingReceivable)} tone="warn" hint="Approved claims not yet received" />
        <StatCard label="Outstanding Payables" value={fmtRM(outstandingPayable)} tone="warn" hint="Delivered POs not yet paid" />
        <StatCard
          label="Cash Position"
          value={fmtRM(totalReceived - totalPaidOut)}
          tone={totalReceived - totalPaidOut >= 0 ? "good" : "bad"}
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

        <Card title="Project Health — highest risk first">
          {!health.length ? (
            <EmptyState message="No active projects." />
          ) : (
            <Table
              headers={["Project", "Completion", "Budget", "Committed", "Budget Variance", "Flags"]}
              rightAlign={[2, 3, 4]}
            >
              {health.map(({ p, budget, committed, variancePct, delayed, overduePOs }) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-slate-400">{(p.clients as { name?: string } | null)?.name}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <span className="block h-full bg-emerald-500" style={{ width: `${Math.min(100, Number(p.completion_pct) || 0)}%` }} />
                      </span>
                      {fmtPct(p.completion_pct)}
                    </span>
                  </Td>
                  <Td right>{fmtRM(budget)}</Td>
                  <Td right>{fmtRM(committed)}</Td>
                  <Td right>
                    {variancePct === null ? (
                      <span className="text-slate-400">No budget</span>
                    ) : (
                      <span className={variancePct < 0 ? "text-rose-600 font-semibold" : variancePct < 10 ? "text-amber-600" : "text-emerald-600"}>
                        {fmtPct(variancePct)}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1.5">
                      {delayed && (
                        <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 px-2 py-0.5 text-xs font-medium">
                          Past end date
                        </span>
                      )}
                      {overduePOs > 0 && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 px-2 py-0.5 text-xs font-medium">
                          {overduePOs} overdue PO{overduePOs > 1 ? "s" : ""}
                        </span>
                      )}
                      {!delayed && !overduePOs && <span className="text-slate-400 text-xs">On track</span>}
                    </span>
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
