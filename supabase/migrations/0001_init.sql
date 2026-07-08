create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);
alter table clients enable row level security;
drop policy if exists "clients_v1_read" on clients;
create policy "clients_v1_read" on clients for select using (true);
drop policy if exists "clients_v1_write" on clients;
create policy "clients_v1_write" on clients for all using (true) with check (true);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  client_id uuid,
  project_code text,
  name text not null,
  address text,
  status text not null default 'active',
  contract_value numeric default 0,
  start_date date,
  end_date date,
  project_manager text,
  completion_pct numeric default 0,
  created_at timestamptz not null default now()
);
alter table projects enable row level security;
drop policy if exists "projects_v1_read" on projects;
create policy "projects_v1_read" on projects for select using (true);
drop policy if exists "projects_v1_write" on projects;
create policy "projects_v1_write" on projects for all using (true) with check (true);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  quotation_no text,
  issue_date date,
  total_amount numeric default 0,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now()
);
alter table quotations enable row level security;
drop policy if exists "quotations_v1_read" on quotations;
create policy "quotations_v1_read" on quotations for select using (true);
drop policy if exists "quotations_v1_write" on quotations;
create policy "quotations_v1_write" on quotations for all using (true) with check (true);

create table if not exists boq_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  section text,
  description text not null,
  unit text,
  quantity numeric default 0,
  unit_rate numeric default 0,
  total_amount numeric generated always as (quantity * unit_rate) stored,
  created_at timestamptz not null default now()
);
alter table boq_items enable row level security;
drop policy if exists "boq_items_v1_read" on boq_items;
create policy "boq_items_v1_read" on boq_items for select using (true);
drop policy if exists "boq_items_v1_write" on boq_items;
create policy "boq_items_v1_write" on boq_items for all using (true) with check (true);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  category text not null,
  budgeted_amount numeric default 0,
  actual_amount numeric default 0,
  created_at timestamptz not null default now()
);
alter table budgets enable row level security;
drop policy if exists "budgets_v1_read" on budgets;
create policy "budgets_v1_read" on budgets for select using (true);
drop policy if exists "budgets_v1_write" on budgets;
create policy "budgets_v1_write" on budgets for all using (true) with check (true);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  contact_person text,
  phone text,
  email text,
  category text,
  created_at timestamptz not null default now()
);
alter table suppliers enable row level security;
drop policy if exists "suppliers_v1_read" on suppliers;
create policy "suppliers_v1_read" on suppliers for select using (true);
drop policy if exists "suppliers_v1_write" on suppliers;
create policy "suppliers_v1_write" on suppliers for all using (true) with check (true);

create table if not exists purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  pr_no text,
  requested_by text,
  request_date date,
  status text not null default 'draft',
  items jsonb default '[]',
  notes text,
  created_at timestamptz not null default now()
);
alter table purchase_requests enable row level security;
drop policy if exists "purchase_requests_v1_read" on purchase_requests;
create policy "purchase_requests_v1_read" on purchase_requests for select using (true);
drop policy if exists "purchase_requests_v1_write" on purchase_requests;
create policy "purchase_requests_v1_write" on purchase_requests for all using (true) with check (true);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  pr_id uuid,
  supplier_id uuid,
  po_no text,
  issue_date date,
  delivery_date date,
  status text not null default 'draft',
  total_amount numeric default 0,
  notes text,
  created_at timestamptz not null default now()
);
alter table purchase_orders enable row level security;
drop policy if exists "purchase_orders_v1_read" on purchase_orders;
create policy "purchase_orders_v1_read" on purchase_orders for select using (true);
drop policy if exists "purchase_orders_v1_write" on purchase_orders;
create policy "purchase_orders_v1_write" on purchase_orders for all using (true) with check (true);

