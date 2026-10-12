/* Oppsett: teknikere og roller, maskiner og backup.
   Aktiviteter, roller og LMS-arbeid legges inn i koden (model.js), ikke her. */
import { esc, uid } from '../util.js';
import { S, UI, setState, freshState, save, tech, shiftOf, autoFill, migrate } from '../state.js';
import { render } from '../render.js';
import { ask } from '../ui/dialog.js';
import { toast, toastUndo, snapshot, copy } from '../ui/toast.js';
import { val } from '../ui/bits.js';

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
  h += `<section class="panel set"><h2>Maskiner (LMS)</h2><table><thead><tr><th>Maskin</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.machines.length ? S.machines.map(m => `<tr><td class="reg">${esc(m.name)}</td><td><button class="rolebtn" data-action="m-active" data-m="${m.id}" aria-pressed="${m.active}">${m.active?'I dokk':'Ferdig'}</button></td><td><button class="btn sm danger" data-action="del-m" data-m="${m.id}">Fjern</button></td></tr>`).join('') : '<tr><td colspan="3" class="muted">Ingen maskiner. Legg til her eller direkte når du fører LMS.</td></tr>'}
    </tbody></table><div class="muted" style="font-size:13px">Ferdige maskiner vises ikke ved føring, men timene blir i rapporten.</div>
    <div class="row"><input type="text" id="new-m" class="field" placeholder="F.eks. ONX"><button class="btn" data-action="add-m2">Legg til</button></div></section>`;
  h += `<section class="panel set"><h2>Data</h2><div class="row">
      <button class="btn" data-action="backup">Kopier backup</button>
      <button class="btn sm danger" data-action="reset">Tøm alt</button>
    </div><label class="muted" style="font-size:13px;display:grid;gap:4px">Gjenopprett fra backup<textarea id="restore" placeholder="Lim inn backup her"></textarea></label><div><button class="btn sm" data-action="restore">Gjenopprett</button></div></section>`;
  h += `</div></div>`;
  return h;
}

export const actions = {
  'opp-toggle'(el){ UI.oppOpen[el.dataset.s] = !UI.oppOpen[el.dataset.s]; render(); },
  reset(){ ask({title:'Tømme alt?', text:'Alle føringer, teknikere, maskiner og roller tilbakestilles. Dette kan ikke angres.', ok:'Tøm alt', fn:() => { setState(freshState()); autoFill(); render(); toast('Alt er tømt'); }}); },
  backup(){ copy(JSON.stringify(S), 'Backup kopiert. Lagre teksten et trygt sted.'); },
  restore(){ try { const o = JSON.parse(val('restore')); if (!o.techs || !o.entries) throw 0; setState(migrate(o)); save(); render(); toast('Backup gjenopprettet'); } catch(err){ toast('Kunne ikke lese backupen. Lim inn hele teksten fra «Kopier backup».'); } },
  'add-tech'(){ const n = val('new-tech'); if (!n){ toast('Skriv navnet på teknikeren'); return; } const sid = +val('new-tech-s')||1; S.techs.push({id:uid(), name:n, shift:sid, roles:[]}); save(); render(); toast(n+' lagt til på '+shiftOf(sid).name); },
  'rm-tech'(){ const id = val('rm-tech'); if (!id){ toast('Velg en tekniker å fjerne'); return; } const t0 = tech(id); const n = S.entries.filter(x => x.tech === id).length;
    ask({title:'Fjerne '+t0.name+'?', text: n ? n+' føringer for '+t0.name.split(' ')[0]+' blir også slettet.' : 'Teknikeren fjernes fra føring, kalender og rapport.', ok:'Fjern', fn:() => {
      const snap = snapshot(); S.techs = S.techs.filter(x => x.id !== id); S.entries = S.entries.filter(x => x.tech !== id); for (const k in S.notes || {}) if (k.endsWith('|' + id)) delete S.notes[k]; save(); render(); toastUndo(t0.name+' fjernet', snap); }}); },
  'add-m2'(){ const n = val('new-m').toUpperCase(); if (!n || S.machines.some(m => m.name === n)) return; S.machines.push({id:uid(), name:n, active:true}); save(); render(); },
  'm-active'(el){ const m = S.machines.find(m => m.id === el.dataset.m); m.active = !m.active; save(); render(); },
  'del-m'(el){ const id = el.dataset.m; const m0 = S.machines.find(x => x.id === id);
    ask({title:'Fjerne '+m0.name+'?', text:'Maskinen fjernes fra listen. Timer som er ført på '+m0.name+' blir liggende i rapporten.', ok:'Fjern', fn:() => {
      S.machines = S.machines.filter(x => x.id !== id); save(); render(); toast(m0.name+' fjernet'); }}); },
};

