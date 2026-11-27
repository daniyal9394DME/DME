# RIC DME Office: source code

The live app (`index.html` in the folder above) is built from the pieces in this folder. Read `../CLAUDE.md` first.

## Build
    python3 source/build.py            # builds into source/dist/
    python3 source/build.py --deploy   # also copies index.html and sw.js to the site root

`source/dist/ric-dme-office.html` is a stand-alone prototype with data built in: real data from `source/private/` when that folder exists (only on the Director's computer), otherwise the made-up data in `source/sample/`.

## Tests
    cd source/tests && npm install && npx playwright install chromium && npm test
The online observership form test (`public-form.js`) also needs a local Postgres: see `../CLAUDE.md`.

## Folders
- `app/`: `src.html` (base page) and the feature modules, joined in the order set in `build.py`.
- `build/`: extra styles, side menu listeners, specialty list, certificate artwork, bio-data module.
- `omr/`: answer sheet printing and reading.
- `img/`: RIC logo and Government of Punjab logo.
- `sql/`: database scripts; see `sql/APPLIED.md`. Never run 00_reset.sql or 02_pilot_setup.sql on the live database.
- `hosting/`: the other files GitHub Pages serves (service worker, icons, manifest, registration and check pages).
- `register/`: source of the PGT registration page.
- `sample/`: made-up demo data for the prototype and tests.
- `tests/`: browser tests.

## Never put on GitHub
`config.js` keys other than the publishable (anon) key, `dme-initial-data.json`, the `private/` folder, update JSON files, real scans or result files.
