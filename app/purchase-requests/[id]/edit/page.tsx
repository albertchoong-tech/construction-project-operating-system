import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { PRItemsField } from "@/components/pr-items-field";
import { updatePR } from "@/lib/actions/procurement";
import type { PurchaseRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pr } = await supabase
    .from("purchase_requests")
    .select("*, projects(name)")
    .eq("id", id)
    .single<PurchaseRequest>();
  if (!pr) notFound();
  if (pr.status !== "draft") redirect("/purchase-requests");

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${pr.pr_no}`} subtitle={pr.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updatePR} submitLabel="Save Changes">
          <input type="hidden" name="id" value={pr.id} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Requested by">
              <TextInput name="requested_by" defaultValue={pr.requested_by ?? ""} placeholder="Name" />
            </Field>
            <Field label="Request date">
              <TextInput name="request_date" type="date" defaultValue={pr.request_date ?? ""} />
            </Field>
          </div>
          <Field label="Items" required>
            <PRItemsField initial={pr.items} />
          </Field>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={pr.notes ?? ""} />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
