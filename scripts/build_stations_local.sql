-- build_stations_local.sql — LOCAL-DEV-ONLY variant of build_stations.sql.
--
-- Identical to build_stations.sql except for one thing: it does not load the
-- `spatial` extension, and instead of deriving station lat/lon from
-- grid.parquet's geom_ctr (ST_X/ST_Y), it reads them straight out of the
-- `grid` table already sitting in the existing public/data/stations.json on
-- disk. Use this only when `LOAD spatial;` is blocked locally (e.g. Windows
-- Application Control / WDAC refusing to run the downloaded
-- spatial.duckdb_extension DLL) and there's no time to sort out the OS-level
-- policy — CI (.github/workflows/refresh.yml) should keep using the real
-- build_stations.sql, not this file, since CI runners don't hit that block
-- and the parquet-derived lat/lon is the actual source of truth.
--
-- This is safe for local iteration because the grid (CalCOFI's station
-- line/station layout — lat/lon/pattern/shore/zone/area_km2) essentially
-- never changes between releases; only the per-dataset coverage below it
-- does, and that part is unchanged from build_stations.sql. If the grid
-- itself is ever actually revised upstream, this local variant will keep
-- serving the previous shape until someone runs the real build_stations.sql
-- (via CI, or locally with spatial working) at least once to refresh it —
-- so don't rely on this file to pick up a grid change, only a coverage one.
--
-- The mirroring is enforced: scripts/check_local_variant.py (run by check.yml)
-- compares everything from the `obs` table down, comment-stripped, and fails
-- the build if this file and build_stations.sql disagree — apply any change
-- below the grid table to both files.
--
-- Everything below is unchanged from build_stations.sql's own header:
--
-- Stations ARE the integrated-DB `grid` table (regularized CalCOFI station grid,
-- derived from calcofi4r::cc_grid). For each grid cell x dataset it summarizes:
-- time min/max, depth min/max, #observations, #samples, #surveys (distinct
-- cruises) plus the actual cruises behind that count (cruise_key lists — see
-- cov_cruises below; each cruise's date/ship lives once in the companion
-- public/data/cruises.json), and per-year (overall) and per-month (seasonal)
-- histograms.
--
-- Also writes public/data/taxon_coverage.json — per-(station, taxon) coverage,
-- kept as its own file rather than nested into stations.json (which every page
-- load needs) since joining a taxon dimension in would bloat that file a lot.
-- Consumed by the portal's stationsForVar() to give ZooDB/Phytoplankton/etc.
-- taxa their own station counts instead of falling back to whole-dataset
-- coverage for every taxon regardless of how often it was actually recorded
-- (see 2026-07 investigation — e.g. ZooDB's Aetideidae was only in 28% of
-- tows but showed the same station count as Salpida at 81%).
--
-- Joined by aphia_id (WoRMS ID), not taxon_key — the portal's variables.json
-- doesn't carry taxon_key yet, and several taxa share the same scientific_name
-- across two different taxon_keys (Hydrozoa, Salpida, Siphonophorae, Ctenophora
-- all confirmed duplicated), so a name-based join would silently merge distinct
-- taxa. aphia_id is already in variables.json and is the safer key available
-- today. If build_vars.sql is later updated to carry taxon_key directly, switch
-- the join key here and in app.js's TAXON_STATIONS lookup — everything else
-- stays the same.
--
-- Run from the repo root (needs the `duckdb` CLI + network to public GCS;
-- reads the existing public/data/stations.json, so run this from the repo
-- root with that file already present):
--   duckdb -c ".read scripts/build_stations_local.sql"
--
-- Data source: the frozen release parquet at
--   https://storage.googleapis.com/calcofi-db/ducklake/releases/{VERSION}/parquet/
-- (public); the literal __RELEASE__ below is substituted with the resolved
-- version at build time (see .github/workflows/refresh.yml) — still needed
-- here for obs/ship, just not for grid (see above).

INSTALL httpfs; LOAD httpfs;

-- frozen-release parquet base; __RELEASE__ is substituted with the resolved
-- version (e.g. v2026.07.15) at build time. Uses the gs:// scheme (not https://)
-- because reading the Hive-partitioned obs/ requires GCS object listing, which
-- plain-HTTPS read_parquet cannot do; gs:// reads this public bucket anonymously.
CREATE TEMP MACRO r(p) AS 'gs://calcofi-db/ducklake/releases/__RELEASE__/parquet/' || p;

-- stations = grid cells; lat/lon read from the CURRENT public/data/stations.json
-- rather than derived from grid.parquet's geom_ctr — see the file header for
-- why. read_json_auto() infers the nested `datasets` field's type too even
-- though it's unused below; harmless, just means this reads the whole file
-- rather than a projected subset.
CREATE TEMP TABLE grid AS
SELECT grid_key, line, station, pattern, shore, zone, area_km2, lat, lon
FROM read_json_auto('public/data/stations.json');

