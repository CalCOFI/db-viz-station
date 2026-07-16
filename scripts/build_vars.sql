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
--   duckdb -c ".read scripts/build_vars.sql"   (needs duckdb CLI + network)

INSTALL httpfs; LOAD httpfs;
CREATE TEMP MACRO u(p) AS 'https://storage.googleapis.com/calcofi-db/ingest/' || p;

-- authoritative measurement-type registry
CREATE TEMP TABLE mt AS
SELECT measurement_type, description, units, (is_canonical = 'TRUE') AS is_canonical,
       _source_datasets AS dataset_key,
       CASE WHEN _source_datasets IN ('calcofi_bottle','calcofi_ctd-cast','calcofi_dic')
            THEN 'env' ELSE 'bio' END AS realm
FROM read_csv_auto('https://raw.githubusercontent.com/CalCOFI/workflows/main/metadata/measurement_type.csv')
WHERE _source_datasets IS NOT NULL;

-- authoritative taxa spine — the unified `taxon` (one deduped row per taxon)
-- joined to the `dataset_taxon` crosswalk (dataset_key) from the LATEST frozen
-- release. `__RELEASE__` is substituted by refresh.yml (curl latest.txt), the
-- same mechanism build_stations.sql uses. Supersedes the per-dataset ingest
-- parquet UNION (species/zoodb_taxon/zooscan_taxon/phyto_taxon); now also covers
-- seabirds/mammals + resolves coarse taxa to real WoRMS/ITIS.
CREATE TEMP MACRO r(p) AS
  'https://storage.googleapis.com/calcofi-db/ducklake/releases/__RELEASE__/parquet/' || p;
CREATE TEMP TABLE tx AS
SELECT dt.dataset_key, t.scientific_name,
       CAST(t.worms_id AS VARCHAR) AS aphia_id, t.rank, t.common_name
FROM read_parquet(r('dataset_taxon.parquet')) dt
JOIN read_parquet(r('taxon.parquet')) t USING (taxon_key)
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
