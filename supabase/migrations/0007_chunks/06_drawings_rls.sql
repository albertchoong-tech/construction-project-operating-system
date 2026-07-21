-- CHUNK 06 — RLS for project_drawings.
-- Requires CHUNK 05, plus can_read()/can_write() from 0004_team_access.sql
-- (CHUNK 00 confirms those exist). Safe to re-run.
--
-- Read      : anyone who can read the project (incl. Site Supervisors, Surveyors)
-- Insert    : Director + Quantity Surveyor
-- Update    : Director only (issuing a revision supersedes the previous row)
-- Delete    : Director only

alter table project_drawings enable row level security;

drop policy if exists "project_drawings_read" on project_drawings;
create policy "project_drawings_read" on project_drawings for select to authenticated
  using (public.can_read(project_id));

drop policy if exists "project_drawings_insert" on project_drawings;
create policy "project_drawings_insert" on project_drawings for insert to authenticated
  with check (public.can_write(project_id, array['director', 'quantity_surveyor']));

drop policy if exists "project_drawings_update" on project_drawings;
create policy "project_drawings_update" on project_drawings for update to authenticated
  using (public.can_write(project_id, array['director']))
  with check (public.can_write(project_id, array['director']));

drop policy if exists "project_drawings_delete" on project_drawings;
create policy "project_drawings_delete" on project_drawings for delete to authenticated
  using (public.can_write(project_id, array['director']));
