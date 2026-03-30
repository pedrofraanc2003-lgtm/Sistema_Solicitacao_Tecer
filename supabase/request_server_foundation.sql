create extension if not exists pgcrypto;

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
