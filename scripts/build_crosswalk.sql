-- build_crosswalk.sql — generate metadata/crosswalk_variables.csv
--
-- Maps every existing portal variable (public/data/variables.json) to the
-- integrated-DB measurement_type vocabulary, inheriting the dataset-level
-- classification from metadata/crosswalk_datasets.csv (hand-curated).
--
-- Run from the repo root:   duckdb -c ".read scripts/build_crosswalk.sql"
-- Requires network: reads the authoritative measurement_type registry from
-- the CalCOFI/workflows repo (public raw GitHub).

INSTALL httpfs; LOAD httpfs;

-- authoritative DB measurement-type vocabulary (canonical field registry)
CREATE OR REPLACE TABLE mt AS
SELECT measurement_type, _source_column, _source_datasets, units
FROM read_csv_auto('https://raw.githubusercontent.com/CalCOFI/workflows/main/metadata/measurement_type.csv');

-- hand-curated dataset crosswalk (portal dataset -> DB provider_dataset + realm + class)
CREATE OR REPLACE TABLE xd AS
SELECT portal_dataset_id, db_provider_dataset, realm, match_class
FROM read_csv_auto('metadata/crosswalk_datasets.csv');

-- portal variable catalog
CREATE OR REPLACE TABLE v AS
SELECT dataset_id AS portal_dataset_id, variable_name, display_name, units, entity_type
FROM read_json_auto('public/data/variables.json');

-- normalize a token for fuzzy name matching (t_degc <-> t_deg_c, chlora <-> chlor_a)
CREATE OR REPLACE MACRO norm(s) AS lower(regexp_replace(coalesce(s, ''), '[^a-z0-9]', '', 'g'));

COPY (
  SELECT
    v.portal_dataset_id,
    v.variable_name,
    v.display_name,
    v.units,
    v.entity_type,
    xd.db_provider_dataset,
    xd.realm,
    xd.match_class AS dataset_match_class,
    m.measurement_type AS measurement_type_match,
    CASE
      WHEN m.measurement_type IS NOT NULL          THEN 'measurement_type (source_column/name)'
      WHEN xd.realm = 'bio'                        THEN 'taxon (build-time species match)'
      WHEN xd.db_provider_dataset IS NULL          THEN 'no DB dataset (missing/omics)'
      ELSE 'unmatched'
    END AS var_note
  FROM v
  LEFT JOIN xd USING (portal_dataset_id)
  LEFT JOIN mt m
    ON m._source_datasets = xd.db_provider_dataset
   AND (norm(v.variable_name) = norm(m._source_column)
        OR norm(v.variable_name) = norm(m.measurement_type))
  QUALIFY row_number() OVER (
    PARTITION BY v.portal_dataset_id, v.variable_name
    ORDER BY m.measurement_type NULLS LAST) = 1
  ORDER BY v.portal_dataset_id, v.variable_name
) TO 'metadata/crosswalk_variables.csv' (HEADER, DELIMITER ',');
