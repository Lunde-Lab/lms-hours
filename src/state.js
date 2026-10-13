/* Applikasjonstilstand (S), UI-tilstand og avledede oppslag. Lagring går via storage-adapteren. */
import { dn, isoOf, todayIso, uid } from './util.js';
import { VERSION, AUTO_FROM, LMS, LOCKED, FIXED_ROLES, WORK_TYPES, freshState as fresh } from './model.js';
import * as P from './schedule.js';

export let S;
export function setState(s){ S = s; }
export const freshState = () => fresh(uid);

let store;
export function setStorage(adapter){ store = adapter; }
export async function load(){ const o = await store.loadAll(); if (o) { S = o; return true; } return false; }
export function save(){ store.saveAll(S); reindex(); }

export const UI = { oppOpen:{}, rapOpen:{}, tab:'kal', dayOpen:false, date: todayIso(), foreOpen:{}, cal: todayIso().slice(0,7), from:null, to:null, sheet:null };

/* ---------- oppslag ---------- */
let IDX = new Map();
export function reindex(){ IDX = new Map(); for (const e of S.entries){ const k = e.date+'|'+e.tech; if(!IDX.has(k)) IDX.set(k,[]); IDX.get(k).push(e);} }
export const entriesOf = (tech,date) => IDX.get(date+'|'+tech) || [];
export const act = id => S.acts.find(a => a.id === id);
export const tech = id => S.techs.find(t => t.id === id);
export const shiftOf = id => S.shifts.find(s => s.id === id);
export const cycle = () => P.cycle(S);

/* skiftplan mot gjeldende tilstand */
export const phase = (shiftId, date) => P.phase(S, shiftId, date);
export const workHours = (key, date) => P.workHours(S, key, date);
export const timeTxt = (key, date) => P.timeTxt(S, key, date);
export const stdHours = (t, date) => P.stdHours(S, t, date);
export const extraUntil = (shift, from, days) => P.extraUntil(S, shift, from, days);

export const sumH = arr => arr.reduce((a,e) => a + (+e.hours||0), 0);
/* Aktiviteter som føres med maskin og arbeid: LMS, og faste aktiviteter merket mw (Line, Mod). */
export const hasMW = a => !!a && (a.type === '1500H' || !!a.mw);
export const mwText = e => [e.machine, e.work].filter(Boolean).join(' · ');
/* Maskinene en aktivitet kan føres på: Line alle, LMS og Mod bare de som er «I dokk». Valgt maskin tas alltid med. */
export const machinesFor = (a, current) => S.machines.filter(m => (a && a.allM) || m.active || m.name === current);
/* LMS-timer uten maskin eller arbeid: det skiftlederen må fylle ut (gjelder fra og med i dag og bakover) */
export const lacksMW = e => act(e.act)?.type === '1500H' && +e.hours > 0 && (!e.machine || !e.work);
export const label = e => { const a = act(e.act); if (!a) return 'Ukjent'; return hasMW(a) ? [a.name, e.machine, e.work].filter(Boolean).join(' · ') : a.name; };
export const color = a => 'var(--a'+((a && a.color) || 7)+')';
export const allowed = t => S.acts.filter(a => !a.role || t.roles.includes(a.role));
export function dominant(list){
  const m = new Map(); for (const e of list) m.set(e.act, (m.get(e.act)||0) + (+e.hours||0));
  let best = null, bv = -1; for (const [k,v] of m) if (v > bv){ best = k; bv = v; }
  return {act: act(best), split: list.length > 1};
}
export const activeOn = (t, date) => !t.extra || (date >= t.extra.from && date <= t.extra.until);
export const workDay = (t, date) => activeOn(t, date) && phase(t.shift, date).key !== 'F';
export const manualOf = (techId, date) => entriesOf(techId, date).filter(e => !e.auto);
/* Notat per tekniker og dag (S.notes['dato|tekniker']). Tomt notat fjernes. */
export const noteOf = (techId, date) => (S.notes && S.notes[date + '|' + techId]) || '';
export function setNote(techId, date, text){
  S.notes = S.notes || {}; const k = date + '|' + techId; const v = String(text || '').trim();
  if (v) S.notes[k] = String(text); else delete S.notes[k];
}
/* Føringer på en fridag i skiftplanen er overtid. Føres som vanlig; regnes ut fra skiftplanen. */
export const offDay = (t, date) => phase(t.shift, date).key === 'F';
export const overtime = e => { const t = tech(e.tech); return !!t && offDay(t, e.date); };

