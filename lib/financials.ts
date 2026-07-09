import { createClient } from "@/lib/supabase/server";
import type { CostCategoryKey } from "@/lib/categories";

/** Statuses where a PO represents real incurred cost (goods received or beyond). */
export const PO_ACTUAL_STATUSES = ["delivered", "invoiced", "paid"];
/** Statuses where a PO represents committed spend. */
export const PO_COMMITTED_STATUSES = ["approved", "delivered", "invoiced", "paid"];

export type CategoryCost = { committed: number; actual: number };

export type ProjectFinancials = {
  budgetTotal: number;
  committedCost: number; // committed POs + labour
  actualCost: number; // delivered/invoiced/paid POs + labour
  labourCost: number;
  costByCategory: Record<string, CategoryCost>; // keyed by CostCategoryKey
  approvedVOs: number;
  revisedContractValue: number;
  claimedTotal: number; // submitted + approved + paid claims (claimed_amount)
  approvedClaims: number; // approved + paid claims (approved_amount)
  receipts: number; // customer payments
  supplierPaid: number; // supplier payments
  outstandingReceivable: number;
  outstandingPayable: number;
  cashPosition: number;
  grossMargin: number;
  grossMarginPct: number;
  completionPct: number;
  budgetVariancePct: number; // (budget - committed) / budget * 100
};

const sum = (rows: { v: number | null }[] | null | undefined) =>
  (rows ?? []).reduce((acc, r) => acc + (Number(r.v) || 0), 0);

function addCategory(
  map: Record<string, CategoryCost>,
  key: string,
  committed: number,
  actual: number,
) {
  const entry = map[key] ?? { committed: 0, actual: 0 };
  entry.committed += committed;
  entry.actual += actual;
  map[key] = entry;
}

export async function getProjectFinancials(
  projectId: string,
  contractValue: number,
): Promise<ProjectFinancials> {
  const supabase = await createClient();

  const [budgets, pos, labour, vos, claims, receipts, supplierPays, latestLog] =
    await Promise.all([
      supabase.from("budgets").select("v:budgeted_amount").eq("project_id", projectId),
      supabase
        .from("purchase_orders")
        .select("total_amount, status, cost_category")
        .eq("project_id", projectId),
      supabase.from("labour_costs").select("v:total_cost").eq("project_id", projectId),
      supabase
        .from("variation_orders")
        .select("v:amount")
        .eq("project_id", projectId)
        .eq("status", "approved"),
      supabase
        .from("progress_claims")
        .select("claimed_amount, approved_amount, status")
        .eq("project_id", projectId),
      supabase.from("customer_payments").select("v:amount").eq("project_id", projectId),
      supabase.from("supplier_payments").select("v:amount").eq("project_id", projectId),
      supabase
        .from("site_progress_logs")
        .select("completion_pct")
        .eq("project_id", projectId)
        .order("log_date", { ascending: false })
        .limit(1),
    ]);

  const budgetTotal = sum(budgets.data);

  // Cost by category from POs, plus the labour module
  const costByCategory: Record<string, CategoryCost> = {};
  let poCommitted = 0;
  let poActual = 0;
  for (const po of pos.data ?? []) {
    const amount = Number(po.total_amount) || 0;
    const committed = PO_COMMITTED_STATUSES.includes(po.status) ? amount : 0;
    const actual = PO_ACTUAL_STATUSES.includes(po.status) ? amount : 0;
    poCommitted += committed;
    poActual += actual;
    if (committed || actual) {
      addCategory(costByCategory, (po.cost_category as CostCategoryKey) || "material", committed, actual);
    }
  }
  const labourCost = sum(labour.data);
  if (labourCost) addCategory(costByCategory, "labour", labourCost, labourCost);

  const committedCost = poCommitted + labourCost;
  const actualCost = poActual + labourCost;

  const approvedVOs = sum(vos.data);
  const revisedContractValue = (Number(contractValue) || 0) + approvedVOs;

  const claimRows = claims.data ?? [];
  const claimedTotal = claimRows
    .filter((c) => ["submitted", "approved", "paid"].includes(c.status))
    .reduce((a, c) => a + (Number(c.claimed_amount) || 0), 0);
  const approvedClaims = claimRows
    .filter((c) => ["approved", "paid"].includes(c.status))
    .reduce((a, c) => a + (Number(c.approved_amount) || 0), 0);

  const receiptsTotal = sum(receipts.data);
  const supplierPaid = sum(supplierPays.data);

  const outstandingReceivable = Math.max(0, approvedClaims - receiptsTotal);
  const outstandingPayable = Math.max(0, poActual - supplierPaid);
  const grossMargin = revisedContractValue - committedCost;

  return {
    budgetTotal,
    committedCost,
    actualCost,
    labourCost,
    costByCategory,
    approvedVOs,
    revisedContractValue,
    claimedTotal,
    approvedClaims,
    receipts: receiptsTotal,
    supplierPaid,
    outstandingReceivable,
    outstandingPayable,
    cashPosition: receiptsTotal - supplierPaid,
    grossMargin,
    grossMarginPct: revisedContractValue > 0 ? (grossMargin / revisedContractValue) * 100 : 0,
    completionPct: Number(latestLog.data?.[0]?.completion_pct) || 0,
    budgetVariancePct:
      budgetTotal > 0 ? ((budgetTotal - committedCost) / budgetTotal) * 100 : 0,
  };
}
