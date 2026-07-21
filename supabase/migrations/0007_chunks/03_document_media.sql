-- CHUNK 03 — Attachment media metadata + a per-file note.
-- Lets one attachment model carry photo / video / document. Safe to re-run.

alter table project_documents add column if not exists media_type text;   -- photo | video | document
alter table project_documents add column if not exists mime_type text;
alter table project_documents add column if not exists file_size bigint;
alter table project_documents add column if not exists storage_path text;
alter table project_documents add column if not exists thumbnail_url text;
alter table project_documents add column if not exists caption text;
