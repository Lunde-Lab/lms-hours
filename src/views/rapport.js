/* Rapport: timer i en periode per aktivitet, maskin, skift og tekniker, og eksport som CSV. */
import { dn, isoOf, todayIso, ddmm, fmtH, esc } from '../util.js';
import { S, UI, tech, act, shiftOf, cycle, sumH, color } from '../state.js';
import { render } from '../render.js';
import { copy } from '../ui/toast.js';
import { xtag } from '../ui/bits.js';

export function vRap(){
  const today = todayIso();
  if (!UI.from){ UI.from = today.slice(0,8)+'01'; UI.to = today; }
  const f = dn(UI.from), t = dn(UI.to);
  const list = S.entries.filter(e => { const n = dn(e.date); return n >= f && n <= t; });
  const total = sumH(list);
  const byAct = new Map(S.acts.map(a => [a.id,0])); for (const e of list) byAct.set(e.act, (byAct.get(e.act)||0) + +e.hours);
  const h15 = byAct.get('h1500') || 0;
  const max = Math.max(1, ...byAct.values());
  let h = `<div class="row" style="justify-content:space-between;align-items:end">
    <div class="range">
      <label>Fra<input type="date" id="r-from" value="${UI.from}"></label>
      <label>Til<input type="date" id="r-to" value="${UI.to}"></label>
      <button class="btn sm" data-action="range" data-r="period">Denne skiftperioden</button>
      <button class="btn sm" data-action="range" data-r="month">Denne måneden</button>
      <button class="btn sm" data-action="range" data-r="year">I år</button>
    </div>
    <button class="btn primary" data-action="csv">Kopier som CSV</button></div>`;
  h += `<div class="tiles">
    <div class="panel tile"><span class="v num">${fmtH(total)}</span><span class="l">Timer totalt</span></div>
    <div class="panel tile"><span class="v num">${fmtH(h15)}</span><span class="l">Timer LMS · ${total ? Math.round(h15/total*100) : 0} %</span></div>
  </div>`;
  h += `<div class="cols"><div class="panel card"><h3>Per aktivitet</h3><div class="bars">${S.acts.map(a => { const v = byAct.get(a.id)||0; return `<div class="barrow"><span>${esc(a.name)}</span><span class="track"><i style="width:${v/max*100}%;background:${color(a)}"></i></span><span class="v">${fmtH(v)} t <span class="muted">${total ? Math.round(v / total * 100) : 0} %</span></span></div>`; }).join('')}</div></div>`;
  const mset = [...new Set([...S.machines.map(m => m.name), ...list.filter(e => e.act==='h1500').map(e => e.machine)])].filter(Boolean);
  const mm = (m,w) => sumH(list.filter(e => e.act==='h1500' && e.machine===m && (!w || e.work===w)));
  h += `<div class="panel card"><h3>LMS per maskin</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Maskin</th>${S.work.map(w => `<th>${esc(w)}</th>`).join('')}<th>Sum</th></tr></thead><tbody>
    ${mset.length ? mset.map(m => `<tr><td class="reg">${esc(m)}</td>${S.work.map(w => { const v = mm(m,w); return `<td class="num ${v?'':'z'}">${v?fmtH(v):'–'}</td>`; }).join('')}<td class="num"><b>${fmtH(mm(m))}</b></td></tr>`).join('') : ''}
    ${(() => { const nm = list.filter(e => e.act === 'h1500' && !e.machine); const v = sumH(nm); return `<tr><td class="muted">Ingen maskin</td>${S.work.map(w => { const x = sumH(nm.filter(e => e.work === w)); return `<td class="num ${x?'':'z'}">${x?fmtH(x):'–'}</td>`; }).join('')}<td class="num"><b>${fmtH(v)}</b></td></tr>`; })()}
    </tbody><tfoot><tr><td>Sum</td>${S.work.map(w => `<td class="num">${fmtH(sumH(list.filter(e => e.act==='h1500' && e.work===w)))}</td>`).join('')}<td class="num">${fmtH(h15)}</td></tr></tfoot></table></div>
    <h3>Per skift</h3><div class="tbl-wrap"><table class="t"><tbody>${S.shifts.map(s => { const ids = new Set(S.techs.filter(x => x.shift===s.id).map(x => x.id)); return `<tr><td>${esc(s.name)}</td><td class="num">${fmtH(sumH(list.filter(e => ids.has(e.tech))))} t</td></tr>`; }).join('')}</tbody></table></div></div></div>`;
  h += `<div class="panel card"><h3>Per tekniker</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Tekniker</th>${S.acts.map(a => `<th>${esc(a.name)}</th>`).join('')}<th>Sum</th></tr></thead><tbody>`;
  for (const s of S.shifts){
    const xs = S.techs.filter(x => x.shift === s.id && (!x.extra || list.some(e => e.tech === x.id) || (dn(x.extra.until) >= f && dn(x.extra.from) <= t)));
    const sids = new Set(xs.map(x => x.id)); const sl = list.filter(e => sids.has(e.tech)); const open = !!UI.rapOpen[s.id];
    h += `<tr class="grp-row" data-action="rap-toggle" data-s="${s.id}" aria-expanded="${open}"><td><span class="chev2">${open ? '▾' : '▸'}</span>${esc(s.name)} <span class="muted">· ${xs.length}</span></td>${S.acts.map(a => { const v = sumH(sl.filter(e => e.act === a.id)); return `<td class="num ${v?'':'z'}">${v?fmtH(v):'–'}</td>`; }).join('')}<td class="num"><b>${fmtH(sumH(sl))}</b></td></tr>`;
    if (!open) continue;
    for (const x of xs){
      const mine = list.filter(e => e.tech === x.id);
      h += `<tr class="in"><td>${esc(x.name)}${xtag(x)}</td>${S.acts.map(a => { const v = sumH(mine.filter(e => e.act===a.id)); return `<td class="num ${v?'':'z'}">${v?fmtH(v):'–'}</td>`; }).join('')}<td class="num"><b>${fmtH(sumH(mine))}</b></td></tr>`;
    }
  }
  h += `</tbody><tfoot><tr><td>Sum</td>${S.acts.map(a => `<td class="num">${fmtH(byAct.get(a.id)||0)}</td>`).join('')}<td class="num">${fmtH(total)}</td></tr></tfoot></table></div></div>`;
  return h;
}

