"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDocumentRecord } from "@/lib/actions/documents";
import { inputClass } from "@/components/form";

/** Uploads a file to Supabase Storage then records it in project_documents. */
export function DocumentUploader({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File too large (max 20 MB).");
      return;
    }
    const documentType = (form.elements.namedItem("document_type") as HTMLSelectElement).value;
    const uploadedBy = (form.elements.namedItem("uploaded_by") as HTMLInputElement).value;

    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${projectId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("project-documents")
        .upload(path, file);
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from("project-documents").getPublicUrl(path);

      startTransition(async () => {
        const result = await addDocumentRecord({
          projectId,
          documentType,
          fileName: file.name,
          fileUrl: pub.publicUrl,
          uploadedBy,
        });
        if (result?.error) setError(result.error);
        else formRef.current?.reset();
      });
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || pending;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            File<span className="text-rose-500 ml-0.5">*</span>
          </span>
          <input type="file" name="file" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Document type</span>
          <select name="document_type" defaultValue="Drawing" className={inputClass}>
            <option>Drawing</option>
            <option>Contract</option>
            <option>Quotation</option>
            <option>Site Photo</option>
            <option>Delivery Note</option>
            <option>Invoice</option>
            <option>Other</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Uploaded by</span>
          <input name="uploaded_by" placeholder="Your name" className={inputClass} />
        </label>
      </div>
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {busy ? "Uploading…" : "Upload Document"}
        </button>
      </div>
    </form>
  );
}
