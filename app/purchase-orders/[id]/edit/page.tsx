import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { updatePO } from "@/lib/actions/procurement";
import { COST_CATEGORIES } from "@/lib/categories";
import type { PurchaseOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPOPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: po }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_orders").select("*, projects(name)").eq("id", id).single<PurchaseOrder>(),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);
  if (!po) notFound();
  if (po.status !== "draft") redirect(`/purchase-orders/${id}`);

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${po.po_no}`} subtitle={po.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updatePO} submitLabel="Save Changes">
          <input type="hidden" name="id" value={po.id} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Supplier" required>
              <Select name="supplier_id" required defaultValue={po.supplier_id ?? ""}>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cost centre">
              <Select name="cost_category" defaultValue={po.cost_category ?? "material"}>
                {COST_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Total amount (RM)" required>
              <TextInput
                name="total_amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={po.total_amount ?? ""}
              />
            </Field>
            <Field label="Issue date">
              <TextInput name="issue_date" type="date" defaultValue={po.issue_date ?? ""} />
            </Field>
            <Field label="Expected delivery date">
              <TextInput name="delivery_date" type="date" defaultValue={po.delivery_date ?? ""} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextArea name="notes" defaultValue={po.notes ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
