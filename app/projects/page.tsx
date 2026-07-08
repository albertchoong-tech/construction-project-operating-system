import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { fmtRM, fmtPct } from "@/lib/format";
import type { Project } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Projects" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load projects: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="All construction projects from quotation to completion"
        action={<LinkButton href="/projects/new">+ New Project</LinkButton>}
      />
      <Card>
        {!projects?.length ? (
          <EmptyState
            message="No projects yet."
            action={<LinkButton href="/projects/new">Create your first project</LinkButton>}
          />
        ) : (
          <Table
            headers={["Code", "Project", "Client", "Status", "Contract Value", "Completion"]}
            rightAlign={[4, 5]}
          >
            {(projects as Project[]).map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td className="text-slate-500">{p.project_code ?? "—"}</Td>
                <Td>
                  <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                    {p.name}
                  </Link>
                </Td>
                <Td>{p.clients?.name ?? "—"}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td right>{fmtRM(p.contract_value)}</Td>
                <Td right>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <span
                        className="block h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Number(p.completion_pct) || 0)}%` }}
                      />
                    </span>
                    {fmtPct(p.completion_pct)}
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
