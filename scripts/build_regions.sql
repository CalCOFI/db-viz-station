-- build_regions.sql — pooled-region geometry + coverage, written to
-- public/data/regions.json.
--
-- Some datasets pool their samples across a set of stations BEFORE anything is
-- counted, so they have no per-station observation and no grid_key to hang one
-- on. build_stations.sql filters `WHERE grid_key IS NOT NULL`, which is correct
-- and which leaves those datasets highlighting nothing at all — the portal read
-- "0 stations" for calcofi_phytoplankton, which looks like missing data and is
-- actually its grain (CalCOFI/workflows#76).
--
-- The release now carries real geometry for those pools: `region.parquet` has one
-- POLYGON per region, derived from the station membership the source declares
-- (calcofi4db::cc_station_regions, v2026.08.14+). This script turns that into the
-- map layer and the coverage numbers the panel needs, so a pooled dataset
-- highlights the water it was actually pooled over.
--
-- DATASET-AGNOSTIC ON PURPOSE. Regions are matched to observations through
-- `sample.sample_type = 'region_pool'`, not through a hardcoded dataset key, so a
-- second pooled dataset appears here without a code change. Today
-- calcofi_phytoplankton is the only one.
--
-- Two properties of the release geometry this relies on, both guaranteed upstream
-- by cc_station_regions() and asserted in its tests:
--   * the regions do not overlap, so a point falls in at most one;
--   * each region's lat/lon is st_point_on_surface(), i.e. INSIDE its own polygon
--     (a centroid is not — Alley wraps around NE), so the spatial join below is
--     unambiguous for every observation.
--
-- Run from the repo root (needs the `duckdb` CLI + network to public GCS):
--   python3 scripts/resolve_release.py          # renders this template -> build/build_regions.sql
--   duckdb -c ".read build/build_regions.sql"
-- The `__TBL:<table>__` tokens below are rendered into read_parquet() over each
-- table's release objects — see build_stations.sql's header for the contract.
--
-- Regenerate on every DB release (see .github/workflows/refresh.yml).

INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;
-- ST_Area_Spheroid assumes [lat, lon] unless told otherwise, and would silently
-- return NaN / a transposed area for these lon/lat polygons
SET geometry_always_xy = true;

-- the pooled datasets, discovered rather than named
CREATE TEMP TABLE rp_ds AS
SELECT DISTINCT dataset_key
FROM __TBL:sample__
WHERE sample_type = 'region_pool' AND dataset_key IS NOT NULL;

CREATE TEMP TABLE reg AS
SELECT region_key, description, n_stations, station_codes,
       ST_X(ST_Point(longitude, latitude)) AS lon,
       ST_Y(ST_Point(longitude, latitude)) AS lat,
       round(ST_Area_Spheroid(geom) / 1e6) AS area_km2,
       CAST(ST_AsGeoJSON(geom) AS JSON) AS geometry
FROM __TBL:region__;

-- observations of a pooled dataset, assigned to the region containing them.
-- The dataset_key filter prunes Hive partitions, so this reads only the pooled
-- datasets' shards rather than the whole ~200M-row obs tree.
CREATE TEMP TABLE robs AS
SELECT o.dataset_key, o.realm, o.sample_key, o.taxon_key, o.cruise_key,
       o.depth_min_m AS depth_min, o.depth_max_m AS depth_max,
       g.region_key,
       -- These observations carry NO datetime — the grain is cruise x region, so
       -- there is no per-observation time. The cruise reference is the only date
       -- that exists, and it resolves for ~60% of rows (the rest fall in months
       -- with more than one cruise; CalCOFI/workflows phytoplankton Q06). Emitted
       -- as `year` so the slider can filter what IS dated, alongside n_obs_undated
       -- so the UI can say what it cannot filter rather than implying it did.
       year(c.date_ym) AS yr
FROM __TBL:obs__ o
JOIN __TBL:region__ g
  ON ST_Within(ST_Point(o.longitude, o.latitude), g.geom)
LEFT JOIN __TBL:cruise__ c USING (cruise_key)
WHERE o.dataset_key IN (SELECT dataset_key FROM rp_ds);

-- per (region, dataset)
CREATE TEMP TABLE cov AS
SELECT region_key, dataset_key, any_value(realm) AS realm,
       min(CASE WHEN depth_min BETWEEN 0 AND 6000 THEN depth_min END) AS depth_min,
       max(CASE WHEN depth_max BETWEEN 0 AND 6000 THEN depth_max END) AS depth_max,
       count(*) AS n_obs,
       count(*) FILTER (WHERE yr IS NULL) AS n_obs_undated,
       count(DISTINCT sample_key) AS n_samples,
       count(DISTINCT cruise_key) AS n_surveys,
       min(yr) AS year_min, max(yr) AS year_max
FROM robs GROUP BY 1, 2;

CREATE TEMP TABLE ybin AS
SELECT region_key, dataset_key, list(struct_pack(y := yr, n := n) ORDER BY yr) AS years
FROM (SELECT region_key, dataset_key, yr, count(*) AS n
      FROM robs WHERE yr IS NOT NULL GROUP BY 1, 2, 3)
GROUP BY 1, 2;

-- per (region, dataset, taxon). Joined out to worms_id because variables.json
-- keys taxa by aphia_id, exactly as taxon_coverage.json does — see the long note
-- in build_stations.sql for why aphia_id and not scientific_name or taxon_key.
CREATE TEMP TABLE tax AS
SELECT o.region_key, o.dataset_key,
       CAST(t.worms_id AS VARCHAR) AS aphia_id,
       count(*) AS n_obs,
       count(*) FILTER (WHERE o.yr IS NULL) AS n_obs_undated,
       count(DISTINCT o.sample_key) AS n_samples,
       min(o.yr) AS year_min, max(o.yr) AS year_max
FROM robs o
JOIN __TBL:taxon__ t USING (taxon_key)
WHERE o.taxon_key IS NOT NULL AND t.worms_id IS NOT NULL
GROUP BY 1, 2, 3;

CREATE TEMP TABLE tax_ybin AS
SELECT region_key, dataset_key, aphia_id,
       list(struct_pack(y := yr, n := n) ORDER BY yr) AS years
FROM (SELECT o.region_key, o.dataset_key, CAST(t.worms_id AS VARCHAR) AS aphia_id,
             o.yr, count(*) AS n
      FROM robs o
      JOIN __TBL:taxon__ t USING (taxon_key)
      WHERE o.taxon_key IS NOT NULL AND t.worms_id IS NOT NULL AND o.yr IS NOT NULL
      GROUP BY 1, 2, 3, 4)
GROUP BY 1, 2, 3;

CREATE TEMP TABLE ds AS
SELECT c.region_key,
       list(struct_pack(
         dataset_key := c.dataset_key, realm := c.realm,
         depth_min := c.depth_min, depth_max := c.depth_max,
         n_obs := c.n_obs, n_obs_undated := c.n_obs_undated,
         n_samples := c.n_samples, n_surveys := c.n_surveys,
         year_min := c.year_min, year_max := c.year_max,
         years := y.years) ORDER BY c.dataset_key) AS datasets,
       count(*) AS n_datasets,
       sum(c.n_obs) AS n_obs, sum(c.n_samples) AS n_samples,
       min(c.year_min) AS year_min, max(c.year_max) AS year_max
FROM cov c LEFT JOIN ybin y USING (region_key, dataset_key)
GROUP BY c.region_key;

CREATE TEMP TABLE tx AS
SELECT t.region_key,
       list(struct_pack(
         dataset_key := t.dataset_key, aphia_id := t.aphia_id,
         n_obs := t.n_obs, n_obs_undated := t.n_obs_undated,
         n_samples := t.n_samples,
         year_min := t.year_min, year_max := t.year_max,
         years := y.years) ORDER BY t.dataset_key, t.aphia_id) AS taxa
FROM tax t LEFT JOIN tax_ybin y USING (region_key, dataset_key, aphia_id)
GROUP BY t.region_key;

COPY (
  SELECT g.region_key, g.description, g.n_stations, g.station_codes,
         round(g.lat, 5) AS lat, round(g.lon, 5) AS lon, g.area_km2,
         coalesce(d.n_datasets, 0) AS n_datasets,
         coalesce(d.n_obs, 0)      AS n_obs,
         coalesce(d.n_samples, 0)  AS n_samples,
         d.year_min, d.year_max,
         g.geometry,
         coalesce(d.datasets, []) AS datasets,
         coalesce(t.taxa, [])     AS taxa
  FROM reg g
  LEFT JOIN ds d USING (region_key)
  LEFT JOIN tx t USING (region_key)
  ORDER BY g.region_key
) TO 'public/data/regions.json' (FORMAT JSON, ARRAY true);
