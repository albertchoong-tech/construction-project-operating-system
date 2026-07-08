import { PageHeader, Card } from "@/components/ui";
import { SupplierForm } from "../supplier-form";

export default function NewSupplierPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New Supplier" />
      <Card>
        <SupplierForm />
      </Card>
    </div>
  );
}
