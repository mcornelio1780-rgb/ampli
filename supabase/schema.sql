-- AMPLI · Base de datos para Supabase (solo si usas backend: "supabase")
-- Pegar completo en: Supabase → SQL Editor → New query → Run
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('talent','clinic','contact','newsletter')),
  name text check (char_length(name) <= 200),
  email text not null check (char_length(email) between 5 and 254 and email like '%@%'),
  country text check (char_length(country) <= 100),
  english text check (char_length(english) <= 10),
  job text check (char_length(job) <= 300),
  practice text check (char_length(practice) <= 200),
  state text check (char_length(state) <= 100),
  denials integer check (denials is null or denials between 0 and 100000),
  message text check (char_length(message) <= 3000),
  lang text check (char_length(lang) <= 5),
  page text check (char_length(page) <= 200),
  user_agent text check (char_length(user_agent) <= 300),
  consent boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'nuevo',
  notes text
);
alter table public.leads enable row level security;
drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads for insert to anon, authenticated
  with check (consent = true and status = 'nuevo' and notes is null and (user_id is null or user_id = auth.uid()));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text check (char_length(full_name) <= 200),
  role text not null default 'student' check (role in ('student','clinic','billing','other')),
  country text, lang text default 'es', marketing_consent boolean not null default false,
  terms_accepted_at timestamptz, practice_name text, practice_addr text,
  npi text, tin text, phone text, operator_name text
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','student');
begin
  if r not in ('student','clinic','billing','other') then r := 'student'; end if;
  insert into public.profiles (id, full_name, role, lang, marketing_consent, terms_accepted_at)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 200), r,
          left(coalesce(new.raw_user_meta_data->>'lang','es'), 5),
          coalesce((new.raw_user_meta_data->>'marketing')::boolean, false),
          nullif(new.raw_user_meta_data->>'terms_accepted_at','')::timestamptz)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.app_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (char_length(event) <= 60),
  meta jsonb not null default '{}'::jsonb
);
alter table public.app_events enable row level security;
drop policy if exists "events_insert" on public.app_events;
create policy "events_insert" on public.app_events for insert to authenticated with check (auth.uid() = user_id);
