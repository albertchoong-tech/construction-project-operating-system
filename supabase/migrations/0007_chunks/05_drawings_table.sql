-- CHUNK 05 — Plans & Drawings register (metadata only; files reuse the
-- existing `project-documents` storage bucket). Safe to re-run.

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
