/* Føring: én dag, alle skift, en rad per tekniker. Åpnes som modal fra kalenderen (knappen «Føring» eller en dato). */
import { dn, isoOf, todayIso, longDate, fmtH, esc } from '../util.js';
import { PH } from '../model.js';
import { S, UI, act, hasMW, mwText, noteOf, entriesOf, phase, workHours, timeTxt, stdHours, sumH, label, color, activeOn, workDay } from '../state.js';
import { render } from '../render.js';
import { openSheet, openBulk } from '../ui/sheet.js';
import { xtag } from '../ui/bits.js';

export function vFore(){
  const date = UI.date;
  const order = [...S.shifts].sort((a,b) => (phase(a.id,date).key==='F') - (phase(b.id,date).key==='F') || a.id-b.id);
  let h = `<div class="sheet-h"><div class="t">Dagsoversikt</div><button class="icon-btn x" data-action="day-close" aria-label="Lukk">×</button></div>`;
  h += `<div class="datenav">
    <button class="icon-btn" data-action="day" data-d="-1" aria-label="Forrige dag">‹</button>
    <button class="icon-btn" data-action="day" data-d="1" aria-label="Neste dag">›</button>
    <div class="d">${esc(longDate(date))}</div>
    <span style="flex:1"></span>
    ${date !== todayIso() ? '<button class="btn sm" data-action="today">I dag</button>' : ''}
    <input type="date" id="f-date" value="${date}" aria-label="Velg dato">
  </div>`;
  for (const s of order){
    const ph = phase(s.id, date);
    const ts = S.techs.filter(t => t.shift === s.id && activeOn(t, date));
    const done = ts.filter(t => sumH(entriesOf(t.id,date)) >= stdHours(t,date)).length;
    const off = ph.key === 'F';
    const open = !!UI.foreOpen[s.id];   /* skiftene er lukket til man åpner dem */
    h += `<section class="panel shift${open ? '' : ' closed'}">
      <div class="shift-h">
        <button class="shift-tg" data-action="shift-toggle" data-s="${s.id}" aria-expanded="${open}"><span class="chev2">${open ? '▾' : '▸'}</span><span class="name">${esc(s.name)}</span>
        <span class="phase ${ph.key}">${PH[ph.key]} ${ph.idx}/${ph.len}${off ? ' · overtid' : ' · ' + timeTxt(ph.key,date) + ' · ' + fmtH(workHours(ph.key,date)) + ' t'}</span>
        ${off ? '' : `<span class="progress num">${done}/${ts.length} ført</span>`}</button>
        <span class="spacer"></span>
        ${off ? '' : `<button class="btn sm" data-action="extra" data-s="${s.id}">+ Ekstra personell</button><button class="btn sm" data-action="bulk" data-s="${s.id}">Sett alle…</button>`}
      </div>`;
    if (open) {
      h += `<div class="techs">`;
      for (const t of ts){
        const list = entriesOf(t.id, date); const sum = sumH(list); const std = stdHours(t,date);
        const st = sum === 0 ? 'none' : sum < std ? 'part' : sum > std ? 'over' : 'full';
        const stTxt = sum === 0 ? (off ? 'Fri' : dn(date) > dn(todayIso()) ? 'Standard' : 'Ikke ført') : `${fmtH(sum)} / ${fmtH(std)} t`;
        h += `<button class="tech" data-action="open" data-t="${t.id}">
          <span class="nm">${esc(t.name)}${xtag(t)}${noteOf(t.id, date) ? `<i class="nd" title="${esc('Notat: ' + noteOf(t.id, date))}"></i>` : ''}${off && list.length ? '<span class="xtag ot">Overtid</span>' : ''}</span>
          <span class="hrs"><span class="status ${st} num">${stTxt}</span>${sum ? `<span class="meter ${st==='part'?'part':''}"><i style="width:${Math.min(100,sum/std*100)}%"></i></span>` : ''}</span>
          <span class="chips">${!list.length && !off && dn(date) > dn(todayIso()) && workDay(t, date) && !S.noAuto[date + '|' + t.id] ? `<span class="chip auto"><i class="dot" style="background:${color(act('h1500'))}"></i><span>LMS · standard</span><b class="num">${fmtH(std)}</b></span>` : ''}${list.map(chip).join('')}</span>
        </button>`;
      }
      h += `</div>`;
    }
    h += `</section>`;
  }
  return h;
}

/* LMS, Line og Mod på to linjer: aktivitet øverst, maskin og arbeid under. Uten maskin og arbeid holder én linje. */
function chip(e){
  const a = act(e.act); const dot = `<i class="dot" style="background:${color(a)}"></i>`; const h = `<b class="num">${fmtH(e.hours)}</b>`;
  const sub = hasMW(a) ? mwText(e) : '';
  if (!sub) return `<span class="chip ${e.auto ? 'auto' : ''}">${dot}<span>${esc(label(e))}</span>${h}</span>`;
  return `<span class="chip two ${e.auto ? 'auto' : ''}">${dot}<span class="cl"><span>${esc(a.name)}</span><small>${esc(sub)}</small></span>${h}</span>`;
}

export const actions = {
  'day-open'(el){ UI.dayOpen = true; if (el.dataset.d) UI.date = el.dataset.d; render(); },
  'day-close'(){ UI.dayOpen = false; render(); },
  'day-scrim'(el, sh, e){ if (e.target === el){ UI.dayOpen = false; render(); } },
  day(el){ UI.date = isoOf(dn(UI.date) + +el.dataset.d); render(); },
  today(){ UI.date = todayIso(); render(); },
  'shift-toggle'(el){ UI.foreOpen[el.dataset.s] = !UI.foreOpen[el.dataset.s]; render(); },
  open(el){ openSheet(el.dataset.t); },
  bulk(el){ openBulk(+el.dataset.s); }
};

export function onChange(el){
  if (el.id === 'f-date' && el.value){ UI.date = el.value; render(); return true; }
  return false;
}
