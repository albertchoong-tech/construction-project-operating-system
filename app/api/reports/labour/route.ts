import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import type { LabourCost } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Labour-cost export. RLS still applies (the request carries the user's
 *  cookies); this only additionally gates by role for a clean 403. */
export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !["director", "finance"].includes(profile.role))
    return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project");

  const supabase = await createClient();
  let query = supabase
    .from("labour_costs")
    .select("*, projects(name, project_code)")
    .order("work_date", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const rows = (data ?? []) as (LabourCost & { projects?: { name?: string; project_code?: string } })[];
  const csv = toCsv(
    ["Date", "Period", "Project", "Worker", "Basic", "Overtime", "Allowance", "EPF", "SOCSO", "EIS", "PCB", "Other", "Total"],
    rows.map((r) => [
      r.work_date, r.period, r.projects?.name, r.worker_name,
      r.basic_wages, r.overtime, r.allowance, r.epf, r.socso, r.eis, r.pcb, r.other_cost, r.total_cost,
    ]),
  );
  return csvResponse("labour-costs.csv", csv);
}
