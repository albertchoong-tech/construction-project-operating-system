import { createClient } from "@/lib/supabase/server";

/** Statuses where a PO represents real incurred cost (goods received or beyond). */
export const PO_ACTUAL_STATUSES = ["delivered", "invoiced", "paid"];
/** Statuses where a PO represents committed spend. */
export const PO_COMMITTED_STATUSES = ["approved", "delivered", "invoiced", "paid"];

export type ProjectFinancials = {
  budgetTotal: number;
  committedCost: number; // approved + delivered + invoiced + paid POs
  actualCost: number; // delivered + invoiced + paid POs
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
  budgetVariancePct: number; // (budget - actual) / budget * 100
};

const sum = (rows: { v: number | null }[] | null | undefined) =>
  (rows ?? []).reduce((acc, r) => acc + (Number(r.v) || 0), 0);

export async function getProjectFinancials(
  projectId: string,
  contractValue: number,
): Promise<ProjectFinancials> {
  const supabase = await createClient();

  const [budgets, pos, actualPos, vos, claims, receipts, supplierPays, latestLog] =
    await Promise.all([
      supabase.from("budgets").select("v:budgeted_amount").eq("project_id", projectId),
      supabase
        .from("purchase_orders")
        .select("v:total_amount")
        .eq("project_id", projectId)
        .in("status", PO_COMMITTED_STATUSES),
      supabase
        .from("purchase_orders")
        .select("v:total_amount")
        .eq("project_id", projectId)
        .in("status", PO_ACTUAL_STATUSES),
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
  const committedCost = sum(pos.data);
  const actualCost = sum(actualPos.data);
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
  const outstandingPayable = Math.max(0, actualCost - supplierPaid);
  const grossMargin = revisedContractValue - committedCost;

  return {
    budgetTotal,
    committedCost,
    actualCost,
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
