import { isImageUrl } from "@/lib/attachments";
import { deleteDocument } from "@/lib/actions/documents";
import { ActionButton } from "@/components/action-button";
import type { ProjectDocument } from "@/lib/types";

/** Multi-file input for forms whose server action calls uploadAttachments(). */
export function FileField({
  label = "Attachments (photos / documents)",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <input
        type="file"
        name="attachments"
        multiple
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
      />
      <span className="block text-xs text-slate-400 mt-1">
        Multiple files allowed · max 20 MB each
      </span>
    </label>
  );
}

/** Compact thumbnail/link strip for a record's attachments. */
export function AttachmentChips({
  docs,
  projectId,
  canDelete = false,
}: {
  docs: ProjectDocument[];
  projectId: string;
  canDelete?: boolean;
}) {
  if (!docs.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {docs.map((d) => (
        <span key={d.id} className="inline-flex items-center gap-1.5">
          <a
            href={d.file_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            title={d.file_name ?? "Attachment"}
            className="block"
          >
            {isImageUrl(d.file_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.file_url!}
                alt={d.file_name ?? "Attachment"}
                className="h-14 w-14 object-cover rounded-lg border border-slate-200 hover:opacity-80"
              />
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 max-w-40 truncate">
                📄 {d.file_name ?? "File"}
              </span>
            )}
          </a>
          {canDelete && (
            <ActionButton
              label="Remove"
              variant="danger"
              confirmMessage={`Delete "${d.file_name}"?`}
              action={deleteDocument.bind(null, d.id, projectId)}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/** Groups a project's linked documents by their source record id. */
export function groupByEntity(docs: ProjectDocument[]): Map<string, ProjectDocument[]> {
  const map = new Map<string, ProjectDocument[]>();
  for (const d of docs) {
    if (!d.entity_id) continue;
    const list = map.get(d.entity_id) ?? [];
    list.push(d);
    map.set(d.entity_id, list);
  }
  return map;
}
