import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { SupplierForm } from "../../supplier-form";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (!supplier) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${supplier.name}`} />
      <Card>
        <SupplierForm supplier={supplier} />
      </Card>
    </div>
  );
}
