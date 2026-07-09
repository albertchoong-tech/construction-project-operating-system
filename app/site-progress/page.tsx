import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { FileField } from "@/components/attachments";
import { addProgressLog } from "@/lib/actions/site";
import { fmtDate, fmtPct, today } from "@/lib/format";
import type { SiteProgressLog } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SiteProgressPage() {
  const supabase = await createClient();
  const [{ data: logs, error }, { data: projects }] = await Promise.all([
    supabase
      .from("site_progress_logs")
      .select("*, projects(name, project_code, status)")
      .order("log_date", { ascending: false })
      .limit(100),
    supabase
      .from("projects")
      .select("id, name, project_code")
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="Site Progress" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load progress logs: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Site Progress"
        subtitle="Daily logs from site — work done, completion, workers, issues"
      />

      <div className="space-y-6">
        <Card title="Log Today's Progress">
          <ActionForm action={addProgressLog} submitLabel="Save Progress Log">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Project" required className="col-span-2">
                <Select name="project_id" required defaultValue="">
                  <option value="">— Select project —</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code ? `${p.project_code} · ` : ""}
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Log date">
                <TextInput name="log_date" type="date" defaultValue={today()} />
              </Field>
              <Field label="Reported by">
                <TextInput name="reported_by" placeholder="Supervisor name" />
              </Field>
              <Field label="Work done" required className="col-span-2 sm:col-span-4">
                <TextArea name="work_done" required placeholder="What was completed today?" />
              </Field>
              <Field label="Completion %">
                <TextInput name="completion_pct" type="number" min="0" max="100" step="0.1" placeholder="0–100" />
              </Field>
              <Field label="Workers on site">
                <TextInput name="workers_count" type="number" min="0" placeholder="0" />
              </Field>
              <Field label="Weather">
                <TextInput name="weather" placeholder="Sunny / Rain…" />
              </Field>
              <Field label="Issues">
                <TextInput name="issues" placeholder="Delays, shortages…" />
              </Field>
              <FileField label="Site photos" className="col-span-2 sm:col-span-4" />
            </div>
          </ActionForm>
        </Card>

        <Card title="Recent Logs">
          {!logs?.length ? (
            <EmptyState message="No site progress logged yet. Add the first log above." />
          ) : (
            <Table
              headers={["Date", "Project", "Work Done", "Completion", "Workers", "Weather", "Issues"]}
              rightAlign={[3, 4]}
            >
              {(logs as SiteProgressLog[]).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 align-top">
                  <Td>{fmtDate(log.log_date)}</Td>
                  <Td>
                    <Link href={`/projects/${log.project_id}?tab=progress`} className="hover:underline">
                      {log.projects?.name ?? "—"}
                    </Link>
                  </Td>
                  <Td className="whitespace-normal max-w-md">{log.work_done ?? "—"}</Td>
                  <Td right>{fmtPct(log.completion_pct)}</Td>
                  <Td right>{log.workers_count}</Td>
                  <Td>{log.weather ?? "—"}</Td>
                  <Td className="whitespace-normal max-w-xs">
                    {log.issues ? <span className="text-amber-700">{log.issues}</span> : "—"}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
