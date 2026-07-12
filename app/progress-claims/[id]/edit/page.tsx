import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { updateClaim } from "@/lib/actions/financial";
import type { ProgressClaim } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("progress_claims")
    .select("*, projects(name)")
    .eq("id", id)
    .single<ProgressClaim>();
  if (!claim) notFound();
  if (!["draft", "submitted"].includes(claim.status)) redirect("/progress-claims");

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${claim.claim_no}`} subtitle={claim.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updateClaim} submitLabel="Save Changes">
          <input type="hidden" name="id" value={claim.id} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Claimed amount (RM)" required>
              <TextInput
                name="claimed_amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={claim.claimed_amount ?? ""}
              />
            </Field>
            <Field label="Claim date">
              <TextInput name="claim_date" type="date" defaultValue={claim.claim_date ?? ""} />
            </Field>
            <Field label="Period end">
              <TextInput name="period_end" type="date" defaultValue={claim.period_end ?? ""} />
            </Field>
            <Field label="Notes" className="sm:col-span-3">
              <TextArea name="notes" defaultValue={claim.notes ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
