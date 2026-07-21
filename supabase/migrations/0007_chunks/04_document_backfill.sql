-- CHUNK 04 — Backfill media_type on existing documents. Requires CHUNK 03.
-- Uses bracket classes ([.] and [?]) instead of backslash escapes so the
-- pattern can't be affected by string-escaping settings. Safe to re-run
-- (it only touches rows where media_type is still null).

update project_documents
   set media_type = case
         when file_url ~* '[.](png|jpe?g|gif|webp|bmp|svg)([?]|$)' then 'photo'
         else 'document'
       end
 where media_type is null;
