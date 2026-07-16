-- build_decades.sql — per-station, per-decade mean plankton density for the two
-- CCE-LTER plankton datasets, written to public/data/decades.json. Powers the
-- "Mean density by decade" block in the station panel (ports PR #1's decade-means
-- feature onto the integrated release DB instead of its ERDDAP/oceaninformatics
-- pipeline).
--
-- Grain: one row per (dataset_key, station_id, decade). `station_id` is the
-- "LLL.L SSS.S" line/station label, matching stations.json so the front-end can
-- join a selected station straight to its decade breakdown. Density is the mean
-- community tow-total (summed across taxa + life stages within a tow, then
-- averaged over tows in the decade); n_tows is the distinct tow count behind it.
--
-- Only the two datasets whose release-DB grain supports a meaningful volumetric/
-- per-tow density summary are included:
--   cce-lter_zoodb        zooplankton_abundance  (count/1000m3) — 33 taxa summed
--   cce-lter_euphausiids  abundance              (count/tow)    — Euphausiidae
-- (The 37-species euphausiid split in PR #1 came from ERDDAP; the integrated DB
-- carries a single Euphausiidae aggregate, so this summarizes the community total.)
--
-- Run from repo root (needs the `duckdb` CLI + network to public GCS):
--   sed "s/__RELEASE__/v2026.07.16/g" scripts/build_decades.sql | duckdb
-- __RELEASE__ is substituted with the resolved version at build time (see
-- .github/workflows/refresh.yml). Regenerate on every DB release.

INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;

CREATE TEMP MACRO r(p) AS 'gs://calcofi-db/ducklake/releases/__RELEASE__/parquet/' || p;

-- grid_key -> station_id ("LLL.L SSS.S"), identical to stations.json's station_id
CREATE TEMP TABLE grid AS
SELECT grid_key, printf('%05.1f %05.1f', line, station) AS station_id
FROM read_parquet(r('grid.parquet'));

-- per-tow community total: sum the headline density across taxa + life stages
-- within a sampling event (sample_key), per dataset x grid x decade. Decade key
-- is the floor-of-ten start year; excludes NaN/inf sentinels.
CREATE TEMP TABLE tow AS
SELECT dataset_key, grid_key, sample_key, (year(datetime) // 10) * 10 AS dec0,
       sum(measurement_value) AS tow_total
FROM read_parquet(r('obs/dataset_key=cce-lter_zoodb/*.parquet'))
WHERE measurement_type = 'zooplankton_abundance'
  AND grid_key IS NOT NULL AND datetime IS NOT NULL
  AND measurement_value IS NOT NULL AND isfinite(measurement_value)
GROUP BY 1, 2, 3, 4
UNION ALL
SELECT dataset_key, grid_key, sample_key, (year(datetime) // 10) * 10 AS dec0,
       sum(measurement_value) AS tow_total
FROM read_parquet(r('obs/dataset_key=cce-lter_euphausiids/*.parquet'))
WHERE measurement_type = 'abundance'
  AND grid_key IS NOT NULL AND datetime IS NOT NULL
  AND measurement_value IS NOT NULL AND isfinite(measurement_value)
GROUP BY 1, 2, 3, 4;

-- per (dataset, station, decade): mean tow-total density + distinct tow count
CREATE TEMP TABLE dm AS
SELECT t.dataset_key, g.station_id,
       printf('%d-%d', t.dec0, t.dec0 + 9) AS decade,
       round(avg(t.tow_total), 2) AS mean_density,
       count(DISTINCT t.sample_key) AS n_tows
FROM tow t JOIN grid g USING (grid_key)
GROUP BY 1, 2, 3;

-- flat array (front-end indexes it once into dataset_key -> station_id -> decades)
COPY (
  SELECT dataset_key, station_id, decade, mean_density, n_tows
  FROM dm
  ORDER BY dataset_key, station_id, decade
) TO 'public/data/decades.json' (FORMAT JSON, ARRAY true);
