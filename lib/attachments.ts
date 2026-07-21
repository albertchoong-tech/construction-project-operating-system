import { createClient } from "@/lib/supabase/server";
import {
  STORAGE_BUCKET,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_COUNT,
  isVideoMime,
  type UploadedVideo,
} from "@/lib/media";

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

  // Per-photo notes, same order as the files (PhotoField emits this).
  let captions: (string | null)[] = [];
  try {
    const raw = (formData.get("attachment_captions") as string) || "";
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) captions = parsed;
    }
  } catch {
    captions = [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uploadedBy =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || null;

  for (const [idx, file] of files.entries()) {
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
      storage_path: path,
      media_type: file.type?.startsWith("image/") ? "photo" : "document",
      mime_type: file.type || null,
      file_size: file.size,
      caption: (captions[idx] || "").toString().trim() || null,
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

/** Records videos that the browser already uploaded straight to Storage (the
 *  bytes never pass through Vercel — see components/video-field.tsx). Only the
 *  metadata arrives here, and it is re-validated: the client is untrusted, so
 *  paths must sit under this project's prefix. */
export async function recordUploadedVideos(
  formData: FormData,
  projectId: string,
  entityType: string | null,
  entityId: string | null,
  documentType: string,
): Promise<string | null> {
  const raw = (formData.get("videos") as string) || "";
  if (!raw.trim()) return null;

  let videos: UploadedVideo[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return "Malformed video data.";
    videos = parsed as UploadedVideo[];
  } catch {
    return "Malformed video data.";
  }
  if (!videos.length) return null;
  if (videos.length > VIDEO_MAX_COUNT)
    return `Up to ${VIDEO_MAX_COUNT} videos per update.`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uploadedBy =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || null;

  for (const v of videos) {
    if (!v?.path || typeof v.path !== "string" || !v.path.startsWith(`${projectId}/`))
      return "Video upload path is not valid for this project.";
    if (typeof v.size !== "number" || v.size <= 0 || v.size > VIDEO_MAX_BYTES)
      return `"${v.name || "video"}" exceeds the ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} MB limit.`;
    if (!isVideoMime(v.type)) return `"${v.name || "file"}" is not a video.`;

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(v.path);
    const thumbUrl = v.thumbPath
      ? supabase.storage.from(STORAGE_BUCKET).getPublicUrl(v.thumbPath).data.publicUrl
      : null;

    const { error } = await supabase.from("project_documents").insert({
      project_id: projectId,
      document_type: documentType,
      file_name: v.name,
      file_url: pub.publicUrl,
      storage_path: v.path,
      media_type: "video",
      mime_type: v.type,
      file_size: v.size,
      thumbnail_url: thumbUrl,
      caption: (v.caption || "").toString().trim() || null,
      uploaded_by: uploadedBy,
      entity_type: entityType,
      entity_id: entityId,
    });
    if (error) return `Could not record "${v.name}": ${error.message}`;
  }
  return null;
}
