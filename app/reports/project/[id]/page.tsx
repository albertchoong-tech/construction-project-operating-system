import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectFinancials } from "@/lib/financials";
import { COST_CATEGORIES } from "@/lib/categories";
import { PageHeader, Card, Table, Td, StatCard } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { fmtDate, fmtRM, fmtPct } from "@/lib/format";
import type { LabourCost, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectCostReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("id", id)
    .single<Project>();
  if (!project) notFound();

  const [fin, { data: budgets }, { data: labour }] = await Promise.all([
    getProjectFinancials(id, project.contract_value),
    supabase.from("budgets").select("cost_category, budgeted_amount").eq("project_id", id),
    supabase.from("labour_costs").select("*").eq("project_id", id).order("work_date", { ascending: false }),
  ]);

  const budgetByCentre = new Map<string, number>();
  for (const b of budgets ?? []) {
    if (b.cost_category)
      budgetByCentre.set(b.cost_category, (budgetByCentre.get(b.cost_category) ?? 0) + (Number(b.budgeted_amount) || 0));
  }
  const centres = COST_CATEGORIES.filter((c) => fin.costByCategory[c.key] || budgetByCentre.has(c.key));
  const labourRows = (labour ?? []) as LabourCost[];

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Project Cost Report"
          subtitle={`${project.name} · ${project.project_code ?? "—"}`}
          action={
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/projects/${id}`} className="min-h-11 lg:min-h-0 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Open project</Link>
              <a href={`/api/reports/project-cost?project=${id}`} className="min-h-11 lg:min-h-0 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Cost CSV</a>
              <a href={`/api/reports/labour?project=${id}`} className="min-h-11 lg:min-h-0 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Labour CSV</a>
              <PrintButton />
            </span>
          }
        />
      </div>

      <div className="print-sheet space-y-6">
        <div className="pb-4 border-b border-slate-200">
          <p className="text-xl font-bold text-slate-900">HSH ProjectOS — Project Cost Report</p>
          <p className="text-sm text-slate-600">
            {project.name} · {project.project_code ?? "—"} · Client: {project.clients?.name ?? "—"}
          </p>
          <p className="text-xs text-slate-400">Generated {fmtDate(new Date().toISOString())}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Revised Contract" value={fmtRM(fin.revisedContractValue)} />
          <StatCard label="Committed Cost" value={fmtRM(fin.committedCost)} hint={`incl. labour ${fmtRM(fin.labourCost)}`} />
          <StatCard label="Gross Margin" value={fmtRM(fin.grossMargin)} tone={fin.grossMargin < 0 ? "bad" : "good"} hint={fmtPct(fin.grossMarginPct)} />
          <StatCard label="Completion" value={fmtPct(fin.completionPct)} />
        </div>

        <Card title="Cost by Centre — Budget vs Actual">
          <Table headers={["Cost Centre", "Budget", "Committed", "Actual", "Variance", "Share"]} rightAlign={[1, 2, 3, 4, 5]}>
            {centres.map((c) => {
              const entry = fin.costByCategory[c.key] ?? { committed: 0, actual: 0 };
              const budget = budgetByCentre.get(c.key) ?? 0;
              const variance = budget - entry.committed;
              const share = fin.committedCost > 0 ? (entry.committed / fin.committedCost) * 100 : 0;
              return (
                <tr key={c.key}>
                  <Td className="font-medium">{c.label}</Td>
                  <Td right>{budget ? fmtRM(budget) : "—"}</Td>
                  <Td right>{fmtRM(entry.committed)}</Td>
                  <Td right>{fmtRM(entry.actual)}</Td>
                  <Td right className={budget && variance < 0 ? "text-rose-600 font-medium" : ""}>{budget ? fmtRM(variance) : "—"}</Td>
                  <Td right>{share.toFixed(1)}%</Td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-semibold">
              <Td>Total</Td>
              <Td right>{fmtRM([...budgetByCentre.values()].reduce((a, v) => a + v, 0))}</Td>
              <Td right>{fmtRM(fin.committedCost)}</Td>
              <Td right>{fmtRM(fin.actualCost)}</Td>
              <Td right>{fmtRM(fin.budgetTotal - fin.committedCost)}</Td>
              <Td right>100%</Td>
            </tr>
          </Table>
          {!budgetByCentre.size && (
            <p className="text-xs text-slate-400 mt-3">
              Tip: set a cost centre on budget categories (Budget tab) to see budget-vs-actual per
              centre.
            </p>
          )}
        </Card>

        <Card title={`Labour Breakdown (${labourRows.length})`}>
          {!labourRows.length ? (
            <p className="text-sm text-slate-500">No labour recorded for this project.</p>
          ) : (
            <Table headers={["Date", "Worker", "Basic", "OT", "Statutory", "Total"]} rightAlign={[2, 3, 4, 5]}>
              {labourRows.map((r) => (
                <tr key={r.id}>
                  <Td>{fmtDate(r.work_date)}</Td>
                  <Td>{r.worker_name}</Td>
                  <Td right>{fmtRM(r.basic_wages)}</Td>
                  <Td right>{fmtRM(r.overtime)}</Td>
                  <Td right>{fmtRM((Number(r.epf) || 0) + (Number(r.socso) || 0) + (Number(r.eis) || 0) + (Number(r.pcb) || 0))}</Td>
                  <Td right className="font-medium">{fmtRM(r.total_cost)}</Td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <Td>Total</Td>
                <Td>{""}</Td>
                <Td right>{""}</Td>
                <Td right>{""}</Td>
                <Td right>{""}</Td>
                <Td right>{fmtRM(fin.labourCost)}</Td>
              </tr>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
