"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachments, recordUploadedVideos } from "@/lib/attachments";
import { today } from "@/lib/format";
import type { ActionResult } from "@/components/form";

const INSPECTION_RESULTS = ["pass", "fail", "conditional"];

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
      area: ((formData.get("area") as string) || "").trim() || null,
      drawing_id: ((formData.get("drawing_id") as string) || "").trim() || null,
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

  const videoError = await recordUploadedVideos(
    formData,
    project_id,
    "site_progress_log",
    inserted.id,
    "Site Video",
  );
  if (videoError) return { error: videoError };

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
  revalidatePath("/site-updates");
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

export async function updateProgressLog(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || "";
  if (!id) return { error: "Missing log." };
  const work_done = ((formData.get("work_done") as string) || "").trim();
  if (!work_done) return { error: "Describe the work done." };
  const completion_pct = parseFloat((formData.get("completion_pct") as string) || "0");
  if (isNaN(completion_pct) || completion_pct < 0 || completion_pct > 100)
    return { error: "Completion % must be between 0 and 100." };
  const workers_count = parseInt((formData.get("workers_count") as string) || "0", 10);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_progress_logs")
    .update({
      log_date: (formData.get("log_date") as string) || today(),
      reported_by: ((formData.get("reported_by") as string) || "").trim() || null,
      area: ((formData.get("area") as string) || "").trim() || null,
      drawing_id: ((formData.get("drawing_id") as string) || "").trim() || null,
      work_done,
      completion_pct,
      weather: ((formData.get("weather") as string) || "").trim() || null,
      workers_count: isNaN(workers_count) ? 0 : workers_count,
      issues: ((formData.get("issues") as string) || "").trim() || null,
    })
    .eq("id", id)
    .select("project_id")
    .single();
  if (error) return { error: `Could not update log: ${error.message}` };

  // Re-sync the project's surfaced completion % to the latest log
  if (data?.project_id) {
    const { data: latest } = await supabase
      .from("site_progress_logs")
      .select("completion_pct")
      .eq("project_id", data.project_id)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (latest)
      await supabase
        .from("projects")
        .update({ completion_pct: latest.completion_pct })
        .eq("id", data.project_id);
    revalidatePath(`/projects/${data.project_id}`);
  }
  revalidatePath("/site-progress");
  revalidatePath("/");
  redirect("/site-progress");
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
      drawing_id: ((formData.get("drawing_id") as string) || "").trim() || null,
      result,
      issue_category,
      issue_detail: issue_category === "Others" ? issue_detail : null,
      corrective_action: ((formData.get("corrective_action") as string) || "").trim() || null,
      responsible_party: ((formData.get("responsible_party") as string) || "").trim() || null,
      follow_up_date: ((formData.get("follow_up_date") as string) || "").trim() || null,
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

  const videoError = await recordUploadedVideos(
    formData,
    project_id,
    "inspection_record",
    data.id,
    "Inspection Video",
  );
  if (videoError) return { error: videoError };

  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/site-updates");
  revalidatePath("/inspections");
  revalidatePath("/");
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

export async function updateInspection(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || "";
  if (!id) return { error: "Missing inspection." };
  const result = (formData.get("result") as string) || "pass";
  if (!INSPECTION_RESULTS.includes(result)) return { error: "Invalid inspection result." };

  const issue_category = ((formData.get("issue_category") as string) || "").trim() || null;
  const issue_detail = ((formData.get("issue_detail") as string) || "").trim() || null;
  if (issue_category === "Others" && !issue_detail)
    return { error: 'Please specify the issue when category is "Others".' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_records")
    .update({
      inspection_date: (formData.get("inspection_date") as string) || today(),
      inspector: ((formData.get("inspector") as string) || "").trim() || null,
      area: ((formData.get("area") as string) || "").trim() || null,
      drawing_id: ((formData.get("drawing_id") as string) || "").trim() || null,
      result,
      issue_category,
      issue_detail: issue_category === "Others" ? issue_detail : null,
      corrective_action: ((formData.get("corrective_action") as string) || "").trim() || null,
      responsible_party: ((formData.get("responsible_party") as string) || "").trim() || null,
      follow_up_date: ((formData.get("follow_up_date") as string) || "").trim() || null,
      remarks: ((formData.get("remarks") as string) || "").trim() || null,
    })
    .eq("id", id)
    .select("project_id")
    .single();
  if (error) return { error: `Could not update inspection: ${error.message}` };

  const uploadError = await uploadAttachments(
    formData,
    data.project_id,
    "inspection_record",
    id,
    "Inspection Photo",
  );
  if (uploadError) return { error: uploadError };

  revalidatePath(`/projects/${data.project_id}`);
  revalidatePath("/inspections");
  revalidatePath("/");
  redirect(`/projects/${data.project_id}?tab=inspections`);
}