create table if not exists po_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  po_id uuid,
  description text not null,
  unit text,
  quantity numeric default 0,
  unit_rate numeric default 0,
  total_amount numeric generated always as (quantity * unit_rate) stored,
  created_at timestamptz not null default now()
);
alter table po_items enable row level security;
drop policy if exists "po_items_v1_read" on po_items;
create policy "po_items_v1_read" on po_items for select using (true);
drop policy if exists "po_items_v1_write" on po_items;
create policy "po_items_v1_write" on po_items for all using (true) with check (true);

create table if not exists material_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  po_id uuid,
  delivery_date date,
  delivery_note_no text,
  received_by text,
  items jsonb default '[]',
  notes text,
  created_at timestamptz not null default now()
);
alter table material_deliveries enable row level security;
drop policy if exists "material_deliveries_v1_read" on material_deliveries;
create policy "material_deliveries_v1_read" on material_deliveries for select using (true);
drop policy if exists "material_deliveries_v1_write" on material_deliveries;
create policy "material_deliveries_v1_write" on material_deliveries for all using (true) with check (true);

create table if not exists site_progress_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  log_date date not null,
  reported_by text,
  work_done text,
  completion_pct numeric default 0,
  weather text,
  workers_count int default 0,
  issues text,
  photo_urls jsonb default '[]',
  created_at timestamptz not null default now()
);
alter table site_progress_logs enable row level security;
drop policy if exists "site_progress_logs_v1_read" on site_progress_logs;
create policy "site_progress_logs_v1_read" on site_progress_logs for select using (true);
drop policy if exists "site_progress_logs_v1_write" on site_progress_logs;
create policy "site_progress_logs_v1_write" on site_progress_logs for all using (true) with check (true);

create table if not exists inspection_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  inspection_date date,
  inspector text,
  area text,
  result text,
  remarks text,
  created_at timestamptz not null default now()
);
alter table inspection_records enable row level security;
drop policy if exists "inspection_records_v1_read" on inspection_records;
create policy "inspection_records_v1_read" on inspection_records for select using (true);
drop policy if exists "inspection_records_v1_write" on inspection_records;
create policy "inspection_records_v1_write" on inspection_records for all using (true) with check (true);

create table if not exists variation_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  vo_no text,
  description text not null,
  requested_by text,
  request_date date,
  amount numeric default 0,
  status text not null default 'draft',
  approved_by text,
  approved_date date,
  created_at timestamptz not null default now()
);
alter table variation_orders enable row level security;
drop policy if exists "variation_orders_v1_read" on variation_orders;
create policy "variation_orders_v1_read" on variation_orders for select using (true);
drop policy if exists "variation_orders_v1_write" on variation_orders;
create policy "variation_orders_v1_write" on variation_orders for all using (true) with check (true);

create table if not exists progress_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  claim_no text,
  claim_date date,
  period_end date,
  claimed_amount numeric default 0,
  approved_amount numeric default 0,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now()
);
alter table progress_claims enable row level security;
drop policy if exists "progress_claims_v1_read" on progress_claims;
create policy "progress_claims_v1_read" on progress_claims for select using (true);
drop policy if exists "progress_claims_v1_write" on progress_claims;
create policy "progress_claims_v1_write" on progress_claims for all using (true) with check (true);

create table if not exists customer_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  claim_id uuid,
  payment_date date,
  amount numeric default 0,
  payment_method text,
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);
alter table customer_payments enable row level security;
drop policy if exists "customer_payments_v1_read" on customer_payments;
create policy "customer_payments_v1_read" on customer_payments for select using (true);
drop policy if exists "customer_payments_v1_write" on customer_payments;
create policy "customer_payments_v1_write" on customer_payments for all using (true) with check (true);

create table if not exists supplier_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  po_id uuid,
  payment_date date,
  amount numeric default 0,
  payment_method text,
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);
alter table supplier_payments enable row level security;
drop policy if exists "supplier_payments_v1_read" on supplier_payments;
create policy "supplier_payments_v1_read" on supplier_payments for select using (true);
drop policy if exists "supplier_payments_v1_write" on supplier_payments;
create policy "supplier_payments_v1_write" on supplier_payments for all using (true) with check (true);

