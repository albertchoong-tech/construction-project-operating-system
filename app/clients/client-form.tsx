import { ActionForm, Field, TextInput, TextArea } from "@/components/form";
import { saveClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";

export function ClientForm({ client }: { client?: Client }) {
  return (
    <ActionForm action={saveClient} submitLabel={client ? "Save Changes" : "Create Client"}>
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Client name" required className="sm:col-span-2">
          <TextInput name="name" defaultValue={client?.name} required placeholder="e.g. Tan Family" />
        </Field>
        <Field label="Contact person">
          <TextInput name="contact_person" defaultValue={client?.contact_person ?? ""} placeholder="e.g. Mr Tan Wei Liang" />
        </Field>
        <Field label="Phone">
          <TextInput name="phone" type="tel" defaultValue={client?.phone ?? ""} placeholder="+60…" />
        </Field>
        <Field label="Email">
          <TextInput name="email" type="email" defaultValue={client?.email ?? ""} placeholder="name@email.com" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <TextArea name="address" defaultValue={client?.address ?? ""} placeholder="Street, city, state" />
        </Field>
      </div>
    </ActionForm>
  );
}
