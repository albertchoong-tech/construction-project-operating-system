import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { FileField, AttachmentChips, groupByEntity } from "@/components/attachments";
import { addProgressLog, deleteProgressLog } from "@/lib/actions/site";
import { fmtDate, fmtPct, today } from "@/lib/format";
import type { ProjectDocument, SiteProgressLog } from "@/lib/types";

export async function ProgressTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [{ data: logs, error }, { data: logDocs }] = await Promise.all([
    supabase
      .from("site_progress_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false }),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("entity_type", "site_progress_log"),
  ]);
  const docsByLog = groupByEntity((logDocs ?? []) as ProjectDocument[]);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load progress logs: {error.message}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Log Progress">
        <ActionForm action={addProgressLog} submitLabel="Save Progress Log">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Log date">
              <TextInput name="log_date" type="date" defaultValue={today()} />
            </Field>
            <Field label="Reported by">
              <TextInput name="reported_by" placeholder="Supervisor name" />
            </Field>
            <Field label="Completion %">
              <TextInput name="completion_pct" type="number" min="0" max="100" step="0.1" placeholder="0–100" />
            </Field>
            <Field label="Workers on site">
              <TextInput name="workers_count" type="number" min="0" placeholder="0" />
            </Field>
            <Field label="Work done" required className="col-span-2 sm:col-span-4">
              <TextArea name="work_done" required placeholder="What was completed today?" />
            </Field>
            <Field label="Weather" className="col-span-1">
              <TextInput name="weather" placeholder="Sunny / Rain…" />
            </Field>
            <Field label="Issues" className="col-span-1 sm:col-span-3">
              <TextInput name="issues" placeholder="Delays, shortages…" />
            </Field>
            <FileField label="Site photos" className="col-span-2 sm:col-span-4" />
          </div>
        </ActionForm>
      </Card>

      <Card title="Progress History">
        {!logs?.length ? (
          <EmptyState message="No site progress logged for this project yet." />
        ) : (
          <Table
            headers={["Date", "Reported By", "Work Done", "Completion", "Workers", "Weather", "Issues", ""]}
            rightAlign={[3, 4]}
          >
            {(logs as SiteProgressLog[]).map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 align-top">
                <Td>{fmtDate(log.log_date)}</Td>
                <Td>{log.reported_by ?? "—"}</Td>
                <Td className="whitespace-normal max-w-md">
                  {log.work_done ?? "—"}
                  <AttachmentChips docs={docsByLog.get(log.id) ?? []} projectId={projectId} />
                </Td>
                <Td right>{fmtPct(log.completion_pct)}</Td>
                <Td right>{log.workers_count}</Td>
                <Td>{log.weather ?? "—"}</Td>
                <Td className="whitespace-normal max-w-xs">
                  {log.issues ? <span className="text-amber-700">{log.issues}</span> : "—"}
                </Td>
                <Td right>
                  <ActionButton
                    label="Delete"
                    variant="danger"
                    confirmMessage="Delete this progress log?"
                    action={deleteProgressLog.bind(null, log.id, projectId)}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
