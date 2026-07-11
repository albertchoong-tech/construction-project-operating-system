import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { PageHeader, Card, Table, Td, EmptyState, StatCard } from "@/components/ui";
import { ActionForm, Field, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { RoleSelect } from "@/components/role-select";
import {
  updateUserRole,
  setUserActive,
  addMembership,
  removeMembership,
} from "@/lib/actions/team";
import { ROLE_LABELS, isValidRole, type Role } from "@/lib/roles";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  active: boolean;
  created_at: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  project_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
  projects: { name: string; project_code: string | null } | null;
};

export default async function TeamPage() {
  const supabase = await createClient();
  const me = await getSessionProfile();
  const [{ data: users, error }, { data: memberships }, { data: projects }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase
        .from("project_members")
        .select("id, user_id, project_id, profiles(full_name, email), projects(name, project_code)")
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name, project_code")
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    return (
      <>
        <PageHeader title="Team" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load team: {error.message}</p>
        </Card>
      </>
    );
  }

  const team = (users ?? []) as ProfileRow[];
  const rows = (memberships ?? []) as unknown as MembershipRow[];
  const membershipCount = new Map<string, number>();
  for (const m of rows) {
    membershipCount.set(m.user_id, (membershipCount.get(m.user_id) ?? 0) + 1);
  }
  const scopedRoles: Role[] = ["project_manager", "site_supervisor"];

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Roles, account access and project assignments — new sign-ups start as Site Supervisor until you promote them"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Team Members" value={String(team.length)} />
        <StatCard label="Active" value={String(team.filter((u) => u.active).length)} />
        <StatCard
          label="Directors"
          value={String(team.filter((u) => u.role === "director" && u.active).length)}
        />
      </div>

      <div className="space-y-6">
        <Card title="Members">
          {!team.length ? (
            <EmptyState message="No team members yet." />
          ) : (
            <Table headers={["Member", "Role", "Assigned Projects", "Status", "Joined", "Actions"]}>
              {team.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 align-top ${u.active ? "" : "opacity-60"}`}>
                  <Td>
                    <span className="font-medium text-slate-900">
                      {u.full_name || "—"}
                      {u.id === me?.userId && (
                        <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-400">{u.email}</span>
                  </Td>
                  <Td>
                    <RoleSelect
                      currentRole={isValidRole(u.role) ? u.role : "site_supervisor"}
                      action={updateUserRole.bind(null, u.id)}
                    />
                  </Td>
                  <Td>
                    {scopedRoles.includes(u.role)
                      ? `${membershipCount.get(u.id) ?? 0} project(s)`
                      : "All projects (role-wide)"}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        u.active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {u.active ? "Active" : "Deactivated"}
                    </span>
                  </Td>
                  <Td>{fmtDate(u.created_at)}</Td>
                  <Td>
                    {u.active ? (
                      <ActionButton
                        label="Deactivate"
                        variant="danger"
                        confirmMessage={`Deactivate ${u.full_name || u.email}? They will be signed out and lose all access until reactivated.`}
                        action={setUserActive.bind(null, u.id, false)}
                      />
                    ) : (
                      <ActionButton
                        label="Reactivate"
                        variant="approve"
                        action={setUserActive.bind(null, u.id, true)}
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Project Assignments — Project Managers & Site Supervisors">
          <p className="text-sm text-slate-500 mb-4">
            PMs and Supervisors only see and work on their assigned projects. Directors, QS,
            Finance and Purchasing have company-wide access by role.
          </p>
          <ActionForm action={addMembership} submitLabel="Assign to Project">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Team member" required>
                <Select name="user_id" required defaultValue="">
                  <option value="">— Select member —</option>
                  {team
                    .filter((u) => u.active && scopedRoles.includes(u.role))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} · {ROLE_LABELS[u.role]}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Project" required>
                <Select name="project_id" required defaultValue="">
                  <option value="">— Select project —</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code ? `${p.project_code} · ` : ""}
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </ActionForm>

          <div className="mt-6">
            {!rows.length ? (
              <EmptyState message="No project assignments yet." />
            ) : (
              <Table headers={["Member", "Project", ""]}>
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <Td>{m.profiles?.full_name || m.profiles?.email || "—"}</Td>
                    <Td>
                      {m.projects?.project_code ? `${m.projects.project_code} · ` : ""}
                      {m.projects?.name ?? "—"}
                    </Td>
                    <Td right>
                      <ActionButton
                        label="Remove"
                        variant="danger"
                        confirmMessage={`Remove ${m.profiles?.full_name || "this member"} from ${m.projects?.name}? They will lose access to it immediately.`}
                        action={removeMembership.bind(null, m.id)}
                      />
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
