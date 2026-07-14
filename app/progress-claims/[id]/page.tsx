import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, LinkButton } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { fmtDate, fmtRM } from "@/lib/format";
import type { CustomerPayment, ProgressClaim } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClaimCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("progress_claims")
    .select("*, projects(name, project_code, address, clients(name, contact_person, address))")
    .eq("id", id)
    .single<ProgressClaim & { projects?: { name?: string; project_code?: string; address?: string; clients?: { name?: string; contact_person?: string; address?: string } } }>();
  if (!claim) notFound();

  const { data: payments } = await supabase
    .from("customer_payments")
    .select("*")
    .eq("claim_id", id)
    .order("payment_date", { ascending: false });

  const received = ((payments ?? []) as CustomerPayment[]).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const certified = Number(claim.approved_amount) || 0;
  const outstanding = Math.max(0, certified - received);
  const client = claim.projects?.clients;

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`Progress Claim ${claim.claim_no}`}
          subtitle={claim.projects?.name ?? ""}
          action={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={claim.status} />
              <LinkButton href={`/projects/${claim.project_id}?tab=claims`} variant="secondary">Open project</LinkButton>
              <PrintButton />
            </span>
          }
        />
      </div>

      <div className="print-sheet bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-10 max-w-3xl">
        <div className="flex flex-wrap justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-900">HSH ProjectOS</p>
            <p className="text-sm text-slate-500">Residential Construction & Renovation</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-900">
              {["approved", "paid"].includes(claim.status) ? "PAYMENT CERTIFICATE" : "PROGRESS CLAIM"}
            </p>
            <p className="text-sm text-slate-600">{claim.claim_no}</p>
            <p className="text-sm text-slate-500">Dated {fmtDate(claim.claim_date)}</p>
            <p className="text-sm text-slate-500">Period to {fmtDate(claim.period_end)}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">To (Client)</p>
            <p className="font-medium text-slate-900">{client?.name ?? "—"}</p>
            {client?.contact_person && <p className="text-sm text-slate-600">Attn: {client.contact_person}</p>}
            {client?.address && <p className="text-sm text-slate-600 whitespace-pre-line">{client.address}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Project</p>
            <p className="font-medium text-slate-900">{claim.projects?.name}</p>
            <p className="text-sm text-slate-600">{claim.projects?.project_code}</p>
            {claim.projects?.address && <p className="text-sm text-slate-600 whitespace-pre-line">{claim.projects.address}</p>}
          </div>
        </div>

        <table className="w-full text-sm border-t border-slate-200">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 text-slate-700">Amount claimed this period</td>
              <td className="py-3 text-right tabular-nums font-medium">{fmtRM(claim.claimed_amount)}</td>
            </tr>
            {["approved", "paid"].includes(claim.status) && (
              <tr>
                <td className="py-3 text-slate-700">Amount certified for payment</td>
                <td className="py-3 text-right tabular-nums font-medium">{fmtRM(certified)}</td>
              </tr>
            )}
            <tr>
              <td className="py-3 text-slate-700">Received to date</td>
              <td className="py-3 text-right tabular-nums">{fmtRM(received)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td className="py-3 font-semibold text-slate-900">
                {["approved", "paid"].includes(claim.status) ? "Balance now due" : "Amount claimed (pending certification)"}
              </td>
              <td className="py-3 text-right tabular-nums font-bold text-slate-900">
                {fmtRM(["approved", "paid"].includes(claim.status) ? outstanding : claim.claimed_amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {claim.notes && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{claim.notes}</p>
          </div>
        )}

        {payments && payments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Payments received against this claim</p>
            <ul className="text-sm text-slate-700 space-y-1">
              {(payments as CustomerPayment[]).map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{fmtDate(p.payment_date)} · {p.payment_method ?? "—"} {p.reference_no ? `· ${p.reference_no}` : ""}</span>
                  <span className="tabular-nums">{fmtRM(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-400">
          {["approved", "paid"].includes(claim.status)
            ? "This certificate confirms the amount certified for payment. Please settle the balance due by the agreed terms."
            : "This progress claim is pending certification. Figures are subject to review."}
          {" "}Amounts in Malaysian Ringgit (RM).
        </p>
      </div>
    </>
  );
}
