# RIC DME Office: notes for Claude

## Who you work for
- Dr. Daniyal Ahmad Kamal, Director of Medical Education & Training, Rawalpindi Institute of Cardiology (RIC), Rawalpindi, Pakistan. He is a cardiac surgeon, not a developer.
- Reply in short, plain, factual language. No jargon, no long recaps. Times are Asia/Karachi; money is PKR.
- When something needs him (SQL to run, a setting to fill, a choice), say so clearly at the end of the pull request description.

## What this repository is
- This repository is the live GitHub Pages site for the DME Office app. The files in the root are what staff and applicants load:
  - `index.html`: the built app. Never edit it by hand; it is made by `source/build.py`.
  - `sw.js`, `register.html`, `check.html`, `manifest.webmanifest`, icons: copied from `source/hosting/` by the build. Change them there.
  - `config.js`: the Supabase address and publishable key. Never edit, move or delete it.
- `source/`: everything needed to rebuild the app. Work here.
- Backend: Supabase (Postgres plus the storage bucket `dme-uploads`). All records live in one table, `dme_records` (`coll`, `id`, `ord`, `data` jsonb, `deleted`, `updated_at`). Public forms write through security-definer functions (`dme_submit_obs` and others). Several staff use the app at once; `source/app/p13.js` merges changes (three-way merge).

## Golden rules
1. **This repository is public. No personal data in it, ever.** No real trainee, faculty, applicant or patient details: names lists, CNIC, mobile numbers, emails, scans, answer sheets, result files, `dme-initial-data.json`, `data*.json`, `*-update*.json`, `source/private/`. Test data must be made up (see `source/sample/`).
2. **Never touch `config.js`.** Only the publishable (anon) key belongs there. A service_role key must never appear anywhere.
3. **Never change the live database yourself.** A database change goes in a new numbered file in `source/sql/` (next is `07_...sql`), written so it is safe to run twice. Also append it to `02_pilot_setup.sql` and `03_update_biodata.sql` as earlier files were, and add any `drop function` to `00_reset.sql`. Record it in `source/sql/APPLIED.md` and ask the Director to run it in the Supabase SQL editor. Never ask him to run `00_reset.sql` or `02_pilot_setup.sql` on the live database.
4. **Never lose what already works.** Changes are additive. Records saved by older versions must keep working: read old shapes, don't break them.
5. **Every release:**
   1. bump `const V="dme-vNN"` in `source/hosting/sw.js`;
   2. run `python3 source/build.py --deploy` (it rebuilds and copies `index.html` and every file in `source/hosting/` to the root);
   3. run the tests (below);
   4. open a pull request whose description says, in plain words, what changed, what to check after merging, and anything the Director must do.
6. Edit `source/`, never the built root `index.html`.

## How the app is built
- `source/app/src.html` is the base page. `source/build.py` joins the modules in a fixed order (the long `rep('/* ---------- events ---------- */', ...)` line) and applies exact text replacements with `rep(a,b)`, which asserts exactly one match. Keep replacement strings unique.
- New features go in a new module (`source/app/p57.js`, then `p58.js`, ...) added at the end of that chain.
- Changing behaviour: function declarations can be wrapped, `{const _f=fn;fn=function(){...}}`. Some names are `const` and cannot be wrapped: `persist`, `pgtName` (changed through a `rep` in build.py), `exSpecs`, `canSee`, `FORM_DEF` (mutate the object), `NAVG` (mutate the array).
- The build makes:
  - `source/dist/index.html`: the live page. It never contains data; everything comes from Supabase. `--deploy` copies it, and the files in `source/hosting/`, to the root.
  - `source/dist/ric-dme-office.html`: the stand-alone prototype with data built in. On the Director's computer it uses `source/private/` (real names, never committed); everywhere else it uses the made-up `source/sample/` data. Tests run on it.
- `index.html` carries `APP_BUILD` (a hash added by the build). Open screens compare it with the server copy and show "A new version is ready: Reload".
- Dates: `TODAY` is local midnight and is moved forward when the day changes. Use `iso(d)` for local dates and `dDay(timestamp)` to turn a saved ISO timestamp into a local date. Never use `timestamp.slice(0,10)` (that is UTC and is a day early between midnight and 5 a.m.).
- Wording in the app: plain English, short sentences, sentence case. Say "PGTs" or "trainees", "the DME office", "the MS".

