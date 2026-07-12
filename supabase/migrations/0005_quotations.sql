-- Sprint 9 — Quotation-to-Project
-- Quotations gain a client, a job title and validity date, plus structured
-- line items (mirroring boq_items) so conversion copies lines straight into
-- the project BOQ.

alter table quotations add column if not exists client_id uuid references clients(id) on delete set null;
alter table quotations add column if not exists title text;
alter table quotations add column if not exists valid_until date;

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  quotation_id uuid not null references quotations(id) on delete cascade,
  section text,
  description text not null,
  unit text,
  quantity numeric default 0,
  unit_rate numeric default 0,
  total_amount numeric generated always as (quantity * unit_rate) stored,
  created_at timestamptz not null default now()
);
alter table quotation_items enable row level security;

-- Items inherit access from their quotation (project_id is null until
-- conversion, which can_read/can_write treat as company-level).
drop policy if exists "quotation_items_read_auth" on quotation_items;
create policy "quotation_items_read_auth" on quotation_items for select to authenticated
  using (public.can_read((select q.project_id from quotations q where q.id = quotation_id)));
drop policy if exists "quotation_items_write_roles" on quotation_items;
create policy "quotation_items_write_roles" on quotation_items for all to authenticated
  using (public.can_write((select q.project_id from quotations q where q.id = quotation_id),
         array['director','quantity_surveyor']))
  with check (public.can_write((select q.project_id from quotations q where q.id = quotation_id),
         array['director','quantity_surveyor']));

notify pgrst, 'reload schema';