create table if not exists approval_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actioned_by text,
  actioned_at timestamptz default now(),
  remarks text,
  created_at timestamptz not null default now()
);
alter table approval_records enable row level security;
drop policy if exists "approval_records_v1_read" on approval_records;
create policy "approval_records_v1_read" on approval_records for select using (true);
drop policy if exists "approval_records_v1_write" on approval_records;
create policy "approval_records_v1_write" on approval_records for all using (true) with check (true);

create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  document_type text,
  file_name text,
  file_url text,
  uploaded_by text,
  created_at timestamptz not null default now()
);
alter table project_documents enable row level security;
drop policy if exists "project_documents_v1_read" on project_documents;
create policy "project_documents_v1_read" on project_documents for select using (true);
drop policy if exists "project_documents_v1_write" on project_documents;
create policy "project_documents_v1_write" on project_documents for all using (true) with check (true);

insert into clients (id, name, contact_person, phone, email, address) values
  ('a1000000-0000-0000-0000-000000000001', 'Tan Family', 'Mr Tan Wei Liang', '+60123456789', 'tanwl@email.com', 'No 12, Jalan Kenanga, Subang Jaya, Selangor'),
  ('a1000000-0000-0000-0000-000000000002', 'Lim Holdings Sdn Bhd', 'Ms Lim Hui Shan', '+60197654321', 'huishan@limholdings.com', 'Unit 5A, Menara Lim, KL'),
  ('a1000000-0000-0000-0000-000000000003', 'Ahmad & Family', 'Ahmad Fadzillah', '+60112233445', 'ahmad.fadzillah@gmail.com', 'Lot 88, Taman Maju, Nilai, Negeri Sembilan')
on conflict (id) do nothing;

insert into projects (id, client_id, project_code, name, address, status, contract_value, start_date, end_date, project_manager, completion_pct) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'PRJ-2024-001', 'Tan Residence Renovation', 'No 12, Jalan Kenanga, Subang Jaya', 'active', 350000, '2024-01-15', '2024-07-31', 'Razif Ismail', 42),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'PRJ-2024-002', 'Lim Commercial Fitout', 'Unit 5A, Menara Lim, KL', 'active', 820000, '2024-02-01', '2024-09-30', 'Siti Norzahra', 18),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'PRJ-2024-003', 'Ahmad Bungalow Construction', 'Lot 88, Taman Maju, Nilai', 'active', 1250000, '2024-03-01', '2025-03-31', 'Razif Ismail', 8)
on conflict (id) do nothing;

insert into suppliers (id, name, contact_person, phone, email, category) values
  ('c1000000-0000-0000-0000-000000000001', 'BuildMat Sdn Bhd', 'Johan Kamaruddin', '+60321112222', 'sales@buildmat.com.my', 'Building Materials'),
  ('c1000000-0000-0000-0000-000000000002', 'Elektro Maju Trading', 'Chong Wai Kit', '+60333334444', 'chong@elektromaju.com', 'Electrical'),
  ('c1000000-0000-0000-0000-000000000003', 'Paip & Sanitari Works', 'Ravi Subramaniam', '+60355556666', 'ravi@paipsanitari.com', 'Plumbing')
on conflict (id) do nothing;

insert into boq_items (id, project_id, section, description, unit, quantity, unit_rate) values
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Structure', 'Reinforced concrete slab 150mm thick', 'm²', 120, 180),
  ('d1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Finishes', 'Ceramic floor tiles supply and lay', 'm²', 200, 85),
  ('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Electrical', 'Full electrical rewiring with DB upgrade', 'lot', 1, 28000)
on conflict (id) do nothing;

insert into budgets (id, project_id, category, budgeted_amount, actual_amount) values
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Materials', 140000, 62300),
  ('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Labour & Subcontractors', 120000, 45000),
  ('e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Preliminaries', 25000, 18500)
on conflict (id) do nothing;

