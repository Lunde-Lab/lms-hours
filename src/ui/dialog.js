/* Bekreftelsesdialog (f.eks. før sletting) og liten skrivedialog (f.eks. ny maskin). */
import { UI } from '../state.js';
import { esc } from '../util.js';

export function ask(o){ UI.dlg = o; renderDlg(); }
/* o: {title, label, placeholder, ok, upper, fn(verdi)}; fn kalles bare med ikke-tom tekst */
export function promptText(o){ UI.dlg = {...o, input:true}; renderDlg(); }
export function renderDlg(){
  const el = document.getElementById('dlg'); const d = UI.dlg;
  if (!d){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const body = d.input
    ? `<label class="dlg-l">${esc(d.label || '')}<input type="text" id="dlg-in" class="field${d.upper ? ' upper' : ''}" placeholder="${esc(d.placeholder || '')}" autocomplete="off"></label>`
    : `<p>${esc(d.text)}</p>`;
  el.innerHTML = `<div class="dscrim" data-action="dlg-scrim"><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"><div class="dlg-t" id="dlg-t">${esc(d.title)}</div>${body}<div class="dlg-f"><button class="btn" data-action="dlg-cancel">Avbryt</button><button class="btn ${d.input ? 'primary' : 'danger-fill'}" data-action="dlg-ok">${esc(d.ok)}</button></div></div></div>`;
  el.querySelector(d.input ? '#dlg-in' : '[data-action="dlg-cancel"]').focus();
}
export function closeDlg(){ UI.dlg = null; renderDlg(); }

/* Håndteres før vanlige handlinger: klikk på bakgrunnen lukker bare når selve bakgrunnen treffes. */
export function dlgClick(A, el, e){
  if (A === 'dlg-scrim'){ if (e.target === el) closeDlg(); return true; }
  if (A === 'dlg-cancel'){ closeDlg(); return true; }
  if (A === 'dlg-ok'){
    const d = UI.dlg; if (!d) return true;
    if (d.input){ const v = (document.getElementById('dlg-in')?.value || '').trim(); if (!v){ document.getElementById('dlg-in')?.focus(); return true; } closeDlg(); d.fn(d.upper ? v.toUpperCase() : v); return true; }
    closeDlg(); if (d.fn) d.fn(); return true; }
  return false;
}
