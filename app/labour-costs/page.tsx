import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, EmptyState, StatCard } from "@/components/ui";
import { ActionForm, Field, TextInput, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { addLabourCost, deleteLabourCost } from "@/lib/actions/labour";
import { fmtDate, fmtRM, today } from "@/lib/format";
import type { LabourCost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LabourCostsPage() {
  const supabase = await createClient();
  const [{ data: entries, error }, { data: projects }] = await Promise.all([
    supabase
      .from("labour_costs")
      .select("*, projects(name, project_code)")
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("projects")
      .select("id, name, project_code")
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="Labour Cost" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load labour costs: {error.message}</p>
        </Card>
      </>
    );
  }

  const rows = (entries ?? []) as LabourCost[];
  const total = rows.reduce((a, r) => a + (Number(r.total_cost) || 0), 0);
  const statutory = rows.reduce(
    (a, r) =>
      a +
      (Number(r.epf) || 0) +
      (Number(r.socso) || 0) +
      (Number(r.eis) || 0) +
      (Number(r.pcb) || 0),
    0,
  );
  const byProject = new Map<string, { name: string; total: number }>();
  for (const r of rows) {
    const key = r.project_id;
    const entry = byProject.get(key) ?? { name: r.projects?.name ?? "—", total: 0 };
    entry.total += Number(r.total_cost) || 0;
    byProject.set(key, entry);
  }

  return (
    <>
      <PageHeader
        title="Labour Cost"
        subtitle="Wages, overtime and statutory contributions — flows into each project's cost and margin"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Labour Cost" value={fmtRM(total)} hint="All recorded entries" />
        <StatCard label="Statutory (EPF/SOCSO/EIS/PCB)" value={fmtRM(statutory)} />
        <StatCard label="Entries" value={String(rows.length)} />
      </div>

      <div className="space-y-6">
        <Card title="Record Labour Cost">
          <ActionForm action={addLabourCost} submitLabel="Save Entry">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Project" required className="col-span-2">
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
              <Field label="Worker / staff name" required>
                <TextInput name="worker_name" required placeholder="Name" />
              </Field>
              <Field label="Work date">
                <TextInput name="work_date" type="date" defaultValue={today()} />
              </Field>
              <Field label="Period (optional)">
                <TextInput name="period" placeholder="e.g. July 2026 · Week 2" />
              </Field>
              <Field label="Basic wages (RM)">
                <TextInput name="basic_wages" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="Overtime (RM)">
                <TextInput name="overtime" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="Allowance (RM)">
                <TextInput name="allowance" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="EPF (RM)">
                <TextInput name="epf" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="SOCSO (RM)">
                <TextInput name="socso" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="EIS (RM)">
                <TextInput name="eis" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="PCB / tax (RM)">
                <TextInput name="pcb" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="Other payroll cost (RM)">
                <TextInput name="other_cost" type="number" step="0.01" min="0" placeholder="0.00" />
              </Field>
              <Field label="Remarks" className="col-span-2 sm:col-span-3">
                <TextInput name="remarks" placeholder="e.g. Overtime for slab casting" />
              </Field>
            </div>
            <p className="text-xs text-slate-400">
              Total labour cost is calculated automatically (basic + OT + allowance + EPF + SOCSO +
              EIS + PCB + other).
            </p>
          </ActionForm>
        </Card>

        <Card title="Labour Cost by Project">
          {!byProject.size ? (
            <EmptyState message="No labour costs recorded yet." />
          ) : (
            <Table headers={["Project", "Total Labour Cost"]} rightAlign={[1]}>
              {[...byProject.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([id, p]) => (
                  <tr key={id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/projects/${id}`} className="font-medium text-slate-900 hover:underline">
                        {p.name}
                      </Link>
                    </Td>
                    <Td right className="font-medium">
                      {fmtRM(p.total)}
                    </Td>
                  </tr>
                ))}
            </Table>
          )}
        </Card>

        <Card title="Entries">
          {!rows.length ? (
            <EmptyState message="No labour cost entries yet. Add the first one above." />
          ) : (
            <Table
              headers={["Date / Period", "Project", "Worker", "Basic", "OT", "Allow.", "EPF", "SOCSO", "EIS", "PCB", "Other", "Total", ""]}
              rightAlign={[3, 4, 5, 6, 7, 8, 9, 10, 11]}
            >
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>
                    {fmtDate(r.work_date)}
                    {r.period && <span className="block text-xs text-slate-400">{r.period}</span>}
                  </Td>
                  <Td className="whitespace-normal max-w-40">{r.projects?.name ?? "—"}</Td>
                  <Td>{r.worker_name}</Td>
                  <Td right>{fmtRM(r.basic_wages)}</Td>
                  <Td right>{fmtRM(r.overtime)}</Td>
                  <Td right>{fmtRM(r.allowance)}</Td>
                  <Td right>{fmtRM(r.epf)}</Td>
                  <Td right>{fmtRM(r.socso)}</Td>
                  <Td right>{fmtRM(r.eis)}</Td>
                  <Td right>{fmtRM(r.pcb)}</Td>
                  <Td right>{fmtRM(r.other_cost)}</Td>
                  <Td right className="font-semibold">
                    {fmtRM(r.total_cost)}
                  </Td>
                  <Td right>
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete labour entry for ${r.worker_name}?`}
                      action={deleteLabourCost.bind(null, r.id, r.project_id)}
                    />
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
