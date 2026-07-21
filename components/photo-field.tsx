"use client";

import { useEffect, useRef, useState } from "react";

type Photo = { file: File; url: string; caption: string };

const MAX_DIMENSION = 1600;
const COMPRESS_THRESHOLD = 900 * 1024; // only recompress images above ~900KB

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size <= COMPRESS_THRESHOLD) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // compression is best-effort; upload the original
  }
}

/** Mobile-friendly photo picker: camera capture + gallery, multiple photos,
 *  client-side compression, previews with remove. Feeds the surrounding form's
 *  "attachments" field so existing server actions keep working. */
export function PhotoField({
  label = "Photos",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const formInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Keep the hidden form input in sync with our photo list
  useEffect(() => {
    if (!formInputRef.current) return;
    const dt = new DataTransfer();
    photos.forEach((p) => dt.items.add(p.file));
    formInputRef.current.files = dt.files;
  }, [photos]);

  // Clear on form reset (ActionForm resets after a successful save)
  useEffect(() => {
    const form = formInputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const added: Photo[] = [];
      for (const original of Array.from(list)) {
        const file = await compressImage(original);
        added.push({ file, url: URL.createObjectURL(file), caption: "" });
      }
      setPhotos((prev) => [...prev, ...added]);
    } finally {
      setBusy(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const totalKB = Math.round(photos.reduce((a, p) => a + p.file.size, 0) / 1024);

  return (
    <div className={className}>
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>

      {/* the input the form actually submits */}
      <input ref={formInputRef} type="file" name="attachments" multiple hidden aria-hidden tabIndex={-1} />
      {/* Per-photo notes, in the same order as the files above. Server actions
          that don't use captions simply ignore this field. */}
      <input
        type="hidden"
        name="attachment_captions"
        value={JSON.stringify(photos.map((p) => p.caption.trim() || null))}
      />
      {/* pickers */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          Gallery
        </button>
      </div>

      {busy && <p className="text-xs text-slate-500 mt-2">Preparing photos…</p>}

      {photos.length > 0 && (
        <>
          <ul className="mt-3 space-y-2">
            {photos.map((p, idx) => (
              <li key={p.url} className="flex items-start gap-3 rounded-lg border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.file.name}
                  className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-500">{p.file.name}</p>
                  <input
                    type="text"
                    value={p.caption}
                    onChange={(e) =>
                      setPhotos((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, caption: e.target.value } : x)),
                      )
                    }
                    placeholder="Add a note for this photo (optional)"
                    aria-label={`Note for ${p.file.name}`}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  aria-label={`Remove ${p.file.name}`}
                  className="shrink-0 rounded-full bg-slate-900 text-white w-7 h-7 text-sm leading-none flex items-center justify-center shadow"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 mt-2">
            {photos.length} photo{photos.length > 1 ? "s" : ""} · {totalKB.toLocaleString()} KB —
            uploads when you save
          </p>
        </>
      )}
    </div>
  );
}
