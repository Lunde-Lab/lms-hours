-- UTKAST – kjøres IKKE automatisk. Krever 001_schema.sql.
-- Tilgang: bare innloggede brukere som står i allowlisten (skiftledere) kan lese og skrive.
-- Anonyme brukere har ingen tilgang. Allowlisten fylles i Supabase-dashbordet, aldri i dette repoet.

-- Allowlist -------------------------------------------------------------------
create table public.shift_leaders (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
-- RLS uten policyer: ingen klient kan lese eller endre listen, bare service role / dashbordet.
alter table public.shift_leaders enable row level security;

-- Hjelpefunksjon i et skjema som ikke eksponeres av API-et.
create schema if not exists private;
create or replace function private.is_shift_leader() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shift_leaders where user_id = (select auth.uid()));
$$;
revoke all on function private.is_shift_leader() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_shift_leader() to authenticated;

-- Ingen tilgang for anonyme ---------------------------------------------------
revoke all on all tables in schema public from anon;

-- Vanlige tabeller: skiftledere kan alt ----------------------------------------
do $$
declare t text;
begin
  foreach t in array array['shifts','technicians','technician_roles','machines','work_types',
                           'entries','no_auto','day_notes','app_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select private.is_shift_leader()))
         with check ((select private.is_shift_leader()))',
      'skiftledere_' || t, t);
  end loop;
end $$;

-- Roller og aktiviteter: alle skiftledere leser, men faste rader kan ikke endres ----
alter table public.roles enable row level security;
create policy skiftledere_les_roles on public.roles for select to authenticated
  using ((select private.is_shift_leader()));
create policy skiftledere_ny_role on public.roles for insert to authenticated
  with check ((select private.is_shift_leader()) and not fixed);
create policy skiftledere_endre_role on public.roles for update to authenticated
  using ((select private.is_shift_leader()) and not fixed)
  with check ((select private.is_shift_leader()) and not fixed);
create policy skiftledere_slett_role on public.roles for delete to authenticated
  using ((select private.is_shift_leader()) and not fixed);

alter table public.activities enable row level security;
create policy skiftledere_les_activities on public.activities for select to authenticated
  using ((select private.is_shift_leader()));
create policy skiftledere_ny_activity on public.activities for insert to authenticated
  with check ((select private.is_shift_leader()) and not fixed);
create policy skiftledere_endre_activity on public.activities for update to authenticated
  using ((select private.is_shift_leader()) and not fixed)
  with check ((select private.is_shift_leader()) and not fixed);
create policy skiftledere_slett_activity on public.activities for delete to authenticated
  using ((select private.is_shift_leader()) and not fixed);