-- unified observation stream: the consolidated core `obs` table from the frozen
-- release (Hive-partitioned by dataset_key), one row per measurement carrying
-- dataset_key + realm + grid_key + cruise_key + datetime + depth range + sample_key.
-- Replaces the former hand-rolled per-dataset UNION ALL preview.
-- taxon_key added (beyond the original column set) to support the new
-- taxon_cov aggregation below — harmless for every other consumer of `obs`
-- here since it's simply NULL for non-taxon rows.
CREATE TEMP TABLE obs AS
SELECT dataset_key, realm, grid_key,
       CAST(cruise_key AS VARCHAR) AS cruise_key,
       datetime, depth_min_m AS depth_min, depth_max_m AS depth_max, sample_key,
       taxon_key
FROM read_parquet(r('obs/**/*.parquet'), hive_partitioning=true)
WHERE grid_key IS NOT NULL;

-- cruise/ship reference for the per-dataset "Surveys" list (cov_cruises,
-- below) — same source + join convention as db-viz-cruise's cruise_summary
-- (apps/db-viz-cruise/global.R): cruise_key follows the YYYY-MM-NODC
-- convention, so the trailing NODC code maps straight to ship.ship_nodc.
-- Built from `obs` itself (already filtered to grid stations) rather than
-- cruise.parquet, so date_min lines up with the same datetime column
-- everything else here uses, and so this only carries cruises that actually
-- appear at a grid station.
CREATE TEMP TABLE cruise_ref AS
SELECT o.cruise_key,
       min(o.datetime)::DATE AS date_min,
       s.ship_name           AS ship_name
FROM obs o
LEFT JOIN read_parquet(r('ship.parquet')) s
  ON substr(o.cruise_key, 9) = s.ship_nodc
WHERE o.cruise_key IS NOT NULL
GROUP BY o.cruise_key, s.ship_name;

-- per (grid_key, dataset_key): the actual cruises behind that dataset's
-- n_surveys count — "6 surveys" on its own doesn't say which 6. Cross-linking
-- to db-viz-cruise isn't reliable here: that app's obs table is keyed off raw
-- sample lat/lon rather than this app's regularized grid, and can be missing
-- historical/off-grid stations entirely (e.g. line/station 080.0 160.0), so
-- the list is carried directly in stations.json instead.
--
-- Bare cruise_key strings, not structs — date/ship live once per cruise in
-- cruises.json (COPY of cruise_ref below); see build_stations.sql for the
-- size numbers behind the split.
CREATE TEMP TABLE gdc AS
SELECT DISTINCT grid_key, dataset_key, cruise_key
FROM obs WHERE cruise_key IS NOT NULL;

CREATE TEMP TABLE cov_cruises AS
SELECT gdc.grid_key, gdc.dataset_key,
       list(gdc.cruise_key ORDER BY cr.date_min, gdc.cruise_key) AS cruises
FROM gdc
LEFT JOIN cruise_ref cr USING (cruise_key)
GROUP BY gdc.grid_key, gdc.dataset_key;

-- the one-row-per-cruise side of the split above (see build_stations.sql).
COPY (
  SELECT cruise_key, date_min, ship_name
  FROM cruise_ref
  ORDER BY date_min, cruise_key
) TO 'public/data/cruises.json' (FORMAT JSON, ARRAY true);

-- per (grid_key, dataset_key) coverage; clamp sentinel/absurd depths (e.g. -888)
CREATE TEMP TABLE cov AS
SELECT grid_key, dataset_key, any_value(realm) AS realm,
       min(datetime)::DATE AS time_min, max(datetime)::DATE AS time_max,
       min(CASE WHEN depth_min BETWEEN 0 AND 6000 THEN depth_min END) AS depth_min,
       max(CASE WHEN depth_max BETWEEN 0 AND 6000 THEN depth_max END) AS depth_max,
       count(*) AS n_obs,
       count(DISTINCT sample_key) AS n_samples,
       count(DISTINCT cruise_key) AS n_surveys
FROM obs GROUP BY grid_key, dataset_key;

CREATE TEMP TABLE ybin AS
SELECT grid_key, dataset_key, list(struct_pack(y := yr, n := n) ORDER BY yr) AS years
FROM (SELECT grid_key, dataset_key, year(datetime) AS yr, count(*) AS n
      FROM obs WHERE datetime IS NOT NULL GROUP BY 1,2,3)
GROUP BY 1,2;

CREATE TEMP TABLE mbin AS
SELECT grid_key, dataset_key, list(struct_pack(m := mo, n := n) ORDER BY mo) AS months
FROM (SELECT grid_key, dataset_key, month(datetime) AS mo, count(*) AS n
      FROM obs WHERE datetime IS NOT NULL GROUP BY 1,2,3)
GROUP BY 1,2;

