/* Små HTML-biter som brukes i flere visninger. */
export const xtag = t => t.extra ? '<span class="xtag">Ekstra</span>' : '';
export const LOCK = '<span class="lock"><svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1zm2 0h4V5a2 2 0 1 0-4 0v2z"/></svg>Låst</span>';
export const val = id => (document.getElementById(id)?.value || '').trim();
