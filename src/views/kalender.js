/* Kalender: måned per tekniker med fargestriper per aktivitet, dra over flere dager på én rad,
   og hurtigtaster M/A for LMS-dager. */
import { isoOf, todayIso, udate, ddmm, fmtH, esc, dn, MON, WDS } from '../util.js';
import { PH } from '../model.js';
import { S, UI, save, act, tech, entriesOf, hasMW, mwText, phase, timeTxt, sumH, label, color, activeOn, dominant, recomputeAuto } from '../state.js';
import { render } from '../render.js';
import { openSheet, openRange } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { xtag } from '../ui/bits.js';
import { demoBanner } from './foring.js';

export function vKal(){
  const [y,m] = UI.cal.split('-').map(Number);
  const first = dn(`${y}-${String(m).padStart(2,'0')}-01`);
  const nd = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from({length:nd}, (_,i) => isoOf(first+i));
  const today = todayIso();
  const cols = days.length + 1;
  let h = demoBanner() + `<div class="row" style="justify-content:space-between">
     <div class="row"><button class="icon-btn" data-action="cal" data-d="-1" aria-label="Forrige måned">‹</button><button class="icon-btn" data-action="cal" data-d="1" aria-label="Neste måned">›</button><h2>${MON[m-1]} ${y}</h2><button class="btn primary" data-action="day-open" data-d="${today}">Føring</button><button class="btn sm" data-action="extra" data-from="${days.includes(today) ? today : days[0]}">+ Ekstra personell</button></div>
     <div class="legend">
     ${S.acts.map(a => `<span><i class="sw" style="background:${color(a)};border-color:transparent"></i>${esc(a.name)}</span>`).join('')}</div></div>`;
  h += `<div class="cal-wrap"><table class="cal"><thead><tr><th class="nm">Tekniker</th>${days.map(d => { const u = udate(d); const wd = u.getUTCDay(); return `<th class="day ${d===today?'today':''} ${wd===0||wd===6?'we':''}" data-action="day-open" data-d="${d}" title="Føring ${ddmm(d)}"><span class="dd">${u.getUTCDate()}</span>${WDS[wd]}</th>`; }).join('')}</tr></thead><tbody>`;
  S.shifts.forEach((s, i) => {
    if (i) h += `<tr class="gap"><td class="nm"></td><td colspan="${cols-1}"></td></tr>`;
    h += `<tr class="grp"><td class="nm">${esc(s.name)}</td>${days.map(d => { const p = phase(s.id,d).key; return `<td class="${p} ${d===today?'today':''}">${p==='F'?'':p}</td>`; }).join('')}</tr>`;
    for (const t of S.techs.filter(t => t.shift === s.id && (!t.extra || (t.extra.until >= days[0] && t.extra.from <= days[days.length-1])))){
      h += `<tr><td class="nm" title="${esc(t.name)}">${esc(t.name)}${xtag(t)}</td>`;
      const info = days.map(d => {
        if (!activeOn(t, d)) return {d, out:true};
        const p = phase(s.id, d).key; const list = entriesOf(t.id, d).filter(e => +e.hours > 0);   /* linjer med 0 t vises ikke i kalenderen */
        const o = {d, p, key:'', bg:'', lab:'', short:'', sub:'', subShort:'', prev:false,
          ttl: list.length ? list.map(e => label(e) + ' ' + fmtH(e.hours) + ' t').join(', ') + (p === 'F' ? ' · overtid' : '') : (p === 'F' ? 'Fri' : PH[p] + ' ' + timeTxt(p, d))};
        if (list.length){
          const {act:a0} = dominant(list); const tot = sumH(list) || 1;
          if (list.length > 1){
            let x = 0; o.bg = 'linear-gradient(90deg,' + list.map(e => { const c = color(act(e.act)); const f = x; x += (+e.hours || 0) / tot * 100; return `${c} ${f}% ${x}%`; }).join(',') + ')';
            o.key = 'split|' + d; o.short = '';
          } else {
            const e = list[0]; const is15 = a0 && a0.type === '1500H'; const mw = hasMW(a0);
            o.bg = color(a0); o.key = (a0 ? a0.id : '?') + (mw ? '|' + (e.machine || '') + '|' + (e.work || '') : '');
            o.lab = a0 ? a0.name : '?';
            o.short = is15 ? 'LMS' : (a0 ? a0.code : '?');
            /* to linjer: aktivitet øverst, maskin og arbeid under (LMS, Line, Mod) */
            if (mw){ o.sub = mwText(e); o.subShort = e.machine || e.work || ''; }
          }
        } else if (d > today && p !== 'F' && !S.noAuto[d + '|' + t.id]){
          o.bg = color(act('h1500')); o.key = 'prev'; o.prev = true; o.lab = 'LMS'; o.short = 'LMS';
        }
        return o;
      });
      info.forEach((o, i) => {
        if (o.out){ h += '<td class="out"></td>'; return; }
        let strip = '';
        if (o.key){
          const st = i === 0 || info[i-1].key !== o.key, en = i === info.length - 1 || info[i+1].key !== o.key;
          let len = 1; if (st) while (i + len < info.length && info[i+len].key === o.key) len++;
          const txt = st ? (len > 1 ? o.lab : o.short) : ''; const sub = st ? (len > 1 ? o.sub : o.subShort) : '';
          strip = `<div class="strip${st ? ' rs' : ''}${en ? ' re' : ''}${o.prev ? ' prev' : ''}" style="background:${o.bg}">${txt ? `<span class="sl${sub ? ' two' : ''}" style="max-width:calc(${len} * 100% - 8px)">${sub ? `<span>${esc(txt)}</span><span>${esc(sub)}</span>` : esc(txt)}</span>` : ''}</div>`;
        }
        h += `<td class="cell ${o.p} ${o.d === today ? 'today' : ''}" data-action="cell" data-t="${t.id}" data-d="${o.d}" title="${esc(t.name + ' · ' + ddmm(o.d) + ' · ' + o.ttl)}">${strip}</td>`;
      });
      h += `</tr>`;
    }
  });
  h += `</tbody></table></div><div class="muted" style="font-size:13px">Trykk på en dag for å føre eller endre den, eller på datoen øverst for å føre hele dagen for alle. Dra over flere dager på én rad for å føre dem samtidig. Hurtigtast: hold musepekeren over en LMS-dag og trykk <kbd>M</kbd> for å bytte maskin, <kbd>A</kbd> for å bytte arbeid (Shift baklengs).</div>`;
  return h;
}

