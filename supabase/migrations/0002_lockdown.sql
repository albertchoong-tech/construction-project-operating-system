-- Sprint 5 — Lock It Down
-- Replaces the v1 open (anonymous) RLS policies with authenticated + role-based policies.
-- Reads: any authenticated company member (shared workspace; seed data stays visible).
-- Writes: restricted per role, per SECURITY.md. Directors can write everything.

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'project_manager'
    check (role in ('director','project_manager','quantity_surveyor','purchasing_officer','finance','site_supervisor')),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- security definer so RLS policies on other tables can read the caller's role
-- without recursing into profiles' own policies
create or replace function public.user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'role' in
        ('director','project_manager','quantity_surveyor','purchasing_officer','finance','site_supervisor')
      then new.raw_user_meta_data->>'role'
      else 'project_manager'
    end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "profiles_read_auth" on profiles;
create policy "profiles_read_auth" on profiles for select to authenticated using (true);
drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_director_all" on profiles;
create policy "profiles_director_all" on profiles for all to authenticated
  using (public.user_role() = 'director') with check (public.user_role() = 'director');

-- ── Domain tables ────────────────────────────────────────────────────────────
-- read_auth: any authenticated user. write_roles: listed roles only.

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('clients',             array['director','project_manager','quantity_surveyor']),
      ('projects',            array['director','project_manager','quantity_surveyor']),
      ('quotations',          array['director','quantity_surveyor']),
      ('boq_items',           array['director','quantity_surveyor','project_manager']),
      ('budgets',             array['director','project_manager','quantity_surveyor']),
      ('suppliers',           array['director','purchasing_officer','project_manager']),
      ('purchase_requests',   array['director','purchasing_officer','project_manager']),
      ('purchase_orders',     array['director','purchasing_officer']),
      ('po_items',            array['director','purchasing_officer']),
      ('material_deliveries', array['director','purchasing_officer','site_supervisor']),
      ('site_progress_logs',  array['director','project_manager','site_supervisor']),
      ('inspection_records',  array['director','project_manager','site_supervisor']),
      ('variation_orders',    array['director','quantity_surveyor']),
      ('progress_claims',     array['director','quantity_surveyor']),
      ('customer_payments',   array['director','finance']),
      ('supplier_payments',   array['director','finance']),
      ('project_documents',   array['director','project_manager','quantity_surveyor','purchasing_officer','finance','site_supervisor'])
    ) as v(tbl, roles)
  loop
    execute format('drop policy if exists "%s_v1_read" on %I', t.tbl, t.tbl);
    execute format('drop policy if exists "%s_v1_write" on %I', t.tbl, t.tbl);
    execute format('drop policy if exists "%s_read_auth" on %I', t.tbl, t.tbl);
    execute format('drop policy if exists "%s_write_roles" on %I', t.tbl, t.tbl);
    execute format(
      'create policy "%s_read_auth" on %I for select to authenticated using (true)',
      t.tbl, t.tbl);
    execute format(
      'create policy "%s_write_roles" on %I for all to authenticated using (public.user_role() = any(%L::text[])) with check (public.user_role() = any(%L::text[]))',
      t.tbl, t.tbl, t.roles, t.roles);
  end loop;
end $$;

-- approval_records: audit trail — readable by all members, appended only by directors,
-- never updated or deleted (no update/delete policy exists)
drop policy if exists "approval_records_v1_read" on approval_records;
drop policy if exists "approval_records_v1_write" on approval_records;
drop policy if exists "approval_records_read_auth" on approval_records;
drop policy if exists "approval_records_insert_director" on approval_records;
create policy "approval_records_read_auth" on approval_records for select to authenticated using (true);
create policy "approval_records_insert_director" on approval_records for insert to authenticated
  with check (public.user_role() = 'director');

-- ── Storage: uploads/deletes require login; files stay publicly readable ─────
drop policy if exists "project_documents_v1_write" on storage.objects;
drop policy if exists "project_documents_v1_delete" on storage.objects;
drop policy if exists "project_documents_auth_write" on storage.objects;
drop policy if exists "project_documents_auth_delete" on storage.objects;
create policy "project_documents_auth_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-documents');
create policy "project_documents_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-documents');