/* ---------- LMS-standard ---------- */
/* fyller det som er igjen av arbeidsdagen med én automatisk LMS-føring */
export function recomputeAuto(techId, date){
  const t = tech(techId); if (!t) return;
  const list = S.entries.filter(e => e.tech === techId && e.date === date);
  const autos = list.filter(e => e.auto); const keep = autos[0];
  if (autos.length > 1) S.entries = S.entries.filter(e => !autos.slice(1).includes(e));
  const rest = P.lmsFill(stdHours(t, date), sumH(list.filter(e => !e.auto)));
  if (rest > 0 && !S.noAuto[date + '|' + techId] && workDay(t, date)){
    if (keep) keep.hours = rest;
    else S.entries.push({id:uid(), date, tech:techId, act:LMS, machine:'', work:'', hours:rest, auto:true});
  } else if (keep) S.entries = S.entries.filter(e => e !== keep);
}
/* fører LMS-standard for alle arbeidsdager uten føringer, fra forrige kjøring til og med i dag */
export function autoFill(){
  reindex();
  const today = dn(todayIso());
  const start = Math.max(dn(S.autoFrom || AUTO_FROM), S.autoDone ? dn(S.autoDone) + 1 : 0);
  if (start > today) return;
  for (let n = start; n <= today; n++){ const d = isoOf(n);
    for (const t of S.techs){
      if (entriesOf(t.id, d).length) continue;
      if (!workDay(t, d) || S.noAuto[d + '|' + t.id]) continue;
      S.entries.push({id:uid(), date:d, tech:t.id, act:LMS, machine:'', work:'', hours: stdHours(t, d), auto:true});
    }
  }
  S.autoDone = isoOf(today); save();
}

/* ---------- flere dager for én tekniker (dra i kalenderen) ---------- */
/* Datoene en områdeføring gjelder: arbeidsdagene i perioden, eller alle aktive dager (overtid) hvis perioden bare er fri. */
export function rangeDays(techId, from, to){
  const t = tech(techId); if (!t) return [];
  const all = []; for (let n = dn(from); n <= dn(to); n++){ const d = isoOf(n); if (activeOn(t, d)) all.push(d); }
  const work = all.filter(d => workDay(t, d));
  return work.length ? work : all;
}
/* Erstatter alle føringer på dagene med én hel dag av aktiviteten. Gir antall dager. */
export function applyRange(techId, from, to, actId, machine = '', work = ''){
  const t = tech(techId); const a = act(actId); if (!t || !a) return 0;
  const days = rangeDays(techId, from, to); const set = new Set(days);
  S.entries = S.entries.filter(e => !(e.tech === techId && set.has(e.date)));
  for (const d of days) S.entries.push({id:uid(), date:d, tech:techId, act:a.id, machine:hasMW(a)?machine:'', work:hasMW(a)?work:'', hours:stdHours(t, d)});
  reindex(); return days.length;
}
/* Fjerner alle føringer i perioden og slår LMS-standard på igjen (føres automatisk til og med i dag). */
export function clearRange(techId, from, to){
  const t = tech(techId); if (!t) return 0;
  const today = todayIso(); let n = 0;
  for (let i = dn(from); i <= dn(to); i++){ const d = isoOf(i);
    const before = S.entries.length;
    S.entries = S.entries.filter(e => !(e.tech === techId && e.date === d));
    if (S.entries.length !== before || S.noAuto[d + '|' + techId]) n++;
    delete S.noAuto[d + '|' + techId];
    if (d <= today) recomputeAuto(techId, d);
  }
  reindex(); return n;
}

/* ---------- migrering av lagret tilstand ---------- */
export function migrate(o){
  const f = freshState();
  o.sched = f.sched; o.days = f.days; o.shifts = f.shifts; delete o.hours;
  LOCKED.forEach((id, i) => { const fa = f.acts.find(a => a.id === id); const cur = o.acts.find(a => a.id === id);
    if (!cur) o.acts.splice(Math.min(i, o.acts.length), 0, fa); else { cur.name = fa.name; cur.role = fa.role; cur.type = fa.type; for (const k of ['mw', 'allM']) if (fa[k]) cur[k] = true; else delete cur[k]; }
    if (fa.role && !o.roles.includes(fa.role)) o.roles.push(fa.role); });
  o.acts = o.acts.filter(a => a.id !== 'eo'); o.entries = (o.entries || []).filter(e => e.act !== 'eo');
  for (const t of o.techs) t.roles = t.roles.filter(r => r !== 'Engine Overhaul');
  o.roles = (o.roles || []).filter(r => r !== 'Engine Overhaul');
  o.roles = [...FIXED_ROLES, ...(o.roles || []).filter(r => !FIXED_ROLES.includes(r))];
  o.work = [...WORK_TYPES(), ...(o.work || []).filter(w => !WORK_TYPES().includes(w))];
  o.noAuto = o.noAuto || {}; o.notes = o.notes || {}; if (!o.autoFrom || o.autoFrom > AUTO_FROM){ o.autoFrom = AUTO_FROM; o.autoDone = null; }
  if ((o.v || 0) < 7) for (const e of o.entries) if (e.auto){ e.machine = ''; e.work = ''; }
  o.v = VERSION; return o; }
