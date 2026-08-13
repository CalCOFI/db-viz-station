-- build_datasets.sql — per-dataset official names and links from the CalCOFI
-- integrated database, written to public/data/datasets_meta.json.
--
-- Grain: one row per dataset_key (= provider_dataset), the same key that obs/,
-- variables.json and stations.json carry. Replaces the hand-maintained
-- DATASET_OFFICIAL_NAME / DATASET_URL_FALLBACK maps in public/app.js, which went
-- stale silently every time the integrated DB renamed a dataset (see #11, and
-- c643cd2 which was a manual fix-up after three renames at once). app.js still
-- owns label/realm/colour and category — genuine presentation choices with no
-- counterpart in the DB — but the official name and the "Open Dataset ↗" link
-- now come from whatever the release actually contains, so a rename propagates
-- on the next refresh instead of waiting for someone to spot a grey card.
--
-- `url` is the only derived field: the first of link_data_source /
-- link_calcofi_org / link_others that a browser can open as a page. See
-- page_link() for why that test is not simply "is it non-empty".
--
-- Run from repo root (needs the `duckdb` CLI + network to public GCS):
--   sed "s/__RELEASE__/v2026.08.11/g" scripts/build_datasets.sql | duckdb
-- __RELEASE__ is substituted with the resolved version at build time (see
-- .github/workflows/refresh.yml). Regenerate on every DB release.

INSTALL httpfs; LOAD httpfs;

-- frozen-release parquet base; __RELEASE__ is substituted at build time. Plain
-- https:// is enough here (unlike build_stations.sql, which needs gs:// to list
-- the Hive-partitioned obs/) because dataset.parquet is a single named object.
CREATE TEMP MACRO r(p) AS
  'https://storage.googleapis.com/calcofi-db/ducklake/releases/__RELEASE__/parquet/' || p;

-- A link fit to be the target of app.js's "Open Dataset ↗" button, else NULL.
-- Two things disqualify a value, and both are in the release today:
--   * it is not a URL at all — link_data_source is free text for some datasets
--     ('BTEDB (Bongo Tow Euphausiid Database) export', 'SIO Pelagic
--     Invertebrate Collection DB (CSV export)'), and a bare non-empty test puts
--     that prose straight into an href;
--   * it is a bulk download rather than a page — calcofi_bottle's
--     link_data_source is a 31 MB .zip, so a button labelled "Open Dataset"
--     would start a 31 MB download instead of opening anything. Its
--     link_calcofi_org is the actual landing page, which is what we want.
CREATE TEMP MACRO page_link(u) AS
  CASE WHEN u LIKE 'http%'
        AND NOT regexp_matches(lower(u), '\.(zip|gz|tar|csv|tsv|nc|xlsx?)($|\?)')
       THEN u END;

COPY (
  WITH d AS (
    SELECT provider || '_' || dataset AS dataset_key,
           dataset_name, link_calcofi_org, link_data_source, link_others,
           description, citation_main, license, pi_names
    FROM read_parquet(r('dataset.parquet'))
    -- cdfw_dungeness-crab is `in_release: false` upstream — permission to
    -- publish is still open (CalCOFI/workflows ingest_cdfw_dungeness-crab.qmd)
    -- — yet its row IS present in the release's dataset.parquet. This file is
    -- committed to a public repo and served from a public Pages site, so
    -- copying its description and PI name here would publish exactly what the
    -- flag exists to withhold. Drop the filter once the release stops emitting
    -- the row, or once the dataset is cleared for release.
    WHERE provider || '_' || dataset NOT IN ('cdfw_dungeness-crab')
  )
  SELECT dataset_key,
         dataset_name,
         coalesce(
           -- Three datasets whose release link fields cannot yield a usable
           -- page. Every one is a bug at the source, in the ingest notebook's
           -- `calcofi:` YAML in CalCOFI/workflows; delete the arm as each is
           -- fixed and a release carrying the fix is cut.
           CASE dataset_key
             -- link_data_source is prose ('BTEDB ... export'), no other link.
             WHEN 'cce-lter_euphausiids'
               THEN 'https://portal.edirepository.org/nis/mapbrowse?scope=knb-lter-cce&identifier=313'
             -- link_data_source is prose ('SIO Pelagic ... CSV export'), no other link.
             WHEN 'sio_pic-zooplankton'
               THEN 'https://erddap.calcofi.io/erddap/tabledap/sio_pic-zooplankton_sample.html'
             -- link_calcofi_org 404s ("Page not found – CalCOFI", verified
             -- 2026-08-13) and is this dataset's only link, so it passes
             -- page_link() while being unusable. Points at the ERDDAP table the
             -- hardcoded map used before this file existed.
             WHEN 'swfsc_ichthyo'
               THEN 'https://oceanview.pfeg.noaa.gov/erddap/tabledap/erdCalCOFItows.html'
           END,
           page_link(link_data_source),
           page_link(link_calcofi_org),
           page_link(link_others)
         ) AS url,
         link_calcofi_org, link_data_source, link_others,
         description, citation_main, license, pi_names
  FROM d
  ORDER BY dataset_key
) TO 'public/data/datasets_meta.json' (FORMAT JSON, ARRAY true);
