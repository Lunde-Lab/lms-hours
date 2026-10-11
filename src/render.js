/* Tegner aktiv fane i <main id="view">. */
import { UI } from './state.js';
import { savePref } from './prefs.js';
import { vFore } from './views/foring.js';
import { vKal } from './views/kalender.js';
import { vRap } from './views/rapport.js';
import { vOpp } from './views/oppsett.js';

export function render(){
  for (const b of document.querySelectorAll('.tab')) b.setAttribute('aria-current', b.dataset.tab === UI.tab ? 'page' : 'false');
  const v = document.getElementById('view');
  const pw = v.querySelector('.cal-wrap'); const keep = pw && UI.tab === 'kal' && UI.calShown === UI.cal ? pw.scrollLeft : null;
  const py = window.scrollY;
  v.className = UI.tab === 'kal' ? 'wide' : '';
  v.innerHTML = UI.tab === 'fore' ? vFore() : UI.tab === 'kal' ? vKal() : UI.tab === 'rap' ? vRap() : vOpp();
  if (UI.tab === 'kal'){ const w = v.querySelector('.cal-wrap'); const td = v.querySelector('thead th.today');
    if (w && keep !== null){ w.scrollLeft = keep; window.scrollTo(0, py); } else if (td && w) w.scrollLeft = Math.max(0, td.offsetLeft - 240);
    UI.calShown = UI.cal; } else UI.calShown = null;
}

export function setTab(t){ UI.tab = t; render(); savePref('tab', t); }
