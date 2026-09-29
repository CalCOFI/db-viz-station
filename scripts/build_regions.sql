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
       year(c.date_ym) AS yr,
       o.measurement_value AS value
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
       count(DISTINCT sample_key) FILTER (WHERE yr IS NULL) AS n_samples_undated,
       count(DISTINCT cruise_key) AS n_surveys,
       min(yr) AS year_min, max(yr) AS year_max
FROM robs GROUP BY 1, 2;

CREATE TEMP TABLE ybin AS
SELECT region_key, dataset_key, list(struct_pack(y := yr, n := n) ORDER BY yr) AS years
FROM (SELECT region_key, dataset_key, yr, count(*) AS n
      FROM robs WHERE yr IS NOT NULL GROUP BY 1, 2, 3)
GROUP BY 1, 2;

-- samples per year: the denominator for "counted in X of N samples" once the
-- year slider narrows the window (`years` above counts obs ROWS, ~390 per sample)
CREATE TEMP TABLE sybin AS
SELECT region_key, dataset_key, list(struct_pack(y := yr, n := n) ORDER BY yr) AS sample_years
FROM (SELECT region_key, dataset_key, yr, count(DISTINCT sample_key) AS n
      FROM robs WHERE yr IS NOT NULL GROUP BY 1, 2, 3)
GROUP BY 1, 2;

-- per (region, dataset, sample, taxon): the cells actually counted.
--
-- PRESENCE, NOT ROWS (2026-09-28, phytoplankton review with Pooh via Erin). The
-- pooled source is a full taxon x sample matrix — every listed taxon has a row in
-- every sample, 0 where it was not seen — so the old count(*) per taxon was just
-- the region's sample count. On v2026.09.11, 135,764 of 159,804 phytoplankton
-- rows (85%) are 0, and every taxon read "4 of 4 regions": Actinocyclus showed
-- 105 / 106 / 105 / 105 (Alley / NE / Offshore / SE) while cells were counted in
-- 1 / 0 / 3 / 1 samples, checked against the release obs directly.
--
-- Only value > 0 is a count. The -1 (624 rows) and -13 (1,930) codes are open
-- with the provider (workflows phytoplankton Q07), and excluding them is what
-- reproduces Venrick's own group-SUM rows (see `grp` below).
--
-- Summed per sample, not counted per row: several provider codes resolve to one
-- taxon (Dinophyceae carries 27 codes, Bacillariophyceae 24 — size classes of
-- unidentified cells), and each code is a separate count within the same sample.
--
-- Known upstream duplication, not fixable here: cruises 1202 and 1203 appear in
-- both the 1996-2012 and 2012-2018 workbooks (Q06), and the 2007 sheet has two
-- different columns both labelled "CalCOFI 0704"; the ingest folds each pair into
-- one sample, so those 12 samples carry two rows per code. Presence is right
-- (counted once per sample); their sums are doubled. Obs keeps no provider code,
-- so the duplicate rows cannot be told apart from the multi-code taxa above —
-- the fix belongs in the ingest.
CREATE TEMP TABLE rtx AS
SELECT o.region_key, o.dataset_key, o.sample_key, any_value(o.yr) AS yr,
       CAST(t.worms_id AS VARCHAR) AS aphia_id,
       sum(o.value) AS value
FROM robs o
JOIN __TBL:taxon__ t USING (taxon_key)
WHERE o.taxon_key IS NOT NULL AND t.worms_id IS NOT NULL AND o.value > 0
GROUP BY o.region_key, o.dataset_key, o.sample_key, t.worms_id;

-- per (region, dataset, taxon). Joined out to worms_id because variables.json
-- keys taxa by aphia_id, exactly as taxon_coverage.json does — see the long note
-- in build_stations.sql for why aphia_id and not scientific_name or taxon_key.
-- n_obs is now the number of SAMPLES the taxon was counted in (it was rows,
-- zeros included); sum_value is the total counted across them, in the
-- measurement's own units (cells/L for phytoplankton).
CREATE TEMP TABLE tax AS
SELECT region_key, dataset_key, aphia_id,
       count(*) AS n_obs,
       count(*) FILTER (WHERE yr IS NULL) AS n_obs_undated,
       count(*) AS n_samples,
       round(sum(value), 2) AS sum_value,
       min(yr) AS year_min, max(yr) AS year_max
FROM rtx GROUP BY 1, 2, 3;

CREATE TEMP TABLE tax_ybin AS
SELECT region_key, dataset_key, aphia_id,
       list(struct_pack(y := yr, n := n, s := s) ORDER BY yr) AS years
FROM (SELECT region_key, dataset_key, aphia_id, yr,
             count(*) AS n, round(sum(value), 2) AS s
      FROM rtx WHERE yr IS NOT NULL GROUP BY 1, 2, 3, 4)
GROUP BY 1, 2, 3;

-- per (region, dataset, sample, functional group): group totals, e.g. "diatom
-- sum" — asked for in the same review. The source workbooks carry these as
-- SUM rows, which the ingest drops (workflows phytoplankton Q03). Rebuilt from
-- the taxa they reproduce Venrick's rows: on v2026.09.11 every one of the 20
-- region x group totals below matches the sum of the source workbooks' SUM rows
-- (EDI knb-lter-cce.254.4, 1996-2022) to within 0.05%, a few cells/L of rounding.
--
-- Rolled up to the COARSE group (the label before the comma: "diatom",
-- "dinoflagellate", ...), not the fine one ("diatom, centric"): the release
-- keys Bacillariophyceae and Dinophyceae to BOTH halves of their pair and obs
-- no longer carries the provider code that would split them, so a centric vs
-- pennate total cannot be rebuilt from the release. Keeping the SUM rows at
-- ingest (Q03) is what would restore that split.
--
-- Zeros are kept here (value 0 when no member was counted) so a group row exists
-- for every sample; `n_obs` counts only the samples where the total is > 0.
CREATE TEMP TABLE tgrp AS
SELECT dataset_key, taxon_key,
       CASE WHEN count(DISTINCT grp) = 1 THEN any_value(grp) END AS grp
