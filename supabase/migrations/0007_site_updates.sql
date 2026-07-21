-- 0007_site_updates.sql
-- Sprint: Unified Site Updates, Video Evidence & Plans/Drawings
--
-- Additive only. No existing column, row, policy or table is dropped or
-- rewritten; progress logs and inspections stay in their own tables (the
-- unified /site-updates screen is a presentation layer, not a data merge).

-- ── 1. Shared "area / location" ─────────────────────────────────────────────
-- inspection_records already has `area`; progress logs did not.
alter table site_progress_logs add column if not exists area text;

-- ── 2. Inspection follow-up fields ──────────────────────────────────────────
alter table inspection_records add column if not exists corrective_action text;
alter table inspection_records add column if not exists responsible_party text;
alter table inspection_records add column if not exists follow_up_date date;

-- ── 3. Attachment media metadata ────────────────────────────────────────────
-- Lets one attachment model carry photo / video / document without a second
-- storage system. storage_path is set by direct browser→Storage uploads.
alter table project_documents add column if not exists media_type text;   -- photo | video | document
alter table project_documents add column if not exists mime_type text;
alter table project_documents add column if not exists file_size bigint;
alter table project_documents add column if not exists storage_path text;
alter table project_documents add column if not exists thumbnail_url text;
-- Per-attachment note, so each photo/video can carry its own caption.
alter table project_documents add column if not exists caption text;

-- Backfill existing rows so filtering by media_type is reliable.
update project_documents
   set media_type = case
         when file_url ~* '[.](png|jpe?g|gif|webp|bmp|svg)([?]|$)' then 'photo'
         else 'document'
       end
 where media_type is null;

-- ── 4. Plans & Drawings ─────────────────────────────────────────────────────
-- Structured drawing register with revision control. Files reuse the existing
-- `project-documents` bucket — only the metadata lives here.
create table if not exists project_drawings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  drawing_no text not null,
  category text not null,
  revision_no text not null default 'A',
  issue_date date,
  description text,
  file_name text,
  file_url text,
  storage_path text,
  mime_type text,
  file_size bigint,
  status text not null default 'current',
  supersedes_id uuid references project_drawings(id) on delete set null,
  uploaded_by text,
  created_at timestamptz not null default now(),
  constraint project_drawings_status_chk check (status in ('current', 'superseded'))
);

-- Exactly one CURRENT revision per project + drawing number. Older revisions
-- stay in the table as 'superseded' and remain readable.
create unique index if not exists project_drawings_one_current
  on project_drawings (project_id, drawing_no)
  where status = 'current';

create index if not exists project_drawings_project_idx
  on project_drawings (project_id, status);

alter table project_drawings enable row level security;

-- Read: anyone who can read the project — includes Site Supervisors and
-- Quantity Surveyors (they must be able to open the current drawing).
drop policy if exists "project_drawings_read" on project_drawings;
create policy "project_drawings_read" on project_drawings for select to authenticated
  using (public.can_read(project_id));

-- Upload a new drawing: Director + Quantity Surveyor.
drop policy if exists "project_drawings_insert" on project_drawings;
create policy "project_drawings_insert" on project_drawings for insert to authenticated
  with check (public.can_write(project_id, array['director', 'quantity_surveyor']));

-- Revise / supersede (update): Director only.
drop policy if exists "project_drawings_update" on project_drawings;
create policy "project_drawings_update" on project_drawings for update to authenticated
  using (public.can_write(project_id, array['director']))
  with check (public.can_write(project_id, array['director']));

-- Delete: Director only.
drop policy if exists "project_drawings_delete" on project_drawings;
create policy "project_drawings_delete" on project_drawings for delete to authenticated
  using (public.can_write(project_id, array['director']));

-- ── 5. Drawing reference on a site update ───────────────────────────────────
-- Lets an update say "this relates to A-203 Rev 2". Points at a specific
-- revision row, so the reference stays accurate even after a later revision
-- supersedes it. Declared after project_drawings so the FK target exists.
alter table site_progress_logs
  add column if not exists drawing_id uuid references project_drawings(id) on delete set null;
alter table inspection_records
  add column if not exists drawing_id uuid references project_drawings(id) on delete set null;
