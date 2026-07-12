import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { fmtDate, fmtRM } from "@/lib/format";
import type { Quotation } from "@/lib/types";

/** Quotations that were converted into this project. */
export async function QuotationTab({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("*, clients(name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load quotations: {error.message}</p>
      </Card>
    );
  }

  const quotations = (data ?? []) as Quotation[];

  return (
    <Card
      title="Source Quotation"
      action={<LinkButton href="/quotations" variant="secondary">All quotations →</LinkButton>}
    >
      {!quotations.length ? (
        <EmptyState message="This project was not created from a quotation." />
      ) : (
        <Table headers={["Quotation", "Client", "Issued", "Total", "Status", ""]} rightAlign={[3]}>
          {quotations.map((q) => (
            <tr key={q.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/quotations/${q.id}`} className="font-medium text-slate-900 hover:underline">
                  {q.quotation_no}
                </Link>
                <span className="block text-xs text-slate-400">{q.title}</span>
              </Td>
              <Td>{q.clients?.name ?? "—"}</Td>
              <Td>{fmtDate(q.issue_date)}</Td>
              <Td right className="font-medium">
                {fmtRM(q.total_amount)}
              </Td>
              <Td>
                <StatusBadge status={q.status} />
              </Td>
              <Td right>
                <LinkButton href={`/quotations/${q.id}`} variant="secondary">
                  View / Print
                </LinkButton>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
