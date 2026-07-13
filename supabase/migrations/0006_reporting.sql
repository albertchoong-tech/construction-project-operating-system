-- Sprint 11 — Reporting & Exports
-- Budgets gain an optional cost-centre so Budget vs Actual can be reported per
-- cost centre (Material, Labour, Subcontractor, …). Additive and nullable —
-- existing budget rows keep working with their free-text category.

alter table budgets add column if not exists cost_category text;

notify pgrst, 'reload schema';
