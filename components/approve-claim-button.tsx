"use client";

import { useState, useTransition } from "react";

/** Approve a progress claim: prompts for certified amount (defaults to claimed) then remarks. */
export function ApproveClaimButton({
  claimedAmount,
  action,
}: {
  claimedAmount: number;
  action: (approvedAmount: number | null, remarks: string) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const amountStr = window.prompt(
      "Certified amount to approve (RM):",
      String(claimedAmount),
    );
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid non-negative amount.");
      return;
    }
    const remarks = window.prompt("Remarks (optional):", "") ?? "";
    setError(null);
    startTransition(async () => {
      const result = await action(amount, remarks);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {pending ? "Working…" : "Approve"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
