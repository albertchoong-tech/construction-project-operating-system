-- Update sprint: inspection issue categories, attachment linkage, labour costs,
-- PO cost centres. All additive — existing rows and policies keep working.

-- ── Update 1: inspection issue category ──────────────────────────────────────
alter table inspection_records add column if not exists issue_category text;
alter table inspection_records add column if not exists issue_detail text; -- "Please specify" when category is Others

-- ── Update 2/6: attachments — link documents to a source record ──────────────
alter table project_documents add column if not exists entity_type text; -- project | variation_order | inspection_record | site_progress_log | progress_claim
alter table project_documents add column if not exists entity_id uuid;
create index if not exists project_documents_entity_idx on project_documents (entity_type, entity_id);

-- ── Update 4: PO cost centre ──────────────────────────────────────────────────
alter table purchase_orders add column if not exists cost_category text not null default 'material';

-- ── Update 3: labour costs ────────────────────────────────────────────────────
create table if not exists labour_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references projects(id) on delete cascade,
  worker_name text not null,
  work_date date,
  period text,
  basic_wages numeric default 0,
  overtime numeric default 0,
  allowance numeric default 0,
  epf numeric default 0,
  socso numeric default 0,
  eis numeric default 0,
  pcb numeric default 0,
  other_cost numeric default 0,
  remarks text,
  total_cost numeric generated always as
    (coalesce(basic_wages,0) + coalesce(overtime,0) + coalesce(allowance,0)
     + coalesce(epf,0) + coalesce(socso,0) + coalesce(eis,0)
     + coalesce(pcb,0) + coalesce(other_cost,0)) stored,
  created_at timestamptz not null default now()
);
alter table labour_costs enable row level security;
drop policy if exists "labour_costs_read_auth" on labour_costs;
create policy "labour_costs_read_auth" on labour_costs for select to authenticated using (true);
drop policy if exists "labour_costs_write_roles" on labour_costs;
create policy "labour_costs_write_roles" on labour_costs for all to authenticated
  using (public.user_role() = any(array['director','finance']))
  with check (public.user_role() = any(array['director','finance']));