FROM (SELECT split_part(taxon_group_key, ':', 1) AS dataset_key, taxon_key,
             lower(trim(split_part(regexp_extract(description, ':\s*(.+)$', 1), ',', 1))) AS grp
      FROM __TBL:taxon_group__
      WHERE description NOT ILIKE '%undefined%')
WHERE grp <> ''
GROUP BY 1, 2;

CREATE TEMP TABLE rgp AS
SELECT o.region_key, o.dataset_key, o.sample_key, any_value(o.yr) AS yr,
       g.grp AS taxon_group,
       coalesce(sum(o.value) FILTER (WHERE o.value > 0), 0) AS value
FROM robs o
JOIN tgrp g ON g.dataset_key = o.dataset_key AND g.taxon_key = o.taxon_key
WHERE g.grp IS NOT NULL
GROUP BY o.region_key, o.dataset_key, o.sample_key, g.grp;

CREATE TEMP TABLE grp AS
SELECT region_key, dataset_key, taxon_group,
       count(*) FILTER (WHERE value > 0) AS n_obs,
       count(*) FILTER (WHERE value > 0 AND yr IS NULL) AS n_obs_undated,
       count(*) AS n_samples,
       round(sum(value), 2) AS sum_value,
       min(yr) AS year_min, max(yr) AS year_max
FROM rgp GROUP BY 1, 2, 3;

CREATE TEMP TABLE grp_ybin AS
SELECT region_key, dataset_key, taxon_group,
       list(struct_pack(y := yr, n := n, s := s) ORDER BY yr) AS years
FROM (SELECT region_key, dataset_key, taxon_group, yr,
             count(*) FILTER (WHERE value > 0) AS n, round(sum(value), 2) AS s
      FROM rgp WHERE yr IS NOT NULL GROUP BY 1, 2, 3, 4)
GROUP BY 1, 2, 3;

CREATE TEMP TABLE ds AS
SELECT c.region_key,
       list(struct_pack(
         dataset_key := c.dataset_key, realm := c.realm,
         depth_min := c.depth_min, depth_max := c.depth_max,
         n_obs := c.n_obs, n_obs_undated := c.n_obs_undated,
         n_samples := c.n_samples, n_samples_undated := c.n_samples_undated,
         n_surveys := c.n_surveys,
         year_min := c.year_min, year_max := c.year_max,
         years := y.years, sample_years := sy.sample_years) ORDER BY c.dataset_key) AS datasets,
       count(*) AS n_datasets,
       sum(c.n_obs) AS n_obs, sum(c.n_samples) AS n_samples,
       min(c.year_min) AS year_min, max(c.year_max) AS year_max
FROM cov c
LEFT JOIN ybin y USING (region_key, dataset_key)
LEFT JOIN sybin sy USING (region_key, dataset_key)
GROUP BY c.region_key;

CREATE TEMP TABLE tx AS
SELECT t.region_key,
       list(struct_pack(
         dataset_key := t.dataset_key, aphia_id := t.aphia_id,
         n_obs := t.n_obs, n_obs_undated := t.n_obs_undated,
         n_samples := t.n_samples, sum_value := t.sum_value,
         year_min := t.year_min, year_max := t.year_max,
         years := y.years) ORDER BY t.dataset_key, t.aphia_id) AS taxa
FROM tax t LEFT JOIN tax_ybin y USING (region_key, dataset_key, aphia_id)
GROUP BY t.region_key;

CREATE TEMP TABLE gx AS
SELECT g.region_key,
       list(struct_pack(
         dataset_key := g.dataset_key, taxon_group := g.taxon_group,
         n_obs := g.n_obs, n_obs_undated := g.n_obs_undated,
         n_samples := g.n_samples, sum_value := g.sum_value,
         year_min := g.year_min, year_max := g.year_max,
         years := y.years) ORDER BY g.dataset_key, g.taxon_group) AS groups
FROM grp g LEFT JOIN grp_ybin y USING (region_key, dataset_key, taxon_group)
GROUP BY g.region_key;

COPY (
  SELECT g.region_key, g.description, g.n_stations, g.station_codes,
         round(g.lat, 5) AS lat, round(g.lon, 5) AS lon, g.area_km2,
         coalesce(d.n_datasets, 0) AS n_datasets,
         coalesce(d.n_obs, 0)      AS n_obs,
         coalesce(d.n_samples, 0)  AS n_samples,
         d.year_min, d.year_max,
         g.geometry,
         coalesce(d.datasets, []) AS datasets,
         coalesce(t.taxa, [])     AS taxa,
         coalesce(x.groups, [])   AS groups
  FROM reg g
  LEFT JOIN ds d USING (region_key)
  LEFT JOIN tx t USING (region_key)
  LEFT JOIN gx x USING (region_key)
  ORDER BY g.region_key
) TO 'public/data/regions.json' (FORMAT JSON, ARRAY true);
