import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { QuotationItemsField } from "@/components/quotation-items-field";
import { createQuotation } from "@/lib/actions/quotations";
import { today } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New Quotation"
        subtitle="Line items become the project BOQ when the quotation is won"
      />
      <Card>
        <ActionForm action={createQuotation} submitLabel="Create Quotation" draftKey="quotation-new">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Client" required>
              <Select name="client_id" required defaultValue="">
                <option value="">— Select client —</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job / project title" required className="sm:col-span-3">
              <TextInput name="title" required placeholder="e.g. Tan Residence Kitchen Extension" />
            </Field>
            <Field label="Issue date">
              <TextInput name="issue_date" type="date" defaultValue={today()} />
            </Field>
            <Field label="Valid until">
              <TextInput name="valid_until" type="date" />
            </Field>
            <Field label="Notes / terms" className="sm:col-span-2">
              <TextArea
                name="notes"
                rows={2}
                placeholder="Payment terms, exclusions, conditions…"
              />
            </Field>
          </div>
          <Field label="Line items" required>
            <QuotationItemsField />
          </Field>
        </ActionForm>
      </Card>
      {!clients?.length && (
        <p className="text-sm text-slate-500 mt-4">
          No clients yet — create the client first on the Clients page.
        </p>
      )}
    </div>
  );
}
