"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachments } from "@/lib/attachments";
import { DOCUMENT_CATEGORIES } from "@/lib/categories";
import type { ActionResult } from "@/components/form";

/** Document-centre upload: multiple files with a category and an optional
 *  link to a source record (encoded as "entity_type:entity_id"). */
export async function uploadDocuments(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  if (!project_id) return { error: "Project is required." };

  const category = (formData.get("document_type") as string) || "Other";
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(category))
    return { error: "Pick a document category." };

  const files = formData
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one file to upload." };

  let entityType: string | null = null;
  let entityId: string | null = null;
  const link = (formData.get("linked_to") as string) || "";
  if (link.includes(":")) {
    [entityType, entityId] = link.split(":");
  }

  const uploadError = await uploadAttachments(
    formData,
    project_id,
    entityType,
    entityId,
    category,
  );
  if (uploadError) return { error: uploadError };

  revalidatePath(`/projects/${project_id}`);
  return { ok: true };
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
