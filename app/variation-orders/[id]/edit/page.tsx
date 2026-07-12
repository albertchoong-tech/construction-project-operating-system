import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { updateVO } from "@/lib/actions/financial";
import type { VariationOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditVOPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: vo } = await supabase
    .from("variation_orders")
    .select("*, projects(name)")
    .eq("id", id)
    .single<VariationOrder>();
  if (!vo) notFound();
  if (!["draft", "pending"].includes(vo.status)) redirect("/variation-orders");

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${vo.vo_no}`} subtitle={vo.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updateVO} submitLabel="Save Changes">
          <input type="hidden" name="id" value={vo.id} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Description" required className="sm:col-span-3">
              <TextArea name="description" required defaultValue={vo.description} />
            </Field>
            <Field label="Amount (RM)" required>
              <TextInput name="amount" type="number" step="0.01" required defaultValue={vo.amount ?? ""} />
            </Field>
            <Field label="Requested by">
              <TextInput name="requested_by" defaultValue={vo.requested_by ?? ""} />
            </Field>
            <Field label="Request date">
              <TextInput name="request_date" type="date" defaultValue={vo.request_date ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
