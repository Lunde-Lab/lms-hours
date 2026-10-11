/* Dato- og formateringshjelpere. Datoer er ISO-strenger (YYYY-MM-DD); dn() gir dagnummer i UTC. */
export const DAY = 864e5;
export const WD = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
export const WDS = ['sø','ma','ti','on','to','fr','lø'];
export const MON = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];

export const dn = s => { const [y,m,d] = s.split('-').map(Number); return Math.round(Date.UTC(y,m-1,d)/DAY); };
export const isoOf = n => new Date(n*DAY).toISOString().slice(0,10);
export const todayIso = () => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
export const udate = s => new Date(dn(s)*DAY);
export const ddmm = s => { const d = udate(s); return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0'); };
export const longDate = s => { const d = udate(s); return WD[d.getUTCDay()]+' '+d.getUTCDate()+'. '+MON[d.getUTCMonth()]; };
export const fmtH = h => (Math.round(h*10)/10).toLocaleString('nb-NO');
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid = () => Math.random().toString(36).slice(2,9);
export const mins = s => { const [h,m] = String(s||'0:0').split(':').map(Number); return (h||0)*60 + (m||0); };
/* timer mellom to klokkeslett; går over midnatt hvis slutt < start */
export const span = ([a,b]) => { let d = mins(b) - mins(a); if (d < 0) d += 1440; return d/60; };
