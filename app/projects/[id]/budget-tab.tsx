import { createClient } from "@/lib/supabase/server";
import { Card, Table, Td, EmptyState } from "@/components/ui";
import { ActionForm, Field, TextInput, Select } from "@/components/form";
import { ActionButton } from "@/components/action-button";
import { addBudget, deleteBudget } from "@/lib/actions/boq";
import { COST_CATEGORIES } from "@/lib/categories";
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

      <Card
        title="Cost by Category"
        action={
          <span className="text-sm text-slate-500">
            Total committed:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              {fmtRM(fin.committedCost)}
            </span>
          </span>
        }
      >
        {!Object.keys(fin.costByCategory).length ? (
          <EmptyState message="No costs recorded yet — costs appear here from POs (by cost centre) and the Labour Cost module." />
        ) : (
          <Table headers={["Cost Centre", "Committed (RM)", "Actual (RM)", "Share"]} rightAlign={[1, 2, 3]}>
            {COST_CATEGORIES.filter((c) => fin.costByCategory[c.key]).map((c) => {
              const entry = fin.costByCategory[c.key];
              const share = fin.committedCost > 0 ? (entry.committed / fin.committedCost) * 100 : 0;
              return (
                <tr key={c.key} className="hover:bg-slate-50">
                  <Td className="font-medium">{c.label}</Td>
                  <Td right>{fmtRM(entry.committed)}</Td>
                  <Td right>{fmtRM(entry.actual)}</Td>
                  <Td right>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <span className="block h-full bg-slate-500" style={{ width: `${Math.min(100, share)}%` }} />
                      </span>
                      {share.toFixed(1)}%
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="text-xs text-slate-400 mt-3">
          Material / subcontractor and other centres come from purchase orders; labour comes from
          the Labour Cost module.
        </p>
      </Card>

      <Card title="Add Budget Category">
        <ActionForm action={addBudget} submitLabel="Add Category">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Category" required>
              <TextInput name="category" required placeholder="e.g. Materials" />
            </Field>
            <Field label="Cost centre (for reports)">
              <Select name="cost_category" defaultValue="">
                <option value="">— None —</option>
                {COST_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </Select>
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
