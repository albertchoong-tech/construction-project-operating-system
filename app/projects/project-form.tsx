import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { saveProject } from "@/lib/actions/projects";
import type { Client, Project } from "@/lib/types";

export function ProjectForm({
  project,
  clients,
}: {
  project?: Project;
  clients: Pick<Client, "id" | "name">[];
}) {
  return (
    <ActionForm action={saveProject} submitLabel={project ? "Save Changes" : "Create Project"}>
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Project name" required className="sm:col-span-2">
          <TextInput name="name" defaultValue={project?.name} required placeholder="e.g. Tan Residence Renovation" />
        </Field>
        <Field label="Project code">
          <TextInput
            name="project_code"
            defaultValue={project?.project_code ?? ""}
            placeholder="Auto-generated if left blank"
          />
        </Field>
        <Field label="Client">
          <Select name="client_id" defaultValue={project?.client_id ?? ""}>
            <option value="">— No client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={project?.status ?? "active"}>
            <option value="quotation">Quotation</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        <Field label="Contract value (RM)">
          <TextInput
            name="contract_value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={project?.contract_value ?? ""}
            placeholder="0.00"
          />
        </Field>
        <Field label="Start date">
          <TextInput name="start_date" type="date" defaultValue={project?.start_date ?? ""} />
        </Field>
        <Field label="End date">
          <TextInput name="end_date" type="date" defaultValue={project?.end_date ?? ""} />
        </Field>
        <Field label="Project manager">
          <TextInput name="project_manager" defaultValue={project?.project_manager ?? ""} placeholder="Name" />
        </Field>
        <Field label="Site address" className="sm:col-span-2">
          <TextArea name="address" defaultValue={project?.address ?? ""} placeholder="Street, city, state" />
        </Field>
      </div>
    </ActionForm>
  );
}
