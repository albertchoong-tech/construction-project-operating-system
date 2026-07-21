-- 0008_storage_scoping.sql
-- Sprint 11.7 — scope the project-documents bucket to project membership.
--
-- Before this, ANY authenticated user could insert or delete ANY object in the
-- bucket. Every upload path is `<project_id>/...` (lib/attachments.ts and
-- lib/media.ts mediaPath), so the first path segment identifies the project and
-- can be checked against the same can_read() helper the tables use.
--
-- NOTE: this hardens WRITE and DELETE only. Objects are still publicly
-- READABLE by URL because the bucket is public — closing that requires making
-- the bucket private and re-issuing every stored file_url as a signed URL.
-- Deliberately left as a separate decision (see ROADMAP / RELEASE notes).

-- Safely pull the project id out of an object name. Returns null when the
-- first segment isn't a uuid, so a malformed path can never be cast-errored
-- into granting access.
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

-- Replace the blanket authenticated policies with membership-scoped ones.
drop policy if exists "project_documents_auth_write" on storage.objects;
drop policy if exists "project_documents_auth_delete" on storage.objects;
drop policy if exists "project_documents_member_write" on storage.objects;
drop policy if exists "project_documents_member_delete" on storage.objects;

-- Upload: only into a project you can see. can_read() already restricts PMs and
-- Site Supervisors to their assigned projects. The explicit `is not null` guard
-- matters: can_read(null) is TRUE for those roles (null = company-level row),
-- so without it a pathless object would be accepted.
create policy "project_documents_member_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-documents'
    and public.storage_project_id(name) is not null
    and public.can_read(public.storage_project_id(name))
  );

-- Delete: same membership rule. Directors may also clear legacy objects whose
-- path predates the `<project_id>/...` convention.
create policy "project_documents_member_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      (public.storage_project_id(name) is not null
       and public.can_read(public.storage_project_id(name)))
      or public.user_role() = 'director'
    )
  );
