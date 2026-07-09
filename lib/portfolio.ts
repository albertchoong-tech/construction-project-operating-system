import { createClient } from "@/lib/supabase/server";
import { PO_ACTUAL_STATUSES, PO_COMMITTED_STATUSES } from "@/lib/financials";
import { computeHealth, type Health } from "@/lib/health";
import type { Project } from "@/lib/types";

export type ProjectSnapshot = {
  budget: number;
  committed: number; // POs + labour
  labour: number;
  revised: number;
  margin: number;
  marginPct: number;
  receivable: number;
  pendingApprovals: number;
  overduePOs: number;
  openIssues: number;
  health: Health;
};

export type PortfolioSnapshot = {
  projects: Project[];
  perProject: Map<string, ProjectSnapshot>;
  totals: {
    received: number;
    paidOut: number;
    receivable: number;
    payable: number;
    labour: number;
  };
  raw: {
    pos: PoRow[];
    vos: VoRow[];
    claims: ClaimRow[];
    pendingPRs: PrRow[];
  };
};

export type PoRow = {
  id: string;
  po_no: string | null;
  project_id: string;
  status: string;
  total_amount: number;
  delivery_date: string | null;
  created_at: string;
  projects: { name?: string } | null;
  suppliers: { name?: string } | null;
};
export type VoRow = {
  id: string;
  vo_no: string | null;
  project_id: string;
  status: string;
  amount: number;
  description: string;
  created_at: string;
  projects: { name?: string } | null;
};
export type ClaimRow = {
  id: string;
  claim_no: string | null;
  project_id: string;
  status: string;
  claimed_amount: number;
  approved_amount: number;
  created_at: string;
  projects: { name?: string } | null;
};
export type PrRow = {
  id: string;
  pr_no: string | null;
  project_id: string;
  status: string;
  items: unknown;
  created_at: string;
  projects: { name?: string } | null;
};

