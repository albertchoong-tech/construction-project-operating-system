import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Uploads every file in formData's "attachments" field to the project-documents
 *  bucket and records each in project_documents, linked to the source record.
 *  Returns an error message, or null on success (no files is a success). */
export async function uploadAttachments(
  formData: FormData,
  projectId: string,
  entityType: string | null,
  entityId: string | null,
  documentType: string,
): Promise<string | null> {
  const files = formData
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uploadedBy =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || null;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES)
      return `"${file.name}" is too large (max 20 MB per file).`;

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("project-documents")
      .upload(path, file, { contentType: file.type || undefined });
    if (upErr) return `Upload of "${file.name}" failed: ${upErr.message}`;

    const { data: pub } = supabase.storage.from("project-documents").getPublicUrl(path);
    const { error: insErr } = await supabase.from("project_documents").insert({
      project_id: projectId,
      document_type: documentType,
      file_name: file.name,
      file_url: pub.publicUrl,
      uploaded_by: uploadedBy,
      entity_type: entityType,
      entity_id: entityId,
    });
    if (insErr) return `Could not record "${file.name}": ${insErr.message}`;
  }
  return null;
}

export function isImageUrl(url: string | null | undefined): boolean {
  return !!url && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
}
