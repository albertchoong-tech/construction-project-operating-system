import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatCard } from "@/components/ui";
import { ActionForm, Field, TextInput, Select } from "@/components/form";
import { recordCustomerPayment, recordSupplierPayment } from "@/lib/actions/financial";
import { fmtDate, fmtRM, today } from "@/lib/format";
import type { CustomerPayment, SupplierPayment } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const [
    { data: customerPays },
    { data: supplierPays },
    { data: approvedClaims },
    { data: payablePOs },
  ] = await Promise.all([
    supabase
      .from("customer_payments")
      .select("*, projects(name), progress_claims(claim_no)")
      .order("payment_date", { ascending: false })
      .limit(100),
    supabase
      .from("supplier_payments")
      .select("*, projects(name), purchase_orders(po_no, suppliers(name))")
      .order("payment_date", { ascending: false })
      .limit(100),
    supabase
      .from("progress_claims")
      .select("id, claim_no, approved_amount, projects(name)")
      .in("status", ["approved"])
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("id, po_no, total_amount, status, projects(name), suppliers(name)")
      .in("status", ["approved", "delivered", "invoiced"])
      .order("created_at", { ascending: false }),
  ]);

  const received = (customerPays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const paidOut = (supplierPays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);

  return (
    <>
      <PageHeader title="Payments" subtitle="Company-wide receipts and supplier payments" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Received" value={fmtRM(received)} tone="good" />
        <StatCard label="Total Paid Out" value={fmtRM(paidOut)} tone="bad" />
        <StatCard
          label="Net Cash Position"
          value={fmtRM(received - paidOut)}
          tone={received - paidOut >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Record Customer Receipt">
          {!approvedClaims?.length ? (
            <p className="text-sm text-slate-500">
              No approved claims awaiting payment. Approve a claim on the{" "}
              <Link href="/progress-claims" className="underline">
                Progress Claims
              </Link>{" "}
              page first.
            </p>
          ) : (
            <ActionForm action={recordCustomerPayment} submitLabel="Record Receipt">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Against claim" required className="sm:col-span-2">
                  <Select name="claim_id" required defaultValue="">
                    <option value="">— Select approved claim —</option>
                    {approvedClaims.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.claim_no} · {(c.projects as { name?: string } | null)?.name} · certified{" "}
                        {fmtRM(c.approved_amount)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount (RM)" required>
                  <TextInput name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
                </Field>
                <Field label="Payment date">
                  <TextInput name="payment_date" type="date" defaultValue={today()} />
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

        <Card title="Record Supplier Payment">
          {!payablePOs?.length ? (
            <p className="text-sm text-slate-500">No approved or delivered POs awaiting payment.</p>
          ) : (
            <ActionForm action={recordSupplierPayment} submitLabel="Record Payment">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Against purchase order" required className="sm:col-span-2">
                  <Select name="po_id" required defaultValue="">
                    <option value="">— Select PO —</option>
                    {payablePOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_no} · {(po.suppliers as { name?: string } | null)?.name} ·{" "}
                        {fmtRM(po.total_amount)} ({po.status})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount (RM)" required>
                  <TextInput name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
                </Field>
                <Field label="Payment date">
                  <TextInput name="payment_date" type="date" defaultValue={today()} />
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

        <Card title="Customer Receipts">
          {!customerPays?.length ? (
            <EmptyState message="No customer payments recorded yet." />
          ) : (
            <Table headers={["Date", "Project", "Claim", "Amount", "Reference"]} rightAlign={[3]}>
              {(customerPays as (CustomerPayment & { projects?: { name?: string } })[]).map((p) => (
                <tr key={p.id}>
                  <Td>{fmtDate(p.payment_date)}</Td>
                  <Td>{p.projects?.name ?? "—"}</Td>
                  <Td>{p.progress_claims?.claim_no ?? "—"}</Td>
                  <Td right className="text-emerald-700 font-medium">
                    {fmtRM(p.amount)}
                  </Td>
                  <Td>{p.reference_no ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Supplier Payments">
          {!supplierPays?.length ? (
            <EmptyState message="No supplier payments recorded yet." />
          ) : (
            <Table headers={["Date", "Project", "PO", "Supplier", "Amount", "Reference"]} rightAlign={[4]}>
              {(supplierPays as (SupplierPayment & {
                projects?: { name?: string };
                purchase_orders?: { po_no?: string; suppliers?: { name?: string } };
              })[]).map((p) => (
                <tr key={p.id}>
                  <Td>{fmtDate(p.payment_date)}</Td>
                  <Td>{p.projects?.name ?? "—"}</Td>
                  <Td>{p.purchase_orders?.po_no ?? "—"}</Td>
                  <Td>{p.purchase_orders?.suppliers?.name ?? "—"}</Td>
                  <Td right className="text-rose-700 font-medium">
                    {fmtRM(p.amount)}
                  </Td>
                  <Td>{p.reference_no ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
