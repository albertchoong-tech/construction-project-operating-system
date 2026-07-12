import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, LinkButton } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { PrintButton } from "@/components/print-button";
import {
  submitQuotation,
  actionQuotation,
  convertQuotation,
} from "@/lib/actions/quotations";
import { fmtDate, fmtRM } from "@/lib/format";
import type { Quotation, QuotationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: quotation }, { data: items }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*, clients(*), projects(name)")
      .eq("id", id)
      .single<Quotation>(),
    supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", id)
      .order("created_at"),
  ]);
  if (!quotation) notFound();

  const lines = (items ?? []) as QuotationItem[];
  const total = lines.reduce((a, i) => a + (Number(i.total_amount) || 0), 0);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={quotation.quotation_no ?? "Quotation"}
          subtitle={quotation.title ?? ""}
          action={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={quotation.status} />
              <PrintButton />
              {quotation.status === "draft" && (
                <ActionButton
                  label="Submit for Approval"
                  variant="primary"
                  small={false}
                  action={submitQuotation.bind(null, id)}
                />
              )}
              {quotation.status === "submitted" && (
                <>
                  <ActionButton
                    label="Approve"
                    variant="approve"
                    promptRemarks
                    small={false}
                    action={async (remarks: string) => {
                      "use server";
                      return actionQuotation(id, "approved", remarks);
                    }}
                  />
                  <ActionButton
                    label="Reject"
                    variant="reject"
                    promptRemarks
                    small={false}
                    action={async (remarks: string) => {
                      "use server";
                      return actionQuotation(id, "rejected", remarks);
                    }}
                  />
                </>
              )}
              {quotation.status === "approved" && (
                <ActionButton
                  label="Convert to Project"
                  variant="approve"
                  small={false}
                  confirmMessage={`Create a project from this quotation? Lines become the BOQ and the contract value is set to ${fmtRM(total)}.`}
                  action={convertQuotation.bind(null, id)}
                />
              )}
              {quotation.status === "converted" && quotation.project_id && (
                <LinkButton href={`/projects/${quotation.project_id}`} variant="secondary">
                  Open project →
                </LinkButton>
              )}
            </span>
          }
        />
      </div>

      {/* Client-ready document */}
      <div className="print-sheet bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-10 max-w-3xl">
        <div className="flex flex-wrap justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-900">HSH ProjectOS</p>
            <p className="text-sm text-slate-500">Residential Construction & Renovation</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-900">QUOTATION</p>
            <p className="text-sm text-slate-600">{quotation.quotation_no}</p>
            <p className="text-sm text-slate-500">Issued {fmtDate(quotation.issue_date)}</p>
            {quotation.valid_until && (
              <p className="text-sm text-slate-500">Valid until {fmtDate(quotation.valid_until)}</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">To</p>
            <p className="font-medium text-slate-900">{quotation.clients?.name ?? "—"}</p>
            {quotation.clients?.contact_person && (
              <p className="text-sm text-slate-600">Attn: {quotation.clients.contact_person}</p>
            )}
            {quotation.clients?.address && (
              <p className="text-sm text-slate-600 whitespace-pre-line">{quotation.clients.address}</p>
            )}
            {quotation.clients?.phone && (
              <p className="text-sm text-slate-600">{quotation.clients.phone}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Project</p>
            <p className="font-medium text-slate-900">{quotation.title}</p>
            {quotation.status === "converted" && quotation.projects?.name && (
              <p className="text-sm text-slate-500 no-print">
                Converted to project:{" "}
                <Link href={`/projects/${quotation.project_id}`} className="underline">
                  {quotation.projects.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        <table className="w-full text-sm border-t border-slate-200">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="text-left py-2.5 pr-3">Section</th>
              <th className="text-left py-2.5 pr-3">Description</th>
              <th className="text-left py-2.5 pr-3">Unit</th>
              <th className="text-right py-2.5 pr-3">Qty</th>
              <th className="text-right py-2.5 pr-3">Rate (RM)</th>
              <th className="text-right py-2.5">Amount (RM)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.id} className="align-top">
                <td className="py-2.5 pr-3 text-slate-500">{line.section ?? "—"}</td>
                <td className="py-2.5 pr-3 text-slate-900">{line.description}</td>
                <td className="py-2.5 pr-3">{line.unit ?? "—"}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{Number(line.quantity)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{fmtRM(line.unit_rate)}</td>
                <td className="py-2.5 text-right tabular-nums font-medium">{fmtRM(line.total_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td colSpan={5} className="py-3 pr-3 text-right font-semibold text-slate-900">
                Total
              </td>
              <td className="py-3 text-right tabular-nums font-bold text-slate-900">{fmtRM(total)}</td>
            </tr>
          </tfoot>
        </table>

        {quotation.notes && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Notes / Terms
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{quotation.notes}</p>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-400">
          This quotation is valid until {quotation.valid_until ? fmtDate(quotation.valid_until) : "further notice"}.
          Prices in Malaysian Ringgit (RM).
        </p>
      </div>
    </>
  );
}
