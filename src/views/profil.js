/* Profiler: «Velg profil» når ingen er innlogget, profilen i appbaren, og administrasjon av profiler (bare admin, i Oppsett). */
import { esc, uid } from '../util.js';
import { S, UI, me, save, shiftOf } from '../state.js';
import { ROLES, isAdmin, roleText, checkNew, checkRemove, profileOf } from '../profiles.js';
import { savePref } from '../prefs.js';
import { render } from '../render.js';
import { ask, closeDlg } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { renderSheet } from '../ui/sheet.js';
import { val } from '../ui/bits.js';

const shiftTxt = p => p.shift ? shiftOf(p.shift)?.name || '' : '';

export function vLogin(){
  return `<div class="banner"><b>Proof of concept.</b> Bare skiftledere og admin har tilgang. Profilen velges uten passord her; en ekte versjon logger inn via felles database.</div>
  <section class="panel set" style="max-width:520px;width:100%;justify-self:center"><h2>Velg profil</h2><div class="tlist">
    ${S.profiles.map(p => `<button class="tl-row" data-action="login" data-p="${p.id}"><span class="nm">${esc(p.name)}</span><span class="tl-roles"><span class="rtag">${esc(roleText(p))}</span>${p.shift ? `<span class="muted" style="font-size:12px">${esc(shiftTxt(p))}</span>` : ''}</span><span class="chev" aria-hidden="true">›</span></button>`).join('')}
  </div></section>`;
}

/* Innlogget profil i appbaren */
export function vWho(){
  const p = me(); if (!p) return '';
  return `<span class="muted" style="font-size:13px">${esc(p.name)}${p.name === roleText(p) ? '' : `<span class="who-r"> · ${esc(roleText(p))}</span>`}</span><button class="icon-btn sm" data-action="logout" aria-label="Bytt profil" title="Bytt profil"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/></svg></button>`;
}

/* Panel i Oppsett: bare for admin */
export function vProfiles(){
  if (!isAdmin(me())) return '';
  const opts = S.shifts.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  return `<section class="panel set"><h2>Profiler</h2><div class="muted" style="font-size:13px">Bare skiftledere og admin har tilgang til appen. Admin kan i tillegg legge til og fjerne profiler.</div>
    <table><thead><tr><th>Navn</th><th>Rolle</th><th>Skift</th><th></th></tr></thead><tbody>
    ${S.profiles.map(p => `<tr><td>${esc(p.name)}${p.id === UI.me ? ' <span class="muted">(deg)</span>' : ''}</td><td><span class="rtag">${esc(roleText(p))}</span></td><td>${esc(shiftTxt(p)) || '<span class="muted">–</span>'}</td><td>${p.id === UI.me ? '' : `<button class="btn sm danger" data-action="prof-rm" data-p="${p.id}">Fjern</button>`}</td></tr>`).join('')}
    </tbody></table>
    <div class="row"><input type="text" id="new-prof" class="field" placeholder="Navn på ny profil"><select id="new-prof-r" class="field" style="flex:0 0 auto;min-width:0">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}"${k === 'leader' ? ' selected' : ''}>${v}</option>`).join('')}</select><select id="new-prof-s" class="field" style="flex:0 0 auto;min-width:0" aria-label="Skift">${opts}</select><button class="btn" data-action="prof-add">Legg til</button></div>
    <div class="muted" style="font-size:13px">Skiftet er skiftlederens eget skift. Admin har ikke eget skift.</div></section>`;
}

export function login(id){
  const p = profileOf(S.profiles, id); if (!p) return false;
  UI.me = p.id; savePref('profile', p.id);
  return true;
}
export function logout(){
  UI.me = null; savePref('profile', '');
  UI.sheet = null; renderSheet(); closeDlg();
}

/* Handlinger som bare admin kan gjøre (sjekkes i app.js før handlingen kjøres) */
export const ADMIN_ONLY = ['prof-add', 'prof-rm'];

export const actions = {
  login(el){ if (login(el.dataset.p)){ render(); toast('Logget inn som ' + me().name); } },
  logout(){ logout(); render(); },
  'prof-add'(){
    const p = {name: val('new-prof'), role: val('new-prof-r'), shift: null};
    if (p.role === 'leader') p.shift = +val('new-prof-s') || null;
    const err = checkNew(S.profiles, p); if (err){ toast(err); return; }
    S.profiles.push({id:uid(), name:p.name, role:p.role, shift:p.shift}); save(); render(); toast(p.name + ' lagt til som ' + ROLES[p.role].toLowerCase());
  },
  'prof-rm'(el){
    const id = el.dataset.p; const err = checkRemove(S.profiles, id, me()); if (err){ toast(err); return; }
    const p = profileOf(S.profiles, id);
    ask({title:'Fjerne ' + p.name + '?', text:p.name + ' mister tilgangen til appen. Føringer og teknikere påvirkes ikke.', ok:'Fjern', fn:() => {
      S.profiles = S.profiles.filter(x => x.id !== id); save(); render(); toast(p.name + ' fjernet'); }});
  }
};

export function onChange(el){
  if (el.id !== 'new-prof-r') return false;
  const s = document.getElementById('new-prof-s'); if (s) s.disabled = el.value !== 'leader';
  return true;
}
