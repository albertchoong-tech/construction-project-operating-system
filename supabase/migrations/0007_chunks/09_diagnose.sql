-- CHUNK 09 — DIAGNOSE. Read-only, changes nothing.
-- Run this in the SAME editor where chunk 08 passed, and send the FULL output.
-- It distinguishes "wrong database" from "right database, wrong schema".

select 'current_database' as key, current_database()::text as value
union all
select 'current_user', current_user::text
union all
select 'search_path', current_setting('search_path')
union all
select 'schemas containing site_progress_logs',
       coalesce((select string_agg(table_schema, ', ' order by table_schema)
                 from information_schema.tables where table_name = 'site_progress_logs'), '(none)')
union all
select 'schemas containing project_drawings',
       coalesce((select string_agg(table_schema, ', ' order by table_schema)
                 from information_schema.tables where table_name = 'project_drawings'), '(none)')
union all
select 'public.site_progress_logs.area',
       case when exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'site_progress_logs'
                and column_name = 'area')
            then 'PRESENT' else 'ABSENT' end
union all
select 'public.project_documents.caption',
       case when exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'project_documents'
                and column_name = 'caption')
            then 'PRESENT' else 'ABSENT' end
union all
select 'to_regclass(public.project_drawings)',
       coalesce(to_regclass('public.project_drawings')::text, 'NULL')
union all
select 'public.projects row count', (select count(*)::text from public.projects)
union all
select 'can_write exists in public',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'can_write')
            then 'YES' else 'NO' end;
