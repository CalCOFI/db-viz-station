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
CREATE TEMP TABLE tx AS
SELECT DISTINCT dt.dataset_key, t.scientific_name,
       CAST(t.worms_id AS VARCHAR) AS aphia_id, t.rank, t.common_name
FROM __TBL:dataset_taxon__ dt
JOIN __TBL:taxon__ t USING (taxon_key)
WHERE t.scientific_name IS NOT NULL;

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
         e.keywords, e.science_concepts, e.src AS "source"
  FROM mt LEFT JOIN mt_extras e USING (dataset_key, measurement_type)
  UNION ALL BY NAME
  -- taxon variables
  SELECT tx.dataset_key || '::' || tx.scientific_name AS variable_id,
         tx.dataset_key, 'bio' AS realm, 'taxon' AS variable_type,
         tx.scientific_name AS name, coalesce(tx.common_name, tx.scientific_name) AS display_name,
         NULL AS units, NULL AS description, NULL AS is_canonical,
         tx.aphia_id, tx.rank, tx.common_name,
         e.keywords, e.science_concepts, e.src AS "source"
  FROM tx LEFT JOIN tx_extras e ON lower(tx.scientific_name) = e.name_key
  ORDER BY dataset_key, variable_type, name
) TO 'public/data/variables.json' (FORMAT JSON, ARRAY true);
