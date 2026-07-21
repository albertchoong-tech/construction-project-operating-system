"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { addDrawing } from "@/lib/actions/drawings";
import { STORAGE_BUCKET, fmtBytes, mediaPath } from "@/lib/media";
import {
  DRAWING_ACCEPT,
  DRAWING_CATEGORIES,
  DRAWING_MAX_BYTES,
  isAllowedDrawingMime,
} from "@/lib/drawings";

/** Upload / revise a drawing. The file goes browser→Storage directly (drawing
 *  PDFs regularly exceed Vercel's ~4.5 MB request cap); the action only
 *  receives the storage path plus the register metadata. */
export function DrawingForm({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(picked: File | null) {
    setError(null);
    setPath("");
    setFile(picked);
    if (!picked) return setStatus("idle");

    if (!isAllowedDrawingMime(picked.type)) {
      setStatus("error");
      return setError("Drawings must be a PDF or a PNG/JPEG/WebP image.");
    }
    if (picked.size > DRAWING_MAX_BYTES) {
      setStatus("error");
      return setError(
        `${fmtBytes(picked.size)} is over the ${fmtBytes(DRAWING_MAX_BYTES)} limit.`,
      );
    }

    setStatus("uploading");
    const target = mediaPath(projectId, picked.name, "drawings");
    const { error: upErr } = await createClient()
      .storage.from(STORAGE_BUCKET)
      .upload(target, picked, { contentType: picked.type });
    if (upErr) {
      setStatus("error");
      return setError(`Upload failed: ${upErr.message}`);
    }
    setPath(target);
    setStatus("done");
  }

  return (
    <ActionForm action={addDrawing} submitLabel="Save Drawing">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="storage_path" value={path} />
      <input type="hidden" name="file_name" value={file?.name ?? ""} />
      <input type="hidden" name="mime_type" value={file?.type ?? ""} />
      <input type="hidden" name="file_size" value={file?.size ?? 0} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Drawing title" required>
          <TextInput name="title" required placeholder="e.g. Ground Floor Plan" />
        </Field>
        <Field label="Drawing number" required>
          <TextInput name="drawing_no" required placeholder="e.g. A-101" />
        </Field>
        <Field label="Category" required>
          <Select name="category" required defaultValue={DRAWING_CATEGORIES[0]}>
            {DRAWING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Revision no.">
          <TextInput name="revision_no" defaultValue="A" placeholder="A" />
        </Field>
        <Field label="Issue date">
          <TextInput name="issue_date" type="date" />
        </Field>
        <Field label="Description / notes" className="sm:col-span-2">
          <TextArea name="description" placeholder="What changed in this revision…" />
        </Field>
      </div>

      <div className="mt-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Drawing file <span className="text-rose-500">*</span>
        </label>
        <input
          type="file"
          accept={DRAWING_ACCEPT}
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3.5 file:text-sm file:font-medium hover:file:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-500">
          PDF or image · max {fmtBytes(DRAWING_MAX_BYTES)}
        </p>
        {file && status === "uploading" && (
          <p className="mt-1 text-xs text-slate-500">Uploading “{file.name}”…</p>
        )}
        {file && status === "done" && (
          <p className="mt-1 text-xs text-emerald-600">
            “{file.name}” uploaded ({fmtBytes(file.size)}) ✓
          </p>
        )}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        <p className="mt-2 text-xs text-slate-500">
          Re-using an existing drawing number issues a new revision — the previous one is kept
          and marked <strong>Superseded</strong>.
        </p>
      </div>
    </ActionForm>
  );
}
