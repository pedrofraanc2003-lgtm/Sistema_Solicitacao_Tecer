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
  created_at timestamptz not null default now()
);

create index if not exists idx_requests_equipment_id on public.requests (equipment_id);
create index if not exists idx_requests_status on public.requests (status);
create index if not exists idx_requests_created_at on public.requests (created_at desc);
create index if not exists idx_audit_logs_timestamp on public.audit_logs (timestamp desc);
create index if not exists idx_workshop_equipment_id on public.workshop_kanban_items (equipment_id);
create index if not exists idx_workshop_status on public.workshop_kanban_items (status);

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

grant execute on function public.generate_request_code() to anon, authenticated, service_role;

alter table public.users enable row level security;
alter table public.equipments enable row level security;
alter table public.requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workshop_kanban_items enable row level security;
alter table public.request_attachments enable row level security;

drop policy if exists "Users can read active profiles anon" on public.users;
create policy "Users can read active profiles anon"
on public.users
for select
to anon, authenticated
using (status = 'Ativo');

drop policy if exists "Only admins can insert profiles" on public.users;
create policy "Only admins can insert profiles"
on public.users
for insert
to authenticated
with check (exists (
  select 1
  from public.users caller
  where caller.email = auth.email()
    and caller.role = 'Admin'
    and caller.status = 'Ativo'
));

drop policy if exists "Only admins can update profiles" on public.users;
create policy "Only admins can update profiles"
on public.users
for update
to authenticated
using (exists (
  select 1
  from public.users caller
  where caller.email = auth.email()
    and caller.role = 'Admin'
    and caller.status = 'Ativo'
))
with check (exists (
  select 1
  from public.users caller
  where caller.email = auth.email()
    and caller.role = 'Admin'
    and caller.status = 'Ativo'
));

drop policy if exists "Allow requests full access" on public.requests;
create policy "Allow requests full access"
on public.requests
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow equipments full access" on public.equipments;
create policy "Allow equipments full access"
on public.equipments
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow audit_logs full access" on public.audit_logs;
create policy "Allow audit_logs full access"
on public.audit_logs
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow workshop_kanban_items full access" on public.workshop_kanban_items;
create policy "Allow workshop_kanban_items full access"
on public.workshop_kanban_items
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow request_attachments full access" on public.request_attachments;
create policy "Allow request_attachments full access"
on public.request_attachments
for all
to anon, authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

drop policy if exists "Allow read private anexos objects" on storage.objects;
create policy "Allow read private anexos objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'anexos');

drop policy if exists "Allow upload private anexos objects" on storage.objects;
create policy "Allow upload private anexos objects"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'anexos');

drop policy if exists "Allow update private anexos objects" on storage.objects;
create policy "Allow update private anexos objects"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'anexos')
with check (bucket_id = 'anexos');

drop policy if exists "Allow delete private anexos objects" on storage.objects;
create policy "Allow delete private anexos objects"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'anexos');

comment on table public.request_attachments is 'Opcional no fluxo atual: o frontend salva anexos no json attachments de requests e usa storage para os arquivos.';
comment on table public.workshop_kanban_items is 'Usada pelo modulo Kanban da Oficina.';

-- Persistencia do modulo de analise de oleo nao e necessaria no estado atual.
-- Se quiser salvar importacoes e historico no banco, este bloco e o ponto de partida:
--
-- create table if not exists public.oil_analysis_imports (
--   id uuid primary key default gen_random_uuid(),
--   file_name text not null,
--   imported_by text,
--   imported_at timestamptz not null default now()
-- );
--
-- create table if not exists public.oil_analysis_samples (
--   id uuid primary key default gen_random_uuid(),
--   import_id uuid not null references public.oil_analysis_imports (id) on delete cascade,
--   equipamento text not null,
--   compartimento text not null,
--   oleo text,
--   laudo text,
--   condicao text,
--   criticidade text not null check (criticidade in ('ok', 'alerta', 'critico')),
--   nr_laudo text,
--   data_coleta date
-- );
