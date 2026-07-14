"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { inputClass } from "@/components/form";

const VARIANTS: Record<string, string> = {
  approve: "bg-emerald-600 text-white hover:bg-emerald-500",
  reject: "bg-white text-rose-600 border border-rose-300 hover:bg-rose-50",
  neutral: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  danger: "bg-white text-rose-600 border border-rose-300 hover:bg-rose-50",
};

/** Button that invokes a server action for a status transition.
 *
 *  When it needs confirmation (`confirmMessage`) or an optional audit note
 *  (`promptRemarks`), it opens an in-app modal instead of the browser's native
 *  `confirm()` / `prompt()`. Native dialogs block the main thread and can't be
 *  driven by automated tests/preview tooling; this modal is plain DOM, so the
 *  whole approve/reject/cancel/delete flow is verifiable end-to-end. */
export function ActionButton({
  label,
  action,
  variant = "neutral",
  promptRemarks = false,
  confirmMessage,
  small = true,
}: {
  label: string;
  action: (remarks: string) => Promise<{ error?: string } | void>;
  variant?: keyof typeof VARIANTS;
  promptRemarks?: boolean;
  confirmMessage?: string;
  small?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  const needsDialog = promptRemarks || !!confirmMessage;

  function run(remarksValue: string) {
    setError(null);
    startTransition(async () => {
      const result = await action(remarksValue);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setRemarks("");
      }
    });
  }

  function handleClick() {
    if (needsDialog) {
      setError(null);
      setRemarks("");
      setOpen(true);
    } else {
      run("");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 min-h-11 px-3.5 text-sm lg:min-h-0 ${
          small ? "lg:px-2.5 lg:py-1 lg:text-xs" : "lg:px-3.5 lg:py-2 lg:text-sm"
        } ${VARIANTS[variant]}`}
      >
        {pending && !open ? "Working…" : label}
      </button>
      {error && !open && <span className="text-xs text-rose-600">{error}</span>}
      {open && (
        <ConfirmDialog
          label={label}
          message={confirmMessage}
          promptRemarks={promptRemarks}
          variant={variant}
          remarks={remarks}
          setRemarks={setRemarks}
          pending={pending}
          error={error}
          onConfirm={() => run(remarks)}
          onCancel={() => {
            if (pending) return;
            setOpen(false);
            setError(null);
            setRemarks("");
          }}
        />
      )}
    </span>
  );
}

function ConfirmDialog({
  label,
  message,
  promptRemarks,
  variant,
  remarks,
  setRemarks,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  label: string;
  message?: string;
  promptRemarks: boolean;
  variant: keyof typeof VARIANTS;
  remarks: string;
  setRemarks: (v: string) => void;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!promptRemarks) confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{label}</h2>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
        {promptRemarks && (
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Remarks (optional)</span>
            <textarea
              autoFocus
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add a note for the audit trail…"
              className={inputClass}
            />
          </label>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 lg:min-h-0 lg:py-2"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 text-sm font-medium transition-colors disabled:opacity-50 lg:min-h-0 lg:py-2 ${VARIANTS[variant]}`}
          >
            {pending ? "Working…" : label}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
