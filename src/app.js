/* Oppstart og hendelser. Hver visning/UI-modul eksporterer `actions` (data-action → funksjon)
   og eventuelt onChange/onInput/onKey som returnerer true når hendelsen er håndtert. */
import { VERSION } from './model.js';
import { S, UI, me, setState, setStorage, load, save, migrate, autoFill } from './state.js';
import { createStorage } from './storage/index.js';
import { loadPref } from './prefs.js';
import { loadDemo } from './demo.js';
import { render, setTab } from './render.js';
import * as foring from './views/foring.js';
import * as kalender from './views/kalender.js';
import * as rapport from './views/rapport.js';
import * as oppsett from './views/oppsett.js';
import * as profil from './views/profil.js';
import { isAdmin } from './profiles.js';
import * as sheet from './ui/sheet.js';
import { dlgClick, closeDlg } from './ui/dialog.js';
import * as toastUI from './ui/toast.js';

const ACTIONS = { tab: el => setTab(el.dataset.tab), ...foring.actions, ...kalender.actions, ...rapport.actions, ...oppsett.actions, ...profil.actions, ...sheet.actions, ...toastUI.actions };
const ON_CHANGE = [profil.onChange, foring.onChange, rapport.onChange, sheet.onChange];

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const A = el.dataset.action;
  if (dlgClick(A, el, e)) return;
  /* tilgang: uten profil går bare innlogging; noen handlinger er bare for admin */
  if (!me() && A !== 'login') return;
  if (profil.ADMIN_ONLY.includes(A) && !isAdmin(me())){ toastUI.toast('Bare admin kan gjøre dette'); return; }
  const fn = ACTIONS[A]; if (fn) fn(el, UI.sheet, e);
});
document.addEventListener('input', e => { sheet.onInput(e.target); });
document.addEventListener('change', e => { for (const fn of ON_CHANGE) if (fn(e.target)) return; });
document.addEventListener('keydown', e => {
  if (!me()) return;
  if (kalender.onKey(e)) return;
  if (e.key === 'Escape'){ if (UI.dlg) closeDlg(); else if (UI.sheet) sheet.closeSheet(); else if (UI.dayOpen){ UI.dayOpen = false; render(); } }
  if (e.key === 'Enter' && e.target.id === 'dlg-in'){ e.preventDefault(); document.querySelector('[data-action="dlg-ok"]')?.click(); }
});

/* config.js er lokal og ligger i .gitignore; uten den brukes config.example.js (STORAGE = 'local'). */
async function loadConfig(){
  try { return await import('../config.js'); }
  catch(e){ return await import('../config.example.js'); }
}

async function boot(){
  setStorage(await createStorage(await loadConfig()));
  if (!(await load())) loadDemo();
  else if ((S.v||1) < VERSION && (S.demo || (S.v||1) < 9)) loadDemo();
  else { setState(migrate(S)); save(); }
  autoFill();
  const t = loadPref('tab'); if (t) UI.tab = t;
  profil.login(loadPref('profile'));   /* sist brukte profil i denne nettleseren, hvis den fortsatt finnes */
  render();
}

boot().catch(err => {
  console.error(err);
  document.getElementById('view').innerHTML = `<div class="banner"><b>Kunne ikke starte.</b> ${String(err.message || err).replace(/[&<>]/g, '')}</div>`;
});
