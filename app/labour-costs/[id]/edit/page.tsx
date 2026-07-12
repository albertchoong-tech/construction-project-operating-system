import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput } from "@/components/form";
import { updateLabourCost } from "@/lib/actions/labour";
import type { LabourCost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditLabourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("labour_costs")
    .select("*, projects(name)")
    .eq("id", id)
    .single<LabourCost>();
  if (!entry) notFound();

  const money = (v: number) => (v ? String(v) : "");

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit Labour Entry`} subtitle={entry.projects?.name ?? ""} />
      <Card>
        <ActionForm action={updateLabourCost} submitLabel="Save Changes">
          <input type="hidden" name="id" value={entry.id} />
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Worker / staff name" required className="min-[420px]:col-span-2">
              <TextInput name="worker_name" required defaultValue={entry.worker_name} />
            </Field>
            <Field label="Work date">
              <TextInput name="work_date" type="date" defaultValue={entry.work_date ?? ""} />
            </Field>
            <Field label="Period">
              <TextInput name="period" defaultValue={entry.period ?? ""} />
            </Field>
            <Field label="Basic wages (RM)">
              <TextInput name="basic_wages" type="number" step="0.01" min="0" defaultValue={money(entry.basic_wages)} />
            </Field>
            <Field label="Overtime (RM)">
              <TextInput name="overtime" type="number" step="0.01" min="0" defaultValue={money(entry.overtime)} />
            </Field>
            <Field label="Allowance (RM)">
              <TextInput name="allowance" type="number" step="0.01" min="0" defaultValue={money(entry.allowance)} />
            </Field>
            <Field label="EPF (RM)">
              <TextInput name="epf" type="number" step="0.01" min="0" defaultValue={money(entry.epf)} />
            </Field>
            <Field label="SOCSO (RM)">
              <TextInput name="socso" type="number" step="0.01" min="0" defaultValue={money(entry.socso)} />
            </Field>
            <Field label="EIS (RM)">
              <TextInput name="eis" type="number" step="0.01" min="0" defaultValue={money(entry.eis)} />
            </Field>
            <Field label="PCB / tax (RM)">
              <TextInput name="pcb" type="number" step="0.01" min="0" defaultValue={money(entry.pcb)} />
            </Field>
            <Field label="Other payroll cost (RM)">
              <TextInput name="other_cost" type="number" step="0.01" min="0" defaultValue={money(entry.other_cost)} />
            </Field>
            <Field label="Remarks" className="min-[420px]:col-span-2 sm:col-span-3">
              <TextInput name="remarks" defaultValue={entry.remarks ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
