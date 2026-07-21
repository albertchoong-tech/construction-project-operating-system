-- CHUNK 01 — helper function only (public schema, no storage privileges needed).
-- If this succeeds, `select public.storage_project_id('abc/x.png')` returns NULL
-- and `select public.storage_project_id('de057975-f85e-48d2-ad5e-65867bc29cf3/x.png')`
-- returns the uuid. Safe to re-run.

create or replace function public.storage_project_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $fn$
declare seg text;
begin
  seg := split_part(coalesce(object_name, ''), '/', 1);
  if seg ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return seg::uuid;
  end if;
  return null;
end $fn$;

-- Quick self-check (should print one NULL and one uuid):
select public.storage_project_id('notauuid/x.png')                              as should_be_null,
       public.storage_project_id('de057975-f85e-48d2-ad5e-65867bc29cf3/x.png')   as should_be_uuid;
