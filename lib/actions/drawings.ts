"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { STORAGE_BUCKET } from "@/lib/media";
import {
  DRAWING_MAX_BYTES,
  isAllowedDrawingMime,
  isValidDrawingCategory,
} from "@/lib/drawings";
import type { ActionResult } from "@/components/form";

// Upload a NEW drawing number: Director + Quantity Surveyor.
// Revise (supersede) or delete an existing one: Director only.
// These mirror the RLS policies in migration 0007 — belt and braces.
const CAN_UPLOAD = ["director", "quantity_surveyor"];
const CAN_REVISE = ["director"];

/** Adds a drawing. If the drawing number already has a current revision, this
 *  is a revision: the previous row is marked superseded (never overwritten or
 *  deleted) and the new one links back to it via supersedes_id. */
export async function addDrawing(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "You must be signed in." };

  const project_id = ((formData.get("project_id") as string) || "").trim();
  if (!project_id) return { error: "Project is required." };

  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return { error: "Drawing title is required." };

  const drawing_no = ((formData.get("drawing_no") as string) || "").trim();
  if (!drawing_no) return { error: "Drawing number is required." };

  const category = ((formData.get("category") as string) || "").trim();
  if (!isValidDrawingCategory(category)) return { error: "Select a valid drawing category." };

  const revision_no = ((formData.get("revision_no") as string) || "").trim() || "A";
  const issue_date = ((formData.get("issue_date") as string) || "").trim() || null;
  const description = ((formData.get("description") as string) || "").trim() || null;

  // The browser uploads the file straight to Storage (Vercel caps request
  // bodies at ~4.5 MB); only the resulting path reaches this action.
  const storage_path = ((formData.get("storage_path") as string) || "").trim();
  const file_name = ((formData.get("file_name") as string) || "").trim();
  const mime_type = ((formData.get("mime_type") as string) || "").trim();
  const file_size = parseInt((formData.get("file_size") as string) || "0", 10);

  if (!storage_path || !file_name) return { error: "Attach the drawing file." };
  if (!storage_path.startsWith(`${project_id}/`))
    return { error: "Upload path is not valid for this project." };
  if (!isAllowedDrawingMime(mime_type))
    return { error: "Drawings must be a PDF or a PNG/JPEG/WebP image." };
  if (!file_size || file_size > DRAWING_MAX_BYTES)
    return { error: `File exceeds the ${Math.round(DRAWING_MAX_BYTES / 1024 / 1024)} MB limit.` };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_drawings")
    .select("id, revision_no")
    .eq("project_id", project_id)
    .eq("drawing_no", drawing_no)
    .eq("status", "current")
    .maybeSingle();

  const isRevision = !!existing;
  const allowed = isRevision ? CAN_REVISE : CAN_UPLOAD;
  if (!allowed.includes(profile.role)) {
    return {
      error: isRevision
        ? "Only a Director can issue a new revision of an existing drawing."
        : "Only a Director or Quantity Surveyor can upload drawings.",
    };
  }

  if (isRevision) {
    // Retain the old revision — mark it superseded, never overwrite it.
    const { error: supErr } = await supabase
      .from("project_drawings")
      .update({ status: "superseded" })
      .eq("id", existing!.id);
    if (supErr) return { error: `Could not supersede the previous revision: ${supErr.message}` };
  }

  const { error } = await supabase.from("project_drawings").insert({
    project_id,
    title,
    drawing_no,
    category,
    revision_no,
    issue_date,
    description,
    file_name,
    file_url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storage_path).data.publicUrl,
    storage_path,
    mime_type,
    file_size,
    status: "current",
    supersedes_id: existing?.id ?? null,
    uploaded_by: profile.fullName || null,
  });
  if (error) {
    // Roll the supersede back so we never leave a drawing with no current revision.
    if (isRevision) {
      await supabase
        .from("project_drawings")
        .update({ status: "current" })
        .eq("id", existing!.id);
    }
    return { error: `Could not save drawing: ${error.message}` };
  }

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/site-updates");
  return { ok: true };
}

/** Deletes a drawing revision. Director only. */
export async function deleteDrawing(
  id: string,
  projectId: string,
): Promise<{ error?: string } | void> {
  const profile = await getSessionProfile();
  if (!profile || !CAN_REVISE.includes(profile.role))
    return { error: "Only a Director can delete a drawing." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_drawings").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/site-updates");
}
