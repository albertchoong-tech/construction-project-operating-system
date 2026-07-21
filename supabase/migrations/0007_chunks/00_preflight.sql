-- CHUNK 00 — PREFLIGHT. Run this FIRST. It changes nothing.
--
-- Every row should read OK. Anything reading MISSING explains why the full
-- 0007 migration rolled back — fix that first, then continue with CHUNK 01.

select 'projects table' as item,
       case when to_regclass('public.projects') is not null then 'OK' else 'MISSING' end as status
union all
select 'site_progress_logs table',
       case when to_regclass('public.site_progress_logs') is not null then 'OK' else 'MISSING' end
union all
select 'inspection_records table',
       case when to_regclass('public.inspection_records') is not null then 'OK' else 'MISSING' end
union all
select 'project_documents table',
       case when to_regclass('public.project_documents') is not null then 'OK' else 'MISSING' end
union all
select 'can_read(uuid) function',
       case when exists (
              select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'can_read')
            then 'OK' else 'MISSING — apply 0004_team_access.sql first' end
union all
select 'can_write(uuid,text[]) function',
       case when exists (
              select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'can_write')
            then 'OK' else 'MISSING — apply 0004_team_access.sql first' end
union all
select 'standard_conforming_strings', current_setting('standard_conforming_strings')
union all
select 'current database', current_database();
