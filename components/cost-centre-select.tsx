"use client";

import { useState, useTransition } from "react";
import { COST_CATEGORIES } from "@/lib/categories";
import { inputClass } from "@/components/form";

/** Inline cost-centre editor on the PO detail (Director-only action). Saves on
 *  change and writes an audit record server-side. */
export function CostCentreSelect({
  current,
  action,
}: {
  current: string;
  action: (costCategory: string) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        defaultValue={current}
        disabled={pending}
        aria-label="Cost centre"
        className={`${inputClass} !py-1 !min-h-0 max-w-52`}
        onChange={(e) => {
          const value = e.target.value;
          setError(null);
          startTransition(async () => {
            const result = await action(value);
            if (result?.error) {
              setError(result.error);
              e.target.value = current;
            }
          });
        }}
      >
        {COST_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-400">Saving…</span>}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