export const actions = {
  'rap-toggle'(el){ UI.rapOpen[el.dataset.s] = !UI.rapOpen[el.dataset.s]; render(); },
  range(el){
    const t = todayIso();
    if (el.dataset.r === 'month'){ UI.from = t.slice(0,8)+'01'; UI.to = t; }
    else if (el.dataset.r === 'year'){ UI.from = t.slice(0,5)+'01-01'; UI.to = t; }
    else { const s = shiftOf(1); const c = cycle(); const p = (((dn(t)-dn(s.start))%c)+c)%c; UI.from = isoOf(dn(t)-p); UI.to = isoOf(dn(t)-p+c-1); }
    render(); },
  csv(){
    const f = dn(UI.from), t = dn(UI.to);
    const rows = S.entries.filter(x => { const n = dn(x.date); return n >= f && n <= t; }).sort((a,b) => a.date.localeCompare(b.date));
    const lines = ['Dato;Skift;Tekniker;Aktivitet;Maskin;Arbeid;Timer', ...rows.map(x => { const tt = tech(x.tech); const a = act(x.act); return [ddmm(x.date)+'.'+x.date.slice(0,4), tt?shiftOf(tt.shift).name:'', tt?tt.name:'', a?a.name:'', x.machine||'', x.work||'', String(x.hours).replace('.',',')].join(';'); })];
    copy(lines.join('\n'), rows.length + ' rader kopiert. Lim inn i Excel.'); }
};

export function onChange(el){
  if (el.id === 'r-from' && el.value){ UI.from = el.value; render(); return true; }
  if (el.id === 'r-to' && el.value){ UI.to = el.value; render(); return true; }
  return false;
}