-- per grid_key: list of per-dataset coverage structs + station rollups
CREATE TEMP TABLE ds AS
SELECT c.grid_key,
       list(struct_pack(
         dataset_key := c.dataset_key, realm := c.realm,
         time_min := c.time_min, time_max := c.time_max,
         depth_min := c.depth_min, depth_max := c.depth_max,
         n_obs := c.n_obs, n_samples := c.n_samples, n_surveys := c.n_surveys,
         years := y.years, months := m.months,
         cruises := cc.cruises) ORDER BY c.dataset_key) AS datasets,
       count(*) AS n_datasets,
       min(c.time_min) AS time_min, max(c.time_max) AS time_max,
       sum(c.n_obs) AS n_obs, sum(c.n_samples) AS n_samples
FROM cov c
LEFT JOIN ybin y USING (grid_key, dataset_key)
LEFT JOIN mbin m USING (grid_key, dataset_key)
LEFT JOIN cov_cruises cc USING (grid_key, dataset_key)
GROUP BY c.grid_key;

-- distinct cruises per station across all datasets
CREATE TEMP TABLE srv AS
SELECT grid_key, count(DISTINCT cruise_key) AS n_surveys FROM obs GROUP BY 1;

COPY (
  SELECT g.grid_key,
         printf('%05.1f %05.1f', g.line, g.station) AS station_id,
         g.line, g.station, round(g.lat, 5) AS lat, round(g.lon, 5) AS lon,
         g.pattern, g.shore, g.zone, round(g.area_km2, 2) AS area_km2,
         coalesce(d.n_datasets, 0) AS n_datasets,
         d.time_min, d.time_max,
         coalesce(d.n_obs, 0) AS n_obs, coalesce(d.n_samples, 0) AS n_samples,
         coalesce(s.n_surveys, 0) AS n_surveys,
         d.datasets
  FROM grid g
  LEFT JOIN ds d USING (grid_key)
  LEFT JOIN srv s USING (grid_key)
  ORDER BY g.grid_key
) TO 'public/data/stations.json' (FORMAT JSON, ARRAY true);

-- per-(dataset, station, taxon) coverage — see file header for why this exists
-- and why the join key is aphia_id rather than taxon_key or scientific_name.
--
-- dataset_key is part of the grain, not decoration: app.js indexes this file as
-- `dataset_key + '::' + aphia_id` because a taxon can be recorded independently
-- by more than one collection program (Salpida is in both ZooDB and ZooScan),
-- and merging them would report one program's coverage under the other's label.
-- It was omitted here until 2026-08-13, which meant every row keyed as the
-- literal string `undefined::<aphia_id>`, no lookup ever matched, and 3.4 MB was
-- fetched on every page load to do nothing while every taxon silently fell back
-- to dataset-wide counts — precisely the bug this table was added to fix. Adding
-- a column to the SELECT below without adding it to app.js's loader (or vice
-- versa) fails exactly this quietly; scripts/check_data_contract.py now asserts
-- the two agree.
CREATE TEMP TABLE taxon_cov AS
SELECT o.dataset_key,
       o.grid_key,
       CAST(t.worms_id AS VARCHAR) AS aphia_id,
       min(o.datetime)::DATE AS time_min,
       max(o.datetime)::DATE AS time_max,
       count(*) AS n_obs,
       count(DISTINCT o.sample_key) AS n_samples
FROM obs o
JOIN read_parquet(r('taxon.parquet')) t USING (taxon_key)
WHERE o.taxon_key IS NOT NULL AND t.worms_id IS NOT NULL
GROUP BY 1, 2, 3;

-- per-year bins on the same grain, so the year-range slider filters the
-- per-taxon path too. Without these, taxonStationsInRange() has nothing to
-- filter on and a taxon's station count stays at its all-time value while the
-- slider moves — a number that reads as filtered and isn't (issue #4). Same
-- {y, n} struct the dataset-wide `ybin` above uses, so both sides of
-- stationsForVar() consume one shape.
CREATE TEMP TABLE taxon_ybin AS
SELECT dataset_key, grid_key, aphia_id,
       list(struct_pack(y := yr, n := n) ORDER BY yr) AS years
FROM (SELECT o.dataset_key, o.grid_key, CAST(t.worms_id AS VARCHAR) AS aphia_id,
             year(o.datetime) AS yr, count(*) AS n
      FROM obs o
      JOIN read_parquet(r('taxon.parquet')) t USING (taxon_key)
      WHERE o.taxon_key IS NOT NULL AND t.worms_id IS NOT NULL AND o.datetime IS NOT NULL
      GROUP BY 1, 2, 3, 4)
GROUP BY 1, 2, 3;

COPY (
  SELECT c.dataset_key, c.grid_key, c.aphia_id,
         c.time_min, c.time_max, c.n_obs, c.n_samples, y.years
  FROM taxon_cov c
  LEFT JOIN taxon_ybin y USING (dataset_key, grid_key, aphia_id)
  ORDER BY c.dataset_key, c.aphia_id, c.grid_key
) TO 'public/data/taxon_coverage.json' (FORMAT JSON, ARRAY true);
