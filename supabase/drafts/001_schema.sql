-- UTKAST – kjøres IKKE automatisk. Ligger i drafts/ (ikke migrations/) med vilje.
-- Skjema for LMS Hours. Speiler tilstanden i src/state.js / src/storage/local.js.
-- Personvern: ingen ekte navn eller timedata i dette repoet. Bare faste referansedata seedes her.

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Skift og skiftplan ----------------------------------------------------------
-- Syklusen (5 kveld / 2 helg / 5 dag / 9 fri) og arbeidstidene ligger i src/model.js.
create table public.shifts (
  id          smallint primary key,
  name        text not null,
  start_date  date not null            -- første kveldsdag i en syklus
);

-- Roller ----------------------------------------------------------------------
create table public.roles (
  name        text primary key,
  fixed       boolean not null default false,   -- faste roller kan ikke slettes
  sort_order  integer not null default 0
);

-- Teknikere (inkl. ekstra personell med fra/til) -------------------------------
create table public.technicians (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  shift_id     smallint not null references public.shifts (id),
  extra_from   date,                   -- satt for ekstra personell
  extra_until  date,
  created_at   timestamptz not null default now(),
  constraint technicians_extra_both check ((extra_from is null) = (extra_until is null)),
  constraint technicians_extra_order check (extra_until is null or extra_until >= extra_from)
);
create index technicians_shift_idx on public.technicians (shift_id);

create table public.technician_roles (
  technician_id  uuid not null references public.technicians (id) on delete cascade,
  role           text not null references public.roles (name) on update cascade on delete cascade,
  primary key (technician_id, role)
);

-- Aktiviteter (faste + egne) --------------------------------------------------
create table public.activities (
  id             text primary key,     -- faste: 'line', 'h1500', …; egne: generert id
  name           text not null,
  code           text not null check (char_length(code) between 1 and 3),
  required_role  text references public.roles (name) on update cascade on delete set null,
  kind           text not null default 'n' check (kind in ('n', '1500H')),  -- '1500H' = LMS med maskin/arbeid
  color          smallint not null check (color between 1 and 10),         -- --a1 … --a10
  fixed          boolean not null default false,
  sort_order     integer not null default 0
);

-- Maskiner og LMS-arbeid ------------------------------------------------------
create table public.machines (
  id      uuid primary key default gen_random_uuid(),
  name    text not null unique,         -- registrering, store bokstaver
  active  boolean not null default true -- true = «I dokk», false = «Ferdig»
);

create table public.work_types (
  name        text primary key,
  sort_order  integer not null default 0
);

-- Føringer --------------------------------------------------------------------
-- machine og work er tekst (ikke FK): timer blir liggende i rapporten når en maskin
-- eller et arbeid fjernes, slik som i appen.
create table public.entries (
  id             uuid primary key default gen_random_uuid(),
  date           date not null,
  technician_id  uuid not null references public.technicians (id) on delete cascade,
  activity_id    text not null references public.activities (id) on delete cascade,
  machine        text not null default '',
  work           text not null default '',
  hours          numeric(4,1) not null check (hours > 0),
  auto           boolean not null default false,   -- automatisk LMS-standard
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid default auth.uid()
);
create index entries_date_tech_idx on public.entries (date, technician_id);
create index entries_tech_idx on public.entries (technician_id);
create index entries_activity_idx on public.entries (activity_id);
-- høyst én automatisk LMS-føring per tekniker og dag
create unique index entries_one_auto_idx on public.entries (date, technician_id) where auto;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- Dager der automatisk LMS-standard er slått av for en tekniker
create table public.no_auto (
  date           date not null,
  technician_id  uuid not null references public.technicians (id) on delete cascade,
  primary key (date, technician_id)
);

-- Felles innstillinger (f.eks. auto_from / auto_done for autoFill)
create table public.app_settings (
  key    text primary key,
  value  jsonb not null
);

-- Faste referansedata (ikke personopplysninger) -------------------------------
insert into public.shifts (id, name, start_date) values
  (1, 'Skift 1', '2026-01-05'),
  (2, 'Skift 2', '2026-01-12'),
  (3, 'Skift 3', '2026-01-19')
on conflict (id) do nothing;

insert into public.roles (name, fixed, sort_order) values
  ('Assessor', true, 1), ('B1', true, 2), ('B2', true, 3), ('CRS', true, 4),
  ('Independent', true, 5), ('RGR', true, 6), ('Hot Section', true, 7), ('Borescope', true, 8)
on conflict (name) do nothing;

insert into public.activities (id, name, code, required_role, kind, color, fixed, sort_order) values
  ('line',  'Line',        'L',  null,          'n',     1, true, 1),
  ('h1500', 'LMS',         'L',  null,          '1500H', 2, true, 2),
  ('ass',   'Assessor',    'A',  'Assessor',    'n',     3, true, 3),
  ('hs',    'Hot Section', 'HS', 'Hot Section', 'n',     4, true, 4),
  ('kurs',  'Kurs',        'K',  null,          'n',     6, true, 5),
  ('mod',   'Mod',         'M',  null,          'n',     5, true, 6),
  ('ferie', 'Ferie',       'Fe', null,          'n',     8, true, 7),
  ('avsp',  'Avspasering', 'Av', null,          'n',     9, true, 8),
  ('annet', 'Annet',       'An', null,          'n',     7, true, 9)
on conflict (id) do nothing;

insert into public.work_types (name, sort_order) values
  ('Sheet', 1), ('Repair', 2), ('Inspection', 3)
on conflict (name) do nothing;

insert into public.app_settings (key, value) values
  ('auto_from', '"2026-01-01"')
on conflict (key) do nothing;
