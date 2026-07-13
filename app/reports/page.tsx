import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function ReportCard({
  title,
  description,
  href,
  cta = "Open report",
}: {
  title: string;
  description: string;
  href: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:border-slate-400 transition-colors"
    >
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
      <span className="inline-block mt-3 text-sm font-medium text-slate-700">{cta} →</span>
    </Link>
  );
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .order("created_at", { ascending: false });

  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Management reporting and exports — printable and Excel/CSV"
      />

      <div className="space-y-6">
        <Card title="Company Reports">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReportCard
              title="Monthly Financial Report"
              description="Cash in/out, claims raised & certified, outstanding receivables and payables for a month."
              href={`/reports/monthly?month=${thisMonth}`}
            />
            <ReportCard
              title="Payments Export (CSV)"
              description="All customer receipts and supplier payments as a spreadsheet, filterable by date."
              href="/api/reports/payments"
              cta="Download CSV"
            />
            <ReportCard
              title="Labour Costs Export (CSV)"
              description="Every labour entry with wage and statutory breakdown for payroll reconciliation."
              href="/api/reports/labour"
              cta="Download CSV"
            />
          </div>
        </Card>

        <Card title="Project Cost Reports">
          {!projects?.length ? (
            <EmptyState message="No projects yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <ReportCard
                  key={p.id}
                  title={p.name}
                  description={`${p.project_code ?? "—"} · cost by centre, budget vs actual, labour`}
                  href={`/reports/project/${p.id}`}
                  cta="Cost report"
                />
              ))}
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-400">
          Report generated {fmtDate(new Date().toISOString())}. CSV files open directly in Excel or
          Google Sheets. Printable reports use your browser&apos;s Print → Save as PDF.
        </p>
      </div>
    </>
  );
}
