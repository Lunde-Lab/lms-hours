/* Oppsett: teknikere og roller, egne aktiviteter, maskiner, LMS-arbeid og backup. */
import { esc, uid } from '../util.js';
import { S, UI, setState, freshState, save, act, tech, shiftOf, color, isLocked, roleLocked, autoFill, migrate } from '../state.js';
import { loadDemo } from '../demo.js';
import { render } from '../render.js';
import { ask } from '../ui/dialog.js';
import { toast, copy } from '../ui/toast.js';
import { LOCK, val } from '../ui/bits.js';

export function vOpp(){
  let h = `<div class="banner"><b>Proof of concept.</b> Alt lagres bare i denne nettleseren. En ekte versjon trenger en felles database for de tre skiftlederne.</div>`;
  h += `<div class="cols">`;
  h += `<div style="display:grid;gap:16px;align-content:start;min-width:0">`;
  h += `<section class="panel set addrm"><h2>Legg til eller fjern tekniker</h2>
    <div class="row"><input type="text" id="new-tech" class="field" placeholder="Navn på ny tekniker"><select id="new-tech-s" class="field" style="flex:0 0 auto;min-width:0">${S.shifts.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><button class="btn" data-action="add-tech">Legg til</button></div>
    <div class="row"><select id="rm-tech" class="field"><option value="">Velg tekniker å fjerne</option>${S.shifts.map(x => `<optgroup label="${esc(x.name)}">${S.techs.filter(t => t.shift === x.id && !t.extra).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('')}</select><button class="btn danger" data-action="rm-tech">Fjern</button></div></section>`;
  h += `<section class="panel set"><h2>Teknikere og roller</h2><div class="muted" style="font-size:13px">Trykk på en tekniker for å sette roller.</div><div class="tlist">
    ${S.shifts.map(x => { const n = S.techs.filter(t => t.shift === x.id && !t.extra).length; const open = !!UI.oppOpen[x.id]; return `<button class="tl-sub" data-action="opp-toggle" data-s="${x.id}" aria-expanded="${open}"><span class="chev2">${open ? '▾' : '▸'}</span>${esc(x.name)} <span class="muted">· ${n}</span></button>` + (!open ? '' : S.techs.filter(t => t.shift === x.id && !t.extra).map(t => `<button class="tl-row" data-action="roles" data-t="${t.id}"><span class="nm">${esc(t.name)}</span><span class="tl-roles">${t.roles.length ? t.roles.map(r => `<span class="rtag">${esc(r)}</span>`).join('') : '<span class="muted" style="font-size:12px">Ingen roller</span>'}</span><span class="chev" aria-hidden="true">›</span></button>`).join('')); }).join('')}
    </div></section></div>`;
  h += `<div style="display:grid;gap:16px;align-content:start;min-width:0">`;
  h += `<section class="panel set"><h2>Egne aktiviteter</h2>${S.acts.some(a => !isLocked(a)) ? '' : '<div class="hint">Ingen egne aktiviteter. De faste aktivitetene kan ikke endres.</div>'}<table><thead><tr><th>Navn</th><th>Kode</th><th>Krever rolle</th><th></th></tr></thead><tbody>
    ${S.acts.filter(a => !isLocked(a)).map(a => `<tr><td><div class="row" style="flex-wrap:nowrap"><i style="width:12px;height:12px;border-radius:2px;flex:none;background:${color(a)}"></i><input type="text" id="an-${a.id}" data-field="aname" data-a="${a.id}" value="${esc(a.name)}" ${isLocked(a)?'readonly':''}></div></td>
      <td><input type="text" id="ac-${a.id}" data-field="acode" data-a="${a.id}" value="${esc(a.code)}" maxlength="3" style="width:56px"></td>
      <td><select id="ar-${a.id}" data-field="arole" data-a="${a.id}" ${isLocked(a)?'disabled':''}><option value="">Alle</option>${S.roles.map(r => `<option ${a.role===r?'selected':''}>${esc(r)}</option>`).join('')}</select></td>
      <td>${isLocked(a) ? LOCK : `<button class="btn sm danger" data-action="del-act" data-a="${a.id}">Fjern</button>`}</td></tr>`).join('')}
    </tbody></table><div class="row"><input type="text" id="new-act" class="field" placeholder="Ny aktivitet"><button class="btn" data-action="add-act">Legg til</button></div></section>`;
  h += `<section class="panel set"><h2>Maskiner (LMS)</h2><table><thead><tr><th>Maskin</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.machines.length ? S.machines.map(m => `<tr><td class="reg">${esc(m.name)}</td><td><button class="rolebtn" data-action="m-active" data-m="${m.id}" aria-pressed="${m.active}">${m.active?'I dokk':'Ferdig'}</button></td><td><button class="btn sm danger" data-action="del-m" data-m="${m.id}">Fjern</button></td></tr>`).join('') : '<tr><td colspan="3" class="muted">Ingen maskiner. Legg til her eller direkte når du fører LMS.</td></tr>'}
    </tbody></table><div class="muted" style="font-size:13px">Ferdige maskiner vises ikke ved føring, men timene blir i rapporten.</div>
    <div class="row"><input type="text" id="new-m" class="field" placeholder="F.eks. ONX"><button class="btn" data-action="add-m2">Legg til</button></div></section>`;
  h += `<section class="panel set"><h2>Roller og LMS-arbeid</h2>
    <div class="pills">${S.roles.map(r => `<span class="chip"><span>${esc(r)}</span>${roleLocked(r) ? '' : `<button class="btn sm ghost" data-action="del-role" data-r="${esc(r)}" aria-label="Fjern rolle">×</button>`}</span>`).join('')}</div>
    <div class="row"><input type="text" id="new-role" class="field" placeholder="Ny rolle"><button class="btn" data-action="add-role">Legg til rolle</button></div>
    <div class="pills">${S.work.map(w => `<span class="chip"><span>${esc(w)}</span><button class="btn sm ghost" data-action="del-work" data-w="${esc(w)}" aria-label="Fjern">×</button></span>`).join('')}</div>
    <div class="row"><input type="text" id="new-work" class="field" placeholder="Nytt arbeid (LMS)"><button class="btn" data-action="add-work">Legg til</button></div></section>`;
  h += `<section class="panel set"><h2>Data</h2><div class="row">
      <button class="btn" data-action="backup">Kopier backup</button>
      <button class="btn" data-action="demo">Last eksempeldata</button>
      <button class="btn sm danger" data-action="reset">Tøm alt</button>
    </div><label class="muted" style="font-size:13px;display:grid;gap:4px">Gjenopprett fra backup<textarea id="restore" placeholder="Lim inn backup her"></textarea></label><div><button class="btn sm" data-action="restore">Gjenopprett</button></div></section>`;
  h += `</div></div>`;
  return h;
}

export const actions = {
  'opp-toggle'(el){ UI.oppOpen[el.dataset.s] = !UI.oppOpen[el.dataset.s]; render(); },
  demo(){ loadDemo(); autoFill(); render(); toast('Eksempeldata lastet'); },
  reset(){ ask({title:'Tømme alt?', text:'Alle føringer, teknikere, maskiner og roller tilbakestilles. Dette kan ikke angres.', ok:'Tøm alt', fn:() => { setState(freshState()); autoFill(); render(); toast('Alt er tømt'); }}); },
  backup(){ copy(JSON.stringify(S), 'Backup kopiert. Lagre teksten et trygt sted.'); },
  restore(){ try { const o = JSON.parse(val('restore')); if (!o.techs || !o.entries) throw 0; setState(migrate(o)); save(); render(); toast('Backup gjenopprettet'); } catch(err){ toast('Kunne ikke lese backupen. Lim inn hele teksten fra «Kopier backup».'); } },
  'add-tech'(){ const n = val('new-tech'); if (!n){ toast('Skriv navnet på teknikeren'); return; } const sid = +val('new-tech-s')||1; S.techs.push({id:uid(), name:n, shift:sid, roles:[]}); save(); render(); toast(n+' lagt til på '+shiftOf(sid).name); },
  'rm-tech'(){ const id = val('rm-tech'); if (!id){ toast('Velg en tekniker å fjerne'); return; } const t0 = tech(id); const n = S.entries.filter(x => x.tech === id).length;
    ask({title:'Fjerne '+t0.name+'?', text: n ? n+' føringer for '+t0.name.split(' ')[0]+' blir også slettet.' : 'Teknikeren fjernes fra føring, kalender og rapport.', ok:'Fjern', fn:() => {
      S.techs = S.techs.filter(x => x.id !== id); S.entries = S.entries.filter(x => x.tech !== id); save(); render(); toast(t0.name+' fjernet'); }}); },
  'add-act'(){ const n = val('new-act'); if (!n) return; const used = new Set(S.acts.map(a => a.color)); const c = [1,2,3,4,5,6,7,8,9,10].find(x => !used.has(x)) || 10; S.acts.push({id:uid(), name:n, code:n.slice(0,2), role:'', type:'n', color:c}); save(); render(); },
  'del-act'(el){ const id = el.dataset.a; const a0 = act(id); if (!a0 || isLocked(a0)) return; const n = S.entries.filter(x => x.act === id).length;
    ask({title:'Fjerne '+a0.name+'?', text: n ? n+' føringer med denne aktiviteten blir også slettet.' : 'Aktiviteten fjernes fra listen.', ok:'Fjern', fn:() => {
      S.acts = S.acts.filter(x => x.id !== id); S.entries = S.entries.filter(x => x.act !== id); save(); render(); toast(a0.name+' fjernet'); }}); },
  'add-m2'(){ const n = val('new-m').toUpperCase(); if (!n || S.machines.some(m => m.name === n)) return; S.machines.push({id:uid(), name:n, active:true}); save(); render(); },
  'm-active'(el){ const m = S.machines.find(m => m.id === el.dataset.m); m.active = !m.active; save(); render(); },
  'del-m'(el){ const id = el.dataset.m; const m0 = S.machines.find(x => x.id === id);
    ask({title:'Fjerne '+m0.name+'?', text:'Maskinen fjernes fra listen. Timer som er ført på '+m0.name+' blir liggende i rapporten.', ok:'Fjern', fn:() => {
      S.machines = S.machines.filter(x => x.id !== id); save(); render(); toast(m0.name+' fjernet'); }}); },
  'add-role'(){ const n = val('new-role'); if (!n || S.roles.includes(n)) return; S.roles.push(n); save(); render(); },
  'del-role'(el){ const r = el.dataset.r; if (roleLocked(r)) return;
    ask({title:'Fjerne rollen '+r+'?', text:'Rollen fjernes fra alle teknikere. Aktiviteter som krevde den blir tilgjengelige for alle.', ok:'Fjern', fn:() => {
      S.roles = S.roles.filter(x => x !== r); for (const t of S.techs) t.roles = t.roles.filter(x => x !== r); for (const a of S.acts) if (a.role === r) a.role = ''; save(); render(); toast('Rollen '+r+' fjernet'); }}); },
  'add-work'(){ const n = val('new-work'); if (!n || S.work.includes(n)) return; S.work.push(n); save(); render(); },
  'del-work'(el){ const w = el.dataset.w;
    ask({title:'Fjerne «'+w+'»?', text:'Valget fjernes fra LMS. Timer som allerede er ført blir liggende.', ok:'Fjern', fn:() => { S.work = S.work.filter(x => x !== w); save(); render(); }}); }
};

/* felt i tabellen «Egne aktiviteter» */
export function onChange(el){
  const f = el.dataset.field; if (!f) return false;
  if (f === 'aname'){ act(el.dataset.a).name = el.value.trim() || act(el.dataset.a).name; }
  else if (f === 'acode'){ act(el.dataset.a).code = el.value.trim() || act(el.dataset.a).code; }
  else if (f === 'arole'){ act(el.dataset.a).role = el.value; }
  save(); render(); return true;
}
