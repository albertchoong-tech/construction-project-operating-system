import type { Health } from "@/lib/health";

const STYLES = {
  healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  attention: "bg-amber-50 text-amber-700 ring-amber-200",
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
} as const;

const LABELS = { healthy: "Healthy", attention: "Attention", critical: "Critical" } as const;
const DOTS = { healthy: "bg-emerald-500", attention: "bg-amber-500", critical: "bg-rose-500" } as const;

export function HealthBadge({ health, showReasons = false }: { health: Health; showReasons?: boolean }) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        title={health.reasons.join("; ")}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[health.status]}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${DOTS[health.status]}`} />
        {LABELS[health.status]}
      </span>
      {showReasons && health.reasons.length > 0 && (
        <span className="text-xs text-slate-500 max-w-xs">{health.reasons.join(" · ")}</span>
      )}
    </span>
  );
}
