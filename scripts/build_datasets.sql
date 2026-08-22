INSTALL httpfs; LOAD httpfs;
CREATE TEMP MACRO r(p) AS
  'https://storage.googleapis.com/calcofi-db/ducklake/releases/__RELEASE__/parquet/' || p;

COPY (
  SELECT provider || '_' || dataset AS dataset_key,
         dataset_name,
         CASE provider || '_' || dataset
           WHEN 'cce-lter_euphausiids' THEN 'https://portal.edirepository.org/nis/mapbrowse?scope=knb-lter-cce&identifier=313'
           WHEN 'sio_pic-zooplankton' THEN 'https://erddap.calcofi.io/erddap/tabledap/sio_pic-zooplankton_sample.html'
           WHEN 'calcofi_phyllosoma' THEN 'https://portal.edirepository.org/nis/mapbrowse?packageid=knb-lter-cce.188.4'
           WHEN 'farallon_bird-mammal' THEN 'https://coastwatch.pfeg.noaa.gov/erddap/tabledap/CAC_FI_SBAS_obs.html'
           ELSE coalesce(nullif(link_data_source, ''), nullif(link_calcofi_org, ''), nullif(link_others, ''))
         END AS url,
         link_calcofi_org, link_data_source, link_others,
         description, citation_main, license, pi_names
  FROM read_parquet(r('dataset.parquet'))
  ORDER BY dataset_key
) TO 'public/data/datasets_meta.json' (FORMAT JSON, ARRAY true);
