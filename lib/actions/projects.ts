"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachments } from "@/lib/attachments";
import { nextDocNo } from "@/lib/format";
import type { ActionResult } from "@/components/form";

const STATUSES = ["quotation", "active", "on_hold", "completed", "cancelled"];

export async function saveProject(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || null;
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Project name is required." };

  const status = (formData.get("status") as string) || "active";
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const contractRaw = (formData.get("contract_value") as string) || "0";
  const contract_value = parseFloat(contractRaw);
  if (isNaN(contract_value) || contract_value < 0)
    return { error: "Contract value must be a non-negative number." };

  const supabase = await createClient();

  let project_code = ((formData.get("project_code") as string) || "").trim();
  if (!id && !project_code) {
    const { data: codes } = await supabase.from("projects").select("project_code");
    project_code = nextDocNo("PRJ", (codes ?? []).map((c) => c.project_code));
  }

  const row = {
    name,
    project_code: project_code || null,
    client_id: ((formData.get("client_id") as string) || "").trim() || null,
    address: ((formData.get("address") as string) || "").trim() || null,
    status,
    contract_value,
    start_date: ((formData.get("start_date") as string) || "").trim() || null,
    end_date: ((formData.get("end_date") as string) || "").trim() || null,
    project_manager: ((formData.get("project_manager") as string) || "").trim() || null,
  };

  let projectId = id;
  if (id) {
    const { error } = await supabase.from("projects").update(row).eq("id", id);
    if (error) return { error: `Could not save project: ${error.message}` };
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert(row)
      .select("id")
      .single();
    if (error) return { error: `Could not save project: ${error.message}` };
    projectId = data.id;
  }

  const uploadError = await uploadAttachments(formData, projectId!, null, null, "Other");
  if (uploadError) return { error: uploadError };

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/projects");
  redirect("/projects");
}
