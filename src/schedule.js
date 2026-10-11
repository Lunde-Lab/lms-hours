/* Rene funksjoner for skiftplan og arbeidstid. Ingen global tilstand:
   `plan` er {shifts, days, sched} (samme form som tilstanden, se defaultPlan i model.js). */
import { dn, isoOf, udate, span } from './util.js';

export const cycle = plan => plan.days.K + plan.days.H + plan.days.D + plan.days.F;

/* Hvor i syklusen et skift er på en dato: {key:'K'|'H'|'D'|'F', idx (1-basert), len} */
export function phase(plan, shiftId, date){
  const s = plan.shifts.find(x => x.id === shiftId); const c = cycle(plan);
  const p = (((dn(date) - dn(s.start)) % c) + c) % c;
  const {K,H,D} = plan.days;
  if (p < K) return {key:'K', idx:p+1, len:K};
  if (p < K+H) return {key:'H', idx:p-K+1, len:H};
  if (p < K+H+D) return {key:'D', idx:p-K-H+1, len:D};
  return {key:'F', idx:p-K-H-D+1, len:plan.days.F};
}

/* Arbeidstid for en periode på en dato: fredag har egne tider for Kveld og Dag. null på fridag. */
export function times(plan, key, date){
  if (key === 'F') return null;
  const sc = plan.sched[key];
  if (key === 'H') return sc.all;
  return udate(date).getUTCDay() === 5 ? sc.fr : sc.mt;
}
export function workHours(plan, key, date){ const t = times(plan, key, date); return t ? span(t) : (+plan.sched.ot || 0); }
export function timeTxt(plan, key, date){ const t = times(plan, key, date); return t ? t[0]+'–'+t[1] : 'overtid'; }

/* Normal arbeidsdag i timer for en tekniker ({shift}) på en dato. */
export function stdHours(plan, tech, date){ return workHours(plan, phase(plan, tech.shift, date).key, date); }

/* Siste dato for ekstra personell som skal gå `days` skiftdager (ikke fridager) fra `from`. */
export function extraUntil(plan, shiftId, from, days){
  let n = dn(from), c = 0;
  for (let g = 0; g < 400; g++, n++){ if (phase(plan, shiftId, isoOf(n)).key !== 'F'){ c++; if (c >= days) return isoOf(n); } }
  return isoOf(n);
}

/* LMS-standard fyller resten av dagen: timer igjen etter manuelle føringer, rundet til nærmeste halvtime.
   0 eller negativt betyr at det ikke skal være noen automatisk LMS-føring. */
export function lmsFill(std, manualHours){ return Math.round((std - manualHours) * 2) / 2; }
