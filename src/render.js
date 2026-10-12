/* Tegner aktiv fane i <main id="view">, og Føring-modalen (#dayov) når den er åpen. */
import { UI } from './state.js';
import { savePref } from './prefs.js';
import { vFore } from './views/foring.js';
import { vKal } from './views/kalender.js';
import { vRap } from './views/rapport.js';
import { vOpp } from './views/oppsett.js';

export function render(){
  if (!['kal', 'rap', 'opp'].includes(UI.tab)) UI.tab = 'kal';   /* Føring er ikke lenger egen fane */
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
  renderDay();
}

/* Føring for én dag som modal over kalenderen. Arket for en tekniker legger seg over denne. */
function renderDay(){
  const el = document.getElementById('dayov');
  if (!UI.dayOpen){ el.hidden = true; el.innerHTML = ''; return; }
  const prev = el.querySelector('.daysheet'); const y = prev ? prev.scrollTop : 0;
  el.hidden = false;
  el.innerHTML = `<div class="scrim day-scrim" data-action="day-scrim"><div class="sheet daysheet${prev ? '' : ' anim'}" role="dialog" aria-modal="true" aria-label="Dagsoversikt">${vFore()}</div></div>`;
  el.querySelector('.daysheet').scrollTop = y;
}

export function setTab(t){ UI.tab = t; render(); savePref('tab', t); }
