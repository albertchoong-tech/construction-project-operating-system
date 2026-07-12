import { createClient } from "@/lib/supabase/server";

/** Append a row to the audit trail. `action` is free text ("approved",
 *  "rejected", "amended", "cancelled", "recategorised"). Directors only —
 *  RLS on approval_records enforces that. */
export async function recordAudit(
  entityType: string,
  entityId: string,
  action: string,
  actionedBy: string,
  remarks?: string,
) {
  const supabase = await createClient();
  await supabase.from("approval_records").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actioned_by: actionedBy,
    remarks: remarks?.trim() || null,
  });
}