insert into purchase_requests (id, project_id, pr_no, requested_by, request_date, status, items, notes) values
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'PR-2024-001', 'Razif Ismail', '2024-02-10', 'approved', '[{"description":"Cement OPC 50kg","unit":"bag","qty":300,"est_rate":22}]', 'Urgent — structural works starting'),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'PR-2024-002', 'Siti Norzahra', '2024-02-20', 'pending', '[{"description":"LED downlights 12W","unit":"pcs","qty":80,"est_rate":45}]', 'For main hall ceiling')
on conflict (id) do nothing;

insert into purchase_orders (id, project_id, pr_id, supplier_id, po_no, issue_date, delivery_date, status, total_amount) values
  ('f2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'PO-2024-001', '2024-02-12', '2024-02-18', 'delivered', 6600)
on conflict (id) do nothing;

insert into site_progress_logs (id, project_id, log_date, reported_by, work_done, completion_pct, weather, workers_count) values
  ('f3000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '2024-04-01', 'Hafiz Roslan', 'Completed slab casting for living area. Curing in progress.', 42, 'Sunny', 14),
  ('f3000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '2024-04-01', 'Azlan Mohd', 'First fix electrical conduit completed for floors 1–3.', 18, 'Cloudy', 8)
on conflict (id) do nothing;

insert into variation_orders (id, project_id, vo_no, description, requested_by, request_date, amount, status, approved_by, approved_date) values
  ('f4000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'VO-001', 'Additional waterproofing to wet areas — client request', 'Mr Tan Wei Liang', '2024-03-05', 8500, 'approved', 'Director', '2024-03-07')
on conflict (id) do nothing;

insert into progress_claims (id, project_id, claim_no, claim_date, period_end, claimed_amount, approved_amount, status) values
  ('f5000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'PC-001', '2024-03-31', '2024-03-31', 120000, 120000, 'approved'),
  ('f5000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'PC-002', '2024-04-30', '2024-04-30', 85000, 0, 'submitted')
on conflict (id) do nothing;

insert into customer_payments (id, project_id, claim_id, payment_date, amount, payment_method, reference_no) values
  ('f6000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', '2024-04-08', 120000, 'Bank Transfer', 'TT-20240408-001')
on conflict (id) do nothing;

insert into supplier_payments (id, project_id, po_id, payment_date, amount, payment_method, reference_no) values
  ('f7000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '2024-02-25', 6600, 'Bank Transfer', 'TT-20240225-002')
on conflict (id) do nothing;
-- Foreign keys (DATA_MODEL.md relationships) — required for PostgREST embedding
alter table projects add constraint projects_client_id_fkey foreign key (client_id) references clients(id) on delete set null;
alter table quotations add constraint quotations_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table boq_items add constraint boq_items_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table budgets add constraint budgets_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table purchase_requests add constraint purchase_requests_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table purchase_orders add constraint purchase_orders_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table purchase_orders add constraint purchase_orders_pr_id_fkey foreign key (pr_id) references purchase_requests(id) on delete set null;
alter table purchase_orders add constraint purchase_orders_supplier_id_fkey foreign key (supplier_id) references suppliers(id) on delete set null;
alter table po_items add constraint po_items_po_id_fkey foreign key (po_id) references purchase_orders(id) on delete cascade;
alter table material_deliveries add constraint material_deliveries_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table material_deliveries add constraint material_deliveries_po_id_fkey foreign key (po_id) references purchase_orders(id) on delete set null;
alter table site_progress_logs add constraint site_progress_logs_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table inspection_records add constraint inspection_records_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table variation_orders add constraint variation_orders_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table progress_claims add constraint progress_claims_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table customer_payments add constraint customer_payments_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table customer_payments add constraint customer_payments_claim_id_fkey foreign key (claim_id) references progress_claims(id) on delete set null;
alter table supplier_payments add constraint supplier_payments_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table supplier_payments add constraint supplier_payments_po_id_fkey foreign key (po_id) references purchase_orders(id) on delete set null;
alter table project_documents add constraint project_documents_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
