import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { DrawingForm } from "@/components/drawing-form";
import { deleteDrawing } from "@/lib/actions/drawings";
import { getSessionProfile } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { fmtBytes } from "@/lib/media";
import { isPdf, type Drawing } from "@/lib/drawings";

export async function DrawingsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const profile = await getSessionProfile();
  const role = profile?.role;
  const canUpload = role === "director" || role === "quantity_surveyor";
  const canManage = role === "director";

  const { data, error } = await supabase
    .from("project_drawings")
    .select("*")
    .eq("project_id", projectId)
    .order("drawing_no")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load drawings: {error.message}</p>
      </Card>
    );
  }

  const drawings = (data ?? []) as Drawing[];
  const current = drawings.filter((d) => d.status === "current");
  const superseded = drawings.filter((d) => d.status === "superseded");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current Drawings" value={String(current.length)} hint="Safe to build from" />
        <StatCard
          label="Superseded"
          value={String(superseded.length)}
          hint="Retained for history"
          tone={superseded.length ? "warn" : "default"}
        />
      </div>

      <Card
        title="Current Drawings"
        action={<span className="text-xs text-slate-500">Latest revision of each drawing number</span>}
      >
        {!current.length ? (
          <EmptyState message="No drawings uploaded yet. Current plans appear here for the site team." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {current.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      CURRENT
                    </span>
                    <span className="font-medium text-slate-900">{d.drawing_no}</span>
                    <span className="text-xs text-slate-400">Rev {d.revision_no}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.category}
                    {d.issue_date ? ` · Issued ${fmtDate(d.issue_date)}` : ""}
                    {d.uploaded_by ? ` · ${d.uploaded_by}` : ""}
                    {d.file_size ? ` · ${fmtBytes(d.file_size)}` : ""}
                  </p>
                  {d.description && (
                    <p className="mt-1 whitespace-pre-line text-xs text-slate-600">{d.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:min-h-0 lg:py-2"
                    >
                      {isPdf(d.mime_type, d.file_url) ? "Open PDF" : "View"}
                    </a>
                  )}
                  {canManage && (
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete ${d.drawing_no} Rev ${d.revision_no}? This removes the register entry.`}
                      action={deleteDrawing.bind(null, d.id, projectId)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {superseded.length > 0 && (
        <Card title={`Superseded Revisions (${superseded.length})`}>
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ⚠️ These revisions are <strong>out of date — do not build from them.</strong> They are
            kept for history and traceability only.
          </p>
          <ul className="divide-y divide-slate-100">
            {superseded.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start gap-3 py-3 opacity-80">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      SUPERSEDED
                    </span>
                    <span className="font-medium text-slate-700 line-through">{d.drawing_no}</span>
                    <span className="text-xs text-slate-400">Rev {d.revision_no}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.category}
                    {d.issue_date ? ` · Issued ${fmtDate(d.issue_date)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-lg border border-amber-300 bg-white px-3.5 text-sm font-medium text-amber-800 hover:bg-amber-50 lg:min-h-0 lg:py-2"
                    >
                      View superseded
                    </a>
                  )}
                  {canManage && (
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete superseded ${d.drawing_no} Rev ${d.revision_no}?`}
                      action={deleteDrawing.bind(null, d.id, projectId)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canUpload ? (
        <Card title="Upload / Revise Drawing">
          <DrawingForm projectId={projectId} />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">
            Drawings are read-only for your role. Contact a Director or Quantity Surveyor to
            upload or revise plans.
          </p>
        </Card>
      )}
    </div>
  );
}
