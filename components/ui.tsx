import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  // project
  quotation: "bg-sky-50 text-sky-700 ring-sky-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-slate-100 text-slate-600 ring-slate-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200 line-through",
  // workflow
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  submitted: "bg-sky-50 text-sky-700 ring-sky-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  delivered: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  invoiced: "bg-violet-50 text-violet-700 ring-violet-200",
  paid: "bg-teal-50 text-teal-700 ring-teal-200",
  // inspections
  pass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  fail: "bg-rose-50 text-rose-700 ring-rose-200",
  conditional: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Desktop: a regular table. Below lg: each row renders as a stacked record
 *  card, with the column header shown as a label beside each value (via the
 *  data-label attribute + .table-cards CSS in globals.css). */
export function Table({
  headers,
  children,
  rightAlign = [],
}: {
  headers: string[];
  children: ReactNode;
  rightAlign?: number[];
}) {
  // Inject each cell's column label so the mobile card CSS can display it
  const labelledRows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    const rowEl = row as ReactElement<{ children?: ReactNode }>;
    const cells = Children.map(rowEl.props.children, (cell, i) => {
      if (isValidElement(cell) && cell.type === Td) {
        return cloneElement(cell as ReactElement<{ label?: string }>, {
          label: headers[i] ?? "",
        });
      }
      return cell;
    });
    return cloneElement(rowEl, {}, cells);
  });

  return (
    <div className="table-cards overflow-x-auto lg:-mx-5 lg:-my-5">
      <table className="min-w-full lg:divide-y lg:divide-slate-200 text-sm w-full">
        <thead className="hidden lg:table-header-group">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 ${
                  rightAlign.includes(i) ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="lg:divide-y lg:divide-slate-100 bg-transparent lg:bg-white">
          {labelledRows}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  right = false,
  className = "",
  label,
}: {
  children: ReactNode;
  right?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <td
      data-label={label ?? ""}
      className={`lg:px-5 lg:py-3 lg:whitespace-nowrap ${right ? "lg:text-right tabular-nums" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
      <p className="text-sm text-slate-500 mb-4">{message}</p>
      {action}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700"
      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors min-h-11 lg:min-h-0 ${styles}`}
    >
      {children}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-rose-600"
          : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-4 min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`font-semibold mt-1 tabular-nums tracking-tight leading-tight break-words text-[clamp(1rem,0.45rem+1.1vw,1.5rem)] ${valueColor}`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 bg-slate-50 rounded" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-slate-100 rounded w-1/3" />
      <TableSkeleton />
    </div>
  );
}
