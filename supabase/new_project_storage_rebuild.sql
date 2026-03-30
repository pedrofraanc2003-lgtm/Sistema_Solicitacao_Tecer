create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  username text not null unique,
  role text not null check (role in ('Admin', 'PCM', 'Liderança', 'Compras')),
  status text not null check (status in ('Ativo', 'Inativo'))
);

create table if not exists public.equipments (
  id text primary key,
  tag text not null unique,
  name text not null,
  type text not null,
  status text not null check (status in ('Ativo', 'Inativo')),
  notes text
);

create table if not exists public.requests (
  id text primary key,
  type text not null check (type in ('Peça', 'Serviço', 'Ferramenta')),
  classification text check (classification in ('Corretiva', 'Preventiva', 'Melhoria', 'Inspeção')),
  equipment_id text references public.equipments (id) on delete set null,
  description text not null,
  urgency text not null check (urgency in ('Alta', 'Média', 'Baixa')),
  impact text not null check (impact in ('Sem impacto', 'Impacto parcial', 'Equipamento parado', 'Equipamento inoperante')),
  status text not null check (status in ('Nova', 'Cadastro', 'Emitido SC', 'Aguardando entrega', 'Disponível', 'Cancelada')),
  requester_id text not null,
  pcm_responsible_id text,
  created_at timestamptz not null default now(),
  deadline timestamptz,
  insumos jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb
);

create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  user_id text not null,
  user_name text not null,
  user_role text not null check (user_role in ('Admin', 'PCM', 'Liderança', 'Compras')),
  action_type text not null check (action_type in ('Criação', 'Edição', 'Exclusão', 'Status')),
  entity text not null check (entity in ('Solicitação', 'Equipamento', 'Usuário', 'Kanban Oficina')),
  entity_id text not null,
  summary text not null
);

create table if not exists public.workshop_kanban_items (
  id text primary key,
  equipment_id text not null references public.equipments (id) on delete cascade,
  tag text not null,
  equipment_name text not null,
  maintenance_type text not null check (maintenance_type in ('Mecânica', 'Elétrica', 'Pintura', 'Solda', 'Reforma')),
  description text not null,
  status text not null check (status in ('Pendente', 'Em Andamento', 'Liberado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_attachments (
  id text primary key,
  request_id text not null references public.requests (id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  file_type text not null check (file_type in ('photo', 'doc')),
  content_type text,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_requests_equipment_id on public.requests (equipment_id);
create index if not exists idx_requests_status on public.requests (status);
create index if not exists idx_requests_created_at on public.requests (created_at desc);
create index if not exists idx_audit_logs_timestamp on public.audit_logs (timestamp desc);
create index if not exists idx_workshop_equipment_id on public.workshop_kanban_items (equipment_id);
create index if not exists idx_workshop_status on public.workshop_kanban_items (status);
create index if not exists idx_request_attachments_request_id on public.request_attachments (request_id, created_at desc);
create index if not exists idx_request_attachments_active on public.request_attachments (request_id) where deleted_at is null;

create or replace function public.generate_request_code()
returns text
language plpgsql
security definer
as $$
declare
  next_number bigint;
begin
  select coalesce(
    max(nullif(regexp_replace(id, '\D', '', 'g'), '')::bigint),
    0
  ) + 1
  into next_number
  from public.requests;

  return 'SOL-MNT-' || lpad(next_number::text, 6, '0');
end;
$$;

grant execute on function public.generate_request_code() to authenticated, service_role;

alter table public.users enable row level security;
alter table public.equipments enable row level security;
alter table public.requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workshop_kanban_items enable row level security;
alter table public.request_attachments enable row level security;

drop policy if exists "Users can read active profiles" on public.users;
create policy "Users can read active profiles"
on public.users
for select
to authenticated
using (status = 'Ativo');

drop policy if exists "Only admins can mutate profiles" on public.users;
create policy "Only admins can mutate profiles"
on public.users
for all
to authenticated
using (
  exists (
    select 1
    from public.users caller
    where caller.email = auth.email()
      and caller.role = 'Admin'
      and caller.status = 'Ativo'
  )
)
with check (
  exists (
    select 1
    from public.users caller
    where caller.email = auth.email()
      and caller.role = 'Admin'
      and caller.status = 'Ativo'
  )
);

drop policy if exists "Authenticated full access requests" on public.requests;
create policy "Authenticated full access requests"
on public.requests
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated full access equipments" on public.equipments;
create policy "Authenticated full access equipments"
on public.equipments
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated insert audit_logs" on public.audit_logs;
create policy "Authenticated insert audit_logs"
on public.audit_logs
for insert
to authenticated
with check (true);

drop policy if exists "Admin read audit_logs" on public.audit_logs;
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

drop policy if exists "Authenticated full access workshop items" on public.workshop_kanban_items;
create policy "Authenticated full access workshop items"
on public.workshop_kanban_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated request attachment metadata" on public.request_attachments;
create policy "Authenticated request attachment metadata"
on public.request_attachments
for all
to authenticated
using (deleted_at is null)
with check (deleted_at is null);

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

drop policy if exists "Authenticated read anexos objects" on storage.objects;
create policy "Authenticated read anexos objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'anexos'
  and name like 'requests/%'
);

drop policy if exists "Authenticated upload anexos objects" on storage.objects;
create policy "Authenticated upload anexos objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'anexos'
  and name like 'requests/%'
);

drop policy if exists "Authenticated update anexos objects" on storage.objects;
create policy "Authenticated update anexos objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'anexos'
  and name like 'requests/%'
)
with check (
  bucket_id = 'anexos'
  and name like 'requests/%'
);

drop policy if exists "Authenticated delete anexos objects" on storage.objects;
create policy "Authenticated delete anexos objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'anexos'
  and name like 'requests/%'
);

comment on table public.request_attachments is 'Fonte de verdade dos anexos. O campo requests.attachments deve existir apenas para compatibilidade transitória.';
