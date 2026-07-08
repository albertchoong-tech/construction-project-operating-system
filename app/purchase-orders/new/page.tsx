import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { createPO } from "@/lib/actions/procurement";
import { fmtRM, today } from "@/lib/format";
import type { PRItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewPOPage({
  searchParams,
}: {
  searchParams: Promise<{ pr?: string }>;
}) {
  const { pr: preselectedPr } = await searchParams;
  const supabase = await createClient();
  const [{ data: prs }, { data: suppliers }] = await Promise.all([
    supabase
      .from("purchase_requests")
      .select("id, pr_no, items, projects(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  const estTotal = (items: PRItem[]) =>
    (items ?? []).reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.est_rate) || 0), 0);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New Purchase Order"
        subtitle="Raise a PO from an approved purchase request and commit it to a supplier"
      />
      <Card>
        <ActionForm action={createPO} submitLabel="Create Purchase Order">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Approved purchase request" required>
              <Select name="pr_id" defaultValue={preselectedPr ?? ""} required>
                <option value="">— Select approved PR —</option>
                {(prs ?? []).map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.pr_no} · {(pr.projects as { name?: string } | null)?.name ?? "—"} · est.{" "}
                    {fmtRM(estTotal(pr.items as PRItem[]))}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Supplier" required>
              <Select name="supplier_id" defaultValue="" required>
                <option value="">— Select supplier —</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Issue date">
              <TextInput name="issue_date" type="date" defaultValue={today()} />
            </Field>
            <Field label="Expected delivery date">
              <TextInput name="delivery_date" type="date" />
            </Field>
            <Field label="Total amount (RM)" className="sm:col-span-2">
              <TextInput
                name="total_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Leave blank to use the PR's estimated total"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextArea name="notes" placeholder="Delivery instructions, payment terms…" />
            </Field>
          </div>
        </ActionForm>
      </Card>
      {!prs?.length && (
        <p className="text-sm text-slate-500 mt-4">
          No approved purchase requests available — approve a PR first on the Purchase Requests page.
        </p>
      )}
    </div>
  );
}
