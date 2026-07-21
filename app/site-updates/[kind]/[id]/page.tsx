import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { fmtBytes } from "@/lib/media";

export const dynamic = "force-dynamic";

type Kind = "progress" | "inspection";

type Doc = {
  id: string;
  file_name: string | null;
  file_url: string | null;
  media_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  caption: string | null;
};

const RESULT_TONE: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  conditional: "bg-amber-50 text-amber-800",
  fail: "bg-rose-50 text-rose-700",
};

/** Field row helper — omits empty values so the sheet stays readable. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-wrap gap-x-3 py-1.5">
      <dt className="w-44 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-line text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default async function SiteUpdateDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind: rawKind, id } = await params;
  if (rawKind !== "progress" && rawKind !== "inspection") notFound();
  const kind = rawKind as Kind;

  const supabase = await createClient();
  const table = kind === "progress" ? "site_progress_logs" : "inspection_records";

  const { data: record } = await supabase
    .from(table)
    .select("*, projects(id, name, project_code)")
    .eq("id", id)
    .single();
  if (!record) notFound();

  const [{ data: docs }, { data: drawing }] = await Promise.all([
    supabase
      .from("project_documents")
      .select("id, file_name, file_url, media_type, mime_type, file_size, thumbnail_url, caption")
      .eq("entity_id", id)
      .order("created_at"),
    record.drawing_id
      ? supabase
          .from("project_drawings")
          .select("id, project_id, drawing_no, revision_no, title, status, file_url")
          .eq("id", record.drawing_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const all = (docs ?? []) as Doc[];
  const photos = all.filter((d) => d.media_type !== "video");
  const videos = all.filter((d) => d.media_type === "video");

  const date = kind === "progress" ? record.log_date : record.inspection_date;
  const who = kind === "progress" ? record.reported_by : record.inspector;
  const ref = `#${String(id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;

  return (
    <>
      <PageHeader
        title={`${kind === "progress" ? "Progress Update" : "Site Inspection"} ${ref}`}
        subtitle={`${record.projects?.name ?? "—"} · ${fmtDate(date)}${who ? ` · ${who}` : ""}`}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                kind === "progress" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
              }`}
            >
              {kind === "progress" ? "PROGRESS" : "INSPECTION"}
            </span>
            {kind === "inspection" && record.result && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  RESULT_TONE[record.result] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {String(record.result).toUpperCase()}
              </span>
            )}
            <Link
              href={`/projects/${record.project_id}?tab=${kind === "progress" ? "progress" : "inspections"}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:min-h-0 lg:py-2"
            >
              Open in project
            </Link>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Details">
          <dl className="divide-y divide-slate-100">
            <Row label="Project" value={record.projects?.name} />
            <Row label="Area / location" value={record.area} />
            <Row label="Recorded by" value={who} />
            {kind === "progress" ? (
              <>
                <Row label="Completion" value={`${Number(record.completion_pct ?? 0)}%`} />
                <Row label="Workers on site" value={record.workers_count} />
                <Row label="Weather" value={record.weather} />
                <Row label="Work completed" value={record.work_done} />
                <Row label="Delays / issues" value={record.issues} />
              </>
            ) : (
              <>
                <Row label="Result" value={record.result} />
                <Row label="Issue category" value={record.issue_category} />
                <Row label="Issue detail" value={record.issue_detail} />
                <Row label="Corrective action" value={record.corrective_action} />
                <Row label="Responsible party" value={record.responsible_party} />
                <Row
                  label="Follow-up date"
                  value={record.follow_up_date ? fmtDate(record.follow_up_date) : null}
                />
              </>
            )}
          </dl>
        </Card>

        <div className="space-y-6">
          <Card title={`📄 Drawing Reference`}>
            {!drawing ? (
              <p className="text-sm text-slate-500">No drawing referenced for this update.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  {drawing.drawing_no} Rev {drawing.revision_no} — {drawing.title}
                </p>
                {drawing.status === "superseded" && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⚠️ This revision has since been <strong>superseded</strong>. Check the current
                    revision before acting on it.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {drawing.file_url && (
                    <a
                      href={drawing.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:min-h-0 lg:py-2"
                    >
                      Open drawing
                    </a>
                  )}
                  <Link
                    href={`/projects/${drawing.project_id}?tab=drawings`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:min-h-0 lg:py-2"
                  >
                    All drawings
                  </Link>
                </div>
              </div>
            )}
          </Card>

          <Card title={`📷 Photos (${photos.length})`}>
            {!photos.length ? (
              <EmptyState message="No photos attached." />
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {photos.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-200 p-2">
                    {p.file_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.file_url}
                        alt={p.caption || p.file_name || "Site photo"}
                        className="h-40 w-full rounded object-cover"
                      />
                    )}
                    {p.caption && (
                      <p className="mt-2 text-sm text-slate-800">{p.caption}</p>
                    )}
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {p.file_name}
                      {p.file_size ? ` · ${fmtBytes(p.file_size)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`🎥 Videos (${videos.length})`}>
            {!videos.length ? (
              <EmptyState message="No videos attached." />
            ) : (
              <ul className="space-y-3">
                {videos.map((v) => (
                  <li key={v.id} className="rounded-lg border border-slate-200 p-2">
                    {v.file_url && (
                      <video
                        src={v.file_url}
                        poster={v.thumbnail_url ?? undefined}
                        controls
                        preload="metadata"
                        className="w-full rounded bg-slate-900"
                      />
                    )}
                    {v.caption && <p className="mt-2 text-sm text-slate-800">{v.caption}</p>}
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {v.file_name}
                      {v.file_size ? ` · ${fmtBytes(v.file_size)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="📝 Remarks">
            {record.remarks || record.issues ? (
              <p className="whitespace-pre-line text-sm text-slate-800">
                {record.remarks || record.issues}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No remarks recorded.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
