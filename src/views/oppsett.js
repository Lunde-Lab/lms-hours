/* Oppsett: teknikere og roller (legg til her; skift, roller og fjerning i teknikermodalen) og status for maskiner. Profiler er bare for admin.
   Aktiviteter, roller og LMS-arbeid legges inn i koden (model.js), ikke her. */
import { esc, uid } from '../util.js';
import { S, UI, save, shiftOf } from '../state.js';
import { vProfiles } from './profil.js';
import { render } from '../render.js';
import { toast } from '../ui/toast.js';
import { val } from '../ui/bits.js';

export function vOpp(){
  let h = `<div class="cols">`;
  h += `<div style="display:grid;gap:16px;align-content:start;min-width:0">`;
  h += `<section class="panel set"><h2>Teknikere og roller</h2><div class="muted" style="font-size:13px">Trykk på en tekniker for å sette roller, flytte til et annet skift eller fjerne.</div><div class="tlist">
    ${S.shifts.map(x => { const n = S.techs.filter(t => t.shift === x.id && !t.extra).length; const open = !!UI.oppOpen[x.id]; return `<button class="tl-sub" data-action="opp-toggle" data-s="${x.id}" aria-expanded="${open}"><span class="chev2">${open ? '▾' : '▸'}</span>${esc(x.name)} <span class="muted">· ${n}</span></button>` + (!open ? '' : S.techs.filter(t => t.shift === x.id && !t.extra).map(t => `<button class="tl-row" data-action="roles" data-t="${t.id}"><span class="nm">${esc(t.name)}</span><span class="tl-roles">${t.roles.length ? t.roles.map(r => `<span class="rtag">${esc(r)}</span>`).join('') : '<span class="muted" style="font-size:12px">Ingen roller</span>'}</span><span class="chev" aria-hidden="true">›</span></button>`).join('')); }).join('')}
    </div>
    <div class="row"><input type="text" id="new-tech" class="field" placeholder="Navn på ny tekniker"><select id="new-tech-s" class="field" style="flex:0 0 auto;min-width:0">${S.shifts.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><button class="btn" data-action="add-tech">Legg til</button></div></section></div>`;
  h += `<div style="display:grid;gap:16px;align-content:start;min-width:0">`;
  h += `<section class="panel set"><h2>Maskiner (LMS)</h2><table><thead><tr><th>Maskin</th><th>Status</th></tr></thead><tbody>
    ${S.machines.length ? S.machines.map(m => `<tr><td class="reg">${esc(m.name)}</td><td><button class="rolebtn" data-action="m-active" data-m="${m.id}" aria-pressed="${m.active}">${m.active?'I dokk':'Ferdig'}</button></td></tr>`).join('') : '<tr><td colspan="2" class="muted">Ingen maskiner.</td></tr>'}
    </tbody></table><div class="muted" style="font-size:13px">Bare maskiner i dokk vises ved føring. Timer på ferdige maskiner blir i rapporten.</div></section>`;
  h += vProfiles();
  h += `</div></div>`;
  return h;
}

export const actions = {
  'opp-toggle'(el){ UI.oppOpen[el.dataset.s] = !UI.oppOpen[el.dataset.s]; render(); },
  'add-tech'(){ const n = val('new-tech'); if (!n){ toast('Skriv navnet på teknikeren'); return; } const sid = +val('new-tech-s')||1; S.techs.push({id:uid(), name:n, shift:sid, roles:[]}); save(); render(); toast(n+' lagt til på '+shiftOf(sid).name); },
  'm-active'(el){ const m = S.machines.find(m => m.id === el.dataset.m); m.active = !m.active; save(); render(); }
};

