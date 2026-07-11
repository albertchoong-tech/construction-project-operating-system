"use client";

import { useState, useTransition } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { inputClass } from "@/components/form";

/** Inline role editor for the Team page — saves on change. */
export function RoleSelect({
  currentRole,
  action,
}: {
  currentRole: Role;
  action: (role: string) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col gap-1 min-w-44">
      <select
        defaultValue={currentRole}
        disabled={pending}
        aria-label="Role"
        className={inputClass}
        onChange={(e) => {
          const role = e.target.value;
          setError(null);
          startTransition(async () => {
            const result = await action(role);
            if (result?.error) {
              setError(result.error);
              e.target.value = currentRole; // revert on failure
            }
          });
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-400">Saving…</span>}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
