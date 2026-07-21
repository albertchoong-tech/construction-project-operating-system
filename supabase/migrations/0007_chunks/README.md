# 0007 — chunked

Identical content to `../0007_site_updates.sql`, split so each statement group
can be run on its own in the Supabase SQL editor.

The editor runs a pasted script as **one transaction**, so a single error rolls
back the whole file — which is why the combined migration appeared to do
nothing. Running these one at a time shows exactly which statement fails.

Run in order, checking each succeeds before moving on:

| Chunk | What it does | Depends on |
|---|---|---|
| `00_preflight.sql` | Read-only. Confirms prerequisite tables + `can_read`/`can_write` exist | — |
| `01_progress_area.sql` | `site_progress_logs.area` | — |
| `02_inspection_fields.sql` | inspection follow-up columns | — |
| `03_document_media.sql` | media metadata + `caption` on `project_documents` | — |
| `04_document_backfill.sql` | backfills `media_type` on existing rows | 03 |
| `05_drawings_table.sql` | `project_drawings` + indexes | — |
| `06_drawings_rls.sql` | RLS policies for drawings | 05, and 0004 helpers |
| `07_drawing_refs.sql` | `drawing_id` on progress logs + inspections | 05 |
| `08_verify.sql` | Read-only. All 8 rows should read OK | all |

Every chunk is idempotent (`if not exists` / `drop policy if exists`), so
re-running one is harmless.

If a chunk errors, copy the message — that names the exact blocker (most
likely candidate: `can_write` missing, meaning `0004_team_access.sql` was
never applied to this database).
