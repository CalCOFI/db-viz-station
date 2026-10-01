-- build_vars.sql — hybrid variables catalog -> public/data/variables.json
--
-- Spine is DB-authoritative: every measurement_type (env + bio) from the
-- CalCOFI/workflows registry + every taxon from the DB taxon tables. Harvested
-- extras (keywords, science_concepts, source URLs) are LEFT-JOINed from the
-- preserved metadata/variables_harvested.json via the dataset/variable crosswalk.
--
-- Station highlighting is derived client-side from stations.json + dataset_key,
-- so no per-variable station list is baked in here.
--
--   python3 scripts/resolve_release.py      # renders this template -> build/build_vars.sql
--   duckdb -c ".read build/build_vars.sql"  (needs duckdb CLI + network)

INSTALL httpfs; LOAD httpfs;
CREATE TEMP MACRO u(p) AS 'https://storage.googleapis.com/calcofi-db/ingest/' || p;

-- authoritative measurement-type registry
--
-- `_source_datasets` is a ';'-separated LIST, not a single key — `abundance` is
-- recorded as 'swfsc_ichthyo;sio_mesopelagic-fish'. Taking the column verbatim
-- emitted that whole string as a dataset_key, which matches nothing in
-- stations.json or datasets_meta.json, so the variable reached the portal
-- labelled with the raw compound string, in fallback grey, highlighting zero
-- stations. Split it so the measurement is attributed to each dataset that
-- actually records it, and derive realm from the split key (the compound string
-- was never in the env list, so it also silently defaulted to 'bio').
CREATE TEMP TABLE mt AS
WITH split AS (
  SELECT measurement_type, description, units, (is_canonical = 'TRUE') AS is_canonical,
         trim(unnest(string_split(_source_datasets, ';'))) AS dataset_key
  FROM read_csv_auto('https://raw.githubusercontent.com/CalCOFI/workflows/main/metadata/measurement_type.csv')
  WHERE _source_datasets IS NOT NULL
)
SELECT measurement_type, description, units, is_canonical, dataset_key,
       CASE WHEN dataset_key IN ('calcofi_bottle','calcofi_ctd-cast','calcofi_dic')
            THEN 'env' ELSE 'bio' END AS realm
FROM split;

-- authoritative taxa spine — the unified `taxon` (one deduped row per taxon)
-- joined to the `dataset_taxon` crosswalk (dataset_key) from the LATEST frozen
-- release, read through its catalog: the `__TBL:<table>__` tokens are rendered
-- by scripts/resolve_release.py, the same mechanism build_stations.sql uses.
-- Supersedes the per-dataset ingest parquet UNION (species/zoodb_taxon/
-- zooscan_taxon/phyto_taxon); now also covers seabirds/mammals + resolves
-- coarse taxa to real WoRMS/ITIS.
-- DISTINCT is load-bearing. dataset_taxon is grained by `ds_taxon_key` — the
-- PROVIDER's own taxon record, carrying its spelling, common name and taxa code
-- — and many of those resolve to one consolidated taxon_key, so the join fans
-- out. calcofi_phytoplankton is the extreme case: 393 provider rows for 25
-- consolidated taxa. Without DISTINCT that fan-out reached variables.json as
-- 511 byte-identical duplicate records (380 phytoplankton rows for 12 distinct
-- variables), which app.js's buildCanonicalVars() then silently deduped with its
-- `seenExact` pass — so the file shipped ~30% redundant and the UI looked fine.
--
-- Known limitation, unchanged by this fix: variable_id is keyed on
-- scientific_name, so the several taxa that share a name across distinct
-- taxon_keys (Hydrozoa, Salpida, Siphonophorae, Ctenophora are all confirmed
-- duplicated — see build_stations.sql's header) still collapse into one
-- variable. Fixing that means keying variable_id on taxon_key, which changes
-- every variable_id in the catalog and is deliberately out of scope here.
--
-- source_order + taxon_group (2026-09-28, phytoplankton review with Pooh via
-- Erin): the portal listed the 299 phytoplankton taxa A-Z, which is not how
-- anyone who works with this dataset reads it. Venrick's own species list —
-- definitions.xlsx sheet "Species Codes" (EDI knb-lter-cce.254.4), which every
-- data sheet in the three abundance workbooks follows row for row — runs by
-- functional group (centric diatoms, pennate diatoms, thecate dinoflagellates,
-- athecate dinoflagellates, coccolithophores, silicoflagellates, other) and
-- then by name. The release does not carry that order (ds_taxa_code is a code,
-- not a position), so it is read from the workflows copy of the sheet,
-- metadata/calcofi/phytoplankton/taxon_worms.csv — verified identical in row
-- order to the EDI sheet (384 of 384 codes) — the same way measurement_type.csv
-- is read above. The row number IS the datum: preserve_insertion_order (on by
-- default) keeps a single small CSV in file order, and row_number() over that
-- scan is its line number. (read_text + generate_subscripts would say so more
-- explicitly, but DuckDB-WASM rejects this file's bytes as non-UTF-8 though it is
-- plain ASCII, and the same SQL should run in the browser for checking.)
--
-- source_names (2026-09-28, Betty): the name the source itself uses for each
-- code, the sheet's `species` column, with runs of spaces collapsed. The item's
-- label is the release's WoRMS name, and 64 phytoplankton species differ from
-- Venrick's (Ceratium fusus -> Tripos fusus, Emiliania huxleyi -> Gephyrocapsa
-- huxleyi, ...), so the source's own names travel with the item: shown under its
-- WoRMS name and searchable. A list, since several codes can key one taxon.
CREATE TEMP TABLE src_order AS
SELECT 'calcofi_phytoplankton' AS dataset_key,
       trim(species_code) AS ds_taxa_code,
       CAST(row_number() OVER () AS INTEGER) AS source_order,   -- 1 = first species
       regexp_replace(trim(species), '\s+', ' ', 'g') AS source_name
