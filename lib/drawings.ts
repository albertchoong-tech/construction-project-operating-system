/** Plans & Drawings register — shared by the client form, the server actions
 *  and the project tab, so the fixed category list can't drift. */

export const DRAWING_CATEGORIES = [
  "Architectural Floor Plan",
  "Structural Drawing",
  "M&E Drawing",
  "Approved Plan",
  "Shop Drawing",
  "As-Built Drawing",
  "Other Drawing",
] as const;

export type DrawingCategory = (typeof DRAWING_CATEGORIES)[number];

export const DRAWING_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const DRAWING_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function isAllowedDrawingMime(type: string | null | undefined): boolean {
  return (
    typeof type === "string" &&
    (type === "application/pdf" || /^image\/(png|jpe?g|webp)$/.test(type))
  );
}

export function isValidDrawingCategory(value: unknown): value is DrawingCategory {
  return typeof value === "string" && (DRAWING_CATEGORIES as readonly string[]).includes(value);
}

export function isPdf(mime: string | null | undefined, url?: string | null): boolean {
  return mime === "application/pdf" || /\.pdf(\?|$)/i.test(url ?? "");
}

export type Drawing = {
  id: string;
  project_id: string;
  title: string;
  drawing_no: string;
  category: string;
  revision_no: string;
  issue_date: string | null;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: "current" | "superseded";
  supersedes_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};
