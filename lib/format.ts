const rm = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtRM(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v === null || v === undefined || isNaN(v)) return "RM 0.00";
  return rm.format(v).replace("MYR", "RM");
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtPct(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v === null || v === undefined || isNaN(v)) return "0%";
  return `${Math.round(v * 10) / 10}%`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Next sequential document number, e.g. nextDocNo("PR", ["PR-2026-002"]) → "PR-2026-003" */
export function nextDocNo(prefix: string, existing: (string | null)[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const no of existing) {
    if (!no) continue;
    const m = no.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}
