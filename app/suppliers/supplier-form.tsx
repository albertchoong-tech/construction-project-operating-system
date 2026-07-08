import { ActionForm, Field, TextInput } from "@/components/form";
import { saveSupplier } from "@/lib/actions/suppliers";
import type { Supplier } from "@/lib/types";

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  return (
    <ActionForm action={saveSupplier} submitLabel={supplier ? "Save Changes" : "Create Supplier"}>
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier name" required className="sm:col-span-2">
          <TextInput name="name" defaultValue={supplier?.name} required placeholder="e.g. BuildMat Sdn Bhd" />
        </Field>
        <Field label="Category">
          <TextInput name="category" defaultValue={supplier?.category ?? ""} placeholder="e.g. Building Materials" />
        </Field>
        <Field label="Contact person">
          <TextInput name="contact_person" defaultValue={supplier?.contact_person ?? ""} placeholder="Name" />
        </Field>
        <Field label="Phone">
          <TextInput name="phone" defaultValue={supplier?.phone ?? ""} placeholder="+60…" />
        </Field>
        <Field label="Email">
          <TextInput name="email" type="email" defaultValue={supplier?.email ?? ""} placeholder="sales@supplier.com" />
        </Field>
      </div>
    </ActionForm>
  );
}
