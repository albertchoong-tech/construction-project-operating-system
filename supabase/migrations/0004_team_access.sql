-- Sprint 8 — User & Access Administration
-- profiles.active, project memberships, and membership-scoped RLS.
-- profiles.role becomes the single source of truth (JWT metadata is no longer
-- consulted), so role changes apply on the user's next request without re-login.

-- ── Profiles: activation flag ────────────────────────────────────────────────
alter table profiles add column if not exists active boolean not null default true;

-- ── Project memberships ──────────────────────────────────────────────────────
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
alter table project_members enable row level security;

-- ── Helper functions (security definer: bypass RLS, no recursion) ───────────
create or replace function public.user_active() returns boolean
language sql stable security definer set search_path = public as $fn$
  select coalesce((select active from profiles where id = auth.uid()), false)
$fn$;

-- Inactive users have no role: every role-checked write dies automatically.
create or replace function public.user_role() returns text
language sql stable security definer set search_path = public as $fn$
  select role from profiles where id = auth.uid() and active
$fn$;

create or replace function public.is_member(proj uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from project_members m where m.project_id = proj and m.user_id = auth.uid()
  )
$fn$;

-- Read access: Directors/QS/Finance/Purchasing see everything; PMs and
-- Supervisors see only assigned projects. Null project = company-level row.
create or replace function public.can_read(proj uuid) returns boolean
language plpgsql stable security definer set search_path = public as $fn$
declare r text;
begin
  r := public.user_role();
  if r is null then return false; end if;
  if r in ('project_manager', 'site_supervisor') then
    return proj is null or public.is_member(proj);
  end if;
  return true;
end $fn$;

-- Write access: role must be allowed for the table; PMs/Supervisors are
-- additionally restricted to assigned projects.
create or replace function public.can_write(proj uuid, allowed text[]) returns boolean
language plpgsql stable security definer set search_path = public as $fn$
declare r text;
begin
  r := public.user_role();
  if r is null or not (r = any(allowed)) then return false; end if;
  if r in ('project_manager', 'site_supervisor') then
    return proj is null or public.is_member(proj);
  end if;
  return true;
end $fn$;

-- ── project_members policies ────────────────────────────────────────────────
drop policy if exists "project_members_read" on project_members;
create policy "project_members_read" on project_members for select to authenticated
  using (public.user_active());
drop policy if exists "project_members_write" on project_members;
create policy "project_members_write" on project_members for all to authenticated
  using (public.user_role() = 'director') with check (public.user_role() = 'director');

-- ── Rescope domain-table policies ────────────────────────────────────────────
do $do$
declare
  t record;
begin
  for t in
    select * from (values
      -- table            project column   write roles
      ('projects',            'id',         array['director','project_manager','quantity_surveyor']),
      ('quotations',          'project_id', array['director','quantity_surveyor']),
      ('boq_items',           'project_id', array['director','quantity_surveyor','project_manager']),
      ('budgets',             'project_id', array['director','project_manager','quantity_surveyor']),
      ('purchase_requests',   'project_id', array['director','purchasing_officer','project_manager']),
      ('purchase_orders',     'project_id', array['director','purchasing_officer']),
      ('material_deliveries', 'project_id', array['director','purchasing_officer','site_supervisor']),
      ('site_progress_logs',  'project_id', array['director','project_manager','site_supervisor']),
      ('inspection_records',  'project_id', array['director','project_manager','site_supervisor']),
      ('variation_orders',    'project_id', array['director','quantity_surveyor']),
      ('progress_claims',     'project_id', array['director','quantity_surveyor']),
      ('customer_payments',   'project_id', array['director','finance']),
      ('supplier_payments',   'project_id', array['director','finance']),
      ('labour_costs',        'project_id', array['director','finance']),
      ('project_documents',   'project_id', array['director','project_manager','quantity_surveyor','purchasing_officer','finance','site_supervisor'])
    ) as v(tbl, proj_col, roles)
  loop
    execute format('drop policy if exists "%s_read_auth" on %I', t.tbl, t.tbl);
    execute format('drop policy if exists "%s_write_roles" on %I', t.tbl, t.tbl);
    execute format(
      'create policy "%s_read_auth" on %I for select to authenticated using (public.can_read(%I))',
      t.tbl, t.tbl, t.proj_col);
    execute format(
      'create policy "%s_write_roles" on %I for all to authenticated using (public.can_write(%I, %L::text[])) with check (public.can_write(%I, %L::text[]))',
      t.tbl, t.tbl, t.proj_col, t.roles, t.proj_col, t.roles);
  end loop;
end $do$;

-- po_items reaches its project through the parent PO
drop policy if exists "po_items_read_auth" on po_items;
create policy "po_items_read_auth" on po_items for select to authenticated
  using (public.can_read((select po.project_id from purchase_orders po where po.id = po_id)));
drop policy if exists "po_items_write_roles" on po_items;
create policy "po_items_write_roles" on po_items for all to authenticated
  using (public.can_write((select po.project_id from purchase_orders po where po.id = po_id),
         array['director','purchasing_officer']))
  with check (public.can_write((select po.project_id from purchase_orders po where po.id = po_id),
         array['director','purchasing_officer']));

-- Company-level tables: any active member may read; writes unchanged
-- (their role checks now fail automatically for inactive users)
do $do$
declare t text;
begin
  foreach t in array array['clients','suppliers','approval_records'] loop
    execute format('drop policy if exists "%s_read_auth" on %I', t, t);
    execute format(
      'create policy "%s_read_auth" on %I for select to authenticated using (public.user_active())',
      t, t);
  end loop;
end $do$;

-- profiles: users must always see their OWN row (even deactivated) so the app
-- can detect the deactivation and sign them out; active members see the team.
drop policy if exists "profiles_read_auth" on profiles;
create policy "profiles_read_auth" on profiles for select to authenticated
  using (public.user_active() or id = auth.uid());

-- ── Sign-up hardening: everyone starts as site_supervisor; Director promotes ─
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'site_supervisor',
    true
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

-- ── Backfill: keep current PMs/Supervisors working on existing projects ──────
insert into project_members (project_id, user_id)
select p.id, pr.id
from projects p
cross join profiles pr
where pr.role in ('project_manager', 'site_supervisor')
on conflict (project_id, user_id) do nothing;

notify pgrst, 'reload schema';
