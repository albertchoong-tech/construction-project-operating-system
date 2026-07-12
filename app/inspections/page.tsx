import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { PageHeader, Card, Table, Td, EmptyState, StatusBadge, LinkButton } from "@/components/ui";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { IssueCategoryField } from "@/components/issue-category-field";
import { PhotoField } from "@/components/photo-field";
import { addInspection } from "@/lib/actions/site";
import { fmtDate, today } from "@/lib/format";
import type { InspectionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InspectionsPage() {
  const supabase = await createClient();
  const [{ data: inspections, error }, { data: projects }, profile] = await Promise.all([
    supabase
      .from("inspection_records")
      .select("*, projects(name, project_code)")
      .order("inspection_date", { ascending: false })
      .limit(50),
    supabase
      .from("projects")
      .select("id, name, project_code")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    getSessionProfile(),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="Inspections" />
        <Card>
          <p className="text-sm text-rose-600">Failed to load inspections: {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Inspections"
        subtitle="Record site inspections with photos — fast entry from the field"
      />

      <div className="space-y-6">
        <Card title="New Inspection">
          <ActionForm action={addInspection} submitLabel="Save Inspection" draftKey="inspection-quick">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Field label="Area inspected">
                <TextInput name="area" placeholder="e.g. Wet areas, Level 2" />
              </Field>
              <Field label="Result">
                <Select name="result" defaultValue="pass">
                  <option value="pass">Pass</option>
                  <option value="conditional">Conditional</option>
                  <option value="fail">Fail</option>
                </Select>
              </Field>
              <Field label="Inspection date">
                <TextInput name="inspection_date" type="date" defaultValue={today()} />
              </Field>
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IssueCategoryField />
              </div>
              <PhotoField label="Photos" className="sm:col-span-2" />
              <Field label="Remarks" className="sm:col-span-2">
                <TextArea name="remarks" placeholder="Findings, follow-up actions…" />
              </Field>
              <Field label="Inspector" className="sm:col-span-2">
                <TextInput name="inspector" defaultValue={profile?.fullName ?? ""} placeholder="Name / authority" />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card title="Recent Inspections">
          {!inspections?.length ? (
            <EmptyState message="No inspections recorded yet. Add the first one above." />
          ) : (
            <Table headers={["Date", "Project", "Area", "Result", "Issue Category", "Remarks", ""]}>
              {(inspections as (InspectionRecord & { projects?: { name?: string } })[]).map((i) => (
                <tr key={i.id} className="hover:bg-slate-50 align-top">
                  <Td>{fmtDate(i.inspection_date)}</Td>
                  <Td>
                    <Link href={`/projects/${i.project_id}?tab=inspections`} className="hover:underline">
                      {i.projects?.name ?? "—"}
                    </Link>
                  </Td>
                  <Td>{i.area ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={i.result} />
                  </Td>
                  <Td className="whitespace-normal max-w-48">
                    {i.issue_category
                      ? i.issue_category === "Others" && i.issue_detail
                        ? `Others — ${i.issue_detail}`
                        : i.issue_category
                      : "—"}
                  </Td>
                  <Td className="whitespace-normal max-w-md">{i.remarks ?? "—"}</Td>
                  <Td right>
                    <LinkButton href={`/inspections/${i.id}/edit`} variant="secondary">
                      Edit
                    </LinkButton>
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
