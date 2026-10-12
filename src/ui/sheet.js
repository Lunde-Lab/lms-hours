/* Arket som glir opp nederst: føring for én tekniker, flere dager, ekstra personell, roller og kopier. */
import { dn, isoOf, todayIso, ddmm, longDate, fmtH, esc, uid } from '../util.js';
import { PH } from '../model.js';
import { S, UI, save, act, tech, shiftOf, entriesOf, manualOf, phase, workHours, timeTxt, stdHours, extraUntil,
  sumH, label, hasMW, lacksMW, noteOf, setNote, color, allowed, activeOn, workDay, offDay, recomputeAuto, rangeDays, applyRange, clearRange, moveTech, removeTech } from '../state.js';
import { render } from '../render.js';
import { toast, toastUndo, snapshot } from './toast.js';
import { ask, promptText } from './dialog.js';

/* ---------- åpne ---------- */
export function openSheet(techId, date = UI.date){
  if (!S.entries.some(e => e.tech === techId && e.date === date)){ recomputeAuto(techId, date); save(); }
  UI.sheet = {mode:'tech', tech:techId, date, act:null, machine:null, work:null, hours:0};
  resetHours(UI.sheet);
  renderSheet();
}
/* flere dager for én tekniker, valgt ved å dra i kalenderen */
export function openRange(techId, from, to){
  const cur = sameSetup(techId, rangeDays(techId, from, to));
  UI.sheet = {mode:'range', tech:techId, from, to, act:cur ? cur.act : null, machine:cur ? cur.machine || null : null, work:cur ? cur.work || null : null};
  renderSheet();
}
/* Det som er ført en dag, som én linje (LMS standard også når den bare vises som forslag). */
function daySetup(t, d){
  const list = entriesOf(t.id, d);
  if (!list.length) return workDay(t, d) && !S.noAuto[d + '|' + t.id] ? [{act:'h1500', machine:'', work:'', auto:true}] : [];
  return list;
}
function setupText(list){
  if (!list.length) return 'Ingenting ført';
  return list.map(e => { const a = act(e.act);
    return (a ? label(e) : 'Ukjent') + (e.auto ? ' (standard)' : '') + (list.length > 1 ? ' ' + fmtH(e.hours) + ' t' : ''); }).join(' + ');
}
/* {act, machine, work} hvis alle dagene har nøyaktig samme ene aktivitet, ellers null */
function sameSetup(techId, days){
  const t = tech(techId); if (!t || !days.length) return null;
  const ls = days.map(d => daySetup(t, d)); const k = e => e.act + '|' + (e.machine || '') + '|' + (e.work || '');
  return ls.every(l => l.length === 1 && k(l[0]) === k(ls[0][0])) ? ls[0][0] : null;
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
  const a = act(e.act); if (!hasMW(a)) return esc(label(e));
  const ms = S.machines.filter(m => m.active || m.name === e.machine).map(m => m.name);
  const miss = f => lacksMW(e) && e.date <= todayIso() && !e[f] ? ' miss' : '';   /* tomt felt som må fylles ut */
  return `<span class="ln1">${esc(a.name)}${e.auto ? '<span class="atag">standard</span>' : ''}</span><span class="ln2"><select class="mini${miss('machine')}" data-em="${e.id}" aria-label="Maskin"><option value="">Ingen maskin</option>${ms.map(n => `<option ${n === e.machine ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><select class="mini${miss('work')}" data-ew="${e.id}" aria-label="Arbeid"><option value="">Arbeid –</option>${S.work.map(w => `<option ${w === e.work ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></span>`;
}

/* ---------- føringer ---------- */
/* Ny aktivitet får timene som ikke er dekket ennå. På en dag med LMS standard blir det 0: aktiviteten legges til
   som egen linje, og LMS standard krymper når timene justeres opp. */
const openHours = (t, date) => Math.max(0, stdHours(t, date) - sumH(entriesOf(t.id, date)));
function resetHours(sh){ sh.hours = openHours(tech(sh.tech), sh.date); }
function addEntry(sh){
  const a = act(sh.act); const hrs = +sh.hours;
  if (!a) return;
  if (!(hrs >= 0)){ toast('Velg antall timer først'); return; }
  const same = manualOf(sh.tech, sh.date).find(e => e.act === a.id && (!hasMW(a) || (sh.machine && sh.work && e.machine === sh.machine && e.work === sh.work)));
  let id;
  if (same){ same.hours = +same.hours + hrs; id = same.id; }
  else { id = uid(); S.entries.push({id, date:sh.date, tech:sh.tech, act:a.id, machine:hasMW(a)?sh.machine||'':'', work:hasMW(a)?sh.work||'':'', hours:hrs}); }
  toast([a.name, sh.machine, sh.work].filter(Boolean).join(' · ') + (same ? ' · +' : ' · ') + fmtH(hrs) + ' t');
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
  e.hours = Math.min(24, Math.max(0, Math.round((+String(h).replace(',', '.') || 0) * 2) / 2));
  if (e.auto){ e.auto = false; S.noAuto[e.date + '|' + e.tech] = true; }
  recomputeAuto(e.tech, e.date); save();
  if (UI.sheet) resetHours(UI.sheet);
  if (deferred) deferSheet(); else { if (UI.sheet) renderSheet(); render(); }
}
const ready1500 = sh => sh.mode === 'tech' && hasMW(act(sh.act)) && sh.machine && sh.work;

/* Legger til (eller aktiverer) maskinen. I arket for en tekniker settes den på siste føring uten maskin. */
function addMachine(sh, n){
  if (UI.sheet !== sh) return;
  const m = S.machines.find(x => x.name === n); if (m) m.active = true; else S.machines.push({id:uid(), name:n, active:true});
  if (sh.mode === 'tech'){ const tgt = entriesOf(sh.tech, sh.date).filter(e => hasMW(act(e.act)) && !e.machine).pop(); if (tgt) tgt.machine = n; save(); renderSheet(); render(); toast('Maskin ' + n + ' lagt til'); return; }
  sh.machine = n; save(); if (ready1500(sh)) addEntry(sh); else renderSheet();
}

/* ---------- tegning ---------- */
function actPicker(acts, sel){
  return `<div class="grid-btns">${acts.map(a => `<button class="opt" data-action="pick-act" data-a="${a.id}" aria-pressed="${sel===a.id}"><i class="dot" style="background:${color(a)}"></i>${esc(a.name)}</button>`).join('')}</div>`;
}
function h1500Picker(sh){
  const ms = S.machines.filter(m => m.active);
  return `<div class="sec"><h3>Maskin</h3><div class="pills">
      ${ms.map(m => `<button class="pill reg" data-action="pick-m" data-m="${esc(m.name)}" aria-pressed="${sh.machine===m.name}">${esc(m.name)}</button>`).join('')}
      <button class="pill" data-action="new-m">+ Ny maskin</button>
    </div>${ms.length ? '' : '<div class="muted" style="font-size:13px">Ingen aktive maskiner ennå. Trykk «+ Ny maskin».</div>'}</div>
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
  } else if (sh.mode === 'range'){
    const t = tech(sh.tech); const days = rangeDays(t.id, sh.from, sh.to);
    const off = days.length > 0 && !workDay(t, days[0]);
    const skip = dn(sh.to) - dn(sh.from) + 1 - days.length;
    const busy = days.filter(d => manualOf(t.id, d).length).length;
    const tot = days.reduce((x, d) => x + stdHours(t, d), 0);
    const a = act(sh.act); const ok = a && (a.type !== '1500H' || (sh.machine && sh.work)) && days.length > 0;
    const groups = new Map(); for (const d of days){ const x = setupText(daySetup(t, d)); groups.set(x, (groups.get(x) || 0) + 1); }
    const now = groups.size === 1 ? `<b>${esc([...groups.keys()][0])}</b> på ${days.length === 1 ? 'dagen' : 'alle ' + days.length + ' dagene'}`
      : [...groups].map(([x, n]) => `<div><b>${esc(x)}</b> · ${n} ${n === 1 ? 'dag' : 'dager'}</div>`).join('');
    body = `<div class="sheet-h"><div><div class="t">${esc(t.name)}</div><div class="s">${esc(ddmm(sh.from))} – ${esc(ddmm(sh.to))} · ${esc(shiftOf(t.shift).name)} · ${days.length} ${off ? (days.length === 1 ? 'fridag (overtid)' : 'fridager (overtid)') : (days.length === 1 ? 'arbeidsdag' : 'arbeidsdager')} · ${fmtH(tot)} t${skip ? ` · ${skip} ${skip === 1 ? 'dag' : 'dager'} hoppes over` : ''}</div></div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      ${days.length ? `<div class="sec"><h3>Ført nå</h3><div class="preview">${now}</div></div>` : ''}
      <div class="sec"><h3>Aktivitet</h3>${actPicker(allowed(t), sh.act)}</div>
      ${hasMW(a) ? h1500Picker(sh) : ''}
      <div class="hint">Hver dag får full arbeidsdag med aktiviteten.${busy ? ` Føringene på ${busy} ${busy === 1 ? 'dag' : 'dager'} erstattes.` : ''}</div>
      <div class="sheet-f"><button class="btn danger lead" data-action="range-clear">Nullstill dagene</button><button class="btn" data-action="close">Avbryt</button><button class="btn primary" data-action="range-apply" ${ok ? '' : 'disabled'}>Før ${days.length} ${days.length === 1 ? 'dag' : 'dager'}</button></div>`;
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
      <div class="sec"><h3>Skift</h3><div class="grid-btns">${S.shifts.map(x => `<button class="opt" data-action="tech-shift" data-t="${t.id}" data-s="${x.id}" aria-pressed="${t.shift === x.id}">${esc(x.name)}</button>`).join('')}</div></div>
      <div class="sec"><h3>Roller</h3><div class="grid-btns">${S.roles.map(r => `<button class="opt" data-action="role" data-t="${t.id}" data-r="${esc(r)}" aria-pressed="${t.roles.includes(r)}"><span class="cb" aria-hidden="true">✓</span>${esc(r)}</button>`).join('')}</div></div>
      <div class="muted" style="font-size:13px">Rollene styrer hvilke aktiviteter teknikeren kan føres på. Ved bytte av skift beholdes føringene.</div>
      <div class="sheet-f"><button class="btn danger lead" data-action="rm-tech" data-t="${t.id}">Fjern tekniker</button><button class="btn primary" data-action="close">Ferdig</button></div>`;
  } else {
    const t = tech(sh.tech); const list = entriesOf(t.id, sh.date); const std = stdHours(t, sh.date);
    const sum = sumH(list); const rem = std - sum; const ph = phase(t.shift, sh.date);
    const scale = Math.max(std, sum) || 1;
    const remTxt = rem > 0 ? `${fmtH(rem)} t igjen` : rem < 0 ? `${fmtH(-rem)} t over` : 'Dagen er full';
    body = `<div class="sheet-h"><div>
        <div class="t">${esc(t.name)}${offDay(t, sh.date) ? '<span class="xtag ot">Overtid</span>' : ''}</div>
        <div class="s">${esc(longDate(sh.date))} · ${esc(shiftOf(t.shift).name)} · ${PH[ph.key]} ${timeTxt(ph.key,sh.date)}</div>
        <div class="roles">${t.roles.length ? 'Roller: ' + t.roles.map(r => `<b>${esc(r)}</b>`).join('') : 'Ingen roller · settes i Oppsett'}</div>
      </div><button class="icon-btn x" data-action="close" aria-label="Lukk">×</button></div>
      <div class="sec"><div class="row" style="justify-content:space-between"><h3>Dagen</h3><span class="num daytxt ${rem < 0 ? 'over' : rem === 0 ? 'full' : ''}">${fmtH(sum)} / ${fmtH(std)} t · ${remTxt}</span></div>
        <div class="daybar">${list.map(e => `<i style="width:${(+e.hours||0)/scale*100}%;background:${color(act(e.act))}" title="${esc(label(e))} ${fmtH(e.hours)} t"></i>`).join('')}</div>
        ${list.length ? list.map(e => `<div class="entry ${e.id === UI.flash ? 'flash' : ''}"><i class="edot" style="background:${color(act(e.act))}"></i>${hasMW(act(e.act)) ? `<span class="lbl two">${entryLabel(e)}</span>` : `<span class="lbl">${entryLabel(e)}${e.auto ? '<span class="atag">standard</span>' : ''}</span>`}
          <span class="stepper"><button class="icon-btn sm" data-action="step" data-e="${e.id}" data-d="-0.5" aria-label="En halv time mindre">−</button><input class="hours-in" type="text" inputmode="decimal" id="eh-${e.id}" data-eh="${e.id}" value="${fmtH(e.hours)}" aria-label="Timer ${esc(label(e))}"><button class="icon-btn sm" data-action="step" data-e="${e.id}" data-d="0.5" aria-label="En halv time mer">+</button></span>
          <button class="icon-btn sm danger del" data-action="del" data-e="${e.id}" aria-label="Slett ${esc(label(e))}">×</button></div>`).join('') : '<div class="hint">Ingenting ført ennå.</div>'}
        ${list.some(e => hasMW(act(e.act))) ? `<div class="row newm"><button class="btn sm" data-action="new-m">+ Legg til maskin</button></div>` : ''}
      </div>
      <div class="sec addbox"><h3>Legg til aktivitet</h3>
        ${actPicker(allowed(t), sh.act)}
        <div class="hint">${(() => { const rm = openHours(t, sh.date); return rm > 0 ? `Legges til med ${fmtH(rm)} t.` : 'Legges til som ny linje med 0 t.'; })()} ${offDay(t, sh.date) ? 'Fridag: alt som føres her regnes som overtid.' : 'LMS standard fyller automatisk resten av dagen.'} Juster timene på raden.</div>
      </div>
      <div class="sec"><h3><label for="sh-note">Notat</label></h3><textarea id="sh-note" class="note" rows="2" placeholder="Notat for dagen (vises som prikk i kalenderen)">${esc(noteOf(t.id, sh.date))}</textarea></div>
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
    if (sh.mode === 'tech'){ if (hasMW(a0)){ const d0 = last1500(sh.tech); sh.machine = d0.machine; sh.work = d0.work; } else { sh.machine = null; sh.work = null; } addEntry(sh); return; }
    if (!hasMW(a0)){ sh.machine = null; sh.work = null; } renderSheet(); },
  /* trykk på valgt maskin/arbeid igjen for å fjerne valget (Line/Mod kan føres uten) */
  'pick-m'(el, sh){ sh.machine = sh.machine === el.dataset.m && sh.mode !== 'tech' ? null : el.dataset.m; if (ready1500(sh)) addEntry(sh); else renderSheet(); },
  'pick-w'(el, sh){ sh.work = sh.work === el.dataset.w && sh.mode !== 'tech' ? null : el.dataset.w; if (ready1500(sh)) addEntry(sh); else renderSheet(); },
  /* ny maskin i egen liten dialog */
  'new-m'(el, sh){ promptText({title:'Ny maskin', label:'Registrering', placeholder:'F.eks. ONA', ok:'Legg til', upper:true, fn:n => addMachine(sh, n)}); },
  step(el){ const e0 = S.entries.find(x => x.id === el.dataset.e); if (e0) setEntryHours(e0.id, +e0.hours + +el.dataset.d); },
  del(el, sh){ const e0 = S.entries.find(x => x.id === el.dataset.e); if (!e0) return; const t0 = tech(sh.tech);
    ask({title:'Slette føringen?', text:label(e0)+' · '+fmtH(e0.hours)+' t for '+t0.name+' '+ddmm(sh.date)+'.', ok:'Slett', fn:() => {
      const snap = snapshot();
      S.entries = S.entries.filter(x => x.id !== e0.id); if (e0.auto) S.noAuto[e0.date + '|' + e0.tech] = true; recomputeAuto(e0.tech, e0.date); save();
      resetHours(sh);
      renderSheet(); render(); toastUndo('Føring slettet', snap); }}); },
  'range-apply'(el, sh){
    const a = act(sh.act); if (!a) return; const snap = snapshot();
    const n = applyRange(sh.tech, sh.from, sh.to, a.id, sh.machine || '', sh.work || ''); save(); closeSheet();
    toastUndo(tech(sh.tech).name + ' ' + ddmm(sh.from) + '–' + ddmm(sh.to) + ': ' + n + ' ' + (n === 1 ? 'dag' : 'dager') + ' satt til ' + [a.name, sh.machine, sh.work].filter(Boolean).join(' · '), snap); },
  'range-clear'(el, sh){ const t0 = tech(sh.tech);
    ask({title:'Nullstille dagene?', text:'Alle føringer for ' + t0.name + ' ' + ddmm(sh.from) + '–' + ddmm(sh.to) + ' fjernes. LMS standard fyller arbeidsdagene igjen.', ok:'Nullstill', fn:() => {
      const snap = snapshot(); clearRange(sh.tech, sh.from, sh.to); save(); closeSheet(); toastUndo(t0.name + ' ' + ddmm(sh.from) + '–' + ddmm(sh.to) + ' nullstilt', snap); }}); },
  roles(el){ UI.sheet = {mode:'roles', tech:el.dataset.t}; renderSheet(); },
  'tech-shift'(el){ const t = tech(el.dataset.t); if (!t) return; const sid = +el.dataset.s; const snap = snapshot();
    if (!moveTech(t.id, sid)) return; save(); renderSheet(); render(); toastUndo(t.name + ' flyttet til ' + shiftOf(sid).name, snap); },
  'rm-tech'(el){ const t0 = tech(el.dataset.t); if (!t0) return; const n = S.entries.filter(x => x.tech === t0.id).length;
    ask({title:'Fjerne '+t0.name+'?', text: n ? n+' føringer for '+t0.name.split(' ')[0]+' blir også slettet.' : 'Teknikeren fjernes fra føring, kalender og rapport.', ok:'Fjern', fn:() => {
      const snap = snapshot(); removeTech(t0.id); save(); closeSheet(); toastUndo(t0.name+' fjernet', snap); }}); },
  role(el){ const t = tech(el.dataset.t); const r = el.dataset.r; t.roles = t.roles.includes(r) ? t.roles.filter(x => x !== r) : [...t.roles, r]; t.roles.sort((x, y) => S.roles.indexOf(x) - S.roles.indexOf(y)); save(); if (UI.sheet) renderSheet(); render(); }
};

export function onInput(el){
  if (el.id === 'sh-note' && UI.sheet && UI.sheet.mode === 'tech'){ setNote(UI.sheet.tech, UI.sheet.date, el.value); save(); return true; }
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
