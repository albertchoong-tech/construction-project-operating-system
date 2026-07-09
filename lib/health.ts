export type HealthStatus = "healthy" | "attention" | "critical";

export type HealthInput = {
  grossMargin: number;
  grossMarginPct: number;
  revisedContractValue: number;
  outstandingReceivable: number;
  completionPct: number;
  endDate: string | null;
  projectStatus: string;
  pendingApprovals: number;
  openIssues: number; // fail/conditional inspections
  overduePOs: number;
};

export type Health = { status: HealthStatus; reasons: string[] };

/** Update 5 — simple initial rules, worst signal wins. */
export function computeHealth(i: HealthInput): Health {
  const todayStr = new Date().toISOString().slice(0, 10);
  const critical: string[] = [];
  const attention: string[] = [];

  if (i.grossMargin < 0) critical.push("Negative gross margin");
  if (
    i.endDate &&
    i.endDate < todayStr &&
    i.completionPct < 100 &&
    !["completed", "cancelled"].includes(i.projectStatus)
  )
    critical.push("Past end date with incomplete work");
  if (
    i.revisedContractValue > 0 &&
    i.outstandingReceivable > 0.3 * i.revisedContractValue
  )
    critical.push("Unpaid certified claims exceed 30% of contract");

  if (i.grossMarginPct < 10 && i.grossMargin >= 0) attention.push("Low margin (<10%)");
  if (i.pendingApprovals > 0) attention.push(`${i.pendingApprovals} pending approval(s)`);
  if (i.openIssues > 0) attention.push(`${i.openIssues} open inspection issue(s)`);
  if (i.overduePOs > 0) attention.push(`${i.overduePOs} overdue delivery(ies)`);

  if (critical.length) return { status: "critical", reasons: [...critical, ...attention] };
  if (attention.length) return { status: "attention", reasons: attention };
  return { status: "healthy", reasons: [] };
}
