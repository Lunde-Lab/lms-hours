# LMS Hours

Timeføring for teknisk personell på LMS (skiftledere fører timer per tekniker, aktivitet og maskin).

Status: proof of concept. Appen lagrer i nettleseren (localStorage) og bruker anonymiserte eksempelnavn. Ingen database er koblet til ennå.

- `index.html` + `src/` – appen (native ES-moduler, ingen byggesteg)
- `prototype/index.html` – opprinnelig prototype, fasit for funksjonalitet og design
- `supabase/drafts/` – SQL-utkast for senere Supabase-oppsett (kjøres ikke automatisk)

## Kjøre lokalt

```
npm start     # eller en hvilken som helst statisk server i roten
npm test
```

Uten `config.js` brukes `config.example.js` (lokal lagring). Se `CLAUDE.md` for struktur og regler.

## Deploy

Push til `main` publiserer til GitHub Pages (Settings → Pages → Source: «GitHub Actions»).
