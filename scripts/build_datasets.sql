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
--   python3 scripts/resolve_release.py          # renders this template -> build/build_datasets.sql
--   duckdb -c ".read build/build_datasets.sql"
-- The `__TBL:<table>__` tokens below are rendered into read_parquet() over each
-- table's release objects — see build_stations.sql's header for the contract.
-- Regenerate on every DB release (see .github/workflows/refresh.yml).

INSTALL httpfs; LOAD httpfs;

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

-- Sampling grain, straight from the release's own sample records. The portal is
-- station-based, and not every dataset is: calcofi_phytoplankton's samples are
-- `region_pool` — Venrick's counts were pooled across stations into four regions
-- before anyone looked down a microscope (Hayward & Venrick 1998), so its 409
-- samples sit at 4 region centroids with no grid_key, no site_key and no
-- datetime, and all 159,804 of its observations inherit that. There is no
-- per-station phytoplankton observation to grid, and no upstream fix that could
-- produce one.
--
-- Carried here as data rather than hardcoded in app.js so the portal can say so
-- honestly wherever it would otherwise print a station count of zero, and so a
-- second region-pooled dataset labels itself without anyone editing JS.
CREATE TEMP TABLE grain AS
SELECT dataset_key, list(DISTINCT sample_type ORDER BY sample_type) AS sample_types
FROM __TBL:sample__
WHERE sample_type IS NOT NULL
GROUP BY dataset_key;

COPY (
  WITH d AS (
    SELECT provider || '_' || dataset AS dataset_key,
           dataset_name, dataset_name_short, category, color,
           link_calcofi_org, link_data_source, link_others,
           description, citation_main, license, pi_names
    FROM __TBL:dataset__
    -- No exclusions. cdfw_dungeness-crab was filtered out here while it was
    -- `in_release: false` upstream with permission to publish still open — its
    -- row was in dataset.parquet anyway, and this file is committed to a public
    -- repo and served from a public Pages site, so copying it would have
    -- published exactly what the flag existed to withhold. CDFW cleared it on
    -- 2026-08-13 (CC BY 4.0), so the filter is gone as its own comment
    -- instructed. If another dataset is ever held back upstream, re-add a
    -- filter here rather than trusting the release to omit the row.
  )
  SELECT dataset_key,
         dataset_name,
         -- the display trio, authored in each ingest's `calcofi.dataset_meta`
         -- and carried here by calcofi4db >= 3.15.0. These replace app.js's
         -- hardcoded DATASET_META / DATASET_CATEGORY, which went stale silently
         -- on every rename. Always present as columns, NULL where a dataset
         -- declares none, so app.js falls back rather than breaking.
         dataset_name_short, category, color,
         coalesce(
           -- Four datasets whose release link fields cannot yield the page we
           -- want. Every one is a bug at the source, in the ingest notebook's
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
             -- link_data_source is the Datazoo catalog page, which still
             -- answers 200 but is on its way out — the maintained access point
             -- is the PFEG ERDDAP table ('CalCOFI Farallon Institute Seabirds:
             -- Observations'), per the 2026-08 CalCOFI feedback round (PR #15).
             -- Same dataset is also served at coastwatch.pfeg.noaa.gov, but
             -- that host was unreachable outright when checked (2026-08-24),
             -- so this points at oceanview — the host the swfsc_ichthyo arm
             -- above already relies on.
             -- FIXED UPSTREAM 2026-08-24 (CalCOFI/workflows ba482d5: the
             -- ingest's link_data_source now carries this same URL): delete
             -- this arm once a release cut after that date ships and
             -- dataset.parquet's link_data_source shows the ERDDAP URL.
             WHEN 'farallon_bird-mammal'
               THEN 'https://oceanview.pfeg.noaa.gov/erddap/tabledap/CAC_FI_SBAS_obs.html'
           END,
           page_link(link_data_source),
           page_link(link_calcofi_org),
           page_link(link_others)
         ) AS url,
         link_calcofi_org, link_data_source, link_others,
         description, citation_main, license, pi_names,
         coalesce(g.sample_types, []) AS sample_types
  FROM d LEFT JOIN grain g USING (dataset_key)
  ORDER BY dataset_key
) TO 'public/data/datasets_meta.json' (FORMAT JSON, ARRAY true);
