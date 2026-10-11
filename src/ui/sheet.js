/* Arket som glir opp nederst: føring for én tekniker, «Sett alle», ekstra personell, roller og kopier. */
import { dn, isoOf, todayIso, ddmm, longDate, fmtH, esc, uid } from '../util.js';
import { PH } from '../model.js';
import { S, UI, save, act, tech, shiftOf, entriesOf, manualOf, phase, workHours, timeTxt, stdHours, extraUntil,
  sumH, label, color, allowed, activeOn, recomputeAuto } from '../state.js';
import { render } from '../render.js';
import { toast } from './toast.js';
import { ask } from './dialog.js';
import { val } from './bits.js';

/* ---------- åpne ---------- */
export function openSheet(techId, date = UI.date){
  if (!S.entries.some(e => e.tech === techId && e.date === date)){ recomputeAuto(techId, date); save(); }
  const t = tech(techId); const rem = Math.max(0, stdHours(t,date) - sumH(manualOf(t.id,date)));
  UI.sheet = {mode:'tech', tech:techId, date, act:null, machine:null, work:null, hours: rem > 0 ? rem : 1, newM:''};
  renderSheet();
}
export function openBulk(shiftId){
  const ts = S.techs.filter(t => t.shift === shiftId && activeOn(t, UI.date) && manualOf(t.id,UI.date).length === 0);
  UI.sheet = {mode:'bulk', shift:shiftId, date:UI.date, act:null, machine:null, work:null, count:ts.length};
  renderSheet();
}
export function openExtra(shift, date){ UI.sheet = {mode:'extra', name:'', shift: shift || 1, from: date || UI.date, days: 1}; renderSheet(); setTimeout(() => document.getElementById('ex-name')?.focus(), 0); }
export function closeSheet(){ UI.sheet = null; renderSheet(); render(); }

