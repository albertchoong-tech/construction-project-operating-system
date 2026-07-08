import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { DocumentUploader } from "@/components/document-uploader";
import { deleteDocument } from "@/lib/actions/documents";
import { fmtDate } from "@/lib/format";
import type { ProjectDocument } from "@/lib/types";

export async function DocumentsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load documents: {error.message}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Project Documents">
        {!docs?.length ? (
          <EmptyState message="No documents uploaded for this project yet." />
        ) : (
          <Table headers={["File", "Type", "Uploaded By", "Date", ""]}>
            {(docs as ProjectDocument[]).map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <Td>
                  {d.file_url ? (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-900"
                    >
                      {d.file_name ?? "File"}
                    </a>
                  ) : (
                    d.file_name ?? "—"
                  )}
                </Td>
                <Td>{d.document_type ?? "—"}</Td>
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

      <Card title="Upload Document">
        <DocumentUploader projectId={projectId} />
      </Card>
    </div>
  );
}
