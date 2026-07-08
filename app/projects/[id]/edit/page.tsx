import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ProjectForm } from "../../project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("clients").select("id, name").order("name"),
  ]);
  if (!project) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${project.name}`} />
      <Card>
        <ProjectForm project={project} clients={clients ?? []} />
      </Card>
    </div>
  );
}
