/* Små HTML-biter som brukes i flere visninger. */
export const xtag = t => t.extra ? '<span class="xtag">Ekstra</span>' : '';
export const val = id => (document.getElementById(id)?.value || '').trim();
