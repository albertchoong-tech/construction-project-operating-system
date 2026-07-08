import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectFinancials } from "@/lib/financials";
import { PageHeader, StatusBadge, LinkButton, StatCard } from "@/components/ui";
import { fmtRM, fmtPct } from "@/lib/format";
import type { Project } from "@/lib/types";
import { OverviewTab } from "./overview-tab";
import { BoqTab } from "./boq-tab";
import { BudgetTab } from "./budget-tab";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "boq", label: "BOQ" },
  { key: "budget", label: "Budget" },
];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*)")
    .eq("id", id)
    .single<Project>();
  if (!project) notFound();

  const fin = await getProjectFinancials(id, project.contract_value);
  const completion = Math.max(Number(project.completion_pct) || 0, fin.completionPct);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.project_code ?? "—"} · ${project.clients?.name ?? "No client"} · PM: ${project.project_manager ?? "—"}`}
        action={
          <span className="flex items-center gap-3">
            <StatusBadge status={project.status} />
            <LinkButton href={`/projects/${id}/edit`} variant="secondary">
              Edit
            </LinkButton>
          </span>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Revised Contract"
          value={fmtRM(fin.revisedContractValue)}
          hint={fin.approvedVOs > 0 ? `${fmtRM(project.contract_value)} + ${fmtRM(fin.approvedVOs)} VOs` : "No approved VOs"}
        />
        <StatCard label="Completion" value={fmtPct(completion)} hint="Latest site progress log" />
        <StatCard
          label="Committed Cost"
          value={fmtRM(fin.committedCost)}
          hint={`Budget ${fmtRM(fin.budgetTotal)}`}
          tone={fin.budgetTotal > 0 && fin.committedCost > fin.budgetTotal ? "bad" : "default"}
        />
        <StatCard
          label="Gross Margin"
          value={fmtRM(fin.grossMargin)}
          hint={`${fmtPct(fin.grossMarginPct)} of revised contract`}
          tone={fin.grossMargin < 0 ? "bad" : "good"}
        />
      </div>

      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/projects/${id}?tab=${t.key}`}
              className={`whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "overview" && <OverviewTab project={project} fin={fin} completion={completion} />}
      {tab === "boq" && <BoqTab projectId={id} />}
      {tab === "budget" && <BudgetTab projectId={id} fin={fin} />}
    </>
  );
}
