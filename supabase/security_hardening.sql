begin;

drop policy if exists "Allow all anon access audit_logs" on public.audit_logs;
drop policy if exists "Allow all for anon" on public.audit_logs;
drop policy if exists "pcm_access" on public.audit_logs;

drop policy if exists "Allow all anon access equipments" on public.equipments;
drop policy if exists "Allow all for anon" on public.equipments;
drop policy if exists "pcm_access" on public.equipments;

drop policy if exists "Acesso livre para testes" on public.notifications;
drop policy if exists "Allow All" on public.notifications;
drop policy if exists "Allow all for anon" on public.notifications;

drop policy if exists "Allow all anon access requests" on public.requests;
drop policy if exists "Allow all for anon" on public.requests;

drop policy if exists "Allow all anon access users" on public.users;
drop policy if exists "Allow all for anon" on public.users;
drop policy if exists "pcm_access" on public.users;

drop policy if exists "Allow anon delete request_attachments" on public.request_attachments;
drop policy if exists "Allow anon insert request_attachments" on public.request_attachments;
drop policy if exists "Allow anon select request_attachments" on public.request_attachments;
drop policy if exists "Allow anon update request_attachments" on public.request_attachments;

drop policy if exists "Allow anon read private anexos objects" on storage.objects;
drop policy if exists "Allow anon reads from anexos" on storage.objects;
drop policy if exists "Allow anon upload private anexos objects" on storage.objects;
drop policy if exists "Allow anon uploads to anexos" on storage.objects;

drop policy if exists "code_select_anon" on public.code;

create policy "Authenticated full access requests"
on public.requests
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated full access equipments"
on public.equipments
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated full access notifications"
on public.notifications
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated insert audit_logs"
on public.audit_logs
for insert
to authenticated
with check (true);

create policy "Admin read audit_logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.users caller
    where caller.email = auth.email()
      and caller.role = 'Admin'
      and caller.status = 'Ativo'
  )
);

create policy "Authenticated access request_attachments"
on public.request_attachments
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated read code"
on public.code
for select
to authenticated
using (true);

create policy "Authenticated read anexos objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'anexos');

create policy "Authenticated upload anexos objects"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'anexos');

commit;
