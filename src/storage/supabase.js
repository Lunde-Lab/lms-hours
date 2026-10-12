/* Supabase-adapter: TOM STUB. Ikke koblet til noen database ennå.
   Samme grensesnitt som local.js (se storage/index.js). Skjema: supabase/drafts/001_schema.sql, RLS: 002_rls.sql.

   TODO før denne tas i bruk:
   - Opprett prosjekt, kjør utkastene i supabase/drafts/ manuelt og legg skiftledere i allowlist (shift_leaders).
   - Fyll SUPABASE_URL og SUPABASE_ANON_KEY i config.js (lokalt) og i deploy-workflowen (fra repo-variabler).
   - Last supabase-js som ES-modul (f.eks. fra esm.sh med låst versjon) og opprett klienten i init().
   - Innlogging for skiftledere (magisk lenke e.l.) før loadAll().
   - Gå over fra saveAll til granulære kall i state.js/visningene.
   - Flytt autoFill (automatisk LMS-standard) til databasen eller gjør den idempotent på tvers av klienter. */

const notReady = name => () => Promise.reject(new Error(`Supabase-adapteren er ikke implementert ennå (${name}). Bruk STORAGE: 'local' i config.js.`));

/* TODO: createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) og sjekk innlogging */
export const init = notReady('init');
/* TODO: les shifts, technicians (+ technician_roles), roles, activities, machines, work_types, entries, no_auto, day_notes
   og bygg samme form som local.js gir: {techs, shifts, roles, acts, machines, work, entries, noAuto, notes, …} */
export const loadAll = notReady('loadAll');
/* TODO: ikke i bruk med Supabase; erstattes av de granulære kallene under */
export const saveAll = notReady('saveAll');
/* TODO: upsert i entries (date, technician_id, activity_id, machine, work, hours, auto) */
export const saveEntry = notReady('saveEntry');
/* TODO: delete fra entries */
export const deleteEntry = notReady('deleteEntry');
/* TODO: upsert i technicians (name, shift_id, extra_from, extra_until) og synk technician_roles */
export const upsertTech = notReady('upsertTech');
/* TODO: delete fra technicians (entries slettes via on delete cascade) */
export const deleteTech = notReady('deleteTech');
/* TODO: upsert i activities (bare egne, fixed = false) */
export const upsertActivity = notReady('upsertActivity');
/* TODO: delete fra activities (bare egne) */
export const deleteActivity = notReady('deleteActivity');
/* TODO: upsert i machines */
export const upsertMachine = notReady('upsertMachine');
/* TODO: delete fra machines (entries.machine er tekst og blir stående) */
export const deleteMachine = notReady('deleteMachine');
/* TODO: synk roles (faste roller kan ikke slettes) */
export const saveRoles = notReady('saveRoles');
/* TODO: synk work_types */
export const saveWorkTypes = notReady('saveWorkTypes');
/* TODO: insert/delete i no_auto */
export const setNoAuto = notReady('setNoAuto');
/* TODO: upsert/delete i day_notes */
export const setNote = notReady('setNote');
