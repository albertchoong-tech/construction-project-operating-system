import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { SiteUpdateForm } from "@/components/site-update-form";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Filter = "all" | "progress" | "inspection";

type FeedItem = {
  id: string;
  kind: "progress" | "inspection";
  projectId: string;
  projectName: string;
  date: string;
  area: string | null;
  who: string | null;
  summary: string;
  badge: string | null;
  drawingId: string | null;
};

const RESULT_TONE: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  conditional: "bg-amber-50 text-amber-800",
  fail: "bg-rose-50 text-rose-700",
};

export default async function SiteUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: Filter =
    rawFilter === "progress" || rawFilter === "inspection" ? rawFilter : "all";

  const supabase = await createClient();
  const profile = await getSessionProfile();

  // RLS scopes these to the projects this user may see.
  const [{ data: projects }, { data: drawings }, { data: logs }, { data: inspections }] = await Promise.all([
    supabase.from("projects").select("id, name, project_code").order("name"),
    supabase
      .from("project_drawings")
      .select("id, project_id, drawing_no, revision_no, title")
      .eq("status", "current")
      .order("drawing_no"),
    supabase
      .from("site_progress_logs")
      .select("id, project_id, log_date, work_done, completion_pct, area, reported_by, drawing_id, created_at, projects(name)")
      .order("log_date", { ascending: false })
      .limit(25),
    supabase
      .from("inspection_records")
      .select("id, project_id, inspection_date, result, area, issue_category, inspector, drawing_id, created_at, projects(name)")
      .order("inspection_date", { ascending: false })
      .limit(25),
  ]);

  type Row = { projects?: { name?: string } | null } & Record<string, unknown>;

  const feed: FeedItem[] = [
    ...((logs ?? []) as Row[]).map((l) => ({
      id: String(l.id),
      kind: "progress" as const,
      projectId: String(l.project_id ?? ""),
      projectName: l.projects?.name ?? "—",
      date: String(l.log_date ?? l.created_at ?? ""),
      area: (l.area as string) ?? null,
      who: (l.reported_by as string) ?? null,
      summary: (l.work_done as string) ?? "",
      badge: `${Number(l.completion_pct ?? 0)}% complete`,
      drawingId: (l.drawing_id as string) ?? null,
    })),
    ...((inspections ?? []) as Row[]).map((i) => ({
      id: String(i.id),
      kind: "inspection" as const,
      projectId: String(i.project_id ?? ""),
      projectName: i.projects?.name ?? "—",
      date: String(i.inspection_date ?? i.created_at ?? ""),
      area: (i.area as string) ?? null,
      who: (i.inspector as string) ?? null,
      summary: (i.issue_category as string) ?? "Inspection recorded",
      badge: (i.result as string) ?? null,
      drawingId: (i.drawing_id as string) ?? null,
    })),
  ]
    .filter((f) => filter === "all" || f.kind === filter)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30);

  // Evidence attached to the visible updates: photo/video counts and the
  // referenced drawing revision, so the feed shows what proof exists.
  const feedIds = feed.map((f) => f.id);
  const refIds = [...new Set(feed.map((f) => f.drawingId).filter(Boolean))] as string[];

  const [{ data: docs }, { data: refDrawings }] = await Promise.all([
    feedIds.length
      ? supabase.from("project_documents").select("entity_id, media_type").in("entity_id", feedIds)
      : Promise.resolve({ data: [] }),
    refIds.length
      ? supabase.from("project_drawings").select("id, drawing_no, revision_no, status").in("id", refIds)
      : Promise.resolve({ data: [] }),
  ]);

  const media = new Map<string, { photos: number; videos: number }>();
  for (const d of (docs ?? []) as { entity_id: string; media_type: string | null }[]) {
    const key = String(d.entity_id);
    const c = media.get(key) ?? { photos: 0, videos: 0 };
    if (d.media_type === "video") c.videos += 1;
    else c.photos += 1;
    media.set(key, c);
  }

  const drawingById = new Map(
    ((refDrawings ?? []) as { id: string; drawing_no: string; revision_no: string; status: string }[])
      .map((d) => [d.id, d]),
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "progress", label: "Progress" },
    { key: "inspection", label: "Inspection" },
  ];

  return (
    <>
      <PageHeader
        title="Site Updates"
        subtitle="One place to log progress and inspections from site — photos, video and plans included"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="New Site Update">
          {!projects?.length ? (
            <EmptyState message="No projects available to you yet." />
          ) : (
            <SiteUpdateForm
              projects={projects}
              drawings={drawings ?? []}
              reporterName={profile?.fullName ?? ""}
            />
          )}
        </Card>

        <Card
          title="Recent Site Updates"
          action={
            <span className="flex gap-1">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={t.key === "all" ? "/site-updates" : `/site-updates?filter=${t.key}`}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    filter === t.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </span>
          }
        >
          {!feed.length ? (
            <EmptyState message="No site updates recorded yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {feed.map((f) => (
                <li key={`${f.kind}-${f.id}`} className="py-3">
                  <Link
                    href={`/site-updates/${f.kind}/${f.id}`}
                    className="block rounded-lg px-1 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          f.kind === "progress"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-violet-50 text-violet-700"
                        }`}
                      >
                        {f.kind === "progress" ? "PROGRESS" : "INSPECTION"}
                      </span>
                      {f.badge && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            RESULT_TONE[f.badge] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {f.badge}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{fmtDate(f.date)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">
                      {f.projectName}
                    </p>
                    <p className="truncate text-xs text-slate-600">{f.summary}</p>
                    <p className="text-xs text-slate-400">
                      {[f.area, f.who].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {(() => {
                      const c = media.get(f.id);
                      const dw = f.drawingId ? drawingById.get(f.drawingId) : null;
                      if (!c?.photos && !c?.videos && !dw) return null;
                      return (
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          {!!c?.photos && <span>📷 {c.photos}</span>}
                          {!!c?.videos && <span>🎥 {c.videos}</span>}
                          {dw && (
                            <span className={dw.status === "superseded" ? "text-amber-700" : ""}>
                              📄 {dw.drawing_no} Rev {dw.revision_no}
                              {dw.status === "superseded" ? " (superseded)" : ""}
                            </span>
                          )}
                        </p>
                      );
                    })()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Full history stays in{" "}
            <Link href="/site-progress" className="underline hover:text-slate-600">
              Site Progress
            </Link>{" "}
            and{" "}
            <Link href="/inspections" className="underline hover:text-slate-600">
              Inspections
            </Link>
            .
          </p>
        </Card>
      </div>
    </>
  );
}
