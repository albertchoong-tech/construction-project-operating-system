import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ProjectForm } from "../project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Project" subtitle="Open a new construction project" />
      <Card>
        <ProjectForm clients={clients ?? []} />
      </Card>
    </div>
  );
}
