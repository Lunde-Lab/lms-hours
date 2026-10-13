/* Domenemodell: faste aktiviteter og roller, skiftplan og arbeidstider.
   Eksempeldata bruker bare anonyme navn («Tekniker 1-01» osv.). */

export const VERSION = 9;
export const PH = {K:'Kveld', H:'Helg', D:'Dag', F:'Fri'};

/* Skiftplan: 5 kveld, 2 helg, 5 dag, 9 fri (21-dagers syklus). */
export const DAYS = () => ({K:5, H:2, D:5, F:9});

/* Arbeidstider per periode og ukedag. mt = man–tor, fr = fredag, all = alle dager.
   ot = timer for overtid på fridag. */
export const SCHED = () => ({K:{mt:['14:30','23:30'], fr:['10:30','19:00']}, H:{all:['07:00','16:30']}, D:{mt:['06:00','15:00'], fr:['06:00','13:00']}, ot:9});

export const SHIFTS = () => [{id:1,name:'Skift 1',start:'2026-01-05'},{id:2,name:'Skift 2',start:'2026-01-12'},{id:3,name:'Skift 3',start:'2026-01-19'}];

export const FIXED_ROLES = ['Assessor','B1','B2','CRS','Independent','RGR','Hot Section','Borescope'];

/* LMS-standard: aktiviteten med type '1500H'. Den fyller automatisk resten av arbeidsdagen
   (se lmsFill i schedule.js og recomputeAuto/autoFill i state.js). */
export const LMS = 'h1500';

/* Faste aktiviteter. color er indeks i --a1 … --a10. mw: føres med maskin og arbeid (LMS har det alltid).
   allM: kan velge alle maskiner; ellers bare de som er «I dokk». */
export const ACTIVITIES = () => [
  {id:'line',name:'Line',code:'L',role:'',type:'n',color:1,mw:true,allM:true},
  {id:LMS,name:'LMS',code:'L',role:'',type:'1500H',color:2},
  {id:'ass',name:'Assessor',code:'A',role:'Assessor',type:'n',color:3},
  {id:'hs',name:'Hot Section',code:'HS',role:'Hot Section',type:'n',color:4},
  {id:'kurs',name:'Kurs',code:'K',role:'',type:'n',color:6},
  {id:'mod',name:'Mod',code:'M',role:'',type:'n',color:5,mw:true},
  {id:'ferie',name:'Ferie',code:'Fe',role:'',type:'n',color:8},
  {id:'avsp',name:'Avspasering',code:'Av',role:'',type:'n',color:9},
  {id:'fravaer',name:'Fravær',code:'Fr',role:'',type:'n',color:10},   /* syk eller fri */
  {id:'annet',name:'Annet',code:'An',role:'',type:'n',color:7}
];
export const LOCKED = ['line',LMS,'ass','hs','kurs','mod','ferie','avsp','fravaer','annet'];

/* Arbeid på LMS-føringer. Legges inn her (ingen UI for å endre listen). */
export const WORK_TYPES = () => ['Sheet','Repair','Inspection','Mod','SLL','Testing','Final'];

/* Automatisk LMS-føring starter fra denne datoen. */
export const AUTO_FROM = '2026-01-01';

/* Anonyme eksempelteknikere per skift: «Tekniker <skift>-<nr>». */
const TEAM_SIZE = {1:11, 2:12, 3:11};
export const exampleName = (shift, n) => `Tekniker ${shift}-${String(n).padStart(2,'0')}`;

/* Skiftplan + arbeidstider, slik schedule.js forventer dem. */
export const defaultPlan = () => ({shifts:SHIFTS(), days:DAYS(), sched:SCHED()});

export function freshState(uid){
  const techs = [];
  for (const s of [1,2,3]) for (let n = 1; n <= TEAM_SIZE[s]; n++) techs.push({id:uid(), name:exampleName(s, n), shift:s, roles:[]});
  return {
    v:VERSION, demo:false,
    techs,
    shifts:SHIFTS(),
    days:DAYS(), sched:SCHED(),
    roles:[...FIXED_ROLES],
    acts:ACTIVITIES(),
    machines:[], work:WORK_TYPES(),
    entries:[], noAuto:{}, notes:{}, autoFrom: AUTO_FROM, autoDone: null
  };
}
