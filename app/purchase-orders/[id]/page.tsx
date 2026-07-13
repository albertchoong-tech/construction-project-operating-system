import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { PrintButton } from "@/components/print-button";
import { CostCentreSelect } from "@/components/cost-centre-select";
import { actionPO, recordDelivery, cancelPO, recategorisePO } from "@/lib/actions/procurement";
import { recordSupplierPayment } from "@/lib/actions/financial";
import { costCategoryLabel } from "@/lib/categories";
import { getSessionProfile } from "@/lib/auth";
import { fmtDate, fmtRM, today } from "@/lib/format";
import type { MaterialDelivery, PRItem, SupplierPayment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("*, projects(id, name, project_code), suppliers(name, contact_person, phone), purchase_requests(pr_no, items)")
    .eq("id", id)
    .single();
  if (!po) notFound();

  const profile = await getSessionProfile();
  const isDirector = profile?.role === "director";

  const [{ data: deliveries }, { data: payments }] = await Promise.all([
    supabase
      .from("material_deliveries")
      .select("*")
      .eq("po_id", id)
      .order("delivery_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select("*")
      .eq("po_id", id)
      .order("payment_date", { ascending: false }),
  ]);

  const paid = (payments ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const prItems = (po.purchase_requests?.items ?? []) as PRItem[];

  return (
    <>
      <PageHeader
        title={po.po_no ?? "Purchase Order"}
        subtitle={`${po.projects?.name ?? "—"} · Supplier: ${po.suppliers?.name ?? "—"}${po.purchase_requests?.pr_no ? ` · From ${po.purchase_requests.pr_no}` : ""}`}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={po.status} />
            <PrintButton />
            {po.status === "draft" && (
              <>
                <ActionButton
                  label="Approve PO"
                  variant="approve"
                  promptRemarks
                  small={false}
                  action={async (remarks: string) => {
                    "use server";
                    return actionPO(id, "approved", remarks);
                  }}
                />
                <LinkButton href={`/purchase-orders/${id}/edit`} variant="secondary">
                  Edit
                </LinkButton>
              </>
            )}
            {["approved", "delivered", "invoiced"].includes(po.status) && (
              <ActionButton
                label="Cancel PO"
                variant="danger"
                small={false}
                promptRemarks
                action={async (remarks: string) => {
                  "use server";
                  return cancelPO(id, remarks);
                }}
              />
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Order Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-500">Project</dt>
            <dd>
              <Link href={`/projects/${po.projects?.id}?tab=procurement`} className="text-slate-900 hover:underline">
                {po.projects?.name ?? "—"}
              </Link>
            </dd>
            <dt className="text-slate-500">Supplier</dt>
            <dd className="text-slate-900">
              {po.suppliers?.name ?? "—"}
              {po.suppliers?.phone ? ` · ${po.suppliers.phone}` : ""}
            </dd>
            <dt className="text-slate-500">Issue date</dt>
            <dd className="text-slate-900">{fmtDate(po.issue_date)}</dd>
            <dt className="text-slate-500">Delivery due</dt>
            <dd className="text-slate-900">{fmtDate(po.delivery_date)}</dd>
            <dt className="text-slate-500">Cost centre</dt>
            <dd className="text-slate-900">
              {isDirector && po.status !== "cancelled" ? (
                <CostCentreSelect
                  current={po.cost_category ?? "material"}
                  action={async (costCategory: string) => {
                    "use server";
                    return recategorisePO(id, costCategory);
                  }}
                />
              ) : (
                costCategoryLabel(po.cost_category)
              )}
            </dd>
            <dt className="text-slate-500">Total amount</dt>
            <dd className="text-slate-900 font-semibold">{fmtRM(po.total_amount)}</dd>
            <dt className="text-slate-500">Paid to supplier</dt>
            <dd className={`font-semibold ${paid >= Number(po.total_amount) ? "text-emerald-600" : "text-amber-600"}`}>
              {fmtRM(paid)}
            </dd>
            {po.notes && (
              <>
                <dt className="text-slate-500">Notes</dt>
                <dd className="text-slate-900">{po.notes}</dd>
              </>
            )}
          </dl>
          {prItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Requested items
              </p>
              <ul className="text-sm text-slate-700 space-y-1">
                {prItems.map((i, idx) => (
                  <li key={idx}>
                    {i.description} — {i.qty} {i.unit} @ {fmtRM(i.est_rate)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Record Material Delivery">
          {po.status === "draft" ? (
            <p className="text-sm text-slate-500">Approve the PO before recording deliveries.</p>
          ) : (
            <ActionForm action={recordDelivery} submitLabel="Record Delivery">
              <input type="hidden" name="po_id" value={id} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Delivery date">
                  <TextInput name="delivery_date" type="date" defaultValue={today()} />
                </Field>
                <Field label="Delivery note no.">
                  <TextInput name="delivery_note_no" placeholder="DN-…" />
                </Field>
                <Field label="Received by" className="sm:col-span-2">
                  <TextInput
                    name="received_by"
                    defaultValue={(await getSessionProfile())?.fullName ?? ""}
                    placeholder="Site supervisor name"
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <TextArea name="notes" placeholder="Condition, shortages, remarks…" />
                </Field>
              </div>
            </ActionForm>
          )}
        </Card>

        <Card title="Deliveries">
          {!deliveries?.length ? (
            <EmptyState message="No deliveries recorded yet." />
          ) : (
            <Table headers={["Date", "Note No", "Received By", "Notes"]}>
              {(deliveries as MaterialDelivery[]).map((d) => (
                <tr key={d.id}>
                  <Td>{fmtDate(d.delivery_date)}</Td>
                  <Td>{d.delivery_note_no ?? "—"}</Td>
                  <Td>{d.received_by ?? "—"}</Td>
                  <Td className="whitespace-normal">{d.notes ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Supplier Payments">
          {!payments?.length ? (
            <p className="text-sm text-slate-500 mb-4">No payments made against this PO yet.</p>
          ) : (
            <div className="mb-5">
              <Table headers={["Date", "Amount", "Method", "Reference"]} rightAlign={[1]}>
                {(payments as SupplierPayment[]).map((p) => (
                  <tr key={p.id}>
                    <Td>{fmtDate(p.payment_date)}</Td>
                    <Td right>{fmtRM(p.amount)}</Td>
                    <Td>{p.payment_method ?? "—"}</Td>
                    <Td>{p.reference_no ?? "—"}</Td>
                  </tr>
                ))}
              </Table>
              <div className="h-5" />
            </div>
          )}
          {po.status !== "draft" && (
            <ActionForm action={recordSupplierPayment} submitLabel="Record Payment">
              <input type="hidden" name="po_id" value={id} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Payment date">
                  <TextInput name="payment_date" type="date" defaultValue={today()} />
                </Field>
                <Field label="Amount (RM)" required>
                  <TextInput name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
                </Field>
                <Field label="Method">
                  <TextInput name="payment_method" placeholder="Bank Transfer" />
                </Field>
                <Field label="Reference no.">
                  <TextInput name="reference_no" placeholder="TT-…" />
                </Field>
              </div>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  );
}
