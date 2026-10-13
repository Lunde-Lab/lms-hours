/* Kalender: måned per tekniker med fargestriper per aktivitet, og dra over flere dager på én rad. */
import { isoOf, todayIso, udate, ddmm, fmtH, esc, dn, isoWeek, MON, WDS } from '../util.js';
import { PH } from '../model.js';
import { S, UI, act, entriesOf, hasMW, mwText, lacksMW, noteOf, phase, timeTxt, sumH, label, color, activeOn, dominant } from '../state.js';
import { render } from '../render.js';
import { openSheet, openRange } from '../ui/sheet.js';
import { xtag } from '../ui/bits.js';
import { toast } from '../ui/toast.js';

export function vKal(){
  const [y,m] = UI.cal.split('-').map(Number);
  const first = dn(`${y}-${String(m).padStart(2,'0')}-01`);
  const nd = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from({length:nd}, (_,i) => isoOf(first+i));
  const today = todayIso();
  const cols = days.length + 1;
  let missing = 0;
  let h = `<div class="row" style="justify-content:space-between">
     <div class="row"><button class="icon-btn" data-action="cal" data-d="-1" aria-label="Forrige måned">‹</button><button class="icon-btn" data-action="cal" data-d="1" aria-label="Neste måned">›</button><h2>${MON[m-1]} ${y}</h2>${UI.cal !== today.slice(0,7) ? '<button class="btn sm" data-action="cal-today">I dag</button>' : ''}<button class="btn sm" data-action="extra" data-from="${days.includes(today) ? today : days[0]}">+ Ekstra personell</button></div>
     <div class="legend">
     ${S.acts.map(a => `<span><i class="sw" style="background:${color(a)};border-color:transparent"></i>${esc(a.name)}</span>`).join('')}</div></div>`;
  /* ukerad over datoene: «Uke 42» over dagene i hver uke */
  const weeks = []; for (const d of days){ const w = isoWeek(d); if (weeks.length && weeks[weeks.length-1].w === w) weeks[weeks.length-1].n++; else weeks.push({w, n:1}); }
  h += `MISSING<div class="cal-wrap"><table class="cal"><thead><tr class="wk"><th class="nm"></th>${weeks.map(x => `<th colspan="${x.n}">${x.n > 1 ? 'Uke ' : 'U'}${x.w}</th>`).join('')}</tr><tr class="dt"><th class="nm">Tekniker</th>${days.map(d => { const u = udate(d); const wd = u.getUTCDay(); return `<th class="day ${d===today?'today':''} ${wd===0||wd===6?'we':''}"><span class="dd">${u.getUTCDate()}</span>${WDS[wd]}</th>`; }).join('')}</tr></thead><tbody>`;
  S.shifts.forEach((s, i) => {
    if (i) h += `<tr class="gap"><td class="nm"></td><td colspan="${cols-1}"></td></tr>`;
    h += `<tr class="grp"><td class="nm">${esc(s.name)}</td>${days.map(d => { const p = phase(s.id,d).key; return `<td class="${p} ${d===today?'today':''}">${p==='F'?'':p}</td>`; }).join('')}</tr>`;
    for (const t of S.techs.filter(t => t.shift === s.id && (!t.extra || (t.extra.until >= days[0] && t.extra.from <= days[days.length-1])))){
      h += `<tr><td class="nm" title="${esc(t.name)}">${esc(t.name)}${xtag(t)}</td>`;
      const info = days.map(d => {
        if (!activeOn(t, d)) return {d, out:true};
        const p = phase(s.id, d).key; const list = entriesOf(t.id, d).filter(e => +e.hours > 0);   /* linjer med 0 t vises ikke i kalenderen */
        const o = {d, p, key:'', bg:'', lab:'', sub:'', subShort:'', prev:false,
          ttl: list.length ? list.map(e => label(e) + ' ' + fmtH(e.hours) + ' t').join(', ') + (p === 'F' ? ' · overtid' : '') : (p === 'F' ? 'Fri' : PH[p] + ' ' + timeTxt(p, d))};
        /* LMS uten maskin eller arbeid (i dag og bakover): oransje strek under stripen */
        o.miss = d <= today && list.some(lacksMW); if (o.miss){ missing++; o.ttl += '\nMangler maskin eller arbeid'; }
        if (list.length){
          const {act:a0} = dominant(list); const tot = sumH(list) || 1;
          /* teksten viser aktiviteten med flest timer (på delte dager også), og føringen med flest timer av den */
          const e = list.filter(x => x.act === a0?.id).reduce((m, x) => +x.hours > +m.hours ? x : m);
          const mw = hasMW(a0);
          o.lab = a0 ? a0.name : '?';
          /* to linjer: aktivitet øverst, maskin og arbeid under (LMS, Line, Mod) */
          if (mw){ o.sub = mwText(e); o.subShort = e.machine || e.work || ''; }
          if (list.length > 1){
            let x = 0; o.bg = 'linear-gradient(90deg,' + list.map(e => { const c = color(act(e.act)); const f = x; x += (+e.hours || 0) / tot * 100; return `${c} ${f}% ${x}%`; }).join(',') + ')';
            o.key = 'split|' + d;
          } else {
            o.bg = color(a0); o.key = (a0 ? a0.id : '?') + (mw ? '|' + (e.machine || '') + '|' + (e.work || '') : '');
          }
        } else if (d > today && p !== 'F' && !S.noAuto[d + '|' + t.id]){
          o.bg = color(act('h1500')); o.key = 'prev'; o.prev = true; o.lab = 'LMS';
        }
        return o;
      });
      info.forEach((o, i) => {
        if (o.out){ h += '<td class="out"></td>'; return; }
        let strip = '';
        if (o.key){
          const st = i === 0 || info[i-1].key !== o.key, en = i === info.length - 1 || info[i+1].key !== o.key;
          let len = 1; if (st) while (i + len < info.length && info[i+len].key === o.key) len++;
          const txt = st ? o.lab : ''; const sub = st ? (len > 1 ? o.sub : o.subShort) : '';
          strip = `<div class="strip${st ? ' rs' : ''}${en ? ' re' : ''}${o.prev ? ' prev' : ''}" style="background:${o.bg}">${txt ? `<span class="sl${sub ? ' two' : ''}" style="max-width:calc(${len} * 100% - 8px)">${sub ? `<span>${esc(txt)}</span><span>${esc(sub)}</span>` : esc(txt)}</span>` : ''}</div>`;
        }
        const note = noteOf(t.id, o.d);   /* notat: liten prikk øverst til høyre, teksten i verktøytipset */
        h += `<td class="cell ${o.p} ${o.d === today ? 'today' : ''}${o.miss ? ' miss' : ''}" data-action="cell" data-t="${t.id}" data-d="${o.d}" title="${esc(t.name + ' · ' + ddmm(o.d) + ' · ' + o.ttl + (note ? '\nNotat: ' + note : ''))}">${strip}${note ? '<i class="nd" aria-label="Har notat"></i>' : ''}</td>`;
      });
      h += `</tr>`;
    }
  });
  h += `</tbody></table></div><div class="muted" style="font-size:13px">Trykk på en dag for å føre eller endre den. Flere dager på én rad: dra over dem, eller klikk på første dag og hold <kbd>Shift</kbd> mens du klikker på siste. Flere rader: hold <kbd>Ctrl</kbd> mens du merker hver rad, og slipp Ctrl for å føre.</div>`;
  return h.replace('MISSING', missing ? `<div class="misses"><i></i><b>${missing} ${missing === 1 ? 'dag' : 'dager'}</b> i ${MON[m-1]} har LMS uten maskin eller arbeid. De er markert med oransje strek.</div>` : '');
}

