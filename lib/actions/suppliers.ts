"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/form";

export async function saveSupplier(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || null;
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Supplier name is required." };

  const row = {
    name,
    contact_person: ((formData.get("contact_person") as string) || "").trim() || null,
    phone: ((formData.get("phone") as string) || "").trim() || null,
    email: ((formData.get("email") as string) || "").trim() || null,
    category: ((formData.get("category") as string) || "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("suppliers").update(row).eq("id", id)
    : await supabase.from("suppliers").insert(row);
  if (error) return { error: `Could not save supplier: ${error.message}` };

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function deleteSupplier(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id);
  if (count && count > 0)
    return { error: `Supplier has ${count} purchase order(s) — cannot delete.` };
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
}
