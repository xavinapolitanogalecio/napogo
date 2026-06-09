-- =============================================
-- REPARTOS APP — Supabase Schema
-- Ejecuta esto en el SQL Editor de Supabase
-- =============================================

-- Tabla de perfiles de usuario
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade not null primary key,
  nombre     text not null,
  correo     text,
  tiendas    text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de repartos diarios
create table if not exists public.repartos (
  id               uuid        not null default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  tienda           text        not null,
  repartos         integer     not null check (repartos >= 0),
  fecha            date        not null default current_date,
  mensaje_original text,
  created_at       timestamptz not null default now(),
  -- Upsert: si el mismo usuario registra la misma tienda el mismo día, se reemplaza
  constraint repartos_user_tienda_fecha_uq unique (user_id, tienda, fecha)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.profiles enable row level security;
alter table public.repartos enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Repartos
create policy "repartos_select_own" on public.repartos
  for select using (auth.uid() = user_id);

create policy "repartos_insert_own" on public.repartos
  for insert with check (auth.uid() = user_id);

create policy "repartos_update_own" on public.repartos
  for update using (auth.uid() = user_id);

-- =============================================
-- TRIGGER: auto-actualizar updated_at en profiles
-- =============================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