function last1500(){ return {machine:'', work:''}; }  /* LMS starter som «Ingen maskin»; maskin settes for hånd */
function extraPreview(sh){
  const d = Math.max(1, Math.round(+sh.days || 1));
  const u = extraUntil(+sh.shift, sh.from, d);
  return `${d} skiftdag${d === 1 ? '' : 'er'} på ${esc(shiftOf(+sh.shift).name)}: ${esc(ddmm(sh.from))} – ${esc(ddmm(u))}`;
}
function entryLabel(e){
  const a = act(e.act); if (!a || a.type !== '1500H') return esc(label(e));
  const ms = S.machines.filter(m => m.active || m.name === e.machine).map(m => m.name);
  return `LMS <select class="mini" data-em="${e.id}" aria-label="Maskin"><option value="">Ingen maskin</option>${ms.map(n => `<option ${n === e.machine ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><select class="mini" data-ew="${e.id}" aria-label="Arbeid"><option value="">Arbeid –</option>${S.work.map(w => `<option ${w === e.work ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select>`;
}

/* ---------- føringer ---------- */
function resetHours(sh){ const t = tech(sh.tech); const rem = stdHours(t, sh.date) - sumH(manualOf(t.id, sh.date)); sh.hours = rem > 0 ? rem : 1; }
function addEntry(sh){
  const a = act(sh.act); const hrs = +sh.hours;
  if (!a) return;
  if (!(hrs > 0)){ toast('Velg antall timer først'); return; }
  const same = manualOf(sh.tech, sh.date).find(e => e.act === a.id && (a.type !== '1500H' || (sh.machine && sh.work && e.machine === sh.machine && e.work === sh.work)));
  let id;
  if (same){ same.hours = +same.hours + hrs; id = same.id; }
  else { id = uid(); S.entries.push({id, date:sh.date, tech:sh.tech, act:a.id, machine:a.type==='1500H'?sh.machine:'', work:a.type==='1500H'?sh.work:'', hours:hrs}); }
  toast((a.type === '1500H' ? (sh.machine || 'LMS') + (sh.work ? ' · ' + sh.work : '') : a.name) + (same ? ' · +' : ' · ') + fmtH(hrs) + ' t');
  UI.flash = id; sh.toTop = true;
  recomputeAuto(sh.tech, sh.date);
  save(); sh.act = null; sh.machine = null; sh.work = null; resetHours(sh); renderSheet(); render();
}
/* Ikke tegn arket på nytt mens pekeren er nede, ellers forsvinner klikket på knappen som ble trykket. */
let pendingSheet = false, pointerIsDown = false;
function flushSheet(){ if (!pendingSheet) return; pendingSheet = false; if (UI.sheet) renderSheet(); render(); }
function deferSheet(){ pendingSheet = true; if (!pointerIsDown) setTimeout(flushSheet, 0); }
document.addEventListener('pointerdown', () => { pointerIsDown = true; }, true);
document.addEventListener('pointerup', () => { pointerIsDown = false; if (pendingSheet) setTimeout(flushSheet, 0); }, true);
document.addEventListener('pointercancel', () => { pointerIsDown = false; if (pendingSheet) setTimeout(flushSheet, 0); }, true);
function setEntryHours(id, h, deferred){
  const e = S.entries.find(x => x.id === id); if (!e) return;
  e.hours = Math.min(24, Math.max(0.5, Math.round((+String(h).replace(',', '.') || 0) * 2) / 2));
  if (e.auto){ e.auto = false; S.noAuto[e.date + '|' + e.tech] = true; }
  recomputeAuto(e.tech, e.date); save();
  if (UI.sheet) resetHours(UI.sheet);
  if (deferred) deferSheet(); else { if (UI.sheet) renderSheet(); render(); }
}
const ready1500 = sh => sh.mode === 'tech' && act(sh.act)?.type === '1500H' && sh.machine && sh.work;

/* ---------- tegning ---------- */
function actPicker(acts, sel){
  return `<div class="grid-btns">${acts.map(a => `<button class="opt" data-action="pick-act" data-a="${a.id}" aria-pressed="${sel===a.id}"><i class="dot" style="background:${color(a)}"></i>${esc(a.name)}</button>`).join('')}</div>`;
}
function h1500Picker(sh){
  const ms = S.machines.filter(m => m.active);
  return `<div class="sec"><h3>Maskin</h3><div class="pills">
      ${ms.map(m => `<button class="pill reg" data-action="pick-m" data-m="${esc(m.name)}" aria-pressed="${sh.machine===m.name}">${esc(m.name)}</button>`).join('')}
      <span class="inline-add"><input id="sh-newm" type="text" placeholder="Ny maskin" value="${esc(sh.newM||'')}" aria-label="Ny maskin"><button class="pill" data-action="add-m">Legg til</button></span>
    </div>${ms.length ? '' : '<div class="muted" style="font-size:13px">Ingen aktive maskiner ennå. Skriv registreringen over.</div>'}</div>
    <div class="sec"><h3>Arbeid</h3><div class="pills">${S.work.map(w => `<button class="pill" data-action="pick-w" data-w="${esc(w)}" aria-pressed="${sh.work===w}">${esc(w)}</button>`).join('')}</div></div>`;
}
export function renderSheet(){
  const ov = document.getElementById('overlay');
  const sh = UI.sheet;
  if (!sh){ ov.hidden = true; ov.innerHTML = ''; return; }
  ov.hidden = false;
  let body = '';
  if (sh.mode === 'copy'){
    body = `<div class="sheet-h"><div><div class="t">Kopier</div><div class="s">Marker teksten og kopier den manuelt.</div></div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      <div class="sec"><textarea id="copy-txt" readonly>${esc(sh.text)}</textarea></div>`;
  } else if (sh.mode === 'bulk'){
    const s = shiftOf(sh.shift); const ph = phase(s.id, sh.date);
    const a = act(sh.act); const ok = a && (a.type !== '1500H' || (sh.machine && sh.work)) && sh.count > 0;
    body = `<div class="sheet-h"><div><div class="t">Sett alle · ${esc(s.name)}</div><div class="s">${esc(longDate(sh.date))} · ${PH[ph.key]} ${timeTxt(ph.key,sh.date)} · ${sh.count} teknikere med bare LMS standard får hel dag (${fmtH(workHours(ph.key,sh.date))} t)</div></div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      <div class="sec"><h3>Aktivitet</h3>${actPicker(S.acts.filter(x => !x.role), sh.act)}</div>
      ${a && a.type === '1500H' ? h1500Picker(sh) : ''}
      <div class="sheet-f"><button class="btn" data-action="close">Avbryt</button><button class="btn primary" data-action="bulk-apply" ${ok?'':'disabled'}>Sett ${sh.count} teknikere</button></div>`;
  } else if (sh.mode === 'extra'){
    body = `<div class="sheet-h"><div><div class="t">Ekstra personell</div><div class="s">Vises på skiftet i perioden. Timer føres som vanlig.</div></div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      <div class="form">
        <label>Navn<input type="text" id="ex-name" class="field" value="${esc(sh.name)}" placeholder="Fullt navn" autocomplete="off"></label>
        <div class="two">
          <label>Skift<select id="ex-shift" class="field">${S.shifts.map(x => `<option value="${x.id}" ${+sh.shift === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label>Fra dato<input type="date" id="ex-from" class="field" value="${sh.from}"></label>
          <label>Antall skiftdager<input type="text" inputmode="numeric" id="ex-days" class="field" value="${esc(sh.days)}"></label>
        </div>
        <div class="preview" id="ex-prev">${extraPreview(sh)}</div>
      </div>
      <div class="sheet-f"><button class="btn" data-action="close">Avbryt</button><button class="btn primary" data-action="extra-save">Legg til</button></div>`;
  } else if (sh.mode === 'roles'){
    const t = tech(sh.tech);
    body = `<div class="sheet-h"><div><div class="t">${esc(t.name)}</div><div class="s">${esc(shiftOf(t.shift).name)} · ${t.roles.length} ${t.roles.length === 1 ? 'rolle' : 'roller'} valgt</div></div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      <div class="sec"><h3>Roller</h3><div class="grid-btns">${S.roles.map(r => `<button class="opt" data-action="role" data-t="${t.id}" data-r="${esc(r)}" aria-pressed="${t.roles.includes(r)}"><span class="cb" aria-hidden="true">✓</span>${esc(r)}</button>`).join('')}</div></div>
      <div class="muted" style="font-size:13px">Rollene styrer hvilke aktiviteter teknikeren kan føres på.</div>
      <div class="sheet-f"><button class="btn primary" data-action="close">Ferdig</button></div>`;
  } else {
    const t = tech(sh.tech); const list = entriesOf(t.id, sh.date); const std = stdHours(t, sh.date);
    const sum = sumH(list); const rem = std - sum; const ph = phase(t.shift, sh.date);
    const scale = Math.max(std, sum) || 1;
    const remTxt = rem > 0 ? `${fmtH(rem)} t igjen` : rem < 0 ? `${fmtH(-rem)} t over` : 'Dagen er full';
    body = `<div class="sheet-h"><div>
        <div class="t">${esc(t.name)}</div>
        <div class="s">${esc(longDate(sh.date))} · ${esc(shiftOf(t.shift).name)} · ${PH[ph.key]} ${timeTxt(ph.key,sh.date)}</div>
        <div class="roles">${t.roles.length ? 'Roller: ' + t.roles.map(r => `<b>${esc(r)}</b>`).join('') : 'Ingen roller · settes i Oppsett'}</div>
      </div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      <div class="sec"><div class="row" style="justify-content:space-between"><h3>Dagen</h3><span class="num daytxt ${rem < 0 ? 'over' : rem === 0 ? 'full' : ''}">${fmtH(sum)} / ${fmtH(std)} t · ${remTxt}</span></div>
        <div class="daybar">${list.map(e => `<i style="width:${(+e.hours||0)/scale*100}%;background:${color(act(e.act))}" title="${esc(label(e))} ${fmtH(e.hours)} t"></i>`).join('')}</div>
        ${list.length ? list.map(e => `<div class="entry ${e.id === UI.flash ? 'flash' : ''}"><i class="edot" style="background:${color(act(e.act))}"></i><span class="lbl">${entryLabel(e)}${e.auto ? '<span class="atag">standard</span>' : ''}</span>
          <span class="stepper"><button class="icon-btn sm" data-action="step" data-e="${e.id}" data-d="-0.5" aria-label="En halv time mindre">−</button><input class="hours-in" type="text" inputmode="decimal" id="eh-${e.id}" data-eh="${e.id}" value="${fmtH(e.hours)}" aria-label="Timer ${esc(label(e))}"><button class="icon-btn sm" data-action="step" data-e="${e.id}" data-d="0.5" aria-label="En halv time mer">+</button></span>
          <button class="icon-btn sm danger del" data-action="del" data-e="${e.id}" aria-label="Slett ${esc(label(e))}">×</button></div>`).join('') : '<div class="hint">Ingenting ført ennå.</div>'}
        ${list.some(e => act(e.act)?.type === '1500H') ? `<div class="row newm"><input type="text" id="sh-newm" class="field" placeholder="Ny maskin, f.eks. ONX" value="${esc(sh.newM || '')}" aria-label="Ny maskin"><button class="btn sm" data-action="add-m">Legg til maskin</button></div>` : ''}
      </div>
      <div class="sec addbox"><h3>Legg til aktivitet</h3>
        ${actPicker(allowed(t), sh.act)}
        <div class="hint">${(() => { const rm = std - sumH(list.filter(e => !e.auto)); return rm > 0 ? `Legges til med ${fmtH(rm)} t.` : 'Dagen er full. Ny aktivitet legges til med 1 t.'; })()} LMS standard fyller automatisk resten av dagen. Juster timene på raden.</div>
      </div>
      <div class="sheet-f"><button class="btn primary" data-action="close">Ferdig</button></div>`;
  }
  const prev = ov.querySelector('.sheet'); const prevScroll = prev ? prev.scrollTop : 0;
  ov.innerHTML = `<div class="scrim" data-action="scrim"><div class="sheet${prev ? '' : ' anim'}" role="dialog" aria-modal="true">${body}</div></div>`;
  ov.querySelector('.sheet').scrollTop = sh.toTop ? 0 : prevScroll;
  sh.toTop = false; UI.flash = null;
  if (sh.mode === 'copy'){ const ta = document.getElementById('copy-txt'); ta.focus(); ta.select(); }
}

/* ---------- handlinger (data-action) ---------- */
export const actions = {
  scrim(el, sh, e){ if (e.target === el) closeSheet(); },
  close: () => closeSheet(),
  extra: el => openExtra(el.dataset.s ? +el.dataset.s : 1, el.dataset.from || UI.date),
  'extra-save'(el, sh){
    const name = (sh.name || '').trim(); const days = Math.round(+sh.days);
    if (!name){ toast('Skriv navnet'); document.getElementById('ex-name')?.focus(); return; }
    if (!(days >= 1)){ toast('Antall skiftdager må være 1 eller mer'); return; }
    const until = extraUntil(+sh.shift, sh.from, days);
    const nt = {id:uid(), name, shift:+sh.shift, roles:[], extra:{from:sh.from, until}}; S.techs.push(nt);
    for (let n = dn(sh.from); n <= Math.min(dn(until), dn(todayIso())); n++) recomputeAuto(nt.id, isoOf(n));
    save(); UI.sheet = null; renderSheet(); render(); toast(name + ' lagt til på ' + shiftOf(+sh.shift).name + ' ' + ddmm(sh.from) + '–' + ddmm(until)); },
  'pick-act'(el, sh){ sh.act = el.dataset.a; const a0 = act(sh.act);
    if (sh.mode === 'tech'){ if (a0.type === '1500H'){ const d0 = last1500(sh.tech); sh.machine = d0.machine; sh.work = d0.work; } else { sh.machine = null; sh.work = null; } addEntry(sh); return; }
    if (a0.type !== '1500H'){ sh.machine = null; sh.work = null; } renderSheet(); },
  'pick-m'(el, sh){ sh.machine = el.dataset.m; if (ready1500(sh)) addEntry(sh); else renderSheet(); },
  'pick-w'(el, sh){ sh.work = el.dataset.w; if (ready1500(sh)) addEntry(sh); else renderSheet(); },
  'add-m'(el, sh){ const n = val('sh-newm').toUpperCase(); if (!n) return; if (!S.machines.some(m => m.name === n)) S.machines.push({id:uid(), name:n, active:true}); else S.machines.find(m => m.name===n).active = true; sh.newM = '';
    if (sh.mode === 'tech'){ const tgt = entriesOf(sh.tech, sh.date).filter(e => e.act === 'h1500' && !e.machine).pop(); if (tgt) tgt.machine = n; save(); renderSheet(); render(); toast('Maskin ' + n + ' lagt til'); return; }
    sh.machine = n; save(); if (ready1500(sh)) addEntry(sh); else renderSheet(); },
  step(el){ const e0 = S.entries.find(x => x.id === el.dataset.e); if (e0) setEntryHours(e0.id, +e0.hours + +el.dataset.d); },
  del(el, sh){ const e0 = S.entries.find(x => x.id === el.dataset.e); if (!e0) return; const t0 = tech(sh.tech);
    ask({title:'Slette føringen?', text:label(e0)+' · '+fmtH(e0.hours)+' t for '+t0.name+' '+ddmm(sh.date)+'.', ok:'Slett', fn:() => {
      S.entries = S.entries.filter(x => x.id !== e0.id); if (e0.auto) S.noAuto[e0.date + '|' + e0.tech] = true; recomputeAuto(e0.tech, e0.date); save();
      sh.hours = Math.max(0, stdHours(t0, sh.date) - sumH(entriesOf(t0.id, sh.date))) || stdHours(t0, sh.date);
      renderSheet(); render(); toast('Føring slettet'); }}); },
  'bulk-apply'(el, sh){
    const a = act(sh.act); let n = 0;
    for (const t of S.techs.filter(t => t.shift === sh.shift && activeOn(t, sh.date) && manualOf(t.id, sh.date).length === 0)){
      S.entries = S.entries.filter(e => !(e.tech === t.id && e.date === sh.date && e.auto));
      S.entries.push({id:uid(), date:sh.date, tech:t.id, act:a.id, machine:a.type==='1500H'?sh.machine:'', work:a.type==='1500H'?sh.work:'', hours:stdHours(t, sh.date)}); n++;
    }
    save(); closeSheet(); toast(n + ' teknikere satt til ' + (a.type==='1500H' ? 'LMS '+sh.machine : a.name)); },
  roles(el){ UI.sheet = {mode:'roles', tech:el.dataset.t}; renderSheet(); },
  role(el){ const t = tech(el.dataset.t); const r = el.dataset.r; t.roles = t.roles.includes(r) ? t.roles.filter(x => x !== r) : [...t.roles, r]; t.roles.sort((x, y) => S.roles.indexOf(x) - S.roles.indexOf(y)); save(); if (UI.sheet) renderSheet(); render(); }
};

export function onInput(el){
  if (el.id === 'sh-newm' && UI.sheet){ UI.sheet.newM = el.value; return true; }
  if (UI.sheet && UI.sheet.mode === 'extra' && /^ex-/.test(el.id)){
    const k = {'ex-name':'name','ex-shift':'shift','ex-from':'from','ex-days':'days'}[el.id]; if (!k) return true;
    if (k === 'from' && !el.value) return true;
    UI.sheet[k] = el.value; const p = document.getElementById('ex-prev'); if (p) p.innerHTML = extraPreview(UI.sheet); return true; }
  return false;
}
export function onChange(el){
  if (el.dataset.eh){ setEntryHours(el.dataset.eh, el.value, true); return true; }
  if (el.dataset.em || el.dataset.ew){ const e0 = S.entries.find(x => x.id === (el.dataset.em || el.dataset.ew)); if (e0){ if (el.dataset.em) e0.machine = el.value; else e0.work = el.value; save(); deferSheet(); } return true; }
  return false;
}
