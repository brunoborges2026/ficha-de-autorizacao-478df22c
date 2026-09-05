-- Roles
create type public.app_role as enum ('admin', 'broker');
create type public.authorization_status as enum ('pendente', 'assinado');

-- Profiles
create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  must_set_password boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- Roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Auto profile + role on signup (first user becomes admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  admin_count int;
  requested_role text;
begin
  insert into public.profiles (id, email, full_name, must_set_password)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'must_set_password')::boolean, true)
  );

  select count(*) into admin_count from public.user_roles where role = 'admin';
  requested_role := new.raw_user_meta_data ->> 'role';

  if admin_count = 0 or requested_role = 'admin' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'broker');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Authorizations (fichas)
create table public.authorizations (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  status public.authorization_status not null default 'pendente',
  owner jsonb not null default '{}'::jsonb,
  property jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  property_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index authorizations_broker_idx on public.authorizations (broker_id, created_at desc);
grant select, insert, update, delete on public.authorizations to authenticated;
grant all on public.authorizations to service_role;
alter table public.authorizations enable row level security;

create policy "Brokers manage own authorizations" on public.authorizations
  for all to authenticated
  using (auth.uid() = broker_id) with check (auth.uid() = broker_id);
create policy "Admins read all authorizations" on public.authorizations
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete any authorization" on public.authorizations
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger authorizations_updated_at before update on public.authorizations
for each row execute function public.set_updated_at();

-- Signatures
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null unique references public.authorizations(id) on delete cascade,
  selfie_path text not null,
  signature_path text not null,
  pdf_path text,
  signed_at timestamptz not null default now(),
  ip text,
  user_agent text,
  latitude double precision,
  longitude double precision,
  validation_hash text not null,
  created_at timestamptz not null default now()
);
grant select on public.signatures to authenticated;
grant all on public.signatures to service_role;
alter table public.signatures enable row level security;

create policy "Brokers read signatures of own authorizations" on public.signatures
  for select to authenticated
  using (exists (select 1 from public.authorizations a where a.id = authorization_id and a.broker_id = auth.uid()));
create policy "Admins read all signatures" on public.signatures
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Realtime for dashboard status updates
alter publication supabase_realtime add table public.authorizations;
alter table public.authorizations replica identity full;