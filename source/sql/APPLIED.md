# Database scripts and whether they have been run on the live database

Run new scripts in the Supabase SQL editor (Supabase → your project → SQL Editor → paste → Run).
Never run `00_reset.sql` or `02_pilot_setup.sql` on the live database: they are for a fresh test database only.

| Script | What it does | Run on live? |
|---|---|---|
| 01_schema_phase1.sql | First tables and access rules | Yes |
| 03_update_biodata.sql | Bio-data form and later additions (kept up to date with every new script) | Yes (earlier versions) |
| 04_status_form.sql | Training status form | Yes, to be confirmed |
| 05_ws_pgts.sql | Workshop registration links to PGTs | To be confirmed by the Director |
| 06_observers.sql | Observership application form, challan numbers, 10 MB upload limit | To be confirmed by the Director |
| 07_observers_docs.sql | Observership form: photograph, institute ID card and letter (or degree); challan issued by the office. Repeats 06, so it can be run on its own | No |

When you add a script, add a row here and set it to "No" until the Director confirms he has run it.
