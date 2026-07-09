import { getPortfolioSnapshot } from "@/lib/portfolio";
import { PageHeader, Card, Table, Td, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";
import { fmtRM, fmtPct } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let snapshot;
  try {
    snapshot = await getPortfolioSnapshot();
  } catch (e) {
    return (
      <>
        <PageHeader title="Projects" />
        <Card>
          <p className="text-sm text-rose-600">
            Failed to load projects: {e instanceof Error ? e.message : "unknown error"}
          </p>
        </Card>
      </>
    );
  }
  const { projects, perProject } = snapshot;

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="All construction projects from quotation to completion"
        action={<LinkButton href="/projects/new">+ New Project</LinkButton>}
      />
      <Card>
        {!projects.length ? (
          <EmptyState
            message="No projects yet."
            action={<LinkButton href="/projects/new">Create your first project</LinkButton>}
          />
        ) : (
          <Table
            headers={["Code", "Project", "Client", "Status", "Health", "Contract Value", "Completion"]}
            rightAlign={[5, 6]}
          >
            {projects.map((p) => {
              const snap = perProject.get(p.id);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="text-slate-500">{p.project_code ?? "—"}</Td>
                  <Td>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                  </Td>
                  <Td>{(p.clients as { name?: string } | null)?.name ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>{snap ? <HealthBadge health={snap.health} /> : "—"}</Td>
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
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
