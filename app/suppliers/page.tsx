import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { deleteSupplier } from "@/lib/actions/suppliers";
import type { Supplier } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  if (error) {
    return (
      <>
        <PageHeader title="Suppliers" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load suppliers: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Material and service suppliers for purchase orders"
        action={<LinkButton href="/suppliers/new">+ New Supplier</LinkButton>}
      />
      <Card>
        {!suppliers?.length ? (
          <EmptyState
            message="No suppliers yet."
            action={<LinkButton href="/suppliers/new">Create your first supplier</LinkButton>}
          />
        ) : (
          <Table headers={["Name", "Category", "Contact Person", "Phone", "Email", ""]}>
            {(suppliers as Supplier[]).map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/suppliers/${s.id}/edit`} className="font-medium text-slate-900 hover:underline">
                    {s.name}
                  </Link>
                </Td>
                <Td>{s.category ?? "—"}</Td>
                <Td>{s.contact_person ?? "—"}</Td>
                <Td>{s.phone ?? "—"}</Td>
                <Td>{s.email ?? "—"}</Td>
                <Td right>
                  <span className="flex justify-end gap-2">
                    <LinkButton href={`/suppliers/${s.id}/edit`} variant="secondary">
                      Edit
                    </LinkButton>
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete supplier "${s.name}"?`}
                      action={deleteSupplier.bind(null, s.id)}
                    />
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
