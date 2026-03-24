create table if not exists public.request_attachments (
  id text primary key,
  request_id text not null references public.requests (id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  file_type text not null check (file_type in ('photo', 'doc')),
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.request_attachments enable row level security;

create policy "Allow anon select request_attachments"
on public.request_attachments
for select
to anon
using (true);

create policy "Allow anon insert request_attachments"
on public.request_attachments
for insert
to anon
with check (true);

create policy "Allow anon update request_attachments"
on public.request_attachments
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete request_attachments"
on public.request_attachments
for delete
to anon
using (true);

create policy "Allow anon read private anexos objects"
on storage.objects
for select
to anon
using (bucket_id = 'anexos');

create policy "Allow anon upload private anexos objects"
on storage.objects
for insert
to anon
with check (bucket_id = 'anexos');
