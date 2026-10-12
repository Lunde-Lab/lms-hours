-- UTKAST – kjøres IKKE automatisk. Krever 001_schema.sql.
-- Tilgang: bare innloggede brukere som står i allowlisten (skiftledere og admin) kan lese og skrive.
-- Bare admin kan administrere profilene (shift_leaders).
-- Anonyme brukere har ingen tilgang. Allowlisten fylles i Supabase-dashbordet, aldri i dette repoet.

-- Allowlist og profiler -------------------------------------------------------
-- Bare de som står her har tilgang: skiftledere (role = 'leader') og admin (role = 'admin').
-- Admin kan i tillegg legge til og fjerne profiler. Første admin legges inn i dashbordet.
create table public.shift_leaders (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),   -- visningsnavn i appen
  role        text not null default 'leader' check (role in ('admin', 'leader')),
  -- Profil: skiftlederens eget skift. Appen viser det åpent og de andre skiftene lukket
  -- (lette å åpne for overtid). Admin har ikke eget skift.
  shift_id    smallint references public.shifts (id),
  created_at  timestamptz not null default now(),
  constraint shift_leaders_leader_shift check (role <> 'leader' or shift_id is not null)
);

-- Hjelpefunksjoner i et skjema som ikke eksponeres av API-et.
create schema if not exists private;
create or replace function private.is_shift_leader() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shift_leaders where user_id = (select auth.uid()));
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shift_leaders where user_id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function private.is_shift_leader() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_shift_leader() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- RLS: alle leser sin egen profil, admin leser og endrer alle.
alter table public.shift_leaders enable row level security;
create policy les_profil on public.shift_leaders for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy admin_ny_profil on public.shift_leaders for insert to authenticated
  with check ((select private.is_admin()));
create policy admin_endre_profil on public.shift_leaders for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_slett_profil on public.shift_leaders for delete to authenticated
  using ((select private.is_admin()) and user_id <> (select auth.uid()));   -- ikke sin egen

-- Det må alltid være minst én admin.
create or replace function private.keep_one_admin() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.shift_leaders where role = 'admin' and user_id <> old.user_id) then
    raise exception 'Det må være minst én admin';
  end if;
  return coalesce(new, old);
end $$;
create trigger shift_leaders_keep_admin before update or delete on public.shift_leaders
  for each row execute function private.keep_one_admin();

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
