-- 0008 VERIFY — read-only. Paste the full output back.
--
-- Two things can defeat the storage scoping:
--   1. migration 0008 never applied (helper function absent), or
--   2. it applied, but an EXTRA permissive policy still exists — RLS policies
--      are OR'd, so one leftover "allow any authenticated user" policy grants
--      everything regardless of the new rules.
-- This lists both.

select 'helper function storage_project_id' as item,
       case when exists (
              select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'storage_project_id')
            then 'OK — 0008 applied' else 'MISSING — 0008 did not apply' end as detail
union all
select 'policy on storage.objects: ' || policyname,
       cmd || '  |  qual=' || coalesce(qual, '(none)') || '  |  check=' || coalesce(with_check, '(none)')
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by 1;
