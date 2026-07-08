"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/form";

export async function saveClient(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || null;
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Client name is required." };

  const row = {
    name,
    contact_person: ((formData.get("contact_person") as string) || "").trim() || null,
    phone: ((formData.get("phone") as string) || "").trim() || null,
    email: ((formData.get("email") as string) || "").trim() || null,
    address: ((formData.get("address") as string) || "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("clients").update(row).eq("id", id)
    : await supabase.from("clients").insert(row);
  if (error) return { error: `Could not save client: ${error.message}` };

  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClient(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);
  if (count && count > 0)
    return { error: `Client has ${count} project(s) — reassign them first.` };
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
}
