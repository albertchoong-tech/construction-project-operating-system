import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, StatusBadge, EmptyState } from "@/components/ui";
import { AttachmentChips } from "@/components/attachments";
import { fmtRM, fmtDate, fmtPct } from "@/lib/format";
import type { ProjectFinancials } from "@/lib/financials";
import type { Project, ProjectDocument, SiteProgressLog } from "@/lib/types";

export async function OverviewTab({
  project,
  fin,
  completion,
}: {
  project: Project;
  fin: ProjectFinancials;
  completion: number;
}) {
  const supabase = await createClient();
  const [{ data: recentLogs }, { data: recentDocs }] = await Promise.all([
    supabase
      .from("site_progress_logs")
      .select("*")
      .eq("project_id", project.id)
      .order("log_date", { ascending: false })
      .limit(5),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const budgetUsedPct =
    fin.budgetTotal > 0 ? Math.min(100, (fin.committedCost / fin.budgetTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Project Information">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-slate-500">Client</dt>
          <dd className="text-slate-900">{project.clients?.name ?? "—"}</dd>
          <dt className="text-slate-500">Contact</dt>
          <dd className="text-slate-900">
            {project.clients?.contact_person ?? "—"}
            {project.clients?.phone ? ` · ${project.clients.phone}` : ""}
          </dd>
          <dt className="text-slate-500">Site address</dt>
          <dd className="text-slate-900">{project.address ?? "—"}</dd>
          <dt className="text-slate-500">Status</dt>
          <dd>
            <StatusBadge status={project.status} />
          </dd>
          <dt className="text-slate-500">Start date</dt>
          <dd className="text-slate-900">{fmtDate(project.start_date)}</dd>
          <dt className="text-slate-500">End date</dt>
          <dd className="text-slate-900">{fmtDate(project.end_date)}</dd>
          <dt className="text-slate-500">Project manager</dt>
          <dd className="text-slate-900">{project.project_manager ?? "—"}</dd>
          <dt className="text-slate-500">Completion</dt>
          <dd className="text-slate-900">{fmtPct(completion)}</dd>
        </dl>
      </Card>

      <div className="space-y-6">
        <Card title="Budget vs Actual">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total budget</span>
              <span className="font-medium tabular-nums">{fmtRM(fin.budgetTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Committed (POs + labour)</span>
              <span className="font-medium tabular-nums">{fmtRM(fin.committedCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">of which labour cost</span>
              <span className="font-medium tabular-nums">{fmtRM(fin.labourCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Actual (delivered / paid + labour)</span>
              <span className="font-medium tabular-nums">{fmtRM(fin.actualCost)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full ${budgetUsedPct > 95 ? "bg-rose-500" : budgetUsedPct > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {fmtPct(budgetUsedPct)} of budget committed · variance {fmtPct(fin.budgetVariancePct)}
            </p>
          </div>
        </Card>

        <Card title="Financial Position">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Approved claims</dt>
              <dd className="font-medium tabular-nums">{fmtRM(fin.approvedClaims)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Customer receipts</dt>
              <dd className="font-medium tabular-nums">{fmtRM(fin.receipts)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Outstanding receivable</dt>
              <dd className="font-medium tabular-nums text-amber-600">
                {fmtRM(fin.outstandingReceivable)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Supplier payments</dt>
              <dd className="font-medium tabular-nums">{fmtRM(fin.supplierPaid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Outstanding payable</dt>
              <dd className="font-medium tabular-nums text-amber-600">
                {fmtRM(fin.outstandingPayable)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2.5">
              <dt className="font-medium text-slate-700">Project cash position</dt>
              <dd
                className={`font-semibold tabular-nums ${fin.cashPosition < 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {fmtRM(fin.cashPosition)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card
        title="Recent Documents"
        className="lg:col-span-2"
        action={
          <Link
            href={`/projects/${project.id}?tab=documents`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Document centre →
          </Link>
        }
      >
        {!recentDocs?.length ? (
          <EmptyState message="No documents yet — upload from the Documents tab." />
        ) : (
          <div>
            <AttachmentChips docs={recentDocs as ProjectDocument[]} projectId={project.id} />
            <p className="text-xs text-slate-400 mt-3">
              {(recentDocs as ProjectDocument[])
                .map((d) => `${d.file_name} (${d.document_type ?? "Other"})`)
                .join(" · ")}
            </p>
          </div>
        )}
      </Card>

      <Card title="Recent Site Progress" className="lg:col-span-2">
        {!recentLogs?.length ? (
          <EmptyState message="No site progress logged yet." />
        ) : (
          <Table headers={["Date", "Reported By", "Work Done", "Completion", "Workers"]} rightAlign={[3, 4]}>
            {(recentLogs as SiteProgressLog[]).map((log) => (
              <tr key={log.id}>
                <Td>{fmtDate(log.log_date)}</Td>
                <Td>{log.reported_by ?? "—"}</Td>
                <Td className="whitespace-normal max-w-md">{log.work_done ?? "—"}</Td>
                <Td right>{fmtPct(log.completion_pct)}</Td>
                <Td right>{log.workers_count}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
