import { PageHeader, Card } from "@/components/ui";
import { ClientForm } from "../client-form";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New Client" subtitle="Add a client to link projects and quotations to" />
      <Card>
        <ClientForm />
      </Card>
    </div>
  );
}
