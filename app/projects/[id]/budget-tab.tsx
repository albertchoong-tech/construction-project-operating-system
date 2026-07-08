import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, TextInput } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { addBudget, deleteBudget } from "@/lib/actions/boq";
import { fmtRM } from "@/lib/format";
import type { ProjectFinancials } from "@/lib/financials";
import type { Budget } from "@/lib/types";

export async function BudgetTab({
  projectId,
  fin,
}: {
  projectId: string;
  fin: ProjectFinancials;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");

  if (error) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Failed to load budget: {error.message}</p>
      </Card>
    );
  }

  const budgets = (data ?? []) as Budget[];
  const totalBudget = budgets.reduce((a, b) => a + (Number(b.budgeted_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <Card
        title="Budget Categories"
        action={
          <span className="text-sm text-slate-500">
            Committed from POs:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{fmtRM(fin.committedCost)}</span>
          </span>
        }
      >
        {!budgets.length ? (
          <EmptyState message="No budget categories yet. Add the first one below." />
        ) : (
          <Table headers={["Category", "Budgeted (RM)", "Recorded Actual (RM)", "Variance", ""]} rightAlign={[1, 2, 3]}>
            {budgets.map((b) => {
              const variance = (Number(b.budgeted_amount) || 0) - (Number(b.actual_amount) || 0);
              return (
                <tr key={b.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{b.category}</Td>
                  <Td right>{fmtRM(b.budgeted_amount)}</Td>
                  <Td right>{fmtRM(b.actual_amount)}</Td>
                  <Td right className={variance < 0 ? "text-rose-600 font-medium" : "text-emerald-600"}>
                    {fmtRM(variance)}
                  </Td>
                  <Td right>
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete budget category "${b.category}"?`}
                      action={deleteBudget.bind(null, b.id, projectId)}
                    />
                  </Td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-semibold">
              <Td>Total</Td>
              <Td right>{fmtRM(totalBudget)}</Td>
              <Td right>{fmtRM(budgets.reduce((a, b) => a + (Number(b.actual_amount) || 0), 0))}</Td>
              <Td right>{""}</Td>
              <Td right>{""}</Td>
            </tr>
          </Table>
        )}
      </Card>

      <Card title="Add Budget Category">
        <ActionForm action={addBudget} submitLabel="Add Category">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Category" required>
              <TextInput name="category" required placeholder="e.g. Materials" />
            </Field>
            <Field label="Budgeted amount (RM)">
              <TextInput name="budgeted_amount" type="number" step="0.01" min="0" placeholder="0.00" />
            </Field>
            <Field label="Actual to date (RM)">
              <TextInput name="actual_amount" type="number" step="0.01" min="0" placeholder="0.00" />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
