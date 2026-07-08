import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, TextInput, Select } from "@/components/form";
import { recordSupplierPayment } from "@/lib/actions/financial";
import { fmtDate, fmtRM, today } from "@/lib/format";
import type { CustomerPayment, SupplierPayment } from "@/lib/types";

export async function PaymentsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [{ data: customerPays }, { data: supplierPays }, { data: pos }] = await Promise.all([
    supabase
      .from("customer_payments")
      .select("*, progress_claims(claim_no)")
      .eq("project_id", projectId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select("*, purchase_orders(po_no, suppliers(name))")
      .eq("project_id", projectId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("id, po_no, total_amount, status, suppliers(name)")
      .eq("project_id", projectId)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
  ]);

  const received = (customerPays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const paidOut = (supplierPays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Money In — Customer Receipts"
          action={<span className="text-sm font-semibold text-emerald-600 tabular-nums">{fmtRM(received)}</span>}
        >
          {!customerPays?.length ? (
            <EmptyState message="No customer payments yet. Record receipts from the Claims tab." />
          ) : (
            <Table headers={["Date", "Claim", "Amount", "Reference"]} rightAlign={[2]}>
              {(customerPays as CustomerPayment[]).map((p) => (
                <tr key={p.id}>
                  <Td>{fmtDate(p.payment_date)}</Td>
                  <Td>{p.progress_claims?.claim_no ?? "—"}</Td>
                  <Td right>{fmtRM(p.amount)}</Td>
                  <Td>{p.reference_no ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card
          title="Money Out — Supplier Payments"
          action={<span className="text-sm font-semibold text-rose-600 tabular-nums">{fmtRM(paidOut)}</span>}
        >
          {!supplierPays?.length ? (
            <EmptyState message="No supplier payments recorded yet." />
          ) : (
            <Table headers={["Date", "PO", "Supplier", "Amount", "Reference"]} rightAlign={[3]}>
              {(supplierPays as (SupplierPayment & { purchase_orders?: { po_no?: string; suppliers?: { name?: string } } })[]).map(
                (p) => (
                  <tr key={p.id}>
                    <Td>{fmtDate(p.payment_date)}</Td>
                    <Td>{p.purchase_orders?.po_no ?? "—"}</Td>
                    <Td>{p.purchase_orders?.suppliers?.name ?? "—"}</Td>
                    <Td right>{fmtRM(p.amount)}</Td>
                    <Td>{p.reference_no ?? "—"}</Td>
                  </tr>
                ),
              )}
            </Table>
          )}
        </Card>
      </div>

      <Card title="Record Supplier Payment">
        {!pos?.length ? (
          <p className="text-sm text-slate-500">
            No approved purchase orders to pay against yet.
          </p>
        ) : (
          <ActionForm action={recordSupplierPayment} submitLabel="Record Payment">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Purchase order" required>
                <Select name="po_id" required defaultValue="">
                  <option value="">— Select PO —</option>
                  {pos.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_no} · {(po.suppliers as { name?: string } | null)?.name ?? "—"} ·{" "}
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
              <Field label="Reference no." className="sm:col-span-2">
                <TextInput name="reference_no" placeholder="TT-…" />
              </Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
