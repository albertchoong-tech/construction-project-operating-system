"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addDocumentRecord(input: {
  projectId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
}): Promise<{ error?: string } | void> {
  if (!input.fileName || !input.fileUrl) return { error: "File is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("project_documents").insert({
    project_id: input.projectId,
    document_type: input.documentType.trim() || null,
    file_name: input.fileName,
    file_url: input.fileUrl,
    uploaded_by: input.uploadedBy.trim() || null,
  });
  if (error) return { error: `Could not save document record: ${error.message}` };
  revalidatePath(`/projects/${input.projectId}`);
}

export async function deleteDocument(
  id: string,
  projectId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("project_documents")
    .select("file_url")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("project_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  // Best-effort: remove the underlying storage object if it lives in our bucket
  const marker = "/project-documents/";
  const path = doc?.file_url?.split(marker)[1];
  if (path) {
    await supabase.storage.from("project-documents").remove([decodeURIComponent(path)]);
  }

  revalidatePath(`/projects/${projectId}`);
}
