/* Eksempeldata: anonyme teknikere og tilfeldige (seedede) føringer. Aldri ekte navn eller timedata her. */
import { dn, isoOf, todayIso, uid } from './util.js';
import { AUTO_FROM } from './model.js';
import { S, setState, freshState, cycle, stdHours, save } from './state.js';

function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function loadDemo(){
  setState(freshState()); S.demo = true;
  const R = rng(7);
  const roleMap = {'Tekniker 1-01':['Assessor'],'Tekniker 1-07':['Hot Section'],'Tekniker 2-01':['Assessor'],'Tekniker 2-09':['Hot Section'],'Tekniker 3-01':['Assessor','Hot Section'],'Tekniker 3-11':['Hot Section']};
  S.techs.forEach((t, i) => { t.roles = [i % 5 === 4 ? 'B2' : 'B1', ...(roleMap[t.name] || []), ...(i % 4 === 0 ? ['CRS'] : []), ...(i % 7 === 3 ? ['Borescope'] : [])]; });
  /* Alle står på LMS som standard (fylles av autoFill). Per skift og arbeidsperiode gjør 1–2 teknikere noe annet. */
  const lastDay = dn(todayIso()) + 21; const first = dn(AUTO_FROM);
  const workLen = S.days.K + S.days.H + S.days.D;
  for (const sh of S.shifts){
    const st = dn(sh.start); const c = cycle();
    for (let p0 = st + Math.floor((first - st) / c) * c; p0 <= lastDay; p0 += c){
      const team = S.techs.filter(t => t.shift === sh.id);
      const k = R() < 0.5 ? 1 : 2; const used = new Set();
      for (let j = 0; j < k; j++){
        let t; do { t = team[Math.floor(R() * team.length)]; } while (used.has(t.id)); used.add(t.id);
        const pool = ['line','line','kurs','mod','ferie','avsp', ...(t.roles.includes('Assessor') ? ['ass','ass'] : []), ...(t.roles.includes('Hot Section') ? ['hs','hs'] : [])];
        const aid = pool[Math.floor(R() * pool.length)];
        const len = aid === 'ferie' ? 5 + Math.floor(R() * 4) : 1 + Math.floor(R() * 3);
        const off = Math.floor(R() * Math.max(1, workLen - len + 1));
        const split = aid === 'kurs' || aid === 'ass' ? R() < 0.5 : false;
        for (let n = p0 + off; n < p0 + Math.min(workLen, off + len); n++){
          const d = isoOf(n); if (n < first || n > lastDay) continue;
          const std = stdHours(t, d);
          if (split){ const h = 4; S.entries.push({id:uid(), date:d, tech:t.id, act:aid, machine:'', work:'', hours:h}, {id:uid(), date:d, tech:t.id, act:'h1500', machine:'', work:'', hours:std - h, auto:true}); }
          else S.entries.push({id:uid(), date:d, tech:t.id, act:aid, machine:'', work:'', hours:std});
        }
      }
    }
  }
  save();
}