export const actions = {
  cell(el){ if (!dragged) openSheet(el.dataset.t, el.dataset.d); },
  cal(el){ let [y,m] = UI.cal.split('-').map(Number); m += +el.dataset.d; if (m < 1){ m = 12; y--; } if (m > 12){ m = 1; y++; } UI.cal = y+'-'+String(m).padStart(2,'0'); render(); }
};

/* ---------- dra: velg flere dager på samme rad (bare mus/penn; berøring ruller som før) ---------- */
let drag = null, dragged = false;
function markSel(){
  for (const td of document.querySelectorAll('.cal td.cell.sel')) td.classList.remove('sel');
  if (!drag) return;
  const [a, b] = [drag.from, drag.to].sort();
  for (const td of drag.row.querySelectorAll('td.cell[data-d]')) if (td.dataset.d >= a && td.dataset.d <= b) td.classList.add('sel');
}
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.pointerType === 'touch' || UI.tab !== 'kal') return;
  const td = e.target.closest && e.target.closest('td.cell[data-t]'); if (!td) return;
  e.preventDefault();   /* ingen tekstmarkering mens man drar */
  drag = {t: td.dataset.t, from: td.dataset.d, to: td.dataset.d, row: td.parentElement};
  markSel();
});
/* Pekeren kan gli over en annen rad; da brukes bare datoen (kolonnen), raden er den man startet på. */
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const td = e.target.closest && e.target.closest('td.cell[data-d]');
  if (td && td.dataset.d !== drag.to){ drag.to = td.dataset.d; markSel(); }
});
document.addEventListener('pointerup', () => {
  if (!drag) return; const d = drag; drag = null; markSel();
  if (d.from === d.to) return;   /* vanlig klikk: data-action="cell" åpner dagen */
  const [a, b] = [d.from, d.to].sort();
  dragged = true;   /* klikket som følger slippet skal ikke åpne én dag */
  setTimeout(() => { dragged = false; openRange(d.t, a, b); }, 0);
});
document.addEventListener('pointercancel', () => { drag = null; markSel(); });

/* ---------- hurtigtaster: M / A blar i maskin / arbeid på LMS-dagen under musepekeren ---------- */
document.addEventListener('mouseover', e => {
  const td = e.target.closest && e.target.closest('td.cell[data-t]');
  UI.hover = td ? {t: td.dataset.t, d: td.dataset.d} : null;
});
function cycleLms(field, dir){
  const {t: techId, d: date} = UI.hover; const t = tech(techId); if (!t) return;
  let list = entriesOf(techId, date).filter(e => act(e.act)?.type === '1500H');
  if (!entriesOf(techId, date).length){ recomputeAuto(techId, date); save(); list = entriesOf(techId, date).filter(e => act(e.act)?.type === '1500H'); }
  if (!list.length){ toast('Ingen LMS-timer på denne dagen'); return; }
  const opts = field === 'machine' ? ['', ...S.machines.filter(m => m.active).map(m => m.name)] : ['', ...S.work];
  if (opts.length < 2){ toast(field === 'machine' ? 'Ingen aktive maskiner. Legg til i Oppsett.' : 'Ingen arbeid å velge'); return; }
  const cur = opts.indexOf(list[0][field] || '');
  const next = opts[((cur < 0 ? 0 : cur) + dir + opts.length) % opts.length];
  for (const e of list) e[field] = next;
  save(); render();
  toast(t.name.split(' ')[0] + ' ' + ddmm(date) + ': ' + (field === 'machine' ? (next || 'Ingen maskin') : (next || 'Arbeid –')));
}
/* true hvis tasten ble brukt */
export function onKey(e){
  if (drag && e.key === 'Escape'){ drag = null; markSel(); return true; }
  if (UI.tab === 'kal' && UI.hover && !UI.sheet && !UI.dlg && !UI.dayOpen && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){
    const k = e.key.toLowerCase();
    if (k === 'm' || k === 'a'){ e.preventDefault(); cycleLms(k === 'm' ? 'machine' : 'work', e.shiftKey ? -1 : 1); return true; }
  }
  return false;
}
