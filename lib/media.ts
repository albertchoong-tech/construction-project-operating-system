/** Shared media rules for site evidence. Imported by both the client capture
 *  UI and the server actions so the limits can never drift apart. */

export const STORAGE_BUCKET = "project-documents";

export const VIDEO_MAX_BYTES = 150 * 1024 * 1024; // 150 MB
export const VIDEO_MAX_COUNT = 3;
export const VIDEO_MAX_SECONDS = 90; // advisory, shown to users

export const VIDEO_LIMIT_HINT = `Up to ${VIDEO_MAX_COUNT} clips · max 90 seconds · 150 MB each`;

export function isVideoMime(type: string | null | undefined): boolean {
  return typeof type === "string" && type.startsWith("video/");
}

export function fmtBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Metadata handed from the browser to the server action after a direct
 *  browser→Supabase Storage upload. The bytes never pass through Vercel. */
export type UploadedVideo = {
  path: string;
  name: string;
  size: number;
  type: string;
  thumbPath?: string | null;
  /** Per-clip note written by the person recording the evidence. */
  caption?: string | null;
};

/** Storage object key for a project's media. Kept stable so RLS/bucket rules
 *  and any future per-project storage scoping keep working. */
export function mediaPath(projectId: string, fileName: string, kind = "video"): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
  return `${projectId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
