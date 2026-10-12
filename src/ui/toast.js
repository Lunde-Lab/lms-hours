/* Kort melding nederst på skjermen (med «Angre» for større endringer), og kopiering til utklippstavlen med manuell reserve. */
import { S, UI, setState, reindex, save } from '../state.js';
import { esc } from '../util.js';
import { renderSheet } from './sheet.js';
import { render } from '../render.js';

let toastT, undoFn = null;
/* undo: funksjon som angrer endringen; da vises «Angre» og meldingen står lenger */
export function toast(msg, undo){
  const el = document.getElementById('toast');
  undoFn = undo || null;
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="toast-undo" data-action="undo">Angre</button>' : ''}`;
  el.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; undoFn = null; }, undo ? 8000 : 2600);
}
/* Ta et øyeblikksbilde før en større endring, og vis meldingen med «Angre» etterpå. */
export const snapshot = () => JSON.stringify(S);
export function toastUndo(msg, snap){
  toast(msg, () => { setState(JSON.parse(snap)); reindex(); save(); if (UI.sheet) renderSheet(); render(); toast('Endringen er angret'); });
}
export const actions = {
  undo(){ const f = undoFn; undoFn = null; document.getElementById('toast').hidden = true; if (f) f(); }
};
export function copy(text, ok){
  const done = () => toast(ok);
  const fallback = () => { UI.sheet = {mode:'copy', text}; renderSheet(); };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch(e){ fallback(); }
}
