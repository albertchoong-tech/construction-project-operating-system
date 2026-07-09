"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireDirector } from "@/lib/auth";
import { uploadAttachments } from "@/lib/attachments";
import { nextDocNo, today } from "@/lib/format";
import type { ActionResult } from "@/components/form";

function revalidateFinancials(projectId?: string | null) {
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/variation-orders");
  revalidatePath("/progress-claims");
  revalidatePath("/payments");
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

// ── Variation Orders ─────────────────────────────────────────────────────────

export async function createVO(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  const description = ((formData.get("description") as string) || "").trim();
  if (!project_id) return { error: "Project is required." };
  if (!description) return { error: "Description is required." };

  const amount = parseFloat((formData.get("amount") as string) || "0");
  if (isNaN(amount)) return { error: "Amount must be a number." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("variation_orders")
    .select("vo_no")
    .eq("project_id", project_id);
  const vo_no = nextDocNo("VO", (existing ?? []).map((r) => r.vo_no));

  const { data, error } = await supabase
    .from("variation_orders")
    .insert({
      project_id,
      vo_no,
      description,
      requested_by: ((formData.get("requested_by") as string) || "").trim() || null,
      request_date: (formData.get("request_date") as string) || today(),
      amount,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) return { error: `Could not create VO: ${error.message}` };

  const uploadError = await uploadAttachments(
    formData,
    project_id,
    "variation_order",
    data.id,
    "Variation Order",
  );
  if (uploadError) return { error: uploadError };

  revalidateFinancials(project_id);
  return { ok: true };
}

export async function actionVO(
  id: string,
  action: "approved" | "rejected",
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variation_orders")
    .update({
      status: action,
      approved_by: action === "approved" ? auth.approver : null,
      approved_date: action === "approved" ? today() : null,
    })
    .eq("id", id)
    .in("status", ["draft", "pending"])
    .select("project_id")
    .single();
  if (error) return { error: error.message };
  await writeApproval("variation_order", id, action, remarks, auth.approver);
  revalidateFinancials(data?.project_id);
}

export async function deleteVO(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variation_orders")
    .delete()
    .eq("id", id)
    .in("status", ["draft", "pending", "rejected"])
    .select("project_id")
    .single();
  if (error) return { error: "Only unapproved VOs can be deleted." };
  revalidateFinancials(data?.project_id);
}

// ── Progress Claims ──────────────────────────────────────────────────────────

export async function createClaim(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const project_id = (formData.get("project_id") as string) || "";
  if (!project_id) return { error: "Project is required." };

  const claimed_amount = parseFloat((formData.get("claimed_amount") as string) || "0");
  if (isNaN(claimed_amount) || claimed_amount <= 0)
    return { error: "Claimed amount must be a positive number." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("progress_claims")
    .select("claim_no")
    .eq("project_id", project_id);
  const claim_no = nextDocNo("PC", (existing ?? []).map((r) => r.claim_no));

  const { error } = await supabase.from("progress_claims").insert({
    project_id,
    claim_no,
    claim_date: (formData.get("claim_date") as string) || today(),
    period_end: (formData.get("period_end") as string) || today(),
    claimed_amount,
    approved_amount: 0,
    status: "submitted",
    notes: ((formData.get("notes") as string) || "").trim() || null,
  });
  if (error) return { error: `Could not create claim: ${error.message}` };

  revalidateFinancials(project_id);
  return { ok: true };
}

export async function approveClaim(
  id: string,
  approvedAmount: number | null,
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("progress_claims")
    .select("claimed_amount, status, project_id")
    .eq("id", id)
    .single();
  if (!claim) return { error: "Claim not found." };
  if (!["draft", "submitted"].includes(claim.status))
    return { error: "Only draft or submitted claims can be approved." };

  const approved_amount =
    approvedAmount !== null && !isNaN(approvedAmount) && approvedAmount >= 0
      ? approvedAmount
      : Number(claim.claimed_amount) || 0;

  const { error } = await supabase
    .from("progress_claims")
    .update({ status: "approved", approved_amount })
    .eq("id", id);
  if (error) return { error: error.message };
  await writeApproval("progress_claim", id, "approved", remarks, auth.approver);
  revalidateFinancials(claim.project_id);
}

export async function rejectClaim(
  id: string,
  remarks: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirector();
  if ("error" in auth) return auth;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_claims")
    .update({ status: "draft" })
    .eq("id", id)
    .eq("status", "submitted")
    .select("project_id")
    .single();
  if (error) return { error: error.message };
  await writeApproval("progress_claim", id, "rejected", remarks, auth.approver);
  revalidateFinancials(data?.project_id);
}

export async function deleteClaim(id: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_claims")
    .delete()
    .eq("id", id)
    .in("status", ["draft", "submitted"])
    .select("project_id")
    .single();
  if (error) return { error: "Only unapproved claims can be deleted." };
  revalidateFinancials(data?.project_id);
}

// ── Payments ─────────────────────────────────────────────────────────────────

export async function recordCustomerPayment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const claim_id = (formData.get("claim_id") as string) || "";
  if (!claim_id) return { error: "Progress claim is required." };

  const amount = parseFloat((formData.get("amount") as string) || "0");
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be a positive number." };

  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("progress_claims")
    .select("id, project_id, status, approved_amount")
    .eq("id", claim_id)
    .single();
  if (!claim) return { error: "Claim not found." };
  if (!["approved", "paid"].includes(claim.status))
    return { error: "Payments can only be recorded against approved claims." };

  const { error } = await supabase.from("customer_payments").insert({
    project_id: claim.project_id,
    claim_id,
    payment_date: (formData.get("payment_date") as string) || today(),
    amount,
    payment_method: ((formData.get("payment_method") as string) || "").trim() || null,
    reference_no: ((formData.get("reference_no") as string) || "").trim() || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
  });
  if (error) return { error: `Could not record payment: ${error.message}` };

  // Mark the claim paid once receipts cover the approved amount
  const { data: pays } = await supabase
    .from("customer_payments")
    .select("amount")
    .eq("claim_id", claim_id);
  const totalPaid = (pays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  if (totalPaid >= (Number(claim.approved_amount) || 0)) {
    await supabase.from("progress_claims").update({ status: "paid" }).eq("id", claim_id);
  }

  revalidateFinancials(claim.project_id);
  return { ok: true };
}

export async function recordSupplierPayment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const po_id = (formData.get("po_id") as string) || "";
  if (!po_id) return { error: "Purchase order is required." };

  const amount = parseFloat((formData.get("amount") as string) || "0");
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be a positive number." };

  const supabase = await createClient();
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, project_id, status, total_amount")
    .eq("id", po_id)
    .single();
  if (!po) return { error: "Purchase order not found." };
  if (po.status === "draft")
    return { error: "Approve the PO before recording payments." };

  const { error } = await supabase.from("supplier_payments").insert({
    project_id: po.project_id,
    po_id,
    payment_date: (formData.get("payment_date") as string) || today(),
    amount,
    payment_method: ((formData.get("payment_method") as string) || "").trim() || null,
    reference_no: ((formData.get("reference_no") as string) || "").trim() || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
  });
  if (error) return { error: `Could not record payment: ${error.message}` };

  // Mark PO paid once payments cover the total
  const { data: pays } = await supabase
    .from("supplier_payments")
    .select("amount")
    .eq("po_id", po_id);
  const totalPaid = (pays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  if (totalPaid >= (Number(po.total_amount) || 0) && ["delivered", "invoiced"].includes(po.status)) {
    await supabase.from("purchase_orders").update({ status: "paid" }).eq("id", po_id);
  }

  revalidateFinancials(po.project_id);
  revalidatePath(`/purchase-orders/${po_id}`);
  revalidatePath("/purchase-orders");
  return { ok: true };
}