/** One round of bulk queries powering the dashboard, project list health and KPIs. */
export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    { data: projects },
    { data: budgets },
    { data: pos },
    { data: labour },
    { data: vos },
    { data: claims },
    { data: receipts },
    { data: supplierPays },
    { data: pendingPRs },
    { data: issueInspections },
  ] = await Promise.all([
    supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false }),
    supabase.from("budgets").select("project_id, budgeted_amount"),
    supabase
      .from("purchase_orders")
      .select("id, po_no, project_id, status, total_amount, delivery_date, created_at, projects(name), suppliers(name)"),
    supabase.from("labour_costs").select("project_id, total_cost"),
    supabase
      .from("variation_orders")
      .select("id, vo_no, project_id, status, amount, description, created_at, projects(name)"),
    supabase
      .from("progress_claims")
      .select("id, claim_no, project_id, status, claimed_amount, approved_amount, created_at, projects(name)"),
    supabase.from("customer_payments").select("project_id, amount"),
    supabase.from("supplier_payments").select("project_id, amount"),
    supabase
      .from("purchase_requests")
      .select("id, pr_no, project_id, status, items, created_at, projects(name)")
      .eq("status", "pending"),
    supabase
      .from("inspection_records")
      .select("project_id, result")
      .in("result", ["fail", "conditional"]),
  ]);

  const sumInto = (map: Map<string, number>, key: string, value: number) =>
    map.set(key, (map.get(key) ?? 0) + value);

  const budgetBy = new Map<string, number>();
  for (const b of budgets ?? []) sumInto(budgetBy, b.project_id, Number(b.budgeted_amount) || 0);

  const poCommittedBy = new Map<string, number>();
  const poActualBy = new Map<string, number>();
  const overduePOsBy = new Map<string, number>();
  const draftPOsBy = new Map<string, number>();
  for (const po of (pos ?? []) as PoRow[]) {
    const amount = Number(po.total_amount) || 0;
    if (PO_COMMITTED_STATUSES.includes(po.status)) sumInto(poCommittedBy, po.project_id, amount);
    if (PO_ACTUAL_STATUSES.includes(po.status)) sumInto(poActualBy, po.project_id, amount);
    if (po.status === "draft") sumInto(draftPOsBy, po.project_id, 1);
    if (
      po.delivery_date &&
      po.delivery_date < todayStr &&
      !["delivered", "invoiced", "paid"].includes(po.status)
    )
      sumInto(overduePOsBy, po.project_id, 1);
  }

  const labourBy = new Map<string, number>();
  for (const l of labour ?? []) sumInto(labourBy, l.project_id, Number(l.total_cost) || 0);

  const approvedVOsBy = new Map<string, number>();
  const pendingVOsBy = new Map<string, number>();
  for (const vo of (vos ?? []) as VoRow[]) {
    if (vo.status === "approved") sumInto(approvedVOsBy, vo.project_id, Number(vo.amount) || 0);
    if (["draft", "pending"].includes(vo.status)) sumInto(pendingVOsBy, vo.project_id, 1);
  }

  const approvedClaimsBy = new Map<string, number>();
  const submittedClaimsBy = new Map<string, number>();
  for (const c of (claims ?? []) as ClaimRow[]) {
    if (["approved", "paid"].includes(c.status))
      sumInto(approvedClaimsBy, c.project_id, Number(c.approved_amount) || 0);
    if (c.status === "submitted") sumInto(submittedClaimsBy, c.project_id, 1);
  }

  const receiptsBy = new Map<string, number>();
  for (const p of receipts ?? []) sumInto(receiptsBy, p.project_id, Number(p.amount) || 0);
  const paidBy = new Map<string, number>();
  for (const p of supplierPays ?? []) sumInto(paidBy, p.project_id, Number(p.amount) || 0);

  const pendingPRsBy = new Map<string, number>();
  for (const pr of (pendingPRs ?? []) as PrRow[]) sumInto(pendingPRsBy, pr.project_id, 1);

  const issuesBy = new Map<string, number>();
  for (const i of issueInspections ?? []) sumInto(issuesBy, i.project_id, 1);

  const perProject = new Map<string, ProjectSnapshot>();
  for (const p of (projects ?? []) as Project[]) {
    const budget = budgetBy.get(p.id) ?? 0;
    const labourTotal = labourBy.get(p.id) ?? 0;
    const committed = (poCommittedBy.get(p.id) ?? 0) + labourTotal;
    const revised = (Number(p.contract_value) || 0) + (approvedVOsBy.get(p.id) ?? 0);
    const receivable = Math.max(
      0,
      (approvedClaimsBy.get(p.id) ?? 0) - (receiptsBy.get(p.id) ?? 0),
    );
    const margin = revised - committed;
    const marginPct = revised > 0 ? (margin / revised) * 100 : 0;
    const pendingApprovals =
      (pendingPRsBy.get(p.id) ?? 0) +
      (draftPOsBy.get(p.id) ?? 0) +
      (pendingVOsBy.get(p.id) ?? 0) +
      (submittedClaimsBy.get(p.id) ?? 0);
    const overduePOs = overduePOsBy.get(p.id) ?? 0;
    const openIssues = issuesBy.get(p.id) ?? 0;

    perProject.set(p.id, {
      budget,
      committed,
      labour: labourTotal,
      revised,
      margin,
      marginPct,
      receivable,
      pendingApprovals,
      overduePOs,
      openIssues,
      health: computeHealth({
        grossMargin: margin,
        grossMarginPct: marginPct,
        revisedContractValue: revised,
        outstandingReceivable: receivable,
        completionPct: Number(p.completion_pct) || 0,
        endDate: p.end_date,
        projectStatus: p.status,
        pendingApprovals,
        openIssues,
        overduePOs,
      }),
    });
  }

  const received = [...receiptsBy.values()].reduce((a, v) => a + v, 0);
  const paidOut = [...paidBy.values()].reduce((a, v) => a + v, 0);
  const receivable = [...perProject.values()].reduce((a, s) => a + s.receivable, 0);
  const totalPoActual = [...poActualBy.values()].reduce((a, v) => a + v, 0);
  const labourTotal = [...labourBy.values()].reduce((a, v) => a + v, 0);

  return {
    projects: (projects ?? []) as Project[],
    perProject,
    totals: {
      received,
      paidOut,
      receivable,
      payable: Math.max(0, totalPoActual - paidOut),
      labour: labourTotal,
    },
    raw: {
      pos: (pos ?? []) as PoRow[],
      vos: (vos ?? []) as VoRow[],
      claims: (claims ?? []) as ClaimRow[],
      pendingPRs: (pendingPRs ?? []) as PrRow[],
    },
  };
}
