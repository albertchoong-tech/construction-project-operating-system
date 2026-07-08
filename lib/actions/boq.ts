"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/form";

export async function addBoqItem(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = formData.get("project_id") as string;
  const description = ((formData.get("description") as string) || "").trim();
  if (!description) return { error: "Description is required." };

  const quantity = parseFloat((formData.get("quantity") as string) || "0");
  const unit_rate = parseFloat((formData.get("unit_rate") as string) || "0");
  if (isNaN(quantity) || quantity < 0) return { error: "Quantity must be a non-negative number." };
  if (isNaN(unit_rate) || unit_rate < 0) return { error: "Unit rate must be a non-negative number." };

  const supabase = await createClient();
  const { error } = await supabase.from("boq_items").insert({
    project_id,
    section: ((formData.get("section") as string) || "").trim() || null,
    description,
    unit: ((formData.get("unit") as string) || "").trim() || null,
    quantity,
    unit_rate,
  });
  if (error) return { error: `Could not add BOQ item: ${error.message}` };

  revalidatePath(`/projects/${project_id}`);
  return { ok: true };
}

export async function deleteBoqItem(
  id: string,
  projectId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("boq_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
}

export async function addBudget(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = formData.get("project_id") as string;
  const category = ((formData.get("category") as string) || "").trim();
  if (!category) return { error: "Category is required." };

  const budgeted_amount = parseFloat((formData.get("budgeted_amount") as string) || "0");
  const actual_amount = parseFloat((formData.get("actual_amount") as string) || "0");
  if (isNaN(budgeted_amount) || budgeted_amount < 0)
    return { error: "Budgeted amount must be a non-negative number." };

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").insert({
    project_id,
    category,
    budgeted_amount,
    actual_amount: isNaN(actual_amount) ? 0 : actual_amount,
  });
  if (error) return { error: `Could not add budget: ${error.message}` };

  revalidatePath(`/projects/${project_id}`);
  return { ok: true };
}

export async function deleteBudget(
  id: string,
  projectId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
}
