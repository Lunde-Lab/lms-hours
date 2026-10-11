/* Visningsvalg per nettleser (f.eks. sist brukte fane). Dette er ikke data og lagres alltid lokalt. */
const KEY = 'lms-timer-poc-v1';
export function loadPref(name){ try { return localStorage.getItem(KEY + '-' + name); } catch(e){ return null; } }
export function savePref(name, value){ try { localStorage.setItem(KEY + '-' + name, value); } catch(e){} }
