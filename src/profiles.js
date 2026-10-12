/* Profiler: hvem som har tilgang til appen. Bare skiftledere og admin har profil, og bare de kan administrere.
   Admin kan i tillegg legge til og fjerne profiler. Eksempelprofiler har bare anonyme navn.

   Proof of concept: profilen velges uten passord og lagres i nettleseren. Med Supabase blir
   profilene raden i shift_leaders (se supabase/drafts/002_rls.sql), og innlogging skjer via Supabase Auth. */

export const ROLES = {admin:'Admin', leader:'Skiftleder'};

/* Standardprofiler: én admin og én skiftleder per skift. */
export const defaultProfiles = uid => [
  {id:uid(), name:'Admin', role:'admin', shift:null},
  ...[1,2,3].map(s => ({id:uid(), name:'Skiftleder ' + s, role:'leader', shift:s}))
];

export const isAdmin = p => !!p && p.role === 'admin';
/* Alle med profil (skiftleder eller admin) kan administrere føringer, teknikere og maskiner. */
export const canManage = p => !!p && (p.role === 'admin' || p.role === 'leader');
export const profileOf = (list, id) => (list || []).find(p => p.id === id) || null;
export const roleText = p => ROLES[p.role] || p.role;

/* Gir feilmelding (tekst) eller '' hvis profilen kan legges til. */
export function checkNew(list, {name, role, shift}){
  const n = String(name || '').trim();
  if (!n) return 'Skriv navnet på profilen';
  if (!ROLES[role]) return 'Velg rolle';
  if (role === 'leader' && !shift) return 'Velg skift for skiftlederen';
  if (list.some(p => p.name.toLowerCase() === n.toLowerCase())) return 'Det finnes allerede en profil med det navnet';
  return '';
}
/* Gir feilmelding (tekst) eller '' hvis profilen kan fjernes. me = innlogget profil. */
export function checkRemove(list, id, me){
  const p = profileOf(list, id); if (!p) return 'Fant ikke profilen';
  if (me && p.id === me.id) return 'Du kan ikke fjerne din egen profil';
  if (isAdmin(p) && list.filter(isAdmin).length < 2) return 'Det må være minst én admin';
  return '';
}

/* Sikrer gyldige profiler i lagret tilstand (eldre tilstand har ingen). */
export function migrateProfiles(list, uid){
  let ps = Array.isArray(list) ? list.filter(p => p && p.id && p.name && ROLES[p.role]) : [];
  if (!ps.length) return defaultProfiles(uid);
  ps = ps.map(p => ({id:p.id, name:p.name, role:p.role, shift:p.role === 'leader' ? (+p.shift || null) : null}));
  if (!ps.some(isAdmin)) ps.unshift({id:uid(), name:'Admin', role:'admin', shift:null});
  return ps;
}
