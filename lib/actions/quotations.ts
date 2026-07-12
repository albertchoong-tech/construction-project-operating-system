"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, requireDirector } from "@/lib/auth";
import { nextDocNo, today } from "@/lib/format";
import type { ActionResult } from "@/components/form";
import type { QuotationLineDraft } from "@/components/quotation-items-field";

function revalidateQuotations(projectId?: string | null) {
  revalidatePath("/quotations");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

async function writeApproval(
  entityId: string,
  action: "approved" | "rejected",
  remarks: string,
  approver: string,
) {
  const supabase = await createClient();
  await supabase.from("approval_records").insert({
    entity_type: "quotation",
    entity_id: entityId,
    action,
    actioned_by: approver,
    remarks: remarks.trim() || null,
  });
}

export async function createQuotation(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const client_id = (formData.get("client_id") as string) || "";
  const title = ((formData.get("title") as string) || "").trim();
  if (!client_id) return { error: "Client is required." };
  if (!title) return { error: "Job / project title is required." };

  let items: QuotationLineDraft[];
  try {
    items = JSON.parse((formData.get("items_json") as string) || "[]");
  } catch {
    return { error: "Invalid line items." };
  }
  items = items.filter((i) => i.description?.trim());
  if (!items.length) return { error: "Add at least one line item with a description." };
  for (const item of items) {
    if (Number(item.quantity) < 0 || Number(item.unit_rate) < 0)
      return { error: "Quantities and rates must be non-negative." };
  }

  const total_amount = items.reduce(
    (a, i) => a + (Number(i.quantity) || 0) * (Number(i.unit_rate) || 0),
    0,
  );

  const supabase = await createClient();
  const { data: existing } = await supabase.from("quotations").select("quotation_no");
  const quotation_no = nextDocNo("QT", (existing ?? []).map((r) => r.quotation_no));

  const { data: quotation, error } = await supabase
    .from("quotations")
    .insert({
      client_id,
      title,
      quotation_no,
      issue_date: (formData.get("issue_date") as string) || today(),
      valid_until: ((formData.get("valid_until") as string) || "").trim() || null,
      total_amount,
      status: "draft",
      notes: ((formData.get("notes") as string) || "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not create quotation: ${error.message}` };

  const { error: itemsError } = await supabase.from("quotation_items").insert(
    items.map((i) => ({
      quotation_id: quotation.id,
      section: i.section?.trim() || null,
      description: i.description.trim(),
      unit: i.unit?.trim() || null,
      quantity: Number(i.quantity) || 0,
      unit_rate: Number(i.unit_rate) || 0,
    })),
  );
  if (itemsError) return { error: `Quotation saved but lines failed: ${itemsError.message}` };

  revalidateQuotations();
  redirect(`/quotations/${quotation.id}`);
}

/** Edit a still-draft quotation, replacing all line items. */
export async function updateQuotation(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || "";
  const client_id = (formData.get("client_id") as string) || "";
  const title = ((formData.get("title") as string) || "").trim();
  if (!id) return { error: "Missing quotation." };
  if (!client_id) return { error: "Client is required." };
  if (!title) return { error: "Job / project title is required." };

  let items: QuotationLineDraft[];
  try {
    items = JSON.parse((formData.get("items_json") as string) || "[]");
  } catch {
    return { error: "Invalid line items." };
  }
  items = items.filter((i) => i.description?.trim());
  if (!items.length) return { error: "Add at least one line item with a description." };

  const total_amount = items.reduce(
    (a, i) => a + (Number(i.quantity) || 0) * (Number(i.unit_rate) || 0),
    0,
  );

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("quotations")
    .select("status")
    .eq("id", id)
    .single();
  if (!existing) return { error: "Quotation not found." };
  if (existing.status !== "draft")
    return { error: "Only draft quotations can be edited." };

  const { error } = await supabase
    .from("quotations")
    .update({
      client_id,
      title,
      valid_until: ((formData.get("valid_until") as string) || "").trim() || null,
      issue_date: (formData.get("issue_date") as string) || today(),
      total_amount,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { error: `Could not update quotation: ${error.message}` };

  // Replace line items
  await supabase.from("quotation_items").delete().eq("quotation_id", id);
  const { error: itemsError } = await supabase.from("quotation_items").insert(
    items.map((i) => ({
      quotation_id: id,
      section: i.section?.trim() || null,
      description: i.description.trim(),
      unit: i.unit?.trim() || null,
      quantity: Number(i.quantity) || 0,
      unit_rate: Number(i.unit_rate) || 0,
    })),
  );
  if (itemsError) return { error: `Quotation saved but lines failed: ${itemsError.message}` };

  revalidateQuotations();
  redirect(`/quotations/${id}`);
}

export async function submitQuotation(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ status: "submitted" })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  revalidateQuotations();
  revalidatePath(`/quotations/${id}`);
}

export async function actionQuotation(
  id: string,
  action: "approved" | "rejected",
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ status: action })
    .eq("id", id)
    .in("status", ["draft", "submitted"]);
  if (error) return { error: error.message };
  await writeApproval(id, action, remarks, auth.approver);
  revalidateQuotations();
  revalidatePath(`/quotations/${id}`);
}

export async function deleteQuotation(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .delete()
    .eq("id", id)
    .in("status", ["draft", "submitted", "rejected"]);
  if (error) return { error: error.message };
  revalidateQuotations();
}

/** Approved quotation → live project: creates the project, copies every line
 *  into the BOQ, sets contract value, and locks the quotation as converted. */
export async function convertQuotation(id: string): Promise<{ error?: string } | void> {
  const profile = await getSessionProfile();
  if (!profile || !["director", "quantity_surveyor"].includes(profile.role))
    return { error: "Only a Director or QS can convert a quotation." };

  const supabase = await createClient();
  const [{ data: quotation }, { data: items }] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).single(),
    supabase.from("quotation_items").select("*").eq("quotation_id", id).order("created_at"),
  ]);
  if (!quotation) return { error: "Quotation not found." };
  if (quotation.status !== "approved")
    return { error: "Only approved quotations can be converted." };
  if (quotation.project_id) return { error: "This quotation is already converted." };

  const { data: codes } = await supabase.from("projects").select("project_code");
  const project_code = nextDocNo("PRJ", (codes ?? []).map((c) => c.project_code));

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: quotation.title || `Project from ${quotation.quotation_no}`,
      project_code,
      client_id: quotation.client_id,
      status: "active",
      contract_value: quotation.total_amount,
      start_date: today(),
    })
    .select("id")
    .single();
  if (projectError) return { error: `Could not create project: ${projectError.message}` };

  if (items?.length) {
    const { error: boqError } = await supabase.from("boq_items").insert(
      items.map((i) => ({
        project_id: project.id,
        section: i.section,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        unit_rate: i.unit_rate,
      })),
    );
    if (boqError)
      return {
        error: `Project created but BOQ copy failed: ${boqError.message}. Add BOQ lines manually on the project.`,
      };
  }

  const { error: linkError } = await supabase
    .from("quotations")
    .update({ status: "converted", project_id: project.id })
    .eq("id", id);
  if (linkError) return { error: `Project created but quotation not locked: ${linkError.message}` };

  revalidateQuotations(project.id);
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