## Tests
After `python3 source/build.py`:
```
cd source/tests
npm install
npx playwright install chromium
npm test
```
All must pass before a pull request. Add a test for each new feature (copy the style of `observership.js`). If the browser tests cannot run where you are, say so in the pull request.

`public-form.js` runs the online observership form against the real database function in a local Postgres. It is skipped unless `PGURL` is set. To run it: create a database, load `source/tests/pg-stubs.sql` (stand-ins for Supabase's auth and storage), then `source/sql/02_pilot_setup.sql`, and set `PGURL` (for example `postgresql://postgres@/pilot?host=/tmp&port=5433`).

Answer-sheet (OMR) reading in `source/omr/omrread.js` was tuned on real scans that are not in this repository. Change it only with great care, ask the Director for sample scans, and never commit them.

## Main areas and where they live (modules in `source/app/`; a rough guide, search the code to be sure)
- PGT register, verification, supervisors, credentials, leave, rotations, data checks: `src.html`, `p5`–`p28`.
- WhatsApp messages page (one tap per person, `{placeholders}`): `p17.js`.
- Workshops (proposal, registration, feedback, certificates): `ws2.js`, `p10`–`p12`, `p20`, `p50`.
- Examinations: `phase4.js`, `p27`, `p30`–`p37`, `p41`–`p49`, `p51`–`p53`.
  - Marks: `exPM(x,k)` gives `{marks,absent,raw,secs}`. Specialty papers use `x.marks`; common papers use `x.cm[k]`.
  - OMR scans: applied map `omrOf(x).applied`. SEQ: `x.seqd[k]`. Guests and removed candidates: `x.guests`, `x.rmData`.
  - Result sheets: `p48.js`. Results to supervisors and trainees on WhatsApp: `p55.js`, `p56.js`.
- Rotating trainees and the attendance kiosk: `p23.js`, `p24.js`.
- Observership: `p54.js`, with the SQL in `06_observers.sql` and `07_observers_docs.sql`.
  - Flow: apply online (QR, `?obs=1`) with a photograph, CNIC, and either the institute ID card and the institute's endorsement letter or (not attached to an institute) the degree → the applicant gets only the application form → HOD signs → the DME office issues the 4-copy fee challan (applicants never download it) → fee paid in cash at the DME office → the Director signs and sends it to the MS with the Admin copy → office order (about 1.5 weeks) → the observership starts and daily kiosk attendance begins.
  - Stages (`obsStage`): Applied, Challan issued (`fees[0].issued`), To forward (first fee paid), With the MS (`fwd`), Upcoming, Current, Completed, Closed. The list's "Next step" column and its "More" menu (`obsActs`) do each step without opening the profile.
  - Extension: before the fee is paid it changes the duration; after that it adds an extension challan, even before the start.
  - Kiosk: an observer can mark attendance only within their attendance time (`v.attWin`, default `attFrom`–`attTo` in the settings). Staff can mark at any time.
  - Records: `DB.visitors` with `kind:"obs"`; fees `{challan:"OBS-YY-####", status, acc}`. Cash goes to the Accounts Office; `f.acc` records the handover.
  - Settings: `DB.settings.forms.obs`.
- Accreditation of training programmes (CPSP or UHS recognition, then PMDC): `p57.js`. One record per specialty and programme in `DB.accr` (its own collection, no SQL needed). Programmes come from each specialty's durations in Settings.
- Install as an app: `p15.js` (button, service worker) and `p58.js` (install notice on the sign-in screen and dashboard). The manifest and icon links must stay in the page head (`pwa` in `build.py`); browsers ignore them in the body.
- Settings page layout (groups, side menu, "Find a setting") and adjustable reminder days: `p59.js`. Read numbers with `stN(key)` (defaults in `ST_DEF`). A new Settings section needs an `id` and an entry in `ST_GROUPS`; otherwise it appears under "Other".
- Search, day change, update notice, dashboard attention items: `p56.js`. Recently opened: `p38.js`.

## Before you change anything the first time
1. If the root has no `.gitignore`, create it from `source/gitignore-for-repo.txt`.
2. Run the build with `--deploy` and the tests. Report in plain words whether the root `index.html` changed and why. It may differ if the Director had not uploaded the latest update.
3. The first deploy also replaces two real PGT names that were used as examples (sample tasks, and the example in the registration form's name box) with made-up ones. Mention this in the pull request.
