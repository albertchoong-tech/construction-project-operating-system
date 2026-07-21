-- CHUNK 07 — Drawing reference on a site update ("this relates to A-203 Rev 2").
-- Points at a specific revision row, so the reference stays accurate even after
-- a later revision supersedes it. Requires CHUNK 05. Safe to re-run.

alter table site_progress_logs
  add column if not exists drawing_id uuid references project_drawings(id) on delete set null;

alter table inspection_records
  add column if not exists drawing_id uuid references project_drawings(id) on delete set null;
