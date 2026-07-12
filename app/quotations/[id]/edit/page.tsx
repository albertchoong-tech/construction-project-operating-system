import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { QuotationItemsField, type QuotationLineDraft } from "@/components/quotation-items-field";
import { updateQuotation } from "@/lib/actions/quotations";
import type { Quotation, QuotationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: quotation }, { data: items }, { data: clients }] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).single<Quotation>(),
    supabase.from("quotation_items").select("*").eq("quotation_id", id).order("created_at"),
    supabase.from("clients").select("id, name").order("name"),
  ]);
  if (!quotation) notFound();
  if (quotation.status !== "draft") redirect(`/quotations/${id}`);

  const initial: QuotationLineDraft[] = ((items ?? []) as QuotationItem[]).map((i) => ({
    section: i.section ?? "",
    description: i.description,
    unit: i.unit ?? "",
    quantity: Number(i.quantity) || 0,
    unit_rate: Number(i.unit_rate) || 0,
  }));

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${quotation.quotation_no}`} />
      <Card>
        <ActionForm action={updateQuotation} submitLabel="Save Changes">
          <input type="hidden" name="id" value={quotation.id} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Client" required>
              <Select name="client_id" required defaultValue={quotation.client_id ?? ""}>
                <option value="">— Select client —</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job / project title" required className="sm:col-span-3">
              <TextInput name="title" required defaultValue={quotation.title ?? ""} />
            </Field>
            <Field label="Issue date">
              <TextInput name="issue_date" type="date" defaultValue={quotation.issue_date ?? ""} />
            </Field>
            <Field label="Valid until">
              <TextInput name="valid_until" type="date" defaultValue={quotation.valid_until ?? ""} />
            </Field>
            <Field label="Notes / terms" className="sm:col-span-2">
              <TextArea name="notes" rows={2} defaultValue={quotation.notes ?? ""} />
            </Field>
          </div>
          <Field label="Line items" required>
            <QuotationItemsField initial={initial} />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
