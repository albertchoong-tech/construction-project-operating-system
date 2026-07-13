import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatCard } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { fmtDate, fmtRM } from "@/lib/format";

export const dynamic = "force-dynamic";

function monthBounds(month: string): { start: string; end: string; label: string } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // last day of month
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: iso(start),
    end: iso(end),
    label: start.toLocaleDateString("en-MY", { month: "long", year: "numeric" }),
  };
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month = new Date().toISOString().slice(0, 7) } = await searchParams;
  const { start, end, label } = monthBounds(month);
  const supabase = await createClient();

  const [{ data: receipts }, { data: supplierPays }, { data: claims }, { data: allReceipts }, { data: allApprovedClaims }, { data: allActualPos }, { data: allSupplierPays }] =
    await Promise.all([
      supabase.from("customer_payments").select("amount, payment_date, reference_no, projects(name)").gte("payment_date", start).lte("payment_date", end),
      supabase.from("supplier_payments").select("amount, payment_date, reference_no, projects(name), purchase_orders(po_no)").gte("payment_date", start).lte("payment_date", end),
      supabase.from("progress_claims").select("claim_no, claim_date, claimed_amount, approved_amount, status, projects(name)").gte("claim_date", start).lte("claim_date", end),
      supabase.from("customer_payments").select("amount"),
      supabase.from("progress_claims").select("approved_amount, status").in("status", ["approved", "paid"]),
      supabase.from("purchase_orders").select("total_amount, status").in("status", ["delivered", "invoiced", "paid"]),
      supabase.from("supplier_payments").select("amount"),
    ]);

  const sum = (rows: { amount?: number | null }[] | null) =>
    (rows ?? []).reduce((a, r) => a + (Number(r.amount) || 0), 0);

  const moneyIn = sum(receipts);
  const moneyOut = sum(supplierPays);
  const claimsRaised = (claims ?? []).reduce((a, c) => a + (Number(c.claimed_amount) || 0), 0);
  const claimsCertified = (claims ?? [])
    .filter((c) => ["approved", "paid"].includes(c.status))
    .reduce((a, c) => a + (Number(c.approved_amount) || 0), 0);

  // Snapshot balances (all-time, as of now)
  const totalReceived = sum(allReceipts);
  const totalApprovedClaims = (allApprovedClaims ?? []).reduce((a, c) => a + (Number(c.approved_amount) || 0), 0);
  const totalActualCost = (allActualPos ?? []).reduce((a, p) => a + (Number(p.total_amount) || 0), 0);
  const totalSupplierPaid = sum(allSupplierPays);
  const outstandingReceivable = Math.max(0, totalApprovedClaims - totalReceived);
  const outstandingPayable = Math.max(0, totalActualCost - totalSupplierPaid);

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return d.toISOString().slice(0, 7);
  })();
  const nextMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    return d.toISOString().slice(0, 7);
  })();

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Monthly Financial Report"
          subtitle={label}
          action={
            <span className="flex flex-wrap items-center gap-2">
              <a href={`/reports/monthly?month=${prevMonth}`} className="min-h-11 lg:min-h-0 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">← Prev</a>
              <a href={`/reports/monthly?month=${nextMonth}`} className="min-h-11 lg:min-h-0 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Next →</a>
              <a href={`/api/reports/payments?from=${start}&to=${end}`} className="min-h-11 lg:min-h-0 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Payments CSV</a>
              <PrintButton />
            </span>
          }
        />
      </div>

      <div className="print-sheet space-y-6">
        <div className="hidden print:block mb-4">
          <p className="text-xl font-bold">HSH ProjectOS — Monthly Financial Report</p>
          <p className="text-sm text-slate-500">{label} · {fmtDate(start)} to {fmtDate(end)}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Money In (Receipts)" value={fmtRM(moneyIn)} tone="good" hint={label} />
          <StatCard label="Money Out (Suppliers)" value={fmtRM(moneyOut)} tone="bad" hint={label} />
          <StatCard label="Net Cash Movement" value={fmtRM(moneyIn - moneyOut)} tone={moneyIn - moneyOut >= 0 ? "good" : "bad"} hint={label} />
          <StatCard label="Claims Certified" value={fmtRM(claimsCertified)} hint={`Raised ${fmtRM(claimsRaised)}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Outstanding Position (as of today)">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Outstanding receivables</dt><dd className="font-medium tabular-nums text-amber-600">{fmtRM(outstandingReceivable)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Outstanding payables</dt><dd className="font-medium tabular-nums text-amber-600">{fmtRM(outstandingPayable)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5"><dt className="font-medium text-slate-700">Net working position</dt><dd className={`font-semibold tabular-nums ${outstandingReceivable - outstandingPayable >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtRM(outstandingReceivable - outstandingPayable)}</dd></div>
            </dl>
          </Card>
          <Card title="Progress Claims This Month">
            {!claims?.length ? (
              <EmptyState message="No claims dated in this month." />
            ) : (
              <Table headers={["Claim", "Project", "Claimed", "Certified"]} rightAlign={[2, 3]}>
                {claims.map((c, i) => (
                  <tr key={i}>
                    <Td>{c.claim_no}</Td>
                    <Td>{(c.projects as { name?: string } | null)?.name ?? "—"}</Td>
                    <Td right>{fmtRM(c.claimed_amount)}</Td>
                    <Td right>{c.approved_amount ? fmtRM(c.approved_amount) : "—"}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <Card title="Money In — Customer Receipts">
          {!receipts?.length ? (
            <EmptyState message="No receipts in this month." />
          ) : (
            <Table headers={["Date", "Project", "Reference", "Amount"]} rightAlign={[3]}>
              {receipts.map((p, i) => (
                <tr key={i}>
                  <Td>{fmtDate(p.payment_date)}</Td>
                  <Td>{(p.projects as { name?: string } | null)?.name ?? "—"}</Td>
                  <Td>{p.reference_no ?? "—"}</Td>
                  <Td right className="text-emerald-700 font-medium">{fmtRM(p.amount)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Money Out — Supplier Payments">
          {!supplierPays?.length ? (
            <EmptyState message="No supplier payments in this month." />
          ) : (
            <Table headers={["Date", "Project", "PO", "Reference", "Amount"]} rightAlign={[4]}>
              {supplierPays.map((p, i) => (
                <tr key={i}>
                  <Td>{fmtDate(p.payment_date)}</Td>
                  <Td>{(p.projects as { name?: string } | null)?.name ?? "—"}</Td>
                  <Td>{(p.purchase_orders as { po_no?: string } | null)?.po_no ?? "—"}</Td>
                  <Td>{p.reference_no ?? "—"}</Td>
                  <Td right className="text-rose-700 font-medium">{fmtRM(p.amount)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
