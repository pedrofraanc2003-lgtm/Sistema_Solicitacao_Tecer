alter table if exists public.request_attachments
add column if not exists cloudinary_public_id text;

alter table if exists public.request_attachments
add column if not exists cloudinary_resource_type text
check (cloudinary_resource_type in ('image', 'raw'));

alter table if exists public.request_attachments
add column if not exists cloudinary_asset_type text
check (cloudinary_asset_type in ('authenticated'));

alter table if exists public.request_attachments
add column if not exists cloudinary_version text;

alter table if exists public.request_attachments
add column if not exists cloudinary_bytes bigint;

alter table if exists public.request_attachments
add column if not exists cloudinary_format text;

alter table if exists public.request_attachments
add column if not exists original_filename text;

alter table if exists public.request_attachments
add column if not exists migrated_at timestamptz;

create index if not exists idx_request_attachments_cloudinary_public_id
on public.request_attachments (cloudinary_public_id)
where cloudinary_public_id is not null;

comment on column public.request_attachments.storage_path is 'Campo legado. Mantido apenas para compatibilidade transitória enquanto houver anexos no Supabase Storage.';
