/* Tegner aktiv fane i <main id="view">. */
import { UI, me } from './state.js';
import { savePref } from './prefs.js';
import { vKal } from './views/kalender.js';
import { vRap } from './views/rapport.js';
import { vOpp } from './views/oppsett.js';
import { vLogin, vWho } from './views/profil.js';

export function render(){
  /* uten profil: ingen tilgang, bare «Velg profil» */
  const ok = !!me();
  document.getElementById('tabs').style.display = ok ? '' : 'none';
  document.getElementById('who').innerHTML = vWho();
  if (!ok){ const v = document.getElementById('view'); v.className = ''; v.innerHTML = vLogin(); UI.calShown = null; return; }
  if (!['kal', 'rap', 'opp'].includes(UI.tab)) UI.tab = 'kal';
  for (const b of document.querySelectorAll('.tab')) b.setAttribute('aria-current', b.dataset.tab === UI.tab ? 'page' : 'false');
  const v = document.getElementById('view');
  const pw = v.querySelector('.cal-wrap'); const keep = pw && UI.tab === 'kal' && UI.calShown === UI.cal ? pw.scrollLeft : null; const keepY = pw ? pw.scrollTop : 0;
  const py = window.scrollY;
  v.className = UI.tab === 'kal' ? 'wide' : '';
  v.innerHTML = UI.tab === 'kal' ? vKal() : UI.tab === 'rap' ? vRap() : vOpp();
  if (UI.tab === 'kal'){ const w = v.querySelector('.cal-wrap'); const td = v.querySelector('thead th.today');
    const wk = v.querySelector('thead tr.wk'); if (wk && w) w.style.setProperty('--wk-h', wk.offsetHeight + 'px');   /* datoraden legger seg under ukeraden */
    if (w && keep !== null){ w.scrollLeft = keep; w.scrollTop = keepY; window.scrollTo(0, py); } else if (td && w) w.scrollLeft = Math.max(0, td.offsetLeft - 240);
    UI.calShown = UI.cal; } else UI.calShown = null;
}

export function setTab(t){ UI.tab = t; render(); savePref('tab', t); }
