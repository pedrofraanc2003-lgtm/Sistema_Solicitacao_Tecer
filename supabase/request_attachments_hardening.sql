alter table if exists public.request_attachments
add column if not exists size_bytes bigint;

alter table if exists public.request_attachments
add column if not exists deleted_at timestamptz;

update public.request_attachments
set size_bytes = 1
where size_bytes is null;

alter table if exists public.request_attachments
alter column size_bytes set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'request_attachments_size_bytes_check'
  ) then
    alter table public.request_attachments
    add constraint request_attachments_size_bytes_check
    check (size_bytes > 0 and size_bytes <= 10485760);
  end if;
end
$$;

create index if not exists idx_request_attachments_request_id
on public.request_attachments (request_id, created_at desc);

create index if not exists idx_request_attachments_active
on public.request_attachments (request_id)
where deleted_at is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos',
  'anexos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