export const actions = {
  cell(el){ if (dragged) return; anchor = {t: el.dataset.t, d: el.dataset.d}; openSheet(el.dataset.t, el.dataset.d); },
  'cal-today'(){ UI.cal = todayIso().slice(0,7); render(); },
  cal(el){ let [y,m] = UI.cal.split('-').map(Number); m += +el.dataset.d; if (m < 1){ m = 12; y--; } if (m > 12){ m = 1; y++; } UI.cal = y+'-'+String(m).padStart(2,'0'); render(); }
};

/* ---------- velg flere dager: dra på én rad, Shift+klikk, og Ctrl for flere rader (bare mus/penn; berøring ruller som før) ---------- */
let drag = null, dragged = false;
/* Shift+klikk: første dag (anker) settes ved vanlig klikk eller Shift+klikk; Shift+klikk på en annen dag i samme rad velger perioden */
let anchor = null, shiftDown = false;
/* Ctrl: hvert utvalg (dra eller klikk) legges til her mens Ctrl holdes; arket åpnes når Ctrl slippes */
let picked = [];
const seg = g => { const [from, to] = [g.from, g.to].sort(); return {t: g.t, from, to}; };
function markSel(){
  for (const td of document.querySelectorAll('.cal td.cell.sel')) td.classList.remove('sel');
  for (const g of [...picked, ...(drag ? [seg(drag)] : [])])
    for (const td of document.querySelectorAll(`.cal td.cell[data-t="${g.t}"]`)) if (td.dataset.d >= g.from && td.dataset.d <= g.to) td.classList.add('sel');
}
const suppressClick = () => { dragged = true; setTimeout(() => { dragged = false; }, 0); };   /* klikket etter slippet skal ikke åpne én dag */
function openPicked(){ const segs = picked; picked = []; markSel(); if (segs.length) setTimeout(() => openRange(segs), 0); }
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.pointerType === 'touch' || UI.tab !== 'kal') return;
  const td = e.target.closest && e.target.closest('td.cell[data-t]'); if (!td) return;
  e.preventDefault();   /* ingen tekstmarkering mens man drar */
  if (e.shiftKey && !e.ctrlKey){
    shiftDown = true; const t = td.dataset.t, d = td.dataset.d;
    if (anchor && anchor.t === t && anchor.d !== d){ const [a, b] = [anchor.d, d].sort(); anchor = null; markSel(); setTimeout(() => openRange([{t, from:a, to:b}]), 0); }
    else { anchor = {t, d}; markSel(); td.classList.add('sel'); toast('Hold Shift og klikk på siste dag'); }
    return;
  }
  drag = {t: td.dataset.t, from: td.dataset.d, to: td.dataset.d};
  markSel();
});
/* Pekeren kan gli over en annen rad; da brukes bare datoen (kolonnen), raden er den man startet på. */
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const td = e.target.closest && e.target.closest('td.cell[data-d]');
  if (td && td.dataset.d !== drag.to){ drag.to = td.dataset.d; markSel(); }
});
document.addEventListener('pointerup', e => {
  if (shiftDown){ shiftDown = false; suppressClick(); return; }
  if (!drag) return; const g = seg(drag); drag = null;
  if (e.ctrlKey || e.metaKey){   /* Ctrl holdes: legg til og vent på flere rader */
    if (!picked.length) toast('Merk flere rader mens du holder Ctrl. Slipp Ctrl for å føre.');
    picked.push(g); markSel(); suppressClick(); return;
  }
  if (picked.length){ picked.push(g); suppressClick(); openPicked(); return; }   /* Ctrl ble sluppet midt i et dra */
  markSel();
  if (g.from === g.to) return;   /* vanlig klikk: data-action="cell" åpner dagen */
  suppressClick(); setTimeout(() => openRange([g]), 0);
});
document.addEventListener('pointercancel', () => { drag = null; markSel(); });
document.addEventListener('keyup', e => { if ((e.key === 'Control' || e.key === 'Meta') && picked.length && !drag) openPicked(); });
window.addEventListener('blur', () => { if (picked.length){ picked = []; markSel(); } });   /* Ctrl+Tab o.l.: ikke la et halvferdig utvalg henge igjen */

/* Escape avbryter markeringen. true hvis tasten ble brukt */
export function onKey(e){
  if ((drag || anchor || picked.length) && e.key === 'Escape' && !UI.sheet && !UI.dlg){ drag = null; anchor = null; picked = []; markSel(); return true; }
  return false;
}
