"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type ActionResult = { error?: string; ok?: boolean } | void;
export type FormAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

const DRAFT_PREFIX = "hsh-draft:";

function saveDraft(key: string, form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    const input = el as HTMLInputElement;
    if (!input.name) continue;
    if (["file", "password", "hidden", "submit", "button"].includes(input.type)) continue;
    values[input.name] = input.value;
  }
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(values));
  } catch {
    /* storage full/unavailable — drafts are best-effort */
  }
}

function restoreDraft(key: string, form: HTMLFormElement) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return;
    const values = JSON.parse(raw) as Record<string, string>;
    for (const el of Array.from(form.elements)) {
      const input = el as HTMLInputElement;
      if (!input.name || !(input.name in values)) continue;
      if (["file", "password", "hidden", "submit", "button"].includes(input.type)) continue;
      if (values[input.name]) input.value = values[input.name];
    }
  } catch {
    /* ignore corrupt drafts */
  }
}

/** Form wrapper around a server action: inline error, pending state, sticky
 *  mobile action bar. `ok: true` results clear the fields (for add-row forms).
 *  `draftKey` keeps unsaved text in localStorage so a dropped connection or
 *  accidental navigation doesn't lose field data. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
  draftKey,
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  draftKey?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      formRef.current?.reset();
      if (draftKey) {
        try {
          localStorage.removeItem(DRAFT_PREFIX + draftKey);
        } catch {}
      }
    }
  }, [state, draftKey]);

  useEffect(() => {
    if (draftKey && formRef.current) restoreDraft(draftKey, formRef.current);
    // restore once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={draftKey ? (e) => saveDraft(draftKey, e.currentTarget) : undefined}
      className={`space-y-4 ${className}`}
    >
      {children}
      {state?.error && (
        <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {state.error} — your entries are still here; fix and try again.
        </p>
      )}
      <div className="sticky bottom-20 lg:static z-10 -mx-2 px-2 py-2 lg:m-0 lg:p-0 bg-white/95 backdrop-blur rounded-xl lg:bg-transparent lg:backdrop-blur-none flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
    >
      {pending && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {pending ? "Saving…" : label}
    </button>
  );
}

export function Field({
  label,
  children,
  required = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 lg:py-2 text-base lg:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 bg-white min-h-11 lg:min-h-0";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const inputMode =
    props.inputMode ?? (props.type === "number" ? "decimal" : props.type === "tel" ? "tel" : undefined);
  return <input {...props} inputMode={inputMode} className={inputClass} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={inputClass} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}
