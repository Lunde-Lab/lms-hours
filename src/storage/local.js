/* Lagring i nettleseren (localStorage), samme nøkkel og format som prototypen.
   Hele tilstanden ligger som én JSON-blob; de granulære funksjonene endrer bloben. */
const KEY = 'lms-timer-poc-v1';

function read(){ try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch(e){} return null; }
function write(s){ try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){} }
function update(fn){ const s = read(); if (!s) return; fn(s); write(s); }
function upsert(list, item){ const i = list.findIndex(x => x.id === item.id); if (i < 0) list.push(item); else list[i] = item; }

export async function init(){}
export async function loadAll(){ return read(); }
export async function saveAll(state){ write(state); }

export async function saveEntry(entry){ update(s => upsert(s.entries, entry)); }
export async function deleteEntry(id){ update(s => { s.entries = s.entries.filter(e => e.id !== id); }); }
export async function upsertTech(tech){ update(s => upsert(s.techs, tech)); }
export async function deleteTech(id){ update(s => { s.techs = s.techs.filter(t => t.id !== id); s.entries = s.entries.filter(e => e.tech !== id); }); }
export async function upsertActivity(act){ update(s => upsert(s.acts, act)); }
export async function deleteActivity(id){ update(s => { s.acts = s.acts.filter(a => a.id !== id); s.entries = s.entries.filter(e => e.act !== id); }); }
export async function upsertMachine(machine){ update(s => upsert(s.machines, machine)); }
export async function deleteMachine(id){ update(s => { s.machines = s.machines.filter(m => m.id !== id); }); }
export async function saveRoles(roles){ update(s => { s.roles = [...roles]; }); }
export async function saveWorkTypes(work){ update(s => { s.work = [...work]; }); }
export async function setNoAuto(date, techId, on){ update(s => { s.noAuto = s.noAuto || {}; const k = date + '|' + techId; if (on) s.noAuto[k] = true; else delete s.noAuto[k]; }); }
export async function setNote(date, techId, text){ update(s => { s.notes = s.notes || {}; const k = date + '|' + techId; if (String(text || '').trim()) s.notes[k] = String(text); else delete s.notes[k]; }); }
export async function upsertProfile(profile){ update(s => { s.profiles = s.profiles || []; upsert(s.profiles, profile); }); }
export async function deleteProfile(id){ update(s => { s.profiles = (s.profiles || []).filter(p => p.id !== id); }); }
