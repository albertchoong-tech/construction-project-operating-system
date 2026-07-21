"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  STORAGE_BUCKET,
  VIDEO_LIMIT_HINT,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_COUNT,
  fmtBytes,
  isVideoMime,
  mediaPath,
  type UploadedVideo,
} from "@/lib/media";

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  path?: string;
  thumbPath?: string | null;
  caption: string;
  error?: string;
};

/**
 * Video evidence capture. Uploads straight from the browser to Supabase
 * Storage (authenticated session → existing bucket RLS), because Vercel caps
 * serverless request bodies at ~4.5 MB — routing video through a server action
 * would fail. Only the resulting storage paths are submitted with the form.
 */
export function VideoField({
  projectId,
  onBusyChange,
}: {
  projectId: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const recordRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLInputElement>(null);

  const busy = items.some((i) => i.status === "uploading");
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Revoke object URLs on unmount to avoid leaking blobs.
  useEffect(() => {
    return () => items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = items.filter((i) => i.status === "done");
  const payload: UploadedVideo[] = done.map((i) => ({
    path: i.path!,
    name: i.file.name,
    size: i.file.size,
    type: i.file.type || "video/mp4",
    thumbPath: i.thumbPath ?? null,
    caption: i.caption.trim() || null,
  }));

  /** Best-effort poster frame; silently skipped if the browser refuses. */
  async function makeThumb(file: File, videoPath: string): Promise<string | null> {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("no metadata"));
        setTimeout(() => reject(new Error("timeout")), 8000);
      });
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        setTimeout(resolve, 3000);
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(640, video.videoWidth || 640);
      canvas.height = Math.round(canvas.width * ((video.videoHeight || 360) / (video.videoWidth || 640)));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.7));
      if (!blob) return null;
      const thumbPath = `${videoPath}.poster.jpg`;
      const { error } = await createClient()
        .storage.from(STORAGE_BUCKET)
        .upload(thumbPath, blob, { contentType: "image/jpeg" });
      return error ? null : thumbPath;
    } catch {
      return null;
    }
  }

  async function upload(item: Item) {
    const supabase = createClient();
    const path = mediaPath(projectId, item.file.name);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, item.file, { contentType: item.file.type || undefined });

    if (error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: error.message } : i)),
      );
      return;
    }
    const thumbPath = await makeThumb(item.file, path);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "done", path, thumbPath } : i)),
    );
  }

  function addFiles(files: FileList | null) {
    setNotice(null);
    if (!files?.length) return;
    if (!projectId) {
      setNotice("Select a project before adding video.");
      return;
    }
    const next: Item[] = [];
    for (const file of Array.from(files)) {
      if (items.length + next.length >= VIDEO_MAX_COUNT) {
        setNotice(`Up to ${VIDEO_MAX_COUNT} videos per update.`);
        break;
      }
      if (!isVideoMime(file.type)) {
        setNotice(`"${file.name}" is not a video file.`);
        continue;
      }
      if (file.size > VIDEO_MAX_BYTES) {
        setNotice(`"${file.name}" is ${fmtBytes(file.size)} — the limit is ${fmtBytes(VIDEO_MAX_BYTES)}.`);
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
        caption: "",
      });
    }
    if (!next.length) return;
    setItems((prev) => [...prev, ...next]);
    next.forEach((i) => void upload(i));
  }

  async function remove(item: Item) {
    if (item.path) {
      const paths = [item.path, ...(item.thumbPath ? [item.thumbPath] : [])];
      await createClient().storage.from(STORAGE_BUCKET).remove(paths).catch(() => {});
    }
    URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function retry(item: Item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", error: undefined } : i)),
    );
    void upload({ ...item, status: "uploading" });
  }

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 min-h-11 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-3">
      {/* Completed uploads travel as metadata only — the bytes are already in Storage. */}
      <input type="hidden" name="videos" value={JSON.stringify(payload)} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          disabled={!projectId || items.length >= VIDEO_MAX_COUNT}
          onClick={() => recordRef.current?.click()}
        >
          🎥 Record Video
        </button>
        <button
          type="button"
          className={btn}
          disabled={!projectId || items.length >= VIDEO_MAX_COUNT}
          onClick={() => chooseRef.current?.click()}
        >
          📁 Choose Video
        </button>
      </div>
      <p className="text-xs text-slate-500">{VIDEO_LIMIT_HINT}</p>

      <input
        ref={recordRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={chooseRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {notice && <p className="text-xs text-amber-600">{notice}</p>}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-start gap-3">
                <video
                  src={i.previewUrl}
                  controls
                  preload="metadata"
                  className="h-20 w-32 shrink-0 rounded bg-slate-900 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{i.file.name}</p>
                  <p className="text-xs text-slate-500">{fmtBytes(i.file.size)}</p>
                  {i.status === "uploading" && (
                    <p className="text-xs text-slate-500">Uploading…</p>
                  )}
                  {i.status === "done" && <p className="text-xs text-emerald-600">Uploaded ✓</p>}
                  {i.status === "error" && (
                    <p className="text-xs text-rose-600">Upload failed: {i.error}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {i.status === "error" && (
                    <button
                      type="button"
                      onClick={() => retry(i)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(i)}
                    disabled={i.status === "uploading"}
                    className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={i.caption}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) => (x.id === i.id ? { ...x, caption: e.target.value } : x)),
                  )
                }
                placeholder="Add a note for this clip (optional)"
                aria-label={`Note for ${i.file.name}`}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <p className="text-xs text-amber-600">
          Video still uploading — please wait before saving.
        </p>
      )}
    </div>
  );
}
