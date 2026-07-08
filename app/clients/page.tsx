import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { deleteClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Clients" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load clients: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Property owners and companies you build for"
        action={<LinkButton href="/clients/new">+ New Client</LinkButton>}
      />
      <Card>
        {!clients?.length ? (
          <EmptyState
            message="No clients yet."
            action={<LinkButton href="/clients/new">Create your first client</LinkButton>}
          />
        ) : (
          <Table headers={["Name", "Contact Person", "Phone", "Email", "Address", ""]}>
            {(clients as Client[]).map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/clients/${c.id}/edit`} className="font-medium text-slate-900 hover:underline">
                    {c.name}
                  </Link>
                </Td>
                <Td>{c.contact_person ?? "—"}</Td>
                <Td>{c.phone ?? "—"}</Td>
                <Td>{c.email ?? "—"}</Td>
                <Td className="max-w-56 truncate whitespace-normal">{c.address ?? "—"}</Td>
                <Td right>
                  <span className="flex justify-end gap-2">
                    <LinkButton href={`/clients/${c.id}/edit`} variant="secondary">
                      Edit
                    </LinkButton>
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete client "${c.name}"?`}
                      action={deleteClient.bind(null, c.id)}
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
