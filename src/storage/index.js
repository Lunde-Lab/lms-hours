/* Felles grensesnitt for lagring. Adapteren velges med STORAGE i config.js ('local' | 'supabase').

   Alle adaptere eksporterer de samme funksjonene, og alle returnerer Promise:

   init(config)                 Klargjør adapteren. config er objektet fra config.js.
   loadAll()                    Hele tilstanden ({techs, shifts, roles, acts, machines, work, entries, noAuto, notes, …})
                                eller null hvis ingenting er lagret.
   saveAll(state)               Lagrer hele tilstanden. Appen bruker dette i dag, slik prototypen gjør.
   saveEntry(entry)             Ny eller endret føring: {id, date, tech, act, machine, work, hours, auto}.
   deleteEntry(id)
   upsertTech(tech)             {id, name, shift, roles, extra?: {from, until}} (extra = ekstra personell).
   deleteTech(id)               Sletter også teknikerens føringer.
   upsertActivity(act)          {id, name, code, role, type, color}. Faste aktiviteter kan ikke endres.
   deleteActivity(id)           Sletter også føringer på aktiviteten.
   upsertMachine(machine)       {id, name, active}
   deleteMachine(id)            Føringer beholder maskinnavnet.
   saveRoles(roles)             Hele rollelisten (strenger).
   saveWorkTypes(work)          Hele listen over LMS-arbeid (strenger).
   setNoAuto(date, techId, on)  Slår av/på automatisk LMS-standard for en tekniker på en dato.
   setNote(date, techId, text)  Notat for en tekniker på en dato. Tom tekst sletter notatet.
   upsertProfile(profile)       {id, name, role: 'admin' | 'leader', shift} (se src/profiles.js). Bare admin.
   deleteProfile(id)            Fjerner tilgangen. Bare admin.

   Når Supabase kobles på, skal kallene i appen gå over fra saveAll til de granulære funksjonene. */

export const METHODS = ['init','loadAll','saveAll','saveEntry','deleteEntry','upsertTech','deleteTech',
  'upsertActivity','deleteActivity','upsertMachine','deleteMachine','saveRoles','saveWorkTypes','setNoAuto','setNote','upsertProfile','deleteProfile'];

const ADAPTERS = {
  local: () => import('./local.js'),
  supabase: () => import('./supabase.js')
};

export function missingMethods(adapter){ return METHODS.filter(m => typeof adapter[m] !== 'function'); }

export async function createStorage(config = {}){
  const name = config.STORAGE || 'local';
  if (!ADAPTERS[name]) throw new Error(`Ukjent STORAGE '${name}' i config.js. Bruk 'local' eller 'supabase'.`);
  const adapter = await ADAPTERS[name]();
  const missing = missingMethods(adapter);
  if (missing.length) throw new Error(`Lagringsadapteren '${name}' mangler: ${missing.join(', ')}`);
  await adapter.init(config);
  return adapter;
}
