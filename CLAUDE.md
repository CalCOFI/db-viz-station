# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`CalCOFI/db-viz-station` — a static, client-side portal for exploring what CalCOFI
collected at each station of the survey grid. Everything ships from `public/`: no
server, no bundler, no npm install, no build step for the app itself. Deployed to
GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

The parent `/Users/bbest/Github/CLAUDE.md` describes R-package conventions; this repo
has no R package. Only its general style guidance (2-space indent, snake_case,
lowercase comments) is relevant, and only to the Python/SQL scripts.

## Local development

Serve `public/` with any static server — there is nothing to compile:

```bash
python -m http.server 8000 --directory public   # or: npx serve public
```

VS Code Live Server is configured on port 5501 (`.vscode/settings.json`).

There is no unit-test suite and no package manifest for the front end;
`requirements.txt` covers the legacy Python scripts only (see below). What does exist,
and what CI runs on every push and PR (`.github/workflows/check.yml`), is:

```bash
python3 scripts/check_data_contract.py   # generated JSON carries what app.js indexes on
node --check public/app.js               # app.js parses
```

Run both before pushing anything that touches a build script, a data file, or `app.js`.

**Never apply a change by uploading a whole file** (GitHub's web "Add files via upload",
or pasting a local copy over the repo's). Six such commits on 2026-08-11 replaced
`app.js` with an older copy — 3,871 → 2,934 lines — silently reverting the data
cache-busting and the Pages deploy dispatch, all of it shipped to production before
`9ee1c0e` restored it. Edit in place and push a diff.

**Asset cache-busting is stamped at deploy, not by hand.** `pages.yml` rewrites the
`?v=` on `app.js` and `styles.css` to the deployed commit's short SHA in the artifact
only, so the counter can no longer be forgotten (it was: `app.js` changed three times
while `?v=106` stood still). The committed counter remains as a human-readable marker —
keep the two equal if you touch it; `check.yml` fails when they diverge.

## Rebuilding the data

`public/data/*.json` is prebuilt, committed, and read directly by the browser. The
current pipeline is DuckDB SQL against the frozen CalCOFI integrated-DB release parquet
on public GCS (`gs://calcofi-db/ducklake/releases/<release>/parquet/`), orchestrated by
`.github/workflows/refresh.yml` (weekly, manual, and `repository_dispatch: db-release`
from `CalCOFI/workflows` on release promotion).

Run from the repo root, with the `duckdb` CLI and network access. `__RELEASE__` is
substituted at build time with the version from
`https://storage.googleapis.com/calcofi-db/ducklake/releases/latest.txt`:

```bash
REL=$(curl -s https://storage.googleapis.com/calcofi-db/ducklake/releases/latest.txt | tr -d '[:space:]')
duckdb -c ".read scripts/build_crosswalk.sql"              # -> metadata/crosswalk_variables.csv
sed "s/__RELEASE__/$REL/g" scripts/build_stations.sql | duckdb   # -> stations.json, cruises.json AND taxon_coverage.json
sed "s/__RELEASE__/$REL/g" scripts/build_vars.sql     | duckdb   # -> variables.json
sed "s/__RELEASE__/$REL/g" scripts/build_decades.sql  | duckdb   # -> decades.json
sed "s/__RELEASE__/$REL/g" scripts/build_datasets.sql | duckdb   # -> datasets_meta.json
duckdb -c ".read scripts/build_depth_profiles.sql"        # resolves the release itself, no sed
gzip -9 -f public/data/depth_profiles.json                # ~76 MB raw; only the .gz is committed/loaded
gzip -9 -f public/data/taxon_coverage.json                # ~8 MB raw -> 0.7 MB; likewise .gz-only
```

Three rules the workflow encodes, each learned from a real failure — preserve them when
adding a build script:

1. **Every generated artifact must be named in refresh.yml's `git add` line.** Anything
   the scripts write but that line omits is regenerated into the runner and silently
   discarded, leaving the committed copy to drift (`taxon_coverage.json` did exactly this).
2. **`version.json` is written by the same step** and stamps the release + build time.
   `app.js` reads it and appends `?v=<release>` to every data fetch via `dataUrl()`,
   because Pages serves `public/data/` with `max-age=600` and no header control. It also
   names the release in the About box.
3. **`refresh.yml` must dispatch `pages.yml` itself**, passing the explicit pushed SHA. A
   push authenticated with `GITHUB_TOKEN` never triggers workflows (GitHub's recursion
   guard), and `--ref main` can still resolve to the pre-push commit. Both failure modes
   go green while shipping stale data.

Files with **no committed generator** — treat as committed artifacts, not build outputs:
`bathymetry.json`, `bottle_cast_coverage.json`, `station_groups.json` (tracked in
issue #3). The two per-species stand-ins that used to sit here
(`euphausiid_species_coverage.json`, `bird_mammal_species_coverage.json`) were deleted
on 2026-08-13 once `taxon_coverage.json` carried `dataset_key`, which made them
redundant — don't reintroduce a hand-built coverage file when the release can produce it.

### The generated-file ↔ reader contract, and why it's checked

Nothing used to validate that a build script's output columns matched what `app.js`
indexes on, and the failure is invisible from both sides. `build_stations.sql` emitted
`taxon_coverage.json` without a `dataset_key` column while `app.js` keyed it
`r.dataset_key + '::' + r.aphia_id`, so all 27,909 rows landed under the literal string
`undefined::<aphia_id>`. The page loaded, nothing errored, 3.4 MB was fetched per visit,
and every taxon silently reported dataset-wide counts — the precise bug the file was
added to fix. `scripts/check_data_contract.py` now asserts the columns and the
cross-file joins. **When you change a build script's SELECT list or an `app.js` loader,
change the contract too** — and if a column you add isn't in the contract, it isn't
protected.

`scripts/check_local_variant.py` (also run by `check.yml`) guards the other
silent split: `build_stations_local.sql` is a deliberate copy of
`build_stations.sql` (different `grid` derivation for a WDAC-locked dev
machine), and everything from the `obs` table down must stay identical or the
two machines build different data — the check compares the SQL comment-stripped
and fails on drift, so apply changes below the grid table to both files.

`metadata/crosswalk_report.qmd` renders to `public/data/crosswalk_report.html` via Quarto
(`quarto::quarto_render()`), reading the two `crosswalk_*.csv` files.

### Legacy Python pipeline

`scripts/build_{data,search,stations,vars}.py` are from the original UCSB capstone ERDDAP
pipeline. They write to a bare `data/` path, are not run by CI, and their outputs
(`datasets.json`, `search_index.json`, `station_groups.json`) are **not fetched by
`app.js`**. `metadata/variables_harvested.json` survives as the source of harvested extras
(keywords, science concepts, source URLs) that `build_vars.sql` LEFT-JOINs onto the
DB-authoritative spine. Don't extend the Python scripts; extend the SQL ones.

## Front-end architecture (`public/app.js`, ~3900 lines)

One file, plain script tag, everything at global scope. `index.html` wires ~22 inline
`onclick`/`onsubmit` handlers, so any function called from markup must stay a top-level
`function` declaration — no modules, no IIFE wrapper, no bundler. Leaflet and JSZip load
from CDN; DuckDB-WASM is `import()`ed lazily only when someone downloads observations.

### Data model

- **`grid_key`** is the join key everywhere (`st-20-ln130_hist`); `station_id` is the
  human label (`"130.0 -20.0"`). Stations *are* the integrated DB's `grid` table.
- **`stations.json`** — one record per grid cell, with a `datasets[]` array carrying
  per-dataset time/depth spans, counts, per-year/per-month histograms, and bare
  `cruise_key` lists (date/ship live once per cruise in the companion
  `cruises.json`, joined at render time — inlining them per station repeated each
  cruise ~78× and grew this file 7×). Loaded on every page view; keep it lean.
- **`variables.json`** — ~2100 rows, `variable_type` of `measurement_type` (~200) or
  `taxon` (~1900), keyed by `variable_id` = `dataset_key::name`.
- **`taxon_coverage.json`** — per-(grid_key, taxon) coverage, split out precisely so the
  taxon dimension doesn't bloat `stations.json`. Joined by `aphia_id` (WoRMS), **not**
  scientific name: several taxa share a name across distinct `taxon_key`s, so a
  name-based join silently merges different taxa.

### Two layers worth knowing before editing

**`stationsForVar(v)` is the single source of truth** for which stations a variable was
collected at — the map highlight, the search banner count, and the panel's "Collected at
N stations" all call it, so they can't drift. It resolves per-taxon coverage first (by
`aphia_id`, then by normalized name), and falls back to whole-dataset coverage. Both
paths honor the year slider since `taxon_coverage.json` gained per-year bins;
`stationsForVarIsYearAware(v)` still guards the case where a taxon's rows carry no
`years` at all, and callers must not print a year range next to a count it returns false
for.

**`VARS` is raw; `CANON_VARS` is what the UI browses.** `buildCanonicalVars()` drops
`REMOVE_VARS`, hides measurement-type columns mixed into species-level datasets (except an
explicit `KEEP_MEASUREMENT_TYPE` allowlist), collapses byte-identical duplicate records,
and merges the three bottle/CTD/DIC datasets on a canonical name. Adding a variable to the
browsable list usually means touching one of those sets, not the render code.

### Conventions to follow

- **Every optional data file degrades to `[]`** (`.then(r => r.ok ? r.json() : []).catch(() => [])`).
  A missing file must never break the map — that's what lets a new artifact ship before
  the first refresh builds it. Keep the pattern when adding one.
- **Dataset identity is release-driven, with hardcoded fallbacks.** `datasets_meta.json`
  (from `build_datasets.sql`) is the primary source for the official name and the "Open
  Dataset ↗" link; read it through `officialNameFor()` / `datasetUrlFor()`, never by
  indexing `DATASET_OFFICIAL_NAME` / `DATASET_URL_FALLBACK` directly — those are now
  fallback-only, for portal-only split keys and for the file being absent. `DATASET_META`
  still owns label/realm/color (presentation choices with no DB counterpart), and
  `DATASET_KEY_ALIASES` absorbs release-side renames for the obs parquet queries.
- **Comments here carry evidence, not description**: they name the date, the observed
  symptom, and why the alternative was rejected. Match that when you change something
  non-obvious; a substantive fix that lands without its "why" is out of house style.
- Taxonomic name matching goes through `normTaxonName()`, which folds superseded names via
  `TAXON_NAME_SYNONYMS`. Delete a synonym entry once its coverage file is rebuilt.
- Coverage-card PNGs are drawn natively on `<canvas>` (`drawCoverageCardCanvas`), *not*
  screenshotted — html2canvas throws on this page's `color-mix()` CSS. Don't reintroduce it.
