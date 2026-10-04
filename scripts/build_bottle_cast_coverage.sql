-- build_bottle_cast_coverage.sql — per-(station, subset) coverage for the two
-- halves of calcofi_bottle, written to public/data/bottle_cast_coverage.json.
--
-- The release publishes calcofi_bottle as one dataset; the portal shows it as two
-- cards, "Hydrographic Bottle" (the bottle chemistry, depth-resolved, in `obs`) and
-- "Hydrographic Cast" (the cast-level weather and sea-state readings, one value per
-- cast, in `sample_measurement`). app.js (stationCardEntries) reads this file to
-- give each card its own date range, depth range, counts and year/month bars
-- instead of both repeating the whole-dataset numbers from stations.json.
--
-- Until 2026-10-04 this file had no generator (db-viz-station#3): it was a frozen
-- upload keyed by the grid_keys of an older release. Release v2026.10.04 rebuilt
-- the grid (one Voronoi cell per official station, some old keys retired and
-- others redrawn), so the frozen file would have kept the old cells' numbers,
-- missed every new cell (shown as an honest-looking zero, because the file DID
-- load), and failed check_data_contract.py's join to stations.json. It is now
-- built here, from the same release as stations.json, by refresh.yml.
--
-- THE SPLIT. The cast side is every calcofi_bottle row of `sample_measurement`
-- whose measurement_type is one of the 14 cast-level fields app.js lists in
-- CAST_SIDE_BOTTLE_FIELDS (bottom_depth, also there, is a cast attribute the
-- portal does not offer as a variable); the bottle side is calcofi_bottle's rows
-- of `obs`. Keep the list below and CAST_SIDE_BOTTLE_FIELDS in step.
--
-- Same grain and column names as one entry of stations.json datasets[] (see
-- build_stations.sql: cov / ybin / mbin), plus `subset`.
--
--   python3 scripts/resolve_release.py          # renders this template -> build/
--   duckdb -c ".read build/build_bottle_cast_coverage.sql"

INSTALL httpfs; LOAD httpfs;

CREATE TEMP TABLE bc AS
SELECT 'calcofi_bottle_hydro' AS subset, o.grid_key, CAST(o.cruise_key AS VARCHAR) AS cruise_key,
       o.datetime, o.depth_min_m AS depth_min, o.depth_max_m AS depth_max, o.sample_key
FROM __TBL:obs__ o
WHERE o.dataset_key = 'calcofi_bottle' AND o.grid_key IS NOT NULL
UNION ALL
SELECT 'calcofi_bottle_cast' AS subset, s.grid_key, CAST(s.cruise_key AS VARCHAR) AS cruise_key,
       s.datetime, NULL::DOUBLE AS depth_min, NULL::DOUBLE AS depth_max, m.sample_key
FROM __TBL:sample_measurement__ m
JOIN __TBL:sample__ s USING (sample_key)
WHERE m.dataset_key = 'calcofi_bottle'
  AND m.measurement_type IN (
    'dry_air_temp', 'wet_air_temp', 'wave_direction', 'wave_height', 'wave_period',
    'wind_direction', 'wind_speed', 'barometric_pressure', 'weather_code',
    'cloud_type', 'cloud_amount', 'visibility', 'secchi_depth', 'water_color')
  AND m.measurement_value IS NOT NULL
  AND s.grid_key IS NOT NULL;

CREATE TEMP TABLE cov AS
SELECT grid_key, subset,
       min(datetime)::DATE AS time_min, max(datetime)::DATE AS time_max,
       min(CASE WHEN depth_min BETWEEN 0 AND 6000 THEN depth_min END) AS depth_min,
       max(CASE WHEN depth_max BETWEEN 0 AND 6000 THEN depth_max END) AS depth_max,
       count(*) AS n_obs,
       count(DISTINCT sample_key) AS n_samples,
       count(DISTINCT cruise_key) AS n_surveys
FROM bc GROUP BY grid_key, subset;

CREATE TEMP TABLE ybin AS
SELECT grid_key, subset, list(struct_pack(y := yr, n := n) ORDER BY yr) AS years
FROM (SELECT grid_key, subset, year(datetime) AS yr, count(*) AS n
      FROM bc WHERE datetime IS NOT NULL GROUP BY 1,2,3)
GROUP BY 1,2;

CREATE TEMP TABLE mbin AS
SELECT grid_key, subset, list(struct_pack(m := mo, n := n) ORDER BY mo) AS months
FROM (SELECT grid_key, subset, month(datetime) AS mo, count(*) AS n
      FROM bc WHERE datetime IS NOT NULL GROUP BY 1,2,3)
GROUP BY 1,2;

COPY (
  SELECT c.grid_key, c.subset, 'env' AS realm,
         c.time_min, c.time_max, c.depth_min, c.depth_max,
         c.n_obs, c.n_samples, c.n_surveys, y.years, m.months
  FROM cov c
  LEFT JOIN ybin y USING (grid_key, subset)
  LEFT JOIN mbin m USING (grid_key, subset)
  ORDER BY c.grid_key, c.subset
) TO 'public/data/bottle_cast_coverage.json' (FORMAT JSON, ARRAY true);
