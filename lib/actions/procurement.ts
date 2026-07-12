"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireDirector } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { nextDocNo, today } from "@/lib/format";
import type { ActionResult } from "@/components/form";
import type { PRItem } from "@/lib/types";

const VALID_COST_CATEGORIES = [
  "material", "labour", "subcontractor", "plant_equipment",
  "transport", "permit_statutory", "site_office", "miscellaneous",
];

function revalidateProcurement(projectId?: string | null) {
  revalidatePath("/purchase-requests");
  revalidatePath("/purchase-orders");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

async function writeApproval(
  entityType: string,
  entityId: string,
  action: "approved" | "rejected",
  remarks: string,
  approver: string,
) {
  const supabase = await createClient();
  await supabase.from("approval_records").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actioned_by: approver,
    remarks: remarks.trim() || null,
  });
}

// ── Purchase Requests ────────────────────────────────────────────────────────

export async function createPR(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  if (!project_id) return { error: "Project is required." };

  let items: PRItem[];
  try {
    items = JSON.parse((formData.get("items_json") as string) || "[]");
  } catch {
    return { error: "Invalid items." };
  }
  items = items.filter((i) => i.description?.trim());
  if (!items.length) return { error: "Add at least one item with a description." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("purchase_requests").select("pr_no");
  const pr_no = nextDocNo("PR", (existing ?? []).map((r) => r.pr_no));

  const { data, error } = await supabase
    .from("purchase_requests")
    .insert({
      project_id,
      pr_no,
      requested_by: ((formData.get("requested_by") as string) || "").trim() || null,
      request_date: (formData.get("request_date") as string) || today(),
      status: "draft",
      items,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not create PR: ${error.message}` };

  revalidateProcurement(project_id);
  redirect(`/purchase-requests?created=${data.id}`);
}

export async function submitPR(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_requests")
    .update({ status: "pending" })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  const { data } = await supabase.from("purchase_requests").select("project_id").eq("id", id).single();
  revalidateProcurement(data?.project_id);
}

export async function actionPR(
  id: string,
  action: "approved" | "rejected",
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_requests")
    .update({ status: action })
    .eq("id", id)
    .in("status", ["pending", "draft"])
    .select("project_id")
    .single();
  if (error) return { error: error.message };
  await writeApproval("purchase_request", id, action, remarks, auth.approver);
  revalidateProcurement(data?.project_id);
}

export async function deletePR(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_requests")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();
  if (error) return { error: error.message };
  revalidateProcurement(data?.project_id);
}

/** Edit a still-draft PR (items, requester, notes). */
export async function updatePR(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || "";
  if (!id) return { error: "Missing PR." };

  let items: PRItem[];
  try {
    items = JSON.parse((formData.get("items_json") as string) || "[]");
  } catch {
    return { error: "Invalid items." };
  }
  items = items.filter((i) => i.description?.trim());
  if (!items.length) return { error: "Add at least one item with a description." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_requests")
    .update({
      requested_by: ((formData.get("requested_by") as string) || "").trim() || null,
      request_date: (formData.get("request_date") as string) || today(),
      items,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    })
    .eq("id", id)
    .eq("status", "draft")
    .select("project_id")
    .single();
  if (error) return { error: `Could not update PR: ${error.message}. Only draft PRs are editable.` };

  revalidateProcurement(data?.project_id);
  redirect("/purchase-requests");
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

export async function createPO(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const pr_id = (formData.get("pr_id") as string) || null;
  const supplier_id = (formData.get("supplier_id") as string) || "";
  if (!supplier_id) return { error: "Supplier is required." };

  const supabase = await createClient();

  let project_id = (formData.get("project_id") as string) || "";
  let total_amount = parseFloat((formData.get("total_amount") as string) || "");

  if (pr_id) {
    const { data: pr } = await supabase
      .from("purchase_requests")
      .select("project_id, status, items")
      .eq("id", pr_id)
      .single();
    if (!pr) return { error: "Purchase request not found." };
    if (pr.status !== "approved")
      return { error: "POs can only be raised from an approved purchase request." };
    project_id = pr.project_id;
    if (isNaN(total_amount)) {
      total_amount = ((pr.items as PRItem[]) ?? []).reduce(
        (a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0),
        0,
      );
    }
  }
  if (!project_id) return { error: "Project is required (pick a PR or a project)." };
  if (isNaN(total_amount) || total_amount < 0)
    return { error: "Total amount must be a non-negative number." };

  const { data: existing } = await supabase.from("purchase_orders").select("po_no");
  const po_no = nextDocNo("PO", (existing ?? []).map((r) => r.po_no));

  const costCategoryRaw = (formData.get("cost_category") as string) || "material";
  const cost_category = VALID_COST_CATEGORIES.includes(costCategoryRaw)
    ? costCategoryRaw
    : "material";

  const { error } = await supabase.from("purchase_orders").insert({
    project_id,
    pr_id,
    supplier_id,
    po_no,
    issue_date: (formData.get("issue_date") as string) || today(),
    delivery_date: ((formData.get("delivery_date") as string) || "").trim() || null,
    status: "draft",
    cost_category,
    total_amount,
    notes: ((formData.get("notes") as string) || "").trim() || null,
  });
  if (error) return { error: `Could not create PO: ${error.message}` };

  revalidateProcurement(project_id);
  redirect(`/purchase-orders`);
}

export async function actionPO(
  id: string,
  action: "approved" | "rejected",
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;
  const supabase = await createClient();
  if (action === "approved") {
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({ status: "approved" })
      .eq("id", id)
      .eq("status", "draft")
      .select("project_id")
      .single();
    if (error) return { error: error.message };
    await writeApproval("purchase_order", id, "approved", remarks, auth.approver);
    revalidateProcurement(data?.project_id);
  } else {
    // Rejected POs revert to draft so they can be amended; record the rejection
    await writeApproval("purchase_order", id, "rejected", remarks, auth.approver);
    const { data } = await supabase.from("purchase_orders").select("project_id").eq("id", id).single();
    revalidateProcurement(data?.project_id);
  }
}

export async function deletePO(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("project_id")
    .single();
  if (error) return { error: error.message ?? "Only draft POs can be deleted." };
  revalidateProcurement(data?.project_id);
}

/** Edit a still-draft PO. */
export async function updatePO(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = (formData.get("id") as string) || "";
  if (!id) return { error: "Missing PO." };

  const supplier_id = (formData.get("supplier_id") as string) || "";
  if (!supplier_id) return { error: "Supplier is required." };

  const total_amount = parseFloat((formData.get("total_amount") as string) || "");
  if (isNaN(total_amount) || total_amount < 0)
    return { error: "Total amount must be a non-negative number." };

  const costCategoryRaw = (formData.get("cost_category") as string) || "material";
  const cost_category = VALID_COST_CATEGORIES.includes(costCategoryRaw) ? costCategoryRaw : "material";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .update({
      supplier_id,
      cost_category,
      total_amount,
      issue_date: (formData.get("issue_date") as string) || today(),
      delivery_date: ((formData.get("delivery_date") as string) || "").trim() || null,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    })
    .eq("id", id)
    .eq("status", "draft")
    .select("project_id")
    .single();
  if (error) return { error: `Could not update PO: ${error.message}. Only draft POs are editable.` };

  revalidateProcurement(data?.project_id);
  redirect(`/purchase-orders/${id}`);
}

/** Recategorise a PO's cost centre at any stage — Director only, audited.
 *  This is the explicit fix for legacy POs that all defaulted to "material". */
export async function recategorisePO(
  id: string,
  costCategory: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;
  if (!VALID_COST_CATEGORIES.includes(costCategory))
    return { error: "Invalid cost centre." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .update({ cost_category: costCategory })
    .eq("id", id)
    .select("project_id, po_no")
    .single();
  if (error) return { error: error.message };
  await recordAudit("purchase_order", id, "recategorised", auth.approver, `Cost centre → ${costCategory}`);
  revalidateProcurement(data?.project_id);
  revalidatePath(`/purchase-orders/${id}`);
}

/** Cancel an approved PO that won't be fulfilled — Director only, audited.
 *  The record is retained (status → cancelled) and drops out of committed cost. */
export async function cancelPO(
  id: string,
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status, project_id")
    .eq("id", id)
    .single();
  if (!po) return { error: "PO not found." };
  if (po.status === "paid") return { error: "A paid PO cannot be cancelled." };
  if (po.status === "cancelled") return { error: "Already cancelled." };
  if (po.status === "draft") return { error: "Delete draft POs instead of cancelling." };

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("purchase_order", id, "cancelled", auth.approver, remarks);
  revalidateProcurement(po.project_id);
  revalidatePath(`/purchase-orders/${id}`);
}

// ── Material Deliveries ──────────────────────────────────────────────────────

export async function recordDelivery(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const po_id = (formData.get("po_id") as string) || "";
  if (!po_id) return { error: "Purchase order is required." };

  const supabase = await createClient();
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, project_id, status")
    .eq("id", po_id)
    .single();
  if (!po) return { error: "Purchase order not found." };
  if (po.status === "draft")
    return { error: "Approve the PO before recording a delivery." };
  if (po.status === "cancelled")
    return { error: "This PO has been cancelled." };

  const { error } = await supabase.from("material_deliveries").insert({
    project_id: po.project_id,
    po_id,
    delivery_date: (formData.get("delivery_date") as string) || today(),
    delivery_note_no: ((formData.get("delivery_note_no") as string) || "").trim() || null,
    received_by: ((formData.get("received_by") as string) || "").trim() || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
  });
  if (error) return { error: `Could not record delivery: ${error.message}` };

  if (po.status === "approved") {
    await supabase.from("purchase_orders").update({ status: "delivered" }).eq("id", po_id);
  }

  revalidateProcurement(po.project_id);
  revalidatePath(`/purchase-orders/${po_id}`);
  return { ok: true };
}
