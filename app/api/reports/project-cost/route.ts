import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { getProjectFinancials } from "@/lib/financials";
import { COST_CATEGORIES } from "@/lib/categories";
import { toCsv, csvResponse } from "@/lib/csv";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Per-project cost report: committed & actual by cost centre, with budget
 *  where budgets carry a cost centre. */
export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !["director", "finance"].includes(profile.role))
    return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project");
  if (!projectId) return new Response("Missing project", { status: 400 });

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single<Project>();
  if (!project) return new Response("Project not found", { status: 404 });

  const [fin, { data: budgets }] = await Promise.all([
    getProjectFinancials(projectId, project.contract_value),
    supabase.from("budgets").select("cost_category, budgeted_amount").eq("project_id", projectId),
  ]);

  const budgetByCentre = new Map<string, number>();
  for (const b of budgets ?? []) {
    if (b.cost_category)
      budgetByCentre.set(b.cost_category, (budgetByCentre.get(b.cost_category) ?? 0) + (Number(b.budgeted_amount) || 0));
  }

  const rows: (string | number)[][] = COST_CATEGORIES.filter(
    (c) => fin.costByCategory[c.key] || budgetByCentre.has(c.key),
  ).map((c) => {
    const entry = fin.costByCategory[c.key] ?? { committed: 0, actual: 0 };
    const budget = budgetByCentre.get(c.key) ?? 0;
    return [c.label, budget, entry.committed, entry.actual, budget - entry.committed];
  });
  // Totals row
  rows.push([
    "TOTAL",
    [...budgetByCentre.values()].reduce((a, v) => a + v, 0),
    fin.committedCost,
    fin.actualCost,
    fin.budgetTotal - fin.committedCost,
  ]);

  const csv = toCsv(
    ["Cost Centre", "Budget (RM)", "Committed (RM)", "Actual (RM)", "Variance (RM)"],
    rows,
  );
  return csvResponse(`project-cost-${project.project_code ?? projectId}.csv`, csv);
}
