-- CHUNK 08 — VERIFY. Changes nothing. All 8 rows should read OK.

select 'site_progress_logs.area' as item,
       case when exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='site_progress_logs' and column_name='area')
            then 'OK' else 'MISSING (chunk 01)' end as status
union all
select 'inspection_records.corrective_action',
       case when exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='inspection_records' and column_name='corrective_action')
            then 'OK' else 'MISSING (chunk 02)' end
union all
select 'project_documents.media_type',
       case when exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='project_documents' and column_name='media_type')
            then 'OK' else 'MISSING (chunk 03)' end
union all
select 'project_documents.caption',
       case when exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='project_documents' and column_name='caption')
            then 'OK' else 'MISSING (chunk 03)' end
union all
select 'project_documents backfilled',
       case when not exists (select 1 from project_documents where media_type is null)
            then 'OK' else 'PENDING (chunk 04)' end
union all
select 'project_drawings table',
       case when to_regclass('public.project_drawings') is not null
            then 'OK' else 'MISSING (chunk 05)' end
union all
select 'project_drawings policies',
       case when (select count(*) from pg_policies where tablename='project_drawings') = 4
            then 'OK' else 'MISSING (chunk 06) — expected 4 policies' end
union all
select 'drawing_id columns',
       case when exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='site_progress_logs' and column_name='drawing_id')
        and exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='inspection_records' and column_name='drawing_id')
            then 'OK' else 'MISSING (chunk 07)' end;
