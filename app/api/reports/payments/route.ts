import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Combined money-in / money-out export within an optional date range. */
export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !["director", "finance"].includes(profile.role))
    return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createClient();
  const applyRange = <T>(q: T): T => {
    let query = q as { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T };
    if (from) query = query.gte("payment_date", from) as typeof query;
    if (to) query = query.lte("payment_date", to) as typeof query;
    return query as T;
  };

  const [{ data: cust }, { data: supp }] = await Promise.all([
    applyRange(
      supabase
        .from("customer_payments")
        .select("payment_date, amount, payment_method, reference_no, projects(name), progress_claims(claim_no)")
        .order("payment_date", { ascending: false }),
    ),
    applyRange(
      supabase
        .from("supplier_payments")
        .select("payment_date, amount, payment_method, reference_no, projects(name), purchase_orders(po_no)")
        .order("payment_date", { ascending: false }),
    ),
  ]);

  const rows: (string | number | null | undefined)[][] = [];
  for (const p of (cust ?? []) as Record<string, unknown>[]) {
    rows.push([
      p.payment_date as string, "Money In (Receipt)",
      (p.projects as { name?: string } | null)?.name,
      (p.progress_claims as { claim_no?: string } | null)?.claim_no,
      p.amount as number, p.payment_method as string, p.reference_no as string,
    ]);
  }
  for (const p of (supp ?? []) as Record<string, unknown>[]) {
    rows.push([
      p.payment_date as string, "Money Out (Supplier)",
      (p.projects as { name?: string } | null)?.name,
      (p.purchase_orders as { po_no?: string } | null)?.po_no,
      -(Number(p.amount) || 0), p.payment_method as string, p.reference_no as string,
    ]);
  }
  rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));

  const csv = toCsv(
    ["Date", "Direction", "Project", "Reference Doc", "Amount (RM)", "Method", "Reference No"],
    rows,
  );
  return csvResponse("payments.csv", csv);
}
