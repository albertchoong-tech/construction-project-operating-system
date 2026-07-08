"use client";

import { useState, useTransition } from "react";

const VARIANTS: Record<string, string> = {
  approve: "bg-emerald-600 text-white hover:bg-emerald-500",
  reject: "bg-white text-rose-600 border border-rose-300 hover:bg-rose-50",
  neutral: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  danger: "bg-white text-rose-600 border border-rose-300 hover:bg-rose-50",
};

/** Button that invokes a server action for a status transition; shows pending + error states. */
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

  function handleClick() {
    let remarks = "";
    if (promptRemarks) {
      const input = window.prompt(`${label} — remarks (optional):`, "");
      if (input === null) return;
      remarks = input;
    } else if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action(remarks);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
          small ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
        } ${VARIANTS[variant]}`}
      >
        {pending ? "Working…" : label}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
