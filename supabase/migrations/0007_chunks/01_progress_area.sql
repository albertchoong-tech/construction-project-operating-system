-- CHUNK 01 — Shared "area / location" on progress logs.
-- (inspection_records already has `area`.) Safe to re-run.

alter table site_progress_logs add column if not exists area text;
