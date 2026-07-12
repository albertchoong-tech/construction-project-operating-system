"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachments } from "@/lib/attachments";
import { today } from "@/lib/format";
import type { ActionResult } from "@/components/form";

export async function addProgressLog(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  if (!project_id) return { error: "Project is required." };

  const work_done = ((formData.get("work_done") as string) || "").trim();
  if (!work_done) return { error: "Describe the work done." };

  const completion_pct = parseFloat((formData.get("completion_pct") as string) || "0");
  if (isNaN(completion_pct) || completion_pct < 0 || completion_pct > 100)
    return { error: "Completion % must be between 0 and 100." };

  const workers_count = parseInt((formData.get("workers_count") as string) || "0", 10);
  const log_date = (formData.get("log_date") as string) || today();

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("site_progress_logs")
    .insert({
      project_id,
      log_date,
      reported_by: ((formData.get("reported_by") as string) || "").trim() || null,
      work_done,
      completion_pct,
      weather: ((formData.get("weather") as string) || "").trim() || null,
      workers_count: isNaN(workers_count) ? 0 : workers_count,
      issues: ((formData.get("issues") as string) || "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not save progress log: ${error.message}` };

  const uploadError = await uploadAttachments(
    formData,
    project_id,
    "site_progress_log",
    inserted.id,
    "Site Photo",
  );
  if (uploadError) return { error: uploadError };

  // Surface the latest completion % on the project master
  const { data: latest } = await supabase
    .from("site_progress_logs")
    .select("completion_pct")
    .eq("project_id", project_id)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (latest) {
    await supabase
      .from("projects")
      .update({ completion_pct: latest.completion_pct })
      .eq("id", project_id);
  }

  revalidatePath("/site-progress");
  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProgressLog(
  id: string,
  projectId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("site_progress_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/site-progress");
  revalidatePath(`/projects/${projectId}`);
}

export async function addInspection(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  if (!project_id) return { error: "Project is required." };

  const result = (formData.get("result") as string) || "pass";
  if (!["pass", "fail", "conditional"].includes(result))
    return { error: "Invalid inspection result." };

  const issue_category = ((formData.get("issue_category") as string) || "").trim() || null;
  const issue_detail = ((formData.get("issue_detail") as string) || "").trim() || null;
  if (issue_category === "Others" && !issue_detail)
    return { error: 'Please specify the issue when category is "Others".' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_records")
    .insert({
      project_id,
      inspection_date: (formData.get("inspection_date") as string) || today(),
      inspector: ((formData.get("inspector") as string) || "").trim() || null,
      area: ((formData.get("area") as string) || "").trim() || null,
      result,
      issue_category,
      issue_detail: issue_category === "Others" ? issue_detail : null,
      remarks: ((formData.get("remarks") as string) || "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not save inspection: ${error.message}` };

  const uploadError = await uploadAttachments(
    formData,
    project_id,
    "inspection_record",
    data.id,
    "Inspection Photo",
  );
  if (uploadError) return { error: uploadError };

  revalidatePath(`/projects/${project_id}`);
  return { ok: true };
}

export async function deleteInspection(
  id: string,
  projectId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("inspection_records").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
}
