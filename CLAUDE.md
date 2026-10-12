# LMS Hours – retningslinjer

Timeføring for teknisk personell på LMS. Skiftledere fører timer per tekniker, aktivitet og maskin.

## PERSONVERN – repoet er offentlig

- **Aldri** ekte navn, e-postadresser, brukernavn eller timedata i kode, eksempeldata, tester, SQL, commits eller PR-er.
- Eksempeldata bruker bare anonyme navn: «Tekniker 1-01», «Tekniker 2-07» osv. (`exampleName` i `src/model.js`).
- Maskiner i eksempeldata er fiktive registreringer (ONX, ONY, ONZ).
- Allowlisten for skiftledere (`shift_leaders`) fylles i Supabase-dashbordet, aldri i repoet.
- `config.js` ligger i `.gitignore`. Ingen nøkler i `config.example.js`.

## Fasit

`prototype/index.html` er fasiten for funksjonalitet og design. Den skal ikke endres.
Endringer i oppførsel avtales først; ellers skal appen oppføre seg likt med prototypen.

## Struktur

Ingen byggesteg og ingen avhengigheter. Native ES-moduler, servert som statiske filer.

```
index.html, styles.css     appen (styles.css er prototypens CSS)
config.example.js          kopier til config.js; STORAGE = 'local' | 'supabase'
src/app.js                 oppstart og hendelser (click/input/change/keydown)
src/render.js              tegner aktiv fane
src/model.js               faste aktiviteter og roller, skiftplan, arbeidstider, freshState
src/schedule.js            rene funksjoner: phase, workHours, stdHours, extraUntil, lmsFill
src/state.js               tilstand S, UI, oppslag, LMS-standard (recomputeAuto/autoFill), migrering
src/demo.js                anonyme eksempeldata
src/util.js                dato- og formateringshjelpere
src/prefs.js               visningsvalg per nettleser (sist brukte fane)
src/views/                 foring, kalender, rapport, oppsett
src/ui/                    sheet, dialog, toast, bits (små HTML-biter)
src/storage/index.js       felles lagringsgrensesnitt + valg av adapter
src/storage/local.js       localStorage (samme nøkkel/format som prototypen)
src/storage/supabase.js    tom stub med samme grensesnitt
supabase/drafts/           SQL-utkast (kjøres ikke automatisk)
tests/                     node:test
```

Hver visning/UI-modul eksporterer `actions` (navn = `data-action`) og eventuelt `onChange`/`onInput`/`onKey`.

## Kommandoer

```
npm test        # node --test, ingen avhengigheter
npm start       # statisk server på http://localhost:8080
```

Deploy: `.github/workflows/pages.yml` publiserer roten til GitHub Pages ved push til `main`
(lager `config.js` fra `config.example.js`).

## Supabase

Ikke koblet til ennå. Ikke opprett eller endre noe i Supabase uten eksplisitt beskjed.
Utkast ligger i `supabase/drafts/` (ikke `migrations/`) slik at ingenting kjøres automatisk.

## UI

- All UI-tekst på norsk (bokmål). Tall med `fmtH` (norsk desimalkomma).
- Kun lyst tema (`color-scheme: light`). Ingen mørk modus.
- Bruk designtokens fra `:root` i `styles.css`, ikke faste farger:
  - flater: `--bg #F4F5F7`, `--surface #FFFFFF`, `--surface-2 #F7F8FA`, `--line #E1E4E8`, `--line-2 #CDD2D8`
  - tekst: `--fg #1B1F24`, `--muted #636B74`
  - aksent: `--accent #1F5FBF`, `--accent-fg #FFFFFF`, `--accent-soft #E8F0FB`
  - status: `--warn #B25E00`, `--warn-soft #FFF4E5`, `--ok #1E7A46`, `--danger #C0362C`
  - skiftfaser: `--ph-k #DDD5F7` (kveld), `--ph-h #FAE0B8` (helg), `--ph-d #CFE4F7` (dag), `--ph-f #FFFFFF` (fri), `--ph-ink #2B2F36`
  - aktivitetsfarger: `--a1` … `--a10`
  - `--scrim`, fonter `--f-body` (IBM Plex Sans) og `--f-mono` (IBM Plex Mono)

## Domene

- Tre skift. Startdatoer: Skift 1 05.01.26, Skift 2 12.01.26, Skift 3 19.01.26.
- Syklus på 21 dager: 5 kveld, 2 helg, 5 dag, 9 fri.
- Arbeidstid: kveld man–tor 14:30–23:30 (9 t), fre 10:30–19:00 (8,5 t); helg 07:00–16:30 (9,5 t);
  dag man–tor 06:00–15:00 (9 t), fre 06:00–13:00 (7 t). Overtid på fridag: 9 t.
- LMS-standard: automatisk LMS-føring som fyller resten av arbeidsdagen (`lmsFill`, `recomputeAuto`).
- Faste aktiviteter (kan ikke endres eller slettes): Line, LMS, Assessor, Hot Section, Kurs, Mod, Ferie, Avspasering, Annet.
- Faste roller (kan ikke slettes): Assessor, B1, B2, CRS, Independent, RGR, Hot Section, Borescope.
- Arbeid på LMS-føringer: Sheet, Repair, Inspection, Mod, SLL, Testing, Final (`WORK_TYPES` i `src/model.js`).
- Aktiviteter, roller og LMS-arbeid legges inn i koden, ikke i Oppsett. Oppsett har bare teknikere/roller per tekniker, maskiner og backup.
- Ekstra personell: tekniker med `extra: {from, until}`, aktiv på skiftet i perioden.
