"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/form";

const MONEY_FIELDS = [
  "basic_wages",
  "overtime",
  "allowance",
  "epf",
  "socso",
  "eis",
  "pcb",
  "other_cost",
] as const;

export async function addLabourCost(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  if (!project_id) return { error: "Project is required." };

  const worker_name = ((formData.get("worker_name") as string) || "").trim();
  if (!worker_name) return { error: "Worker / staff name is required." };

  const row: Record<string, unknown> = {
    project_id,
    worker_name,
    work_date: ((formData.get("work_date") as string) || "").trim() || null,
    period: ((formData.get("period") as string) || "").trim() || null,
    remarks: ((formData.get("remarks") as string) || "").trim() || null,
  };

  for (const field of MONEY_FIELDS) {
    const raw = ((formData.get(field) as string) || "").trim();
    const value = raw === "" ? 0 : parseFloat(raw);
    if (isNaN(value) || value < 0)
      return { error: `${field.replace(/_/g, " ")} must be a non-negative number.` };
    row[field] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("labour_costs").insert(row);
  if (error) return { error: `Could not save labour cost: ${error.message}` };

  revalidatePath("/labour-costs");
  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteLabourCost(
  id: string,
  projectId: string | null,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("labour_costs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/labour-costs");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}
