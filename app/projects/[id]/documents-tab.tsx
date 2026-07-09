import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { FileField } from "@/components/attachments";
import { isImageUrl } from "@/lib/attachments";
import { uploadDocuments, deleteDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORIES, DOCUMENT_ENTITY_TYPES } from "@/lib/categories";
import { fmtDate } from "@/lib/format";
import type { ProjectDocument } from "@/lib/types";

const ENTITY_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_ENTITY_TYPES.map((e) => [e.key, e.label]),
);

export async function DocumentsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [{ data: docs, error }, { data: vos }, { data: claims }, { data: inspections }, { data: logs }] =
    await Promise.all([
      supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase.from("variation_orders").select("id, vo_no").eq("project_id", projectId),
      supabase.from("progress_claims").select("id, claim_no").eq("project_id", projectId),
      supabase
        .from("inspection_records")
        .select("id, inspection_date, area")
        .eq("project_id", projectId),
      supabase.from("site_progress_logs").select("id, log_date").eq("project_id", projectId),
    ]);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load documents: {error.message}</p>
      </Card>
    );
  }

  const documents = (docs ?? []) as ProjectDocument[];

  // Options for linking an upload to a source record
  const linkOptions: { value: string; label: string }[] = [
    ...(vos ?? []).map((v) => ({ value: `variation_order:${v.id}`, label: `VO ${v.vo_no}` })),
    ...(claims ?? []).map((c) => ({ value: `progress_claim:${c.id}`, label: `Claim ${c.claim_no}` })),
    ...(inspections ?? []).map((i) => ({
      value: `inspection_record:${i.id}`,
      label: `Inspection ${fmtDate(i.inspection_date)}${i.area ? ` · ${i.area}` : ""}`,
    })),
    ...(logs ?? []).map((l) => ({
      value: `site_progress_log:${l.id}`,
      label: `Progress log ${fmtDate(l.log_date)}`,
    })),
  ];

  const linkedLabel = (d: ProjectDocument) => {
    if (!d.entity_type) return "—";
    const opt = linkOptions.find((o) => o.value === `${d.entity_type}:${d.entity_id}`);
    return opt?.label ?? ENTITY_LABELS[d.entity_type] ?? d.entity_type;
  };

  // Category summary chips
  const countByCategory = new Map<string, number>();
  for (const d of documents) {
    const c = d.document_type ?? "Other";
    countByCategory.set(c, (countByCategory.get(c) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Card
        title={`Document Centre (${documents.length})`}
        action={
          <span className="flex flex-wrap gap-1.5 justify-end">
            {[...countByCategory.entries()].map(([c, n]) => (
              <span
                key={c}
                className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs"
              >
                {c}: {n}
              </span>
            ))}
          </span>
        }
      >
        {!documents.length ? (
          <EmptyState message="No documents uploaded for this project yet." />
        ) : (
          <Table headers={["File", "Category", "Linked To", "Uploaded By", "Date", ""]}>
            {documents.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 align-top">
                <Td>
                  <a
                    href={d.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-slate-900 hover:underline"
                  >
                    {isImageUrl(d.file_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.file_url!}
                        alt=""
                        className="h-10 w-10 object-cover rounded border border-slate-200"
                      />
                    ) : (
                      <span>📄</span>
                    )}
                    <span className="max-w-56 truncate">{d.file_name ?? "File"}</span>
                  </a>
                </Td>
                <Td>{d.document_type ?? "—"}</Td>
                <Td>{linkedLabel(d)}</Td>
                <Td>{d.uploaded_by ?? "—"}</Td>
                <Td>{fmtDate(d.created_at)}</Td>
                <Td right>
                  <ActionButton
                    label="Delete"
                    variant="danger"
                    confirmMessage={`Delete "${d.file_name}"?`}
                    action={deleteDocument.bind(null, d.id, projectId)}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Upload Documents">
        <ActionForm action={uploadDocuments} submitLabel="Upload">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" required>
              <Select name="document_type" defaultValue="Drawing">
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Link to record (optional)">
              <Select name="linked_to" defaultValue="">
                <option value="">— Project (general) —</option>
                {linkOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <FileField label="Files" className="sm:col-span-2" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
