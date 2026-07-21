-- CHUNK 02 — storage.objects policies. Requires CHUNK 01.
--
-- This is the statement most likely to fail: storage.objects is owned by
-- supabase_storage_admin, so altering its policies needs sufficient privilege.
-- If you get "must be owner of table objects", stop and tell me — the same
-- rules can be added from Dashboard → Storage → Policies instead.
--
-- Run the DROPs and CREATEs one block at a time if you want to isolate further.

drop policy if exists "project_documents_auth_write" on storage.objects;
drop policy if exists "project_documents_auth_delete" on storage.objects;
drop policy if exists "project_documents_member_write" on storage.objects;
drop policy if exists "project_documents_member_delete" on storage.objects;

-- Upload: only into a project you can read. The explicit `is not null` guard
-- matters — can_read(null) is TRUE for PMs/Supervisors (null = company-level),
-- so without it an object with no project prefix would be accepted.
create policy "project_documents_member_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-documents'
    and public.storage_project_id(name) is not null
    and public.can_read(public.storage_project_id(name))
  );

-- Delete: same membership rule, plus a Director fallback for legacy objects
-- whose paths predate the `<project_id>/...` convention.
create policy "project_documents_member_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      (public.storage_project_id(name) is not null
       and public.can_read(public.storage_project_id(name)))
      or public.user_role() = 'director'
    )
  );