FROM read_csv('https://raw.githubusercontent.com/CalCOFI/workflows/main/metadata/calcofi/phytoplankton/taxon_worms.csv',
              all_varchar = true, header = true);

CREATE TEMP TABLE tgrp AS
SELECT dataset_key, taxon_key,
       CASE WHEN count(DISTINCT fine) = 1   THEN any_value(fine)
            WHEN count(DISTINCT coarse) = 1 THEN any_value(coarse) END AS taxon_group
FROM (
  SELECT split_part(taxon_group_key, ':', 1) AS dataset_key, taxon_key,
         trim(regexp_extract(description, ':\s*(.+)$', 1)) AS fine,
         trim(split_part(regexp_extract(description, ':\s*(.+)$', 1), ',', 1)) AS coarse
  FROM __TBL:taxon_group__
  -- the source's own "undefined (code not in source definitions; Q05)" bucket
  -- is a data-quality flag, not a group anyone browses by
  WHERE description NOT ILIKE '%undefined%'
)
WHERE fine <> ''
GROUP BY 1, 2;

CREATE TEMP TABLE tx AS
SELECT dt.dataset_key, t.scientific_name,
       CAST(t.worms_id AS VARCHAR) AS aphia_id, t.rank, t.common_name,
       min(so.source_order) AS source_order,
       CASE WHEN count(DISTINCT tg.taxon_group) = 1 THEN any_value(tg.taxon_group) END AS taxon_group,
       list(DISTINCT so.source_name ORDER BY so.source_name) FILTER (WHERE so.source_name IS NOT NULL) AS source_names
FROM __TBL:dataset_taxon__ dt
JOIN __TBL:taxon__ t USING (taxon_key)
LEFT JOIN src_order so ON so.dataset_key = dt.dataset_key AND so.ds_taxa_code = dt.ds_taxa_code
LEFT JOIN tgrp tg ON tg.dataset_key = dt.dataset_key AND tg.taxon_key = dt.taxon_key
WHERE t.scientific_name IS NOT NULL
-- GROUP BY replaces the old SELECT DISTINCT over these same five columns, so the
-- row set is unchanged; it only lets the two new columns aggregate across the
-- provider rows a taxon fans out to (see the DISTINCT note above)
GROUP BY dt.dataset_key, t.scientific_name, t.worms_id, t.rank, t.common_name;

-- harvested catalog (extras source) + crosswalks
CREATE TEMP TABLE hv AS
SELECT dataset_id AS portal_dataset_id, variable_name, display_name,
       keywords, science_concepts, source, description AS h_description
FROM read_json_auto('metadata/variables_harvested.json');

CREATE TEMP TABLE xv AS
SELECT portal_dataset_id, variable_name, db_provider_dataset, measurement_type_match
FROM read_csv_auto('metadata/crosswalk_variables.csv')
WHERE db_provider_dataset IS NOT NULL;

-- extras keyed to a measurement_type (via crosswalk): pick one harvested row
CREATE TEMP TABLE mt_extras AS
SELECT db_provider_dataset AS dataset_key, measurement_type_match AS measurement_type,
       any_value(h.keywords) AS keywords, any_value(h.science_concepts) AS science_concepts,
       any_value(h."source") AS src, any_value(h.h_description) AS h_description
FROM xv JOIN hv AS h USING (portal_dataset_id, variable_name)
WHERE measurement_type_match IS NOT NULL
GROUP BY 1,2;

-- extras keyed to a taxon (by scientific name, best-effort across harvested)
CREATE TEMP TABLE tx_extras AS
SELECT lower(coalesce(display_name, variable_name)) AS name_key,
       any_value(keywords) AS keywords, any_value(science_concepts) AS science_concepts,
       any_value("source") AS src
FROM hv GROUP BY 1;

COPY (
  -- measurement-type variables
  SELECT mt.dataset_key || '::' || mt.measurement_type AS variable_id,
         mt.dataset_key, mt.realm, 'measurement_type' AS variable_type,
         mt.measurement_type AS name, mt.measurement_type AS display_name,
         mt.units, coalesce(mt.description, e.h_description) AS description,
         mt.is_canonical, NULL AS aphia_id, NULL AS rank, NULL AS common_name,
         CAST(NULL AS INTEGER) AS source_order, CAST(NULL AS VARCHAR) AS taxon_group,
         CAST(NULL AS VARCHAR[]) AS source_names,
         e.keywords, e.science_concepts, e.src AS "source"
  FROM mt LEFT JOIN mt_extras e USING (dataset_key, measurement_type)
  UNION ALL BY NAME
  -- taxon variables
  SELECT tx.dataset_key || '::' || tx.scientific_name AS variable_id,
         tx.dataset_key, 'bio' AS realm, 'taxon' AS variable_type,
         tx.scientific_name AS name, coalesce(tx.common_name, tx.scientific_name) AS display_name,
         NULL AS units, NULL AS description, NULL AS is_canonical,
         tx.aphia_id, tx.rank, tx.common_name,
         tx.source_order, tx.taxon_group,
         CASE WHEN len(tx.source_names) > 0 THEN tx.source_names END AS source_names,
         e.keywords, e.science_concepts, e.src AS "source"
  FROM tx LEFT JOIN tx_extras e ON lower(tx.scientific_name) = e.name_key
  ORDER BY dataset_key, variable_type, name
) TO 'public/data/variables.json' (FORMAT JSON, ARRAY true);
