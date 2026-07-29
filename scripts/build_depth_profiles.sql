-- build_depth_profiles.sql — station × variable depth profiles -> public/data/depth_profiles.json
--
-- Source: the same env arms release_database.qmd already builds into `obs`
-- (bottle / ctd-cast / dic) — the only three datasets with a true point depth
-- per measurement (depth_min_m = depth_max_m, confirmed against calcofi4db's
-- append_obs() schema). Net-tow / cufes / phyllosoma rows carry a depth RANGE,
-- not a point, so they're excluded — same reasoning ctd-viz's own
-- build_profile_plotly() source query uses.
--
-- DEPTH BINNING — this is what actually keeps the output small. Bottle casts
-- sample ~20 fixed depths (0, 10, 20m...), so grouping by exact depth already
-- collapses years of casts into one clean profile. CTD sensors sample
-- continuously (47.283m, 47.916m, ...), so exact-depth grouping barely
-- deduplicates anything — a first draft of this script came out to ~200MB
-- because of exactly that. Binning to the nearest 5m fixes both the file
-- size AND the jagged/noisy look a raw CTD profile has at native resolution
-- (that noise is sensor precision, not signal) — cuts one 50k-row test case
-- from 47,599 distinct depths down to 101.
--
-- Output shape matches what app.js's DEPTH_PROFILES loader expects:
--   {dataset_key, station_id, variable_name, depth_m, value}
--
--   duckdb -c ".read build_depth_profiles.sql"   (needs duckdb CLI + network)

INSTALL httpfs; LOAD httpfs;

-- resolve the current release version dynamically from the same latest.txt
-- every other consumer (build_workflows_index.R, publish-template.md) reads —
-- never hardcode a release tag here. Resolved into a session variable (not
-- referenced as a subquery inside the macro below) because DuckDB table
-- functions like read_parquet() can't accept a macro whose argument itself
-- contains a subquery ("Table function cannot contain subqueries").
CREATE TEMP TABLE _release AS
  SELECT regexp_replace(content, '\s+$', '') AS version
  FROM read_text('https://storage.googleapis.com/calcofi-db/ducklake/releases/latest.txt');
SET VARIABLE release_version = (SELECT version FROM _release);

CREATE TEMP MACRO r(p) AS
  'https://storage.googleapis.com/calcofi-db/ducklake/releases/'
  || getvariable('release_version') || '/parquet/' || p;

-- station_id resolution: grid.parquet carries line/station, not a combined
-- station_id column — derive it the same way every other consumer does
-- (build_vars.py's normalize_station_id, the euphausiid ingest's site_key):
-- "LLL.L SSS.S", e.g. "090.0 090.0".
CREATE TEMP TABLE grid_station AS
SELECT grid_key, printf('%05.1f %05.1f', line, station) AS station_id
FROM read_parquet(r('grid.parquet'))
WHERE line IS NOT NULL AND station IS NOT NULL;

COPY (
  SELECT
    o.dataset_key,
    gs.station_id,
    o.measurement_type AS variable_name,
    ROUND(o.depth_min_m / 5) * 5 AS depth_m,        -- bin to nearest 5m
    ROUND(AVG(o.measurement_value), 4) AS value
  FROM read_parquet(r('obs.parquet')) o
  JOIN grid_station gs USING (grid_key)
  WHERE o.dataset_key IN ('calcofi_bottle', 'calcofi_ctd-cast', 'calcofi_dic')
    AND o.depth_min_m IS NOT NULL
    AND o.depth_min_m = o.depth_max_m        -- true point depth only, not a tow range
    AND o.measurement_value IS NOT NULL
  GROUP BY o.dataset_key, gs.station_id, o.measurement_type, ROUND(o.depth_min_m / 5) * 5
  HAVING COUNT(*) >= 1
  ORDER BY dataset_key, station_id, variable_name, depth_m
) TO 'public/data/depth_profiles.json' (FORMAT JSON, ARRAY true);

