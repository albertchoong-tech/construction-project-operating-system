import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectFinancials } from "@/lib/financials";
import { computeHealth } from "@/lib/health";
import { PageHeader, StatusBadge, LinkButton, StatCard } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";
import { fmtRM, fmtPct } from "@/lib/format";
import type { Project } from "@/lib/types";
import { OverviewTab } from "./overview-tab";
import { BoqTab } from "./boq-tab";
import { BudgetTab } from "./budget-tab";
import { ProcurementTab } from "./procurement-tab";
import { ProgressTab } from "./progress-tab";
import { VosTab } from "./vos-tab";
import { ClaimsTab } from "./claims-tab";
import { PaymentsTab } from "./payments-tab";
import { InspectionsTab } from "./inspections-tab";
import { DocumentsTab } from "./documents-tab";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "boq", label: "BOQ" },
  { key: "budget", label: "Budget" },
  { key: "procurement", label: "Procurement" },
  { key: "progress", label: "Site Progress" },
  { key: "vos", label: "Variation Orders" },
  { key: "claims", label: "Claims" },
  { key: "payments", label: "Payments" },
  { key: "inspections", label: "Inspections" },
  { key: "documents", label: "Documents" },
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

  // Health signals: pending approvals, open inspection issues, overdue POs
  const todayStr = new Date().toISOString().slice(0, 10);
  const [pendingPRs, draftPOs, pendingVOs, submittedClaims, openIssues, overduePOs] =
    await Promise.all([
      supabase.from("purchase_requests").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "pending"),
      supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "draft"),
      supabase.from("variation_orders").select("id", { count: "exact", head: true }).eq("project_id", id).in("status", ["draft", "pending"]),
      supabase.from("progress_claims").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "submitted"),
      supabase.from("inspection_records").select("id", { count: "exact", head: true }).eq("project_id", id).in("result", ["fail", "conditional"]),
      supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("project_id", id).lt("delivery_date", todayStr).in("status", ["draft", "approved"]),
    ]);
  const health = computeHealth({
    grossMargin: fin.grossMargin,
    grossMarginPct: fin.grossMarginPct,
    revisedContractValue: fin.revisedContractValue,
    outstandingReceivable: fin.outstandingReceivable,
    completionPct: completion,
    endDate: project.end_date,
    projectStatus: project.status,
    pendingApprovals:
      (pendingPRs.count ?? 0) + (draftPOs.count ?? 0) + (pendingVOs.count ?? 0) + (submittedClaims.count ?? 0),
    openIssues: openIssues.count ?? 0,
    overduePOs: overduePOs.count ?? 0,
  });

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.project_code ?? "—"} · ${project.clients?.name ?? "No client"} · PM: ${project.project_manager ?? "—"}`}
        action={
          <span className="flex items-center gap-3">
            <HealthBadge health={health} />
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
          hint={`incl. labour ${fmtRM(fin.labourCost)} · budget ${fmtRM(fin.budgetTotal)}`}
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
      {tab === "procurement" && <ProcurementTab projectId={id} />}
      {tab === "progress" && <ProgressTab projectId={id} />}
      {tab === "vos" && <VosTab projectId={id} />}
      {tab === "claims" && <ClaimsTab project={project} fin={fin} completion={completion} />}
      {tab === "payments" && <PaymentsTab projectId={id} />}
      {tab === "inspections" && <InspectionsTab projectId={id} />}
      {tab === "documents" && <DocumentsTab projectId={id} />}
    </>
  );
}
