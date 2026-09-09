-- 1) Lock down SECURITY DEFINER / trigger functions
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
-- has_role must stay callable by signed-in users: RLS policies evaluate it as the caller
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- 2) signatures: writes are server-only (service role). Make that explicit.
revoke insert, update, delete on public.signatures from anon, authenticated;
grant all on public.signatures to service_role;

drop policy if exists "No client inserts on signatures" on public.signatures;
create policy "No client inserts on signatures"
on public.signatures for insert to authenticated, anon
with check (false);

drop policy if exists "No client updates on signatures" on public.signatures;
create policy "No client updates on signatures"
on public.signatures for update to authenticated, anon
using (false) with check (false);

drop policy if exists "No client deletes on signatures" on public.signatures;
create policy "No client deletes on signatures"
on public.signatures for delete to authenticated, anon
using (false);

-- 3) storage.objects policies for the private "signatures" bucket.
-- Files live at "<authorization_id>/<file>", so ownership is derived from the folder.
drop policy if exists "Owners read own signature files" on storage.objects;
create policy "Owners read own signature files"
on storage.objects for select to authenticated
using (
  bucket_id = 'signatures'
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.authorizations a
      where a.broker_id = auth.uid()
        and a.id::text = split_part(objects.name, '/', 1)
    )
  )
);

drop policy if exists "No client writes to signature files" on storage.objects;
create policy "No client writes to signature files"
on storage.objects for insert to authenticated, anon
with check (bucket_id <> 'signatures');

drop policy if exists "No client updates to signature files" on storage.objects;
create policy "No client updates to signature files"
on storage.objects for update to authenticated, anon
using (bucket_id <> 'signatures') with check (bucket_id <> 'signatures');

drop policy if exists "No client deletes of signature files" on storage.objects;
create policy "No client deletes of signature files"
on storage.objects for delete to authenticated, anon
using (bucket_id <> 'signatures');