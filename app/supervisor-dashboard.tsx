import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { fmtDate, fmtPct } from "@/lib/format";
import type { InspectionRecord, Project, SiteProgressLog } from "@/lib/types";

/** Site Supervisor home — built for the phone: quick logging, assigned
 *  projects, recent issues. */
export async function SupervisorDashboard({ name }: { name: string }) {
  const supabase = await createClient();
  const [{ data: projects }, { data: issues }, { data: recentLogs }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("inspection_records")
      .select("*, projects(name)")
      .in("result", ["fail", "conditional"])
      .order("inspection_date", { ascending: false })
      .limit(5),
    supabase
      .from("site_progress_logs")
      .select("*, projects(name)")
      .order("log_date", { ascending: false })
      .limit(5),
  ]);

  return (
    <>
      <PageHeader title={`Site Diary`} subtitle={`Welcome back, ${name} — log today's work in a few taps`} />

      {/* Quick actions — thumb-sized */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/site-progress"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-6 text-sm font-semibold shadow-sm hover:bg-slate-700 min-h-24"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log Site Progress
        </Link>
        <Link
          href="/inspections"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white border border-slate-300 text-slate-800 px-4 py-6 text-sm font-semibold shadow-sm hover:bg-slate-50 min-h-24"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          New Inspection + Photo
        </Link>
      </div>

      <div className="space-y-6">
        <Card title="Your Active Projects">
          {!projects?.length ? (
            <EmptyState message="No active projects." />
          ) : (
            <Table headers={["Project", "Completion", "Quick Actions"]}>
              {(projects as Project[]).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-slate-400">{p.project_code}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <span className="block h-full bg-emerald-500" style={{ width: `${Math.min(100, Number(p.completion_pct) || 0)}%` }} />
                      </span>
                      {fmtPct(p.completion_pct)}
                    </span>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-2">
                      <LinkButton href={`/projects/${p.id}?tab=progress`} variant="secondary">
                        Progress
                      </LinkButton>
                      <LinkButton href={`/projects/${p.id}?tab=inspections`} variant="secondary">
                        Inspect
                      </LinkButton>
                    </span>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Open Issues — failed / conditional inspections">
          {!issues?.length ? (
            <EmptyState message="No open inspection issues. Nice work." />
          ) : (
            <Table headers={["Date", "Project", "Area", "Result", "Category"]}>
              {(issues as (InspectionRecord & { projects?: { name?: string } })[]).map((i) => (
                <tr key={i.id} className="align-top">
                  <Td>{fmtDate(i.inspection_date)}</Td>
                  <Td>
                    <Link href={`/projects/${i.project_id}?tab=inspections`} className="hover:underline">
                      {i.projects?.name ?? "—"}
                    </Link>
                  </Td>
                  <Td>{i.area ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={i.result} />
                  </Td>
                  <Td className="whitespace-normal max-w-48">
                    {i.issue_category === "Others" && i.issue_detail
                      ? `Others — ${i.issue_detail}`
                      : i.issue_category ?? "—"}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Recent Site Logs">
          {!recentLogs?.length ? (
            <EmptyState message="No progress logged yet — use Log Site Progress above." />
          ) : (
            <Table headers={["Date", "Project", "Work Done", "Completion"]}>
              {(recentLogs as (SiteProgressLog & { projects?: { name?: string } })[]).map((log) => (
                <tr key={log.id} className="align-top">
                  <Td>{fmtDate(log.log_date)}</Td>
                  <Td>{log.projects?.name ?? "—"}</Td>
                  <Td className="whitespace-normal max-w-md">{log.work_done ?? "—"}</Td>
                  <Td>{fmtPct(log.completion_pct)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
