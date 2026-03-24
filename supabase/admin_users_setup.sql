alter table public.users
  alter column id type text using id::text;

alter table public.users
  add constraint users_email_unique unique (email);

alter table public.users
  add constraint users_username_unique unique (username);

alter table public.users enable row level security;

create policy "Users can read active profiles"
on public.users
for select
to authenticated
using (true);

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
