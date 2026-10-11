/* Kort melding nederst på skjermen, og kopiering til utklippstavlen med manuell reserve. */
import { UI } from '../state.js';
import { renderSheet } from './sheet.js';

let toastT;
export function toast(msg){ const el = document.getElementById('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2600); }
export function copy(text, ok){
  const done = () => toast(ok);
  const fallback = () => { UI.sheet = {mode:'copy', text}; renderSheet(); };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch(e){ fallback(); }
}
