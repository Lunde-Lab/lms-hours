/* Bekreftelsesdialog (f.eks. før sletting). */
import { UI } from '../state.js';
import { esc } from '../util.js';

export function ask(o){ UI.dlg = o; renderDlg(); }
export function renderDlg(){
  const el = document.getElementById('dlg'); const d = UI.dlg;
  if (!d){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<div class="dscrim" data-action="dlg-scrim"><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"><div class="dlg-t" id="dlg-t">${esc(d.title)}</div><p>${esc(d.text)}</p><div class="dlg-f"><button class="btn" data-action="dlg-cancel">Avbryt</button><button class="btn danger-fill" data-action="dlg-ok">${esc(d.ok)}</button></div></div></div>`;
  el.querySelector('[data-action="dlg-cancel"]').focus();
}
export function closeDlg(){ UI.dlg = null; renderDlg(); }

/* Håndteres før vanlige handlinger: klikk på bakgrunnen lukker bare når selve bakgrunnen treffes. */
export function dlgClick(A, el, e){
  if (A === 'dlg-scrim'){ if (e.target === el) closeDlg(); return true; }
  if (A === 'dlg-cancel'){ closeDlg(); return true; }
  if (A === 'dlg-ok'){ const fn = UI.dlg && UI.dlg.fn; closeDlg(); if (fn) fn(); return true; }
  return false;
}
