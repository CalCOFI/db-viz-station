
// ---- map (dark basemap, matching calcofi.io/db-schema palette) ----
const map = L.map('map', { center: [32.8, -120.2], zoom: 6, worldCopyJump: true })
  .addLayer(L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19, crossOrigin: true }));

// dataset display metadata: label + color + realm (env = cool, bio = warm)
// Official dataset names — Betty's original app's exact titles where they
// exist (pulled from her ERDDAP crosswalk report, e.g. "CalCOFI SIO
// Hydrographic Bottle Data"), falling back to the workflows ingest
// scripts' dataset_meta.dataset_name for datasets that weren't in her old
// portal (DIC, phytoplankton, the combined bird/mammal census). Used as
// the card title when a parameter's family dropdown lists its sources.
const DATASET_OFFICIAL_NAME = {
  'calcofi_bottle': 'CalCOFI SIO Hydrographic Bottle Data',
  'calcofi_ctd-cast': 'CTD Cast Files',
  'calcofi_dic': 'Carbonate Chemistry / DIC',
  'calcofi_phytoplankton': 'CalCOFI Phytoplankton (Venrick)',
  'swfsc_ichthyo': 'CalCOFI NOAA Ichthyoplankton Tows',
  'swfsc_cufes': 'CalCOFI NOAA Continuous Underway Fish-Egg Sampler (CUFES)',
  'sio_pic-zooplankton': 'SIO PIC Net-Tow Biovolume',
  'pic_zooplankton': 'SIO PIC Net-Tow Biovolume',
  'cce-lter_euphausiids': 'CalCOFI Euphausiid Database',
  'calcofi_phyllosoma': 'CalCOFI Lobster Phyllosoma',
  'cce-lter_zoodb': 'CalCOFI ZooDB',
  'cce-lter_zooscan': 'ZooScan PRPOOS Zooplankton',
  'farallon_bird-mammal': 'CalCOFI Bird & Mammal Census',
  'calcofi_bird_mammal_census': 'CalCOFI Bird & Mammal Census',
  'calcofi_mets': 'CalCOFI Underway Meteorological (METS) Data',
  'sio_mesopelagic-fish': 'CalCOFI Mesopelagic Fish Archive',
  'ucsd_sio_mesopelagic-fish': 'CalCOFI Mesopelagic Fish Archive',
  'cce-lter_picoplankton-bacteria': 'CCE-LTER Picoplankton & Bacteria',
};
const DATASET_META = {
  'calcofi_bottle':        { label: 'Hydrographic Bottle',              realm: 'env', color: '#4dabf7' },
  // Synthetic keys, not a real dataset_key on any variable — exist only so
  // the top-level "By Dataset" list can show Bottle vs Cast as two separate
  // rows (see inventoryVarsFor/buildCategories). Same color/realm as the
  // real calcofi_bottle entry above since they're the same underlying table.
  'calcofi_bottle_hydro':  { label: 'Hydrographic Bottle',              realm: 'env', color: '#4dabf7' },
  'calcofi_bottle_cast':   { label: 'Hydrographic Cast',                realm: 'env', color: '#be8c63' },
  'calcofi_ctd-cast':      { label: 'CTD Cast Files',                  realm: 'env', color: '#3bc9db' },
  'calcofi_dic':           { label: 'Carbonate Chemistry / DIC',        realm: 'env', color: '#63e6be' },
  'calcofi_phytoplankton': { label: 'Phytoplankton',                    realm: 'bio', color: '#12b886' },
  'swfsc_ichthyo':         { label: 'Ichthyoplankton (Fish Eggs & Larvae)', realm: 'bio', color: '#ffa94d' },
  'swfsc_cufes':           { label: 'CUFES Fish Eggs',                  realm: 'bio', color: '#ffd43b' },
  'sio_pic-zooplankton':   { label: 'Zooplankton',                     realm: 'bio', color: '#69db7c' },
  'pic_zooplankton':       { label: 'Zooplankton',                     realm: 'bio', color: '#69db7c' },
  'cce-lter_euphausiids':  { label: 'Euphausiids (Krill)',              realm: 'bio', color: '#b197fc' },
  'calcofi_phyllosoma':    { label: 'Phyllosoma (Lobster Larvae)',      realm: 'bio', color: '#f783ac' },
  'cce-lter_zoodb':        { label: 'ZooDB (Holoplankton Community)',   realm: 'bio', color: '#38d9a9' },
  'cce-lter_zooscan':      { label: 'ZooScan (Imaged Zooplankton)',     realm: 'bio', color: '#a9e34b' },
  'farallon_bird-mammal':  { label: 'Seabirds & Marine Mammals',        realm: 'bio', color: '#ff8787' },
  'calcofi_bird_mammal_census': { label: 'Seabirds & Marine Mammals',   realm: 'bio', color: '#ff8787' },
  'calcofi_mets':          { label: 'Underway Meteorological (METS) Data', realm: 'env', color: '#74c0fc' },
  'sio_mesopelagic-fish': { label: 'Mesopelagic Fish',             realm: 'bio', color: '#5c7cfa' },
  'ucsd_sio_mesopelagic-fish': { label: 'Mesopelagic Fish',             realm: 'bio', color: '#5c7cfa' },
  'cce-lter_picoplankton-bacteria': { label: 'Picoplankton & Bacteria', realm: 'bio', color: '#94d82d' },
  // entered the release 2026-08-14 (CC BY 4.0). Deliberately a darker, more
  // saturated orange than swfsc_ichthyo's #ffa94d — the two are both larval
  // plankton and sit next to each other in the inventory, so a near-shade would
  // read as the same dataset at a glance.
  'cdfw_dungeness-crab':   { label: 'Dungeness Crab Megalopae',      realm: 'bio', color: '#f76707' }
};
// datasets_meta.json — dataset_key -> official name + link + citation, built by
// scripts/build_datasets.sql from the release's own dataset.parquet (see #11).
// Primary source for the official name and the "Open Dataset ↗" link.
// DATASET_OFFICIAL_NAME / DATASET_URL_FALLBACK are fallback-only: a key the
// release does not carry (a portal-only split such as calcofi_bottle_cast, or a
// dataset added between releases), or the file being absent altogether (an old
// deploy, a fork, a preview build). Filled once the file loads and empty until
// then, so a lookup before that falls through to the hardcoded maps rather than
// throwing.
let DATASETS_META = {};
// Label/realm/colour stay local — presentation choices with no counterpart in
// the DB — but fall back to the release's own dataset_name rather than the raw
// key, so a dataset renamed since this map was last touched still reads as
// itself (grey, but named) instead of as `cce-lter_something`.
// The release is now the primary source for label and colour: each ingest
// declares `dataset_name_short` / `category` / `color` in its `calcofi:`
// front-matter (calcofi4db >= 3.15.0), so a rename or a new dataset arrives
// named and coloured without anyone editing this file. DATASET_META below is
// fallback-only — for a key the release does not carry (portal-only splits like
// calcofi_bottle_cast) or before datasets_meta.json loads.
//
// `realm` is deliberately NOT taken from the release: stations.json already
// measures it per dataset from obs, so asking the front-matter to restate it
// would create a second answer that can disagree with the data.
const dsMeta = id => {
  const rel = DATASETS_META[id], loc = DATASET_META[id];
  const label = (rel && rel.dataset_name_short) || (loc && loc.label) ||
                (rel && rel.dataset_name) || id;
  const color = (rel && rel.color) || (loc && loc.color) || '#adb5bd';
  const realm = (loc && loc.realm) || 'bio';
  return { label, realm, color };
};
// A few calcofi_bottle variables (dry_air_temp, wet_air_temp) were actually
// collected as part of the Hydrographic CAST program, not the Bottle
// program — they share calcofi_bottle's dataset_key because both portal
// datasets map to the same integrated-DB table, but their own harvested
// `source.access_url` correctly points to siocalcofiHydroCast. Use that to
// relabel just these per-variable displays rather than the whole dataset_key.
// A batch of calcofi_bottle variables are actually collected as part of the
// Hydrographic CAST program (surface meteorology + cast metadata), not the
// Bottle chemistry program — they share calcofi_bottle's dataset_key because
// both portal datasets map to the same integrated-DB table. Matched by name
// (not just source.access_url) since Water Color, a discontinued field
// (1988-10 through 1998-04), has no live source URL to check.
const DATASET_URL_FALLBACK = {
  'calcofi_mets': 'https://calcofi.org/data/oceanographic-data/underway/',
  'calcofi_bottle': 'https://coastwatch.pfeg.noaa.gov/erddap/tabledap/siocalcofiHydroBottle.html',
  'calcofi_bottle_hydro': 'https://coastwatch.pfeg.noaa.gov/erddap/tabledap/siocalcofiHydroBottle.html',
  'calcofi_bottle_cast': 'https://coastwatch.pfeg.noaa.gov/erddap/tabledap/siocalcofiHydroCast.html',
  'calcofi_ctd-cast': 'https://calcofi.org/data/oceanographic-data/ctd-cast-files/',
  'calcofi_dic': 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.nodc:0301029',
  'swfsc_ichthyo': 'https://oceanview.pfeg.noaa.gov/erddap/tabledap/erdCalCOFItows.html',
  'swfsc_cufes': 'https://coastwatch.pfeg.noaa.gov/erddap/tabledap/erdCalCOFIcufes.html',
  'sio_pic-zooplankton': 'https://oceanview.pfeg.noaa.gov/erddap/tabledap/erdCalCOFIzoovol.html',
  'pic_zooplankton': 'https://oceanview.pfeg.noaa.gov/erddap/tabledap/erdCalCOFIzoovol.html',
  'cce-lter_euphausiids': 'https://portal.edirepository.org/nis/mapbrowse?scope=knb-lter-cce&identifier=313',
  'calcofi_phyllosoma': 'https://portal.edirepository.org/nis/mapbrowse?packageid=knb-lter-cce.188.4',
  'cce-lter_zoodb': 'http://oceaninformatics.ucsd.edu/zoodb/',
  'cce-lter_zooscan': 'https://oceaninformatics.ucsd.edu/zooscandb/secure/login.php',
  'sio_mesopelagic-fish': 'https://library.ucsd.edu/dc/object/bb9217084g',
  'ucsd_sio_mesopelagic-fish': 'https://library.ucsd.edu/dc/object/bb9217084g',
  'cce-lter_picoplankton-bacteria': 'https://oceaninformatics.ucsd.edu/datazoo/catalogs/ccelter/datasets/159',
  'calcofi_phytoplankton': 'https://oceaninformatics.ucsd.edu/datazoo/catalogs/ccelter/datasets/254',
  'farallon_bird-mammal': 'https://portal.edirepository.org/nis/mapbrowse?scope=knb-lter-cce&identifier=255&revision=3',
  'calcofi_bird_mammal_census': 'https://portal.edirepository.org/nis/mapbrowse?scope=knb-lter-cce&identifier=255&revision=3',
};
const officialNameFor = dk => (DATASETS_META[dk] && DATASETS_META[dk].dataset_name) || DATASET_OFFICIAL_NAME[dk];
const datasetUrlFor   = dk => (DATASETS_META[dk] && DATASETS_META[dk].url)          || DATASET_URL_FALLBACK[dk];
// True when a dataset has no station resolution to report, because its samples
// were pooled before they were ever counted. calcofi_phytoplankton is the only
// one today: Venrick's counts are pooled across stations into four regions
// (Hayward & Venrick 1998), so its 409 samples sit at 4 region centroids with no
// grid_key and no datetime, and all 159,804 observations inherit that.
//
// This is the dataset's grain, NOT a gap — there is no per-station phytoplankton
// observation anywhere upstream to grid, and no fix that could produce one. So
// the portal must not render it as "0 stations", which reads as "we have nothing
// here" when the truth is "this was never measured per station".
//
// Read from the release's own sample_type via datasets_meta.json rather than a
// hardcoded key, so a second region-pooled dataset labels itself. Region
// geometry — drawing the four regions and highlighting those — is the better
// answer and is deliberately not attempted here.
const REGION_POOLED = 'region_pool';
const isRegionPooled = dk => {
  const t = DATASETS_META[dk] && DATASETS_META[dk].sample_types;
  return Array.isArray(t) && t.length > 0 && t.every(s => s === REGION_POOLED);
};
const POOLED_SHORT = 'pooled by region — no per-station coverage';
const POOLED_WHY = 'Samples were pooled across stations into regions before being counted, so this dataset has no per-station coverage to report. It is not missing data.';
// A few calcofi_bottle variables (dry_air_temp, wet_air_temp) were actually
// collected as part of the Hydrographic CAST program, not the Bottle
// program — they share calcofi_bottle's dataset_key because both portal
// datasets map to the same integrated-DB table, but their own harvested
// `source.access_url` correctly points to siocalcofiHydroCast. Use that to
// relabel just these per-variable displays rather than the whole dataset_key.
// A batch of calcofi_bottle variables are actually collected as part of the
// Hydrographic CAST program (surface meteorology + cast metadata), not the
// Bottle chemistry program — they share calcofi_bottle's dataset_key because
// both portal datasets map to the same integrated-DB table. Matched by name
// (not just source.access_url) since Water Color, a discontinued field
// (1988-10 through 1998-04), has no live source URL to check.
const CAST_SIDE_BOTTLE_FIELDS = new Set([
  'dry_air_temp', 'wet_air_temp', 'wave_direction', 'wave_height', 'wave_period',
  'wind_direction', 'wind_speed', 'barometric_pressure', 'weather_code',
  'cloud_type', 'cloud_amount', 'visibility', 'secchi_depth', 'water_color',
]);
const ZOOPLANKTON_VOLUME_FIELDS = new Set(['small_plankton_biomass', 'total_plankton_biomass']);
function datasetLabelFor(v) {
  const meta = dsMeta(v.dataset_key);
  if (v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name)) return 'Hydrographic Cast';
  if (v.dataset_key === 'swfsc_ichthyo' && ZOOPLANKTON_VOLUME_FIELDS.has(v.name)) return 'Zooplankton Volume';
  return meta.label;
}
// Same idea as datasetLabelFor — Hydrographic Cast variables share
// calcofi_bottle's dataset_key, so dsMeta(v.dataset_key) alone would give
// them Bottle's blue everywhere (dropdown dots, search banner, station
// cards). Indigo (#be8c63) is used for every Cast-side rendering instead,
// distinct from Bottle's #4dabf7 and every other dataset's color.
function datasetColorFor(v) {
  if (v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name)) return '#be8c63';
  if (v.dataset_key === 'swfsc_ichthyo' && ZOOPLANKTON_VOLUME_FIELDS.has(v.name)) return dsMeta('sio_pic-zooplankton').color;
  return dsMeta(v.dataset_key).color;
}
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// ---- display-name cleanup — ported from Betty's original station-portal
// build. The release DB's raw variable names are still snake_case for the
// hydrographic datasets (e.g. "barometric_pressure", "dic_rep1") — this
// turns them into the same clean labels her original app showed, and
// keeps the exact-match fixes/species common names for anything that
// still needs them (e.g. once per-species euphausiid/ZooDB data lands). --
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---- display-name cleanup — ported from Betty's original station-portal
// build. The release DB's raw variable names are still snake_case for the
// hydrographic datasets (e.g. "barometric_pressure", "dic_rep1") — this
// turns them into the same clean labels her original app showed, and
// keeps the exact-match fixes/species common names for anything that
// still needs them (e.g. once per-species euphausiid/ZooDB data lands). --
function toTitleCase(str) {
  return (str || '').replace(/(^|[\s\-/])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
}
function cleanFieldName(name) {
  return name && name.includes('_') ? name.replace(/_/g, ' ') : name;
}
const DISPLAY_NAME_FIXES = {
  'Phaeopigment Concentratio': 'Phaeopigment Concentration',
  'Phaeopigment concentratio': 'Phaeopigment Concentration',
  'ph': 'pH', 'Ph': 'pH', 'PH': 'pH',
  'ph replicate': 'pH Replicate', 'pH replicate': 'pH Replicate',
  'latitude_degrees': 'Latitude Degrees', 'latitude_hemisphere': 'Latitude Hemisphere',
  'latitude_minutes': 'Latitude Minutes', 'longitude_degrees': 'Longitude Degrees',
  'longitude_hemisphere': 'Longitude Hemisphere', 'longitude_minutes': 'Longitude Minutes',
  'erddap': 'ERDDAP', 'oceaninformatics': 'Ocean Informatics', 'ucsd': 'UCSD',
  // ZooDB species common names (only well-established English names)
  'calanus pacificus': 'California Copepod (Calanus pacificus)',
  'neocalanus cristatus': 'Crystalline Copepod (Neocalanus cristatus)',
  'neocalanus flemingeri': "Fleming's Copepod (Neocalanus flemingeri)",
  'neocalanus gracilis': 'Graceful Copepod (Neocalanus gracilis)',
  'neocalanus plumchrus': 'Subarctic Copepod (Neocalanus plumchrus)',
  'pleuroncodes planipes': 'Pelagic Red Crab (Pleuroncodes planipes)',
  'pyrosoma atlanticum': 'Atlantic Pyrosome (Pyrosoma atlanticum)',
  'thalia democratica': 'Democratic Salp (Thalia democratica)',
  'salpa fusiformis': 'Fusiform Salp (Salpa fusiformis)',
  'salpa maxima': 'Giant Salp (Salpa maxima)',
  'salpa aspera': 'Rough Salp (Salpa aspera)',
  'sergestes similis': 'Similar Sergestid Shrimp (Sergestes similis)',
  'pasiphaea pacifica': 'Pacific Glass Shrimp (Pasiphaea pacifica)',
  'pasiphaea spp.': 'Glass Shrimp (Pasiphaea spp.)',
  'dolioletta gegenbauri': "Gegenbauer's Doliolid (Dolioletta gegenbauri)",
  'pegea confoederata': 'Colonial Salp (Pegea confoederata)',
  'weelia cylindrica': 'Cylindrical Salp (Weelia cylindrica)',
  'thetys vagina': 'Giant Salp (Thetys vagina)',
  'tomopteris spp.': 'Polychaete Worm (Tomopteris spp.)',
  'atlanta spp.': 'Sea Butterfly Heteropod (Atlanta spp.)',
  'panulirus interruptus': 'California Spiny Lobster (Panulirus interruptus)',
  'appendicularia': 'Larvacean (Appendicularia)',
  'calanoida': 'Calanoid Copepod (Calanoida)',
  'chaetognatha': 'Arrow Worm (Chaetognatha)',
  'copepoda': 'Copepod (Copepoda)',
  'doliolida': 'Doliolid (Doliolida)',
  'euthecosomata': 'Shelled Pteropod (Euthecosomata)',
  'foraminifera': 'Foraminiferan (Foraminifera)',
  'gammaridea': 'Gammarid Amphipod (Gammaridea)',
  'gymnosomata': 'Naked Pteropod (Gymnosomata)',
  'hydrozoa': 'Hydrozoan (Hydrozoa)',
  'hyperiidea': 'Hyperiid Amphipod (Hyperiidea)',
  'ostracoda': 'Ostracod (Ostracoda)',
  'pseudothecosomata': 'Shelled Pteropod (Pseudothecosomata)',
  'pyrosomatida': 'Pyrosome (Pyrosomatida)',
  'radiozoa': 'Radiolarian (Radiozoa)',
  'sergestoidea': 'Sergestid Shrimp (Sergestoidea)',
  'bryozoa': 'Bryozoan (Bryozoa)',
  'euphausiacea': 'Krill (Euphausiacea)',
  'harpacticoida': 'Harpacticoid Copepod (Harpacticoida)',
  'polychaeta': 'Bristle Worm (Polychaeta)',
  'rhizaria': 'Rhizarian (Rhizaria)',
  'het bacteria': 'Heterotrophic Bacteria',
  'bacillariophyceae': 'Diatom (Bacillariophyceae)',
  'coccolithophyceae': 'Coccolithophore (Coccolithophyceae)',
  'dictyochophyceae': 'Silicoflagellate (Dictyochophyceae)',
  'dinophyceae': 'Dinoflagellate (Dinophyceae)',
  'oxygen sat pct': 'Oxygen Saturation',
  'oxygen temp c': 'Oxygen Sensor Temperature',
  'air temp c': 'Air Temperature',
  'atm pressure mb': 'Atmospheric Pressure',
  'atm pressure slc mb': 'Atmospheric Pressure (SLC)',
  'bottom depth m': 'Bottom Depth',
  'bottom depth mb m': 'Bottom Depth (MB)',
  'transmissometer v': 'Transmissometer (Voltage)',
  'uws flow': 'Underway Seawater Flow Rate',
  'wind dir deg': 'Wind Direction',
  'wind speed ms': 'Wind Speed',
  'long wave rad': 'Long-wave Radiation',
  'short wave rad': 'Short-wave Radiation',
  'rel humidity pct': 'Relative Humidity',
  'sw ph': 'Seawater pH',
  'dic pco2 raw': 'pCO2',
  'dic ph raw': 'pH (Raw)',
  'dic salinity psu': 'Salinity (DIC Analyzer)',
  'dic temp c': 'Temperature (DIC Analyzer)',
  'dic valve': 'DIC Analyzer Valve Position',
  'pred chl': 'Chlorophyll (Predicted)',
  'pred sal psu': 'Salinity (Predicted)',
  'chl fluor': 'Chlorophyll Fluorescence',
  'par surf': 'PAR (Surface)',
  'ss conductivity': 'Sea Surface Conductivity',
  'sst c': 'Sea Surface Temperature',
  'sst c corrected': 'Sea Surface Temperature (Corrected)',
  'sss psu': 'Sea Surface Salinity',
  'sss psu corrected': 'Sea Surface Salinity (Corrected)',
  // Euphausiid common names
  'Bentheuphausia amblyops': 'Deep-sea Krill (Bentheuphausia amblyops)',
  'Euphausia brevis': 'Short Krill (Euphausia brevis)',
  'Euphausia diomedeae': 'Diomedea Krill (Euphausia diomedeae)',
  'Euphausia distinguenda': 'Distinctive Krill (Euphausia distinguenda)',
  'Euphausia eximia': 'Exquisite Krill (Euphausia eximia)',
  'Euphausia gibboides': 'Humpback Krill (Euphausia gibboides)',
  'Euphausia hemigibba': 'Half-hump Krill (Euphausia hemigibba)',
  'Euphausia lamelligera': 'Lamellar Krill (Euphausia lamelligera)',
  'Euphausia mutica': 'Mute Krill (Euphausia mutica)',
  'Euphausia pacifica': 'Pacific Krill (Euphausia pacifica)',
  'Euphausia recurva': 'Curved Krill (Euphausia recurva)',
  'Euphausia tenera': 'Tender Krill (Euphausia tenera)',
  'Hansarsia atlantica': 'Atlantic Krill (Hansarsia atlantica)',
  'Hansarsia difficilis': 'Difficult Krill (Hansarsia difficilis)',
  'Hansarsia gracilis': 'Slender Krill (Hansarsia gracilis)',
  'Hansarsia microps': 'Small-eye Krill (Hansarsia microps)',
  'Hansarsia tenella': 'Delicate Krill (Hansarsia tenella)',
  'Nematobrachion boopis': 'Boops Krill (Nematobrachion boopis)',
  'Nematobrachion flexipes': 'Flexible Krill (Nematobrachion flexipes)',
  'Nyctiphanes simplex': 'Simple Krill (Nyctiphanes simplex)',
  'Stylocheiron abbreviatum': 'Abbreviated Krill (Stylocheiron abbreviatum)',
  'Stylocheiron affine': 'Affine Krill (Stylocheiron affine)',
  'Stylocheiron carinatum': 'Keeled Krill (Stylocheiron carinatum)',
  'Stylocheiron elongatum': 'Elongated Krill (Stylocheiron elongatum)',
  'Stylocheiron longicorne': 'Long-horned Krill (Stylocheiron longicorne)',
  'Stylocheiron maximum': 'Large Krill (Stylocheiron maximum)',
  'Stylocheiron suhmi': "Suhm's Krill (Stylocheiron suhmi)",
  'Tessarabrachion oculatum': 'Four-arm Krill (Tessarabrachion oculatum)',
  'Thysanoessa gregaria': 'Gregarious Krill (Thysanoessa gregaria)',
  'Thysanoessa longipes': 'Long-legged Krill (Thysanoessa longipes)',
  'Thysanoessa spinifera': 'Spiny Krill (Thysanoessa spinifera)',
  'Thysanopoda astylata': 'Styleless Krill (Thysanopoda astylata)',
  'Thysanopoda cornuta': 'Horned Krill (Thysanopoda cornuta)',
  'Thysanopoda cristata': 'Crested Krill (Thysanopoda cristata)',
  'Thysanopoda egregia': 'Distinguished Krill (Thysanopoda egregia)',
  'Thysanopoda monacantha': 'Single-spine Krill (Thysanopoda monacantha)',
  'Thysanopoda obtusifrons': 'Blunt-fronted Krill (Thysanopoda obtusifrons)',
  'Thysanopoda orientalis': 'Oriental Krill (Thysanopoda orientalis)',
  'Thysanopoda pectinata': 'Combed Krill (Thysanopoda pectinata)',
  // Specific ERDDAP name fixes
  'C14 Assimilation of the Experimental Control (dark Bottle)':
    'C14 Assimilation of the Experimental Control (Dark Bottle)',
  'C14 Assimilation of the experimental control (dark bottle)':
    'C14 Assimilation of the Experimental Control (Dark Bottle)',
  'ForelU': 'Forel-Ule Color Code', 'Forel_Ule': 'Forel-Ule Color Code', 'forelU': 'Forel-Ule Color Code',
  'O2Sat': 'Oxygen Saturation', 'O2sat': 'Oxygen Saturation', 'O2': 'Oxygen',
  'Secchi': 'Secchi Depth', 'secchi': 'Secchi Depth',
  'Mesh Size ()': 'Mesh Size', 'mesh size ()': 'Mesh Size',
  'dic': 'Dissolved Inorganic Carbon (DIC)', 'oxygen ml l': 'Oxygen', 'oxygen umol kg': 'Oxygen',
  'par': 'PAR', 'spar': 'Surface PAR', 'isus v': 'In-Situ Ultraviolet Spectrophotometer (ISUS) Voltage',
  'ctdtemp its90': 'CTD (Conductivity, Temperature, Depth) Temperature (ITS-90)', 'salinity pss78': 'Salinity (PSS-78)',
  'est chlorophyll a': 'Est. Chlorophyll-a',
  'light pct': 'Light Percentage', 'fluorescence v': 'Fluorescence Voltage',
  'small plankton biomass': 'Small Plankton Volume', 'total plankton biomass': 'Total Plankton Volume',
  'zooplankton abundance areal': 'Zooplankton Abundance (Areal)',
  'zooplankton biomass carbon': 'Zooplankton Biomass (Carbon)',
  'zooscan biomass carbon': 'ZooScan Biomass (Carbon)',
  'zooscan carbon individual': 'ZooScan Mean Individual Carbon',
  'zooscan feret diameter': 'ZooScan Organism Size (Feret Diameter)',
  'zooscan abundance': 'ZooScan Abundance',
};
function fixDisplayName(name) {
  if (!name) return name;
  const rawLower = name.toLowerCase();
  const isReported = /^r_/.test(rawLower);
  const hasBottleMarker = /(^|_)btl(_|$)/.test(rawLower);

  // reduce to the same base canonicalBase() uses for grouping, so the label
  // matches whichever variant survives de-duplication (e.g. "temperature_1"
  // and "temperature_2" both merge into one row -> both should read
  // "Temperature", not "Temperature 1")
  let base = rawLower.replace(/^r_/, '');
  base = base.replace(/(^|_)btl(_|$)/, '$1').replace(/_$/, '');
  base = base.replace(/_(ave_sta_corr|sta_corr|cruise_corr|corr)$/, '');
  base = base.replace(/_(1|2|ave)$/, '');
  base = base.replace(/_?rep(?:licate)?\d+$/, '');
  if (base === 'c14_mean') base = 'c14';

  let cleaned = cleanFieldName(base);
  cleaned = cleaned.replace(/\s+of\s*$/i, '').trim();
  let resolved = DISPLAY_NAME_FIXES[cleaned] || DISPLAY_NAME_FIXES[cleaned.toLowerCase()] || toTitleCase(cleaned);
  if (hasBottleMarker) resolved = 'Bottle ' + resolved;
  if (isReported) resolved = 'Reported ' + resolved;
  return resolved;
}
const displayLabel = v => fixDisplayName(v.display_name || v.name);
// Groups a station's depth-resolved variables by base name (rep1/rep2/mean/
// dark/ave all collapse to the same group, same base-stripping fixDisplayName()
// uses) and keeps exactly one representative per group — preferring the mean,
// then the plain reading, then the first replicate — dropping the rest.
// Used by both depthProfileCount() and depthProfileBlocks() so the toggle's
// count always matches what's actually rendered underneath it.
// Only literal numbered replicates (rep1, rep2, ...) are true duplicate
// samples of each other and collapse into one row (lowest-numbered wins).
// "mean" (a derived average) and "dark" (a different experimental
// condition — the control bottle, not a duplicate reading) are NOT
// replicates of anything and each keep their own row.
// Label for a depth-profile row. Can't reuse fixDisplayName() here — it
// deliberately collapses "c14_mean" and "c14_rep1" to the identical text
// "C14" (correct for merging duplicate sources in the variable browser),
// but dedupeDepthVars() above keeps mean/dark as separate rows from the
// collapsed rep group, so two rows would show the same label with no way
// to tell them apart. This keeps mean/dark/ave visible in the text, but
// drops the "(Replicate N)" tag for the rep-group row since that
// distinction no longer needs disambiguating once reps are collapsed.
function depthVarLabel(varName) {
  const raw = varName.toLowerCase();
  const isReported = /^r_/.test(raw);
  const hasBottleMarker = /(^|_)btl(_|$)/.test(raw);
  const stripped = raw.replace(/^r_/, '').replace(/(^|_)btl(_|$)/, '$1').replace(/_$/, '');
  const suffixMatch = stripped.match(/_(mean|dark|ave)$/);
  const SUFFIX_LABELS = { mean: 'Mean', dark: 'Dark', ave: 'Average' };
  const base = suffixMatch ? stripped.slice(0, -suffixMatch[0].length) : stripped.replace(/_rep\d+$/, '');
  const cleanedBase = cleanFieldName(base);
  let resolved = DISPLAY_NAME_FIXES[cleanedBase] || DISPLAY_NAME_FIXES[base] || toTitleCase(cleanedBase);
  if (suffixMatch) resolved += ` (${SUFFIX_LABELS[suffixMatch[1]]})`;
  if (hasBottleMarker) resolved = 'Bottle ' + resolved;
  if (isReported) resolved = 'Reported ' + resolved;
  return resolved;
}
function dedupeDepthVars(byVar) {
  const groups = {};
  Object.keys(byVar).forEach(varName => {
    const raw = varName.toLowerCase();
    const stripped = raw.replace(/^r_/, '').replace(/(^|_)btl(_|$)/, '$1').replace(/_$/, '');
    const repMatch = stripped.match(/_rep\d+$/);
    const groupKey = repMatch ? stripped.slice(0, -repMatch[0].length) + '_rep' : stripped;
    (groups[groupKey] ||= []).push(varName);
  });
  return Object.values(groups).map(variants => variants.slice().sort()[0]);
}
// For species/taxon variables, appends the scientific name (stored in the
// release DB's `name` field) as an italic parenthetical after the common
// name — matches Betty's original taxonDisplayLabel pattern. Skipped when
// there's no separate common name (the label already IS the scientific
// name, e.g. class-level entries like "Bacillariophyceae").
function taxonLabel(v) {
  if (v.variable_type !== 'taxon') return displayLabel(v);
  const sci = (v.name || '').trim();
  const MINOR_WORDS = new Set(['of', 'and', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'from', 'with']);
  const titleCaseCommonName = str => {
    let firstWord = true;
    return str.replace(/[A-Za-z']+/g, word => {
      const lower = word.toLowerCase();
      const isMinor = MINOR_WORDS.has(lower) && !firstWord;
      firstWord = false;
      return isMinor ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    });
  };
  let commonName = v.common_name ? titleCaseCommonName(v.common_name) : null;
  if (!commonName) {
    const fixed = DISPLAY_NAME_FIXES[sci.toLowerCase()];
    const m = fixed && fixed.match(/^(.*)\s\([^()]+\)$/);
    if (m) commonName = m[1];
  }
  if (commonName && sci && commonName.toLowerCase() !== sci.toLowerCase() && !sci.includes('(')) {
    return `${commonName} <i style="color:var(--muted);font-weight:400;">(${sci})</i>`;
  }
  // No usable common name — the raw scientific name IS the label. Use it
  // as-is (already correctly cased in the source, e.g. "Panulirus
  // interruptus") rather than title-casing it, which wrongly capitalizes
  // the species epithet into "Panulirus Interruptus". Single-word entries
  // (class-level names like "Bacillariophyceae") don't have this problem,
  // so they still go through the normal display pipeline.
  if (sci.includes(' ') && !sci.includes('(')) return `<i>${sci}</i>`;
  return displayLabel(v);
}
// Single source of truth for "what name shows for this variable" — checks
// PARAMETER_FAMILIES first (its member.label is hand-written and more
// accurate than the generic fixDisplayName fallback, e.g. "Dry Bulb
// Temperature" vs the raw "Dry Air Temp"), then falls back to taxonLabel.
// Used everywhere a variable's name is rendered — search dropdown, station
// accordion, banner, panel title — so a family relabel never applies in
// only one place.
function resolvedLabel(v) {
  const fm = familyMemberFor(v);
  return fm ? fm.member.label : taxonLabel(v);
}
// Sort/letter key: common_name if set, else the scientific name — read
// directly off the variable, NOT via displayLabel()/display_name. Those
// are baked in server-side at build time; common_name values patched in
// client-side afterward (as most of Ichthyoplankton/ZooDB/Phytoplankton's
// are) never get reflected back into display_name, so using it here
// silently sorts by scientific name for every taxon whose common name
// was added after the build — e.g. "Jewel Squids (Abralia)" landing next
// to "Abralia trigonura" under A instead of under J. Shared between the
// By Category browse panel and the search dropdown so both order the
// same way.
const sortNameFor = v => (v.variable_type === 'taxon' ? (v.common_name || v.name) : displayLabel(v)) || '';
// Plain-text variant for contexts that can't render HTML (input.value,
// textContent) — family labels are already plain text, so this only
// differs from resolvedLabel by skipping taxonLabel's italic sci-name span.
function resolvedPlainLabel(v) {
  const fm = familyMemberFor(v);
  return fm ? fm.member.label : displayLabel(v);
}
// Splits resolvedLabel(v)'s flowing "Common Name (Sci Name)" HTML into its
// two parts so callers can stack them on separate lines without parentheses
// (feedback 2026-08-22: match the refined mockup - name and italic sci name
// on their own lines, no parens, short accent rule below). Parses the
// already-resolved label rather than re-deriving name logic, so this can
// never drift from resolvedLabel/taxonLabel.
function speciesTitleParts(v) {
  const label = resolvedLabel(v);
  let m = label.match(/^(.*?)\s*<i[^>]*>\(([^)]+)\)<\/i>$/);
  if (m) return { main: m[1], sci: m[2] };
  m = label.match(/^<i[^>]*>([^<]+)<\/i>$/);
  if (m) return { main: null, sci: m[1] };
  return { main: label, sci: null };
}

// ---- variable de-duplication — one entry per real measurement, not per
// sensor/correction-stage/unit column. Rules (confirmed with Betty):
//  - sensor-pair readings (temperature_1/_2/_ave) -> same measurement, merge
//  - correction-stage readings (_corr/_sta_corr/_cruise_corr, "r_" pre-QC
//    prefix) -> QC stage isn't a different variable, merge
//  - same measurement in two units (oxygen_ml_l vs oxygen_umol_kg) -> merge
//  - bottle vs CTD sensor ("btl_" / "_btl") -> different collection method,
//    kept separate (handled by NOT stripping it below)
// Grouping is scoped per dataset_key, so bottle/CTD/DIC readings of the same
// measurement never merge across datasets either.
function canonicalBase(name) {
  let n = (name || '').toLowerCase();
  n = n.replace(/^r_/, '');
  n = n.replace(/_(ave_sta_corr|sta_corr|cruise_corr|corr)$/, '');
  n = n.replace(/_(1|2|ave)$/, '');
  n = n.replace(/_?rep(?:licate)?\d+$/, '');
  if (n === 'c14_mean') n = 'c14';
  if (n === 'oxygen_ml_l' || n === 'oxygen_umol_kg') n = 'oxygen';
  if (n === 'oxygen_btl_ml_l' || n === 'oxygen_btl_umol_kg') n = 'oxygen_btl';
  if (n === 'ammonium') n = 'ammonia';
  return n;
}
function canonicalKey(v) { return v.dataset_key + '::' + canonicalBase(v.display_name || v.name || ''); }
function repScore(v) {
  const n = (v.display_name || v.name || '').toLowerCase();
  let score = 0;
  if (n.startsWith('r_')) score += 10;
  if (/_(1|2)(_|$)/.test(n)) score += 5;
  if (/corr/.test(n) && !/ave/.test(n)) score += 2;
  if ((v.description || '').includes("QC'd")) score -= 3;
  if (n.includes('umol_kg')) score += 0.5;
  return score + n.length * 0.01;
}
// Deduplicated variable list — everything downstream (search, category
// counts, station accordion) browses this instead of raw VARS.
let CANON_VARS = [];
// Merging by label is only safe for the 3 hydro datasets verified above —
// species datasets have their own pre-existing issue where many distinct
// taxa/variable_ids legitimately share one generic display_name (e.g. 19
// different "Unidentified Albatross" rows), which this logic must not touch.
const MERGE_DATASETS = new Set(['calcofi_bottle', 'calcofi_ctd-cast', 'calcofi_dic']);
// These calcofi_ctd-cast "btl_*" nutrient readings have no CTD-sensor
// counterpart to compare against (unlike btl_temperature/salinity_btl/
// oxygen_btl_*, which sit alongside a genuine CTD sensor reading) — nutrients
// are only ever measured from the bottle sample, so these are pure
// duplicate cross-references of the calcofi_bottle values already shown
// under Nutrients & Chemistry, with no distinguishing data of their own.
const REMOVE_VARS = new Set([
  'calcofi_ctd-cast::btl_ammonium', 'calcofi_ctd-cast::btl_nitrate', 'calcofi_ctd-cast::btl_nitrite',
  'calcofi_ctd-cast::btl_phosphate', 'calcofi_ctd-cast::btl_silicate', 'calcofi_ctd-cast::btl_phaeopigment',
  'calcofi_ctd-cast::est_nitrate_sta_corr', 'calcofi_ctd-cast::est_nitrate_cruise_corr',
  'calcofi_ctd-cast::btl_depth',
  // Bottle-sample-collected-during-the-CTD-cast variants for Temperature/Salinity/Oxygen —
  // the family entries above now show just one CTD Cast card (the sensor reading), so these
  // would otherwise resurface as separate loose rows ("Bottle Temperature", etc.) duplicating it.
  'calcofi_ctd-cast::btl_temperature', 'calcofi_ctd-cast::salinity_btl',
  'calcofi_ctd-cast::oxygen_btl_ml_l', 'calcofi_ctd-cast::oxygen_btl_umol_kg',
  // Removed everywhere — Specific Volume Anomaly has a real source (SVA
  // column in the CTD cast files) but is still pending a decision on
  // whether to restore it as its own family member (see Potential Temp,
  // restored above, for the same fix pattern).
  'calcofi_ctd-cast::specific_volume_anomaly', 'calcofi_bottle::r_salinity_sva',
  'calcofi_mets::unknown_measurement_1', 'calcofi_mets::unknown_measurement_2',
  'calcofi_mets::tsg1_salinity_psu', 'calcofi_mets::tsg2_density', 'calcofi_mets::tsg2_salinity_psu',
  'calcofi_mets::tsg3_density', 'calcofi_mets::tsg3_salinity_psu', 'calcofi_mets::tsg5_salinity_psu',
  'calcofi_mets::tsg1_temp_c', 'calcofi_mets::tsg2_temp_c', 'calcofi_mets::tsg2b_temp_c',
  'calcofi_mets::tsg2_conductivity', 'calcofi_mets::tsg2_sound_velocity',
  'calcofi_mets::tsg3_temp_c', 'calcofi_mets::tsg3_conductivity', 'calcofi_mets::tsg3_sound_velocity',
  'calcofi_mets::tsg5_temp_c',
  'calcofi_mets::sss_psu',
  'calcofi_mets::sst_c',
  'calcofi_mets::pred_temp_c', 'calcofi_mets::pred_sst_c',
  'calcofi_mets::bottom_depth_mb_m',
  'swfsc_ichthyo;ucsd_sio_mesopelagic-fish::abundance',
]);
// ---- Euphausiid species stand-in: RETIRED ---------------------------------
// Until CalCOFI/workflows PR #72 shipped, the release carried Euphausiids as a
// single aggregate "Euphausiidae" row, and this file synthesized 37 species
// variables at load time from euphausiid_species_coverage.json — deliberately
// derived rather than hand-added to variables.json, which refresh.yml
// regenerates and would have silently reverted them.
//
// #72 has now landed: build_vars.sql emits all 37 species for real, with
// accepted WoRMS names. The synthesis has been removed, exactly the rollback
// its own comment prescribed. It was not merely redundant by then — it was
// wrong: the synthesized records did not match the real ones field-for-field,
// so the exact-duplicate collapse in buildCanonicalVars() could not merge them
// and the Euphausiids category listed 74 entries, 31 species twice over. The
// six the coverage file names under superseded synonyms (Nematoscelis →
// Hansarsia, Stylocheiron suhmi → suhmii) appeared as a phantom seventh-plus
// set of species that exist nowhere in the release.
//
// The coverage file itself stays: it is still the only per-(station, species)
// coverage for this dataset, and it feeds TAXON_STATIONS/TAXON_YEARS below.
// Only the variable synthesis is gone.
function buildCanonicalVars() {
  const merged = [], groups = {}, seenExact = new Set();
  // "measurement_type" columns (behavior, count, ...) mixed into an
  // otherwise species-level dataset aren't species — exclude them from the
  // browsable list the same way Betty's original isExcludedFromBrowse did.
  // Only applies to datasets that actually have taxon entries, so it never
  // touches a fully-measurement dataset like calcofi_bottle.
  // Real community-level measurements that belong alongside individual
  // taxa (matches Betty's original — e.g. "Zooplankton (All Genera &
  // Species)" was a real, intentional top entry under ZooDB, not excluded
  // junk). Kept apart from genuine per-observation attributes (behavior,
  // stage, body_length) and sampling-effort fields (prop_sorted,
  // std_haul_factor, volume_sampled), which really aren't independently
  // browsable things. Scoped to dataset::name pairs, not just name, so a
  // future field that happens to share one of these short names elsewhere
  // doesn't get swept in by accident.
  const KEEP_MEASUREMENT_TYPE = new Set([
    'swfsc_ichthyo::small_plankton_biomass', 'swfsc_ichthyo::total_plankton_biomass', 'swfsc_ichthyo::abundance',
    'calcofi_phytoplankton::phytoplankton_abundance',
    'cce-lter_zoodb::zooplankton_abundance', 'cce-lter_zoodb::zooplankton_abundance_areal', 'cce-lter_zoodb::zooplankton_biomass_carbon',
    'cce-lter_zooscan::zooscan_abundance', 'cce-lter_zooscan::zooscan_biomass_carbon',
    'cce-lter_zooscan::zooscan_carbon_individual', 'cce-lter_zooscan::zooscan_feret_diameter',
  ]);
  const taxonDatasets = new Set(VARS.filter(v => v.variable_type === 'taxon').map(v => v.dataset_key));
  VARS.forEach(v => {
    if (REMOVE_VARS.has(v.variable_id)) return;
    // The aggregate family row is superseded by the 37 real species the release
    // now publishes (see the retired stand-in above), so it is always hidden —
    // it is no longer conditional on a stand-in having loaded.
    if (v.variable_id === 'cce-lter_euphausiids::Euphausiidae') return;
    if (v.variable_type === 'measurement_type' && taxonDatasets.has(v.dataset_key) && !KEEP_MEASUREMENT_TYPE.has(v.dataset_key + '::' + v.display_name)) return;
    if (MERGE_DATASETS.has(v.dataset_key)) { (groups[canonicalKey(v)] ||= []).push(v); return; }
    // Collapse exact full-record duplicates — verified against the real
    // data: every duplicate-variable_id group except one is byte-identical
    // repeats (e.g. 19 identical "Unidentified Albatross" rows), safe to
    // collapse anywhere. The one exception (several genuinely different
    // species sharing dataset's generic "(species group)" catch-all
    // variable_id) is NOT touched, since their content actually differs.
    const key = JSON.stringify(v);
    if (seenExact.has(key)) return;
    seenExact.add(key);
    merged.push(v);
  });
  Object.values(groups).forEach(g => merged.push(g.slice().sort((a, b) => repScore(a) - repScore(b))[0]));
  CANON_VARS = merged;
}

let STATIONS = [], VARS = [];
const BY_KEY = {}, MARKERS = {}, DS_STATIONS = {};
const DECADES = {};
// Pooled-region geometry, for datasets whose samples were pooled across stations
// before being counted and so have no grid_key at all (see isRegionPooled). These
// mirror the station structures above one-for-one: REGION_BY_KEY ~ BY_KEY,
// REGION_LAYERS ~ MARKERS, DS_REGIONS ~ DS_STATIONS, REGION_TAXA ~ TAXON_STATIONS.
// All empty unless regions.json loaded.
let REGIONS = [];
const REGION_BY_KEY = {}, REGION_LAYERS = {}, DS_REGIONS = {};
const REGION_TAXA = {}, REGION_TAXA_YEARS = {}, REGION_DS_YEARS = {};
// "dataset_key::aphia_id" -> Set(grid_key) — per-taxon, per-dataset station
// coverage from the optional
// taxon_coverage.json (see load block below). Empty until/unless that file
// exists; every consumer below falls back to dataset-wide coverage when a
// given aphia_id has no entry here.
const TAXON_STATIONS = {};
// "grid_key::subset" -> coverage row (subset is 'calcofi_bottle_hydro' or
// 'calcofi_bottle_cast') from the optional bottle_cast_coverage.json — real
// per-subset date range/depth/year-month bars for the split Bottle/Cast
// accordion cards (see datasetAccordion), instead of both cards showing the
// same whole-dataset numbers. Empty until/unless that file exists; falls
// back to the shared coverage record when a station has no entry here.
const TAXON_YEARS = {};
// cruise_key -> {cruise_key, date_min, ship_name} from the optional
// cruises.json — the one-row-per-cruise side of the stations.json cruise
// lists, which carry bare cruise_key strings so that ~980 cruises are not
// re-serialized into every one of the ~76,000 (station, dataset, cruise)
// tuples (see cov_cruises in scripts/build_stations.sql). Empty until/unless
// that file exists; surveysExpandBlock() renders "—" for date/ship then.
const CRUISE_REF = {};
// "grid_key::subset" -> coverage row (subset is 'calcofi_bottle_hydro' or
// 'calcofi_bottle_cast') from the optional bottle_cast_coverage.json — real
// per-subset date range/depth/year-month bars for the split Bottle/Cast
// accordion cards (see datasetAccordion), instead of both cards showing the
// same whole-dataset numbers. Empty until/unless that file exists; falls
// back to the shared coverage record when a station has no entry here.
const BOTTLE_CAST_COV = {};
// True once bottle_cast_coverage.json has actually loaded (even if it's
// empty) — distinguishes "the file hasn't loaded, fall back to the shared
// whole-dataset record" from "the file loaded and this station genuinely
// has zero observations for this subset, show an honest empty state".
// Without this, an absent/404 file would look identical to a real zero.
let bottleCastCovLoaded = false;
const DEPTH_PROFILES = {};
// True once depth_profiles.json.gz has finished loading and reshaping (even if
// it was absent/empty). Distinguishes "still in flight, a Depth Profiles tab may
// yet appear" from "loaded, this station genuinely has no depth-resolved data" —
// same not-loaded-vs-real-zero distinction as bottleCastCovLoaded above.
let depthProfilesReady = false;
let selectedVar = null;
let compareMode = false;
let selectedGridKeys = new Set();
let lassoMode = false;
let lassoPoints = null;
let lastComparisonStations = [];
let lastComparisonCards = [];
let CARD_COMPARE_CTX = {};
let CARD_DL_CTX = {};
let cardDownloadCounter = 0;
let currentStation = null;
// Which panel tab ('overview' or 'depth') was last viewed — carried across
// clicking different stations, so comparing depth profiles station to
// station doesn't mean re-clicking the tab every time. Reset to 'overview'
// on clearAll() so returning to All Categories doesn't leave a stale
// "depth" preference active for whatever station gets opened next session.
let lastStationTab = 'overview';

// ---- load prebuilt data ----
// Fetches a gzip-compressed JSON file and decompresses it in the browser
// (DecompressionStream is built into every modern browser — no library
// needed). Used for depth_profiles.json, which got too big for GitHub
// uncompressed. Same tolerant not-ok/error -> [] fallback as every other
// optional data file here.
async function fetchGzJson(url) {
  const r = await fetch(url);
  if (!r.ok) return [];
  const ds = new DecompressionStream('gzip');
  const decompressed = r.body.pipeThrough(ds);
  const text = await new Response(decompressed).text();
  return JSON.parse(text);
}
// Case/whitespace-insensitive match for scientific names — the per-species
// coverage files (euphausiid/bird_mammal) and variables.json come from
// separate pipeline steps with no shared normalization guarantee, so an
// exact-string name key can miss on nothing more than casing or stray
// whitespace. Applied identically on write (population below) and read
// (stationsForVar) so it only ever loosens a match, never changes one that
// already worked.
// Superseded scientific names, normalized to the accepted name the release DB
// publishes. The coverage stand-ins were built from raw provider exports that
// predate the taxon-consolidation work, so two bird/mammal species reach us
// under their old names; variables.json (rebuilt from the release, where these
// resolve to accepted WoRMS/ITIS records) uses the new ones, and the name match
// silently found nothing for them. Folded into normTaxonName so it applies on
// both write and read — an accepted name maps to itself, so this can only fix a
// miss, never break a hit. Delete an entry once its coverage file is rebuilt.
const TAXON_NAME_SYNONYMS = {
  // Farallon bird/mammal census
  'lagenorhynchus obliquidens': 'sagmatias obliquidens',
  'arctocephalus townsendi':    'arctocephalus philippii townsendi',
  // Euphausiids — the genus Nematoscelis was split, and suhmi is a misspelling
  // of suhmii carried in the raw BTEDB export. Without these six the species
  // the release does publish show dataset-wide station counts instead of their
  // own, which is the bug this whole name-keyed index exists to avoid.
  'nematoscelis atlantica':   'hansarsia atlantica',
  'nematoscelis difficilis':  'hansarsia difficilis',
  'nematoscelis gracilis':    'hansarsia gracilis',
  'nematoscelis microps':     'hansarsia microps',
  'nematoscelis tenella':     'hansarsia tenella',
  'stylocheiron suhmi':       'stylocheiron suhmii',
};
const normTaxonName = s => {
  const n = (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return TAXON_NAME_SYNONYMS[n] || n;
};
// ---- data cache-busting ----------------------------------------------------
// index.html loads app.js and styles.css as `?v=NNN`, but the data files were
// fetched bare, and GitHub Pages serves them `max-age=600` with no way to set
// headers. So a returning visitor could pair a fresh app.js with a stations.json
// cached from before a dataset was renamed and get, say, a CSV named
// calcofi_bird_mammal_census long after the release stopped using that key.
// (Observed in the wild, 2026-08-04. DATASET_KEY_ALIASES is what kept the UI
// coherent through it, but the raw key still reached a filename.)
//
// So every data URL carries the release it was built from. refresh.yml writes
// version.json alongside the data whenever it regenerates from a release, which
// means the query string changes on its own the moment the release does — no
// hand-bumped counter to forget. version.json itself is fetched `no-cache` so
// it always revalidates; it's a few dozen bytes and usually answers 304.
//
// Degrades safely: no version.json (a preview, a fork, an old deploy) simply
// means unversioned URLs, i.e. exactly today's behavior.
let DATA_VERSION = null, DATA_BUILT = null;
async function loadDataVersion() {
  try {
    const r = await fetch('./data/version.json', { cache: 'no-cache' });
    if (r.ok) {
      const v = await r.json();
      DATA_VERSION = v.release || null;
      DATA_BUILT = v.built || null;
    }
  } catch (e) {
    console.warn('no data/version.json — data URLs will not be cache-busted', e);
  }
  showDataVersion();
  return DATA_VERSION;
}
// Name the release in the About box. Without this nothing on the page says
// which snapshot of the database is on screen, so a stale load is invisible to
// the person looking at it and to whoever they report it to.
function showDataVersion() {
  const el = document.getElementById('about-data-version');
  if (!el || !DATA_VERSION) return;
  const built = DATA_BUILT ? ` · rebuilt ${DATA_BUILT.slice(0, 10)}` : '';
  el.innerHTML = `Showing CalCOFI integrated release <strong>${DATA_VERSION}</strong>${built}.`;
  el.style.display = '';
}
// Keyed on the release AND the build timestamp, not the release alone. The data
// can change without the release changing — a bug fixed in a build script, a
// hand-committed correction, two refreshes inside one release — and on the
// release alone every one of those reuses the same query string, so a returning
// visitor keeps the cached bytes. Reproduced 2026-08-13: after
// build_vars.sql's fan-out fix, ./data/variables.json?v=v2026.08.11 served the
// old 2,087-row file while the deployed file had 1,673 rows, same URL.
// version.json's `built` is rewritten by refresh.yml on every rebuild, so this
// changes whenever the bytes do. Compacted to keep the URL readable; falls back
// to the release alone, then to no query string at all.
const dataUrl = name => {
  const stamp = [DATA_VERSION, DATA_BUILT && DATA_BUILT.replace(/[-:TZ]/g, '')]
    .filter(Boolean).join('.');
  return `./data/${name}` + (stamp ? `?v=${encodeURIComponent(stamp)}` : '');
};
// decades.json (per-station decade-means for the plankton datasets) is optional —
// tolerate its absence so the map still loads before the first refresh builds it.
loadDataVersion().then(() => Promise.all([
  fetch(dataUrl('stations.json')).then(r => r.json()),
  fetch(dataUrl('variables.json')).then(r => r.json()),
  fetch(dataUrl('decades.json')).then(r => r.ok ? r.json() : []).catch(() => []),
  // taxon_coverage.json: one row per (grid_key, aphia_id) — per-taxon station
  // coverage, separate from the per-dataset coverage baked into stations.json.
  // Optional and additive: when absent, station counts/highlighting fall back
  // to dataset-wide (today's behavior, e.g. every ZooDB taxon showing the
  // same "54 stations" regardless of how often that specific taxon was
  // actually recorded — see 2026-07 investigation). When present, per-taxon
  // numbers are used automatically — no other code change needed either way.
  // gzipped like depth_profiles: the per-year bins that make the slider work on
  // the taxon path tripled the raw file to 8.3 MB, but it compresses to 0.7 MB —
  // smaller than the 3.4 MB uncompressed file it replaces, so the slider fix
  // costs nothing and page weight drops. Same tolerant [] fallback (fetchGzJson
  // returns [] on a non-ok response), so an old deploy without the .gz simply
  // falls back to dataset-wide coverage.
  fetchGzJson(dataUrl('taxon_coverage.json.gz')).catch(() => []),
  // bottle_cast_coverage.json: one row per (grid_key, subset) — real
  // per-subset coverage for the split Hydrographic Bottle/Cast cards.
  // Optional/additive, same tolerant pattern as the rest.
  fetch(dataUrl('bottle_cast_coverage.json')).then(r => { bottleCastCovLoaded = r.ok; return r.ok ? r.json() : []; }).catch(() => []),
  // bathymetry.json: one row per (grid_key, bathymetry_depth_m) — seafloor
  // depth sampled from GEBCO 2025, the same source + method the CalCOFI/apps
  // ctd-viz app uses (bathymetry isn't in the release DB yet — tracked as
  // CalCOFI/workflows#54 — so this is the same app-side stopgap that app
  // already relies on, just precomputed once instead of sampled live).
  // Optional/additive: absent means depth-profile charts just don't draw a
  // seafloor line, same as before this existed.
  fetch(dataUrl('bathymetry.json')).then(r => r.ok ? r.json() : []).catch(() => []),
  // euphausiid_species_coverage.json / bird_mammal_species_coverage.json:
  // REMOVED 2026-08-13. Both were frozen, name-keyed stand-ins built by hand
  // from raw provider exports, with no script in this repo to regenerate them
  // (issue #3) — so they drifted: the bird/mammal file was still keyed to
  // `calcofi_bird_mammal_census`, the name this dataset had before it was
  // renamed to `farallon_bird-mammal` (the DATASET is very much still here — it
  // is the KEY that was superseded), and its species names predated the taxon
  // consolidation, which is what TAXON_NAME_SYNONYMS existed to paper over.
  // They are now redundant: taxon_coverage.json carries
  // dataset_key + per-year bins for these datasets, and every one of the 37
  // euphausiid variables and 124 of the 127 bird/mammal variables resolves
  // through the aphia_id path, with none left needing the name-keyed index.
  // Deleting them drops 1 MB of ungenerated data that could only go stale.
  // datasets_meta.json: dataset_key -> official name, "Open Dataset" link,
  // description, citation, licence and PI, straight from the release's
  // dataset.parquet (see #11 / scripts/build_datasets.sql). Optional and
  // additive, same tolerant pattern as the rest — absent just means every
  // officialNameFor/datasetUrlFor lookup falls through to the hardcoded maps.
  fetch(dataUrl('datasets_meta.json')).then(r => r.ok ? r.json() : []).catch(() => []),
  // regions.json: the pooled-region polygons a region-pooled dataset was
  // actually pooled over, with per-dataset and per-taxon coverage inside each
  // (scripts/build_regions.sql, release v2026.08.14+). Optional and additive
  // like the rest — absent means pooled datasets fall back to the map staying
  // neutral, which is what they did before this file existed.
  fetch(dataUrl('regions.json')).then(r => r.ok ? r.json() : []).catch(() => []),
  // cruises.json: one row per cruise (cruise_key, date_min, ship_name) — the
  // lookup side of the per-dataset cruise_key lists in stations.json (see
  // CRUISE_REF above). Optional and additive like the rest — absent just
  // means the surveys expand list shows "—" for each cruise's date/ship.
  fetch(dataUrl('cruises.json')).then(r => r.ok ? r.json() : []).catch(() => [])
])).then(([st, va, dm, tc, bc, bathy, dsMetaRows, rg, crz]) => {
  STATIONS = st; VARS = va;
  // Regions are indexed exactly like taxon_coverage: `dataset_key::aphia_id`,
  // because a pooled dataset's variables are taxa and variables.json keys them
  // by aphia_id. Keeping the two indexes the same shape is what lets
  // regionsForVar() mirror stationsForVar() instead of inventing a second
  // resolution order that could drift from it.
  REGIONS = rg || [];
  REGIONS.forEach(r => {
    REGION_BY_KEY[r.region_key] = r;
    (r.datasets || []).forEach(d => {
      (DS_REGIONS[d.dataset_key] ||= new Set()).add(r.region_key);
      if (d.years) (REGION_DS_YEARS[d.dataset_key] ||= {})[r.region_key] = d.years;
    });
    (r.taxa || []).forEach(t => {
      const k = t.dataset_key + '::' + t.aphia_id;
      (REGION_TAXA[k] ||= new Set()).add(r.region_key);
      if (t.years) (REGION_TAXA_YEARS[k] ||= {})[r.region_key] = t.years;
    });
  });
  // before anything renders — dsMeta()/officialNameFor()/datasetUrlFor() all read it
  (dsMetaRows || []).forEach(r => { DATASETS_META[r.dataset_key] = r; });
  (dm || []).forEach(r => { ((DECADES[r.dataset_key] ||= {})[r.station_id] ||= []).push(r); });
  // taxon_coverage.json rows are (dataset_key, grid_key, aphia_id, …, years).
  // `years` is the {y, n} list the year slider filters on; it is LEFT-JOINed in
  // the build, so a taxon whose observations all have a null datetime has none
  // and stays all-time — stationsForVarIsYearAware() reports that rather than
  // printing a year range next to an unfiltered count.
  (tc || []).forEach(r => {
    const k = r.dataset_key + '::' + r.aphia_id;
    (TAXON_STATIONS[k] ||= new Set()).add(r.grid_key);
    if (r.years) (TAXON_YEARS[k] ||= {})[r.grid_key] = r.years;
  });
  (bc || []).forEach(r => { BOTTLE_CAST_COV[r.grid_key + '::' + r.subset] = r; });
  (crz || []).forEach(r => { CRUISE_REF[r.cruise_key] = r; });
  const bathyByKey = {};
  (bathy || []).forEach(r => { bathyByKey[r.grid_key] = r.bathymetry_depth_m; });
  STATIONS.forEach(s => {
    BY_KEY[s.grid_key] = s;
    // > 0, not just != null: st45-ln60 carries a bathymetry_depth_m of 0, which
    // is a nodata sentinel from the GEBCO sampling rather than a real sounding
    // (a station in 0 m of water isn't a station). Treated as a depth it renders
    // "Seafloor (GEBCO) ≈ 0 m" and draws a seafloor line across the top of every
    // profile at that station. Falling through to "no bathymetry" is honest —
    // 104 of the 218 stations are already in that state (see issue #5).
    if (bathyByKey[s.grid_key] > 0) s.bathymetry_depth_m = bathyByKey[s.grid_key];
    (s.datasets || []).forEach(d => { (DS_STATIONS[d.dataset_key] ||= new Set()).add(s.grid_key); });
  });
  renderStations();
  // built once, added to the map only while a pooled variable is selected
  renderRegions();
  wireSearch();
  initYearSlider();
  initChartTooltip();
  map.on('mousedown', startLasso);
  map.on('mousemove', moveLasso);
  map.on('mouseup', endLasso);
  buildCanonicalVars();
  buildCategories();
  renderInventoryPanel();
  // Deferred, non-blocking (see below). The first-visit auto-tour waits on it
  // rather than firing immediately: its Depth Profiles step needs a station
  // that actually has depth data, and depthProfileCount() reads 0 for every
  // station until this lands — so an eager tour would silently skip that step.
  // Resolves to [] on absence/error, so the tour still runs if the file is gone.
  loadDepthProfiles().then(maybeAutoShowWalkthrough);
}).catch(e => console.error('load failed', e));

// depth_profiles.json.gz: one row per (dataset_key, station_id, variable_name,
// depth_m) — built server-side the same way decades.json is (see the
// build_depth_profiles.sql / build_decades.sql pattern). Shipped gzip-compressed
// since the raw file is far too big for GitHub — fetchGzJson decompresses it.
//
// Deliberately NOT part of the Promise.all above. It is 4.5 MB on the wire but
// decompresses to ~76 MB / ~614k rows, and both the JSON.parse and the reshape
// loop below run on the main thread — putting it in the gating load meant the
// map rendered nothing at all until it finished (multi-second freeze on desktop,
// a plausible OOM on mobile). Nothing on first paint needs it: only the station
// panel's Depth Profiles tab does, and that can't be opened until a station is
// clicked. So it's kicked off right after first paint and lands in the
// background — in practice well before anyone clicks a station.
//
// Idempotent + promise-cached so openStation() can await it directly without
// worrying about ordering or double-fetching.
let depthProfilesPromise = null;
function loadDepthProfiles() {
  if (depthProfilesPromise) return depthProfilesPromise;
  depthProfilesPromise = fetchGzJson(dataUrl('depth_profiles.json.gz'))
    .catch(() => [])
    .then(dp => {
      (dp || []).forEach(r => {
        const byStation = (DEPTH_PROFILES[r.dataset_key] ||= {});
        const byVar = (byStation[r.station_id] ||= {});
        (byVar[r.variable_name] ||= []).push({ depth_m: r.depth_m, value: r.value });
      });
      depthProfilesReady = true;
      // A station opened while this was still in flight rendered without its
      // Depth Profiles tab (depthProfileCount() saw an empty DEPTH_PROFILES).
      // Re-render that one station so the tab appears rather than staying
      // silently missing until the next click.
      if (currentStation) openStation(currentStation);
      return DEPTH_PROFILES;
    });
  return depthProfilesPromise;
}

// ---- year-range filter -------------------------------------------------------
// Filter the map to stations with coverage in a [minYear, maxYear] window, using
// the per-dataset `years` bins already in stations.json (no live query). Null =
// full range. `applyStyles()` is the single source of truth for marker styling
// (combines the year window with any selected variable).
let yearRange = null, G_MIN = null, G_MAX = null;

function datasetInRange(d) {
  if (!yearRange) return true;
  const [a, b] = yearRange;
  if (d.years && d.years.length) return d.years.some(o => o.y >= a && o.y <= b);
  const y0 = d.time_min ? +String(d.time_min).slice(0, 4) : null;
  const y1 = d.time_max ? +String(d.time_max).slice(0, 4) : y0;
  return y0 == null || (y1 >= a && y0 <= b);
}
const activeDatasets = s => (s.datasets || []).filter(datasetInRange);

// Returns the Set of grid_keys where variable `v` actually has data —
// prefers the optional per-taxon taxon_coverage.json (indexed by
// dataset_key + aphia_id — a taxon can be independently recorded by more
// than one collection program, e.g. Salpida in both ZooDB and ZooScan, so
// scoping per-dataset keeps each dataset's own count accurate instead of
// silently combining them under whichever one's label happens to be showing)
// when an entry exists for this variable, falling back to whole-dataset
// coverage otherwise (today's only behavior, before that file exists —
// e.g. every ZooDB taxon showing the same station count regardless of how
// often that specific taxon was actually recorded; see 2026-07
// investigation). Single source of truth so the map highlight, the search
// banner count, and the variable panel's "Collected at N stations" line
// can't drift out of sync with each other.
// NOTE: the taxon-level path does not currently respect the year-range
// slider — taxon_coverage.json has no per-year breakdown yet, unlike the
// dataset-wide path via activeDatasets(). Add year bins to that file's
// build if year-filtered taxon counts are needed later.
function taxonStationsInRange(stationSet, yearsByStation) {
  if (!yearRange || !yearsByStation) return stationSet;
  const [a, b] = yearRange;
  return new Set([...stationSet].filter(gk => {
    const years = yearsByStation[gk];
    return years && years.some(o => o.y >= a && o.y <= b);
  }));
}
// Returns the Set of grid_keys where variable `v` actually has data —
// prefers the optional per-taxon taxon_coverage.json (indexed by
// dataset_key + aphia_id — a taxon can be independently recorded by more
// than one collection program, e.g. Salpida in both ZooDB and ZooScan, so
// scoping per-dataset keeps each dataset's own count accurate instead of
// silently combining them under whichever one's label happens to be showing)
// when an entry exists for this variable, falling back to whole-dataset
// coverage otherwise (today's only behavior, before that file exists —
// e.g. every ZooDB taxon showing the same station count regardless of how
// often that specific taxon was actually recorded; see 2026-07
// investigation). Single source of truth so the map highlight, the search
// banner count, and the variable panel's "Collected at N stations" line
// can't drift out of sync with each other.
// NOTE: the taxon-level path does not currently respect the year-range
// slider — taxon_coverage.json has no per-year breakdown yet, unlike the
// dataset-wide path via activeDatasets(). Add year bins to that file's
// build if year-filtered taxon counts are needed later.
// Resolves a taxon variable to its TAXON_STATIONS/TAXON_YEARS key, trying the
// variable's own dataset_key first and falling back to its old/new alias
// (DATASET_KEY_ALIASES, defined below) when the coverage files filed it under
// the other spelling — e.g. taxon_coverage.json's bird/mammal rows are keyed
// 'farallon_bird-mammal' while variables.json still labels those variables
// 'calcofi_bird_mammal_census'. Without the alias fallback, per-species
// coverage for bird/mammal and mesopelagic-fish taxa silently undercounts
// (feedback 2026-08-21/nvpatin: "Striped Dolphin" showed 1 station instead
// of the real 4). Returns null when there's no per-species data at all.
function taxonLookupKey(v) {
  const alias = typeof DATASET_KEY_ALIASES !== 'undefined' ? DATASET_KEY_ALIASES[v.dataset_key] : null;
  if (v.aphia_id) {
    const key = v.dataset_key + '::' + v.aphia_id;
    if (TAXON_STATIONS[key]) return key;
    if (alias) { const ak = alias + '::' + v.aphia_id; if (TAXON_STATIONS[ak]) return ak; }
  }
  const nameKey = v.dataset_key + '::name::' + normTaxonName(v.name);
  if (TAXON_STATIONS[nameKey]) return nameKey;
  if (alias) { const ank = alias + '::name::' + normTaxonName(v.name); if (TAXON_STATIONS[ank]) return ank; }
  return null;
}
function stationsForVar(v) {
  const key = taxonLookupKey(v);
  if (key) return taxonStationsInRange(TAXON_STATIONS[key], TAXON_YEARS[key]);
  // Same old/new dataset-key mismatch as taxonLookupKey() — the whole-dataset
  // fallback below must check the alias too, or a taxon whose per-species
  // entry is missing (TAXON_STATIONS has nothing for it at all) silently
  // undercounts to 0 for bird/mammal and mesopelagic-fish variables, since
  // variables.json and stations.json don't always agree on which spelling
  // they use (confirmed 2026-08-22: "Striped Dolphin" showed 0 instead of
  // falling back to the real ~100-station dataset-wide count).
  const alias = typeof DATASET_KEY_ALIASES !== 'undefined' ? DATASET_KEY_ALIASES[v.dataset_key] : null;
  const keys = alias ? [v.dataset_key, alias] : [v.dataset_key];
  return new Set(STATIONS.filter(s => activeDatasets(s).some(d => keys.includes(d.dataset_key))).map(s => s.grid_key));
}
// Whether the count stationsForVar() returns for `v` actually honors the year
// slider. False on the per-taxon path (taxon_coverage.json has no year bins —
// see the NOTE above), which is 895 of the 1909 catalogued variables. Callers
// must not assert a year range next to a number this returns false for: the
// banner used to read "N stations … in 1950–1980" with an all-time N, which
// reads as a filtered count and isn't one.
function stationsForVarIsYearAware(v) {
  const key = taxonLookupKey(v);
  return key ? !!TAXON_YEARS[key] : true;
}
// ---- pooled regions ----
// The region equivalents of stationsForVar()/stationsForVarIsYearAware(), and
// deliberately the same shape: per-taxon coverage first (by aphia_id), then
// whole-dataset. A pooled dataset has no grid_key, so these are the only
// coverage it can express — see isRegionPooled() and CalCOFI/workflows#76.
//
// Unlike taxon_coverage.json, regions.json DOES carry year bins — but they come
// from the cruise reference, not from the observations, which carry no datetime
// at all (the grain is cruise x region). Roughly 40% of phytoplankton rows fall
// in months with more than one cruise and so resolve no cruise and no year;
// regionsForVarIsYearAware() reports that, and callers must not print a year
// range beside a count it returns false for.
function regionsInRange(regionSet, yearsByRegion) {
  if (!yearRange || !yearsByRegion) return regionSet;
  const [a, b] = yearRange;
  return new Set([...regionSet].filter(rk => {
    const years = yearsByRegion[rk];
    return years && years.some(o => o.y >= a && o.y <= b);
  }));
}
function regionsForVar(v) {
  if (!v) return new Set();
  if (v.aphia_id) {
    const key = v.dataset_key + '::' + v.aphia_id;
    if (REGION_TAXA[key]) return regionsInRange(REGION_TAXA[key], REGION_TAXA_YEARS[key]);
  }
  return regionsInRange(DS_REGIONS[v.dataset_key] || new Set(),
                        REGION_DS_YEARS[v.dataset_key]);
}
function regionsForVarIsYearAware(v) {
  if (!v) return false;
  if (v.aphia_id && REGION_TAXA[v.dataset_key + '::' + v.aphia_id])
    return !!REGION_TAXA_YEARS[v.dataset_key + '::' + v.aphia_id];
  return !!REGION_DS_YEARS[v.dataset_key];
}
// Observations that carry no resolvable year, for the selected variable. Shown
// beside the count so a year-filtered number never silently stands for the whole
// dataset — the same trap stationsForVarIsYearAware() exists to close.
function regionUndatedObs(v) {
  if (!v) return 0;
  let n = 0;
  REGIONS.forEach(r => {
    if (v.aphia_id) {
      const t = (r.taxa || []).find(x => x.dataset_key === v.dataset_key &&
                                         x.aphia_id === String(v.aphia_id));
      if (t) { n += t.n_obs_undated || 0; return; }
    }
    const d = (r.datasets || []).find(x => x.dataset_key === v.dataset_key);
    if (d) n += d.n_obs_undated || 0;
  });
  return n;
}
// Polygons are created once and left off the map. A pooled dataset is 1 of 16,
// so showing four large polygons over the station grid at all times would be
// noise for every other selection; they are added only while a pooled variable
// is selected (see applyStyles).
function renderRegions() {
  REGIONS.forEach(r => {
    if (!r.geometry) return;
    const layer = L.geoJSON(r.geometry, {
      style: { color: '#ffd84d', weight: 2, fillColor: '#ffd84d',
               fillOpacity: 0.18, opacity: 0.9 }
    });
    layer.bindTooltip(
      `${r.region_key} — ${r.description}<br>${r.n_stations} pooled stations · ` +
      `${(r.area_km2 || 0).toLocaleString()} km²`,
      { direction: 'top', sticky: true });
    REGION_LAYERS[r.region_key] = layer;
  });
}
const DATASET_SPAN_IS_AGGREGATE = new Set(['calcofi_mets']);

function applyStyles() {
  // A region-pooled selection has no station to highlight, and dimming all 218
  // markers would assert "none of these stations have it" — which is not what the
  // data says. It was never resolved to stations at all. The markers therefore
  // stay neutral, and the pooled regions are drawn instead: since v2026.08.14 the
  // release carries their real geometry, so the map can show the water the
  // dataset was actually pooled over rather than nothing at all
  // (CalCOFI/workflows#76). Falls back to the old neutral-map behaviour when
  // regions.json is absent.
  const pooledSelection = selectedVar && isRegionPooled(selectedVar.dataset_key);
  const highlighting = selectedVar && !pooledSelection;
  const selSet = highlighting ? stationsForVar(selectedVar) : null;
  const selRegions = pooledSelection ? regionsForVar(selectedVar) : null;
  REGIONS.forEach(r => {
    const layer = REGION_LAYERS[r.region_key]; if (!layer) return;
    const on = selRegions && selRegions.has(r.region_key);
    if (selRegions) {
      // A region with no data in the selected year window is dimmed rather than
      // removed, so the four regions stay legible as a set and the empty one
      // reads as "nothing here in this window" instead of vanishing.
      layer.setStyle(on
        ? { color: '#fff3bf', weight: 2, fillColor: '#ffd84d', fillOpacity: 0.28, opacity: 1 }
        : { color: '#5a626b', weight: 1, fillColor: '#3a3f44', fillOpacity: 0.10, opacity: 0.35 });
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
  STATIONS.forEach(s => {
    const mk = MARKERS[s.grid_key]; if (!mk) return;
    const active = activeDatasets(s), nd = active.length;
    if (highlighting) {
      const on = selSet.has(s.grid_key);
      mk.setStyle(on
        ? { ...baseStyle(s), color: '#fff3bf', weight: 2, fillColor: '#ffd84d', fillOpacity: 0.95, opacity: 1 }
        : baseStyle(s, true));
    } else {
      // Marker size always reflects the station's full dataset coverage, so
      // it never shrinks or jumps as the year slider moves. Whether the
      // station has ANY data in the selected year window is a yes/no
      // question, not a "what fraction" one — so it's shown as a simple
      // two-state dim/normal switch (same treatment as "no data at all"),
      // not a continuous shade gradient that has to be interpreted.
      mk.setStyle(baseStyle(s, nd === 0));
    }
    // Every pinned station gets a gold ring, persistently (not just on
    // click) — that's what actually lets you spot your comparison set
    // while browsing other stations, not just the one you clicked.
    if (PINNED_CARDS.some(p => p.grid_key === s.grid_key)) {
      mk.setStyle({ color: '#ffd43b', weight: 3 });
      mk.bringToFront();
    }
    if (!compareMode && currentStation && s.grid_key === currentStation.grid_key) {
      mk.setStyle({ color: '#ffffff', weight: 3 });
      mk.bringToFront();
    }
    if (selectedGridKeys.has(s.grid_key)) {
      mk.setStyle({ color: '#00e5ff', weight: 3 });
      mk.bringToFront();
    }
  });
}

// Compare mode is now entered/exited by switching the panel's Compare tab
// in/out of view (see wirePanelTabs below) rather than a standalone toggle
// button — split into enter/exit instead of one toggle so both the tab
// click handler and the bar's own "✕ Exit" button can call the right one
// directly (feedback 2026-08-22: Compare Stations moved into a panel tab).
function enterCompareMode() {
  if (compareMode) return;
  compareMode = true;
  updateCompareBar();
  applyStyles();
}
function exitCompareMode() {
  if (!compareMode) return;
  compareMode = false;
  selectedGridKeys.clear();
  updateCompareBar();
  if (lassoMode) toggleLassoMode();
  applyStyles();
}
// The bar's own "✕ Exit compare mode" button — unlike switching to
// Overview/Depth Profiles directly, there's no other tab click to piggyback
// on, so this exits compare mode and simulates clicking back to Overview.
function exitCompareModeAndReturnToOverview() {
  exitCompareMode();
  const overviewBtn = document.querySelector('#panel-content .panel-tab[data-tab="overview"]');
  if (overviewBtn) overviewBtn.click();
}
function toggleLassoMode() {
  lassoMode = !lassoMode;
  document.getElementById('lasso-select-btn').classList.toggle('active', lassoMode);
  document.getElementById('lasso-select-label').textContent = lassoMode ? '✕ Stop Lasso Select' : '✏️ Lasso Select';
  document.getElementById('lasso-svg').style.display = lassoMode ? 'block' : 'none';
  map.dragging[lassoMode ? 'disable' : 'enable']();
  if (!lassoMode) { lassoPoints = null; document.getElementById('lasso-polygon').setAttribute('points', ''); }
}
function startLasso(e) {
  if (!lassoMode) return;
  const t = e.originalEvent && e.originalEvent.target;
  if (t && t.tagName && /path|circle/i.test(t.tagName)) return;
  lassoPoints = [e.containerPoint];
  updateLassoPolygon();
}
function updateLassoPolygon() {
  document.getElementById('lasso-polygon').setAttribute('points',
    lassoPoints.map(p => `${p.x},${p.y}`).join(' '));
}
function moveLasso(e) {
  if (!lassoPoints) return;
  const last = lassoPoints[lassoPoints.length - 1];
  if (Math.hypot(e.containerPoint.x - last.x, e.containerPoint.y - last.y) < 2) return;
  lassoPoints.push(e.containerPoint);
  updateLassoPolygon();
}
function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const hit = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}
function endLasso(e) {
  if (!lassoPoints) return;
  if (lassoPoints.length > 2) {
    STATIONS.forEach(s => {
      if (!s.n_datasets) return;
      const mk = MARKERS[s.grid_key];
      const center = map.latLngToContainerPoint([s.lat, s.lon]);
      if (pointInPolygon(center, lassoPoints)) { selectedGridKeys.add(s.grid_key); return; }
      const r = (mk && mk.getRadius && mk.getRadius()) || 4;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * 2 * Math.PI;
        const p = { x: center.x + r * Math.cos(ang), y: center.y + r * Math.sin(ang) };
        if (pointInPolygon(p, lassoPoints)) { selectedGridKeys.add(s.grid_key); return; }
      }
    });
  }
  lassoPoints = null;
  document.getElementById('lasso-polygon').setAttribute('points', '');
  updateCompareBar();
  applyStyles();
}
// CalCOFI lines are fractional (60.0, 63.3, 66.7, 70.0, …), so match on the
// value within half a line-unit rather than on Math.floor(): flooring happens
// to work on today's 24 lines only because no two of them share an integer
// part, and it silently starts selecting the wrong line the day one does. The
// 0.5 tolerance is what lets "83" find line 83.3, which is how people refer to
// it out loud.
const LINE_MATCH_TOL = 0.5;
function selectByLine() {
  const input = document.getElementById('line-select-input');
  const target = parseFloat(input.value);
  if (isNaN(target)) return;
  let matched = 0;
  STATIONS.forEach(s => {
    if (s.n_datasets && s.line != null && Math.abs(s.line - target) <= LINE_MATCH_TOL) { selectedGridKeys.add(s.grid_key); matched++; }
  });
  input.value = '';
  updateCompareBar();
  applyStyles();
  if (!matched) alert(`No stations with data found on line ${target}.`);
}
function toggleStationSelection(gridKey) {
  const s = BY_KEY[gridKey];
  if (!s || !s.n_datasets) return;
  if (selectedGridKeys.has(gridKey)) selectedGridKeys.delete(gridKey);
  else selectedGridKeys.add(gridKey);
  updateCompareBar();
  applyStyles();
}
function clearCompareSelection() {
  selectedGridKeys.clear();
  updateCompareBar();
  applyStyles();
}
function updateCompareBar() {
  // Guarded: clearAll() wipes #panel-content — which is where the Compare
  // tab's markup, and #compare-count/#compare-generate-btn along with it,
  // now live — before calling exitCompareMode(), so this can run after
  // those elements are already gone. Not an issue before the Compare tab
  // moved off the map overlay, since that markup used to be static in
  // index.html rather than injected per-station. Found and fixed while
  // testing this port (2026-08-22).
  const countEl = document.getElementById('compare-count');
  const genBtn = document.getElementById('compare-generate-btn');
  if (!countEl || !genBtn) return;
  const n = selectedGridKeys.size;
  countEl.textContent = `${n} Selected`;
  genBtn.disabled = n < 2;
}
function averageHistograms(lists, keyField) {
  const sums = {}, count = lists.length;
  lists.forEach(list => (list || []).forEach(o => { sums[o[keyField]] = (sums[o[keyField]] || 0) + o.n; }));
  return Object.keys(sums).map(k => ({ [keyField]: keyField === 'y' ? +k : +k, n: Math.round((sums[k] / count) * 10) / 10 }))
    .sort((a, b) => a[keyField] - b[keyField]);
}
function generateComparisonCards() {
  const stations = [...selectedGridKeys].map(k => BY_KEY[k]).filter(Boolean);
  if (stations.length < 2) return;
  const byDataset = {};
  stations.forEach(s => (s.datasets || []).forEach(d => (byDataset[d.dataset_key] ||= []).push({ station: s, d })));
  const comparisonCards = [];
  const cardsHtml = Object.keys(byDataset).sort().map(dk => {
    const entries = byDataset[dk], meta = dsMeta(dk), n = entries.length;
    const ds = entries.map(e => e.d);
    const contributingStations = entries.map(e => e.station);
    const depthMins = ds.map(d => d.depth_min).filter(v => v != null);
    const depthMaxs = ds.map(d => d.depth_max).filter(v => v != null);
    const avgD = {
      dataset_key: dk,
      realm: ds[0].realm,
      time_min: ds.reduce((m, d) => (d.time_min && (!m || d.time_min < m)) ? d.time_min : m, null),
      time_max: ds.reduce((m, d) => (d.time_max && (!m || d.time_max > m)) ? d.time_max : m, null),
      depth_min: depthMins.length ? Math.min(...depthMins) : null,
      depth_max: depthMaxs.length ? Math.max(...depthMaxs) : null,
      n_obs: Math.round(ds.reduce((s, d) => s + (d.n_obs || 0), 0) / n),
      n_surveys: Math.round(ds.reduce((s, d) => s + (d.n_surveys || 0), 0) / n),
      years: averageHistograms(ds.map(d => d.years), 'y'),
      months: averageHistograms(ds.map(d => d.months), 'm')
    };
    comparisonCards.push({ d: avgD, label: meta.label, color: meta.color, n, total: stations.length, entries, vars: CANON_VARS.filter(cv => cv.dataset_key === dk) });
    const stationsListHtml = contributingStations
      .slice()
      .sort((a, b) => a.station_id.localeCompare(b.station_id))
      .map(s => `<span>${s.station_id}</span><span>${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</span>`)
      .join('');
    return `<div class="avg-card-note">Averaged across ${n} of ${stations.length} selected stations that have ${meta.label} data
      <details class="params-toggle avg-stations-toggle">
        <summary class="params-toggle-summary">Show ${n} station${n === 1 ? '' : 's'}</summary>
        <div class="avg-stations-list">${stationsListHtml}</div>
      </details></div>
      ${datasetCard(avgD, { large: true, label: meta.label, color: meta.color, compareContext: contributingStations, compareEntries: entries })}`;
  }).join('');
  lastComparisonCards = comparisonCards;
  document.getElementById('modal-title').textContent = `Averaged Coverage — ${stations.length} stations selected`;
  document.getElementById('modal-body').innerHTML = cardsHtml || '<div class="cov-empty">No datasets in common.</div>';
  document.getElementById('modal-footer').style.display = 'none';
  document.getElementById('modal').classList.add('modal-large');
  document.getElementById('modal-backdrop').classList.add('open');
  lastComparisonStations = stations;
}

// ---- PNG card export (drawn natively on <canvas>, not a DOM screenshot —
// html2canvas 1.4.1 throws on this page's CSS color-mix() usage and aborts
// the whole capture; see mixHex above for the same problem on the PDF
// side. Canvas text is also crisp at any export scale, unlike a rasterized
// screenshot scaled up.) Square-ish layout with the station/coords baked
// in as a header, since this image stands alone once downloaded — the
// on-screen card relies on the panel above it for that context.
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
// Year value labels are always drawn rotated straight up (90°), one row of
// bars, rather than switching between horizontal (wide bars) and rotated
// (narrow bars) — a consistent look beats a chart that changes style
// mid-way depending on how many years are in the data.
function yearBarLayout(d, innerW) {
  if (!(d.years && d.years.length)) return null;
  const y0 = d.years[0].y, y1 = d.years[d.years.length - 1].y;
  const n = y1 - y0 + 1, gap = 2;
  const barW = Math.max(1, (innerW - (n - 1) * gap) / n);
  return { y0, y1, n, gap, barW };
}
function drawCoverageCardCanvas(ctx, d, label, color, opts) {
  const W = opts.width;
  const padX = 20, padY = 20;
  const bg = mixHex(color, 6, '#0f1e35');
  const hasYears = d.years && d.years.length;
  const innerWForLayout = W - (padX + 20) * 2;
  const layout = yearBarLayout(d, innerWForLayout);
  const barsAreaH = hasYears ? 155 : 40;
  const monthAreaH = 60;
  let y = 0;

  // White outer background — the title/coords below sit directly on this,
  // so they're dark text here instead of the light-on-dark colors used
  // everywhere else in the card itself.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, opts.height);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#141a24';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(opts.title, padX, padY + 22);
  ctx.fillStyle = '#4a5568';
  ctx.font = '14px monospace';
  ctx.fillText(opts.subtitle, padX, padY + 44);
  y = padY + 66;

  const cardTop = y, cardH = opts.height - cardTop - padY;
  roundRectPath(ctx, padX, cardTop, W - padX * 2, cardH, 10);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(padX, cardTop, 4, cardH);

  let cy = cardTop + 22;
  const innerX = padX + 20, innerW = W - padX * 2 - 40;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(innerX + 4, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e6e9ed';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillText(label, innerX + 18, cy);
  const realm = d.realm || 'env';
  const isBio = realm === 'bio';
  const badgeFillHex = isBio ? '#69db7c' : '#4dabf7';
  const badgeTextHex = isBio ? '#8ce99a' : '#74c0fc';
  const badgeText = realm.toUpperCase();
  ctx.font = 'bold 11px Arial, sans-serif';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgeW = badgeTextW + 18, badgeH = 20;
  const badgeX = innerX + innerW - badgeW;
  roundRectPath(ctx, badgeX, cy - 15, badgeW, badgeH, 10);
  ctx.fillStyle = mixHex(badgeFillHex, isBio ? 16 : 18, bg);
  ctx.fill();
  ctx.fillStyle = badgeTextHex;
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, cy);
  ctx.textAlign = 'left';
  cy += 30;

  const depth = (d.depth_min != null || d.depth_max != null)
    ? `${Math.round(d.depth_min ?? 0)}\u2013${Math.round(d.depth_max ?? 0)} m` : 'depth n/a';
  const statRows = [
    ['DATE RANGE', `${day(d.time_min)} \u2192 ${day(d.time_max)}`],
    ['DEPTH RANGE', depth],
    ['COVERAGE', `${num(d.n_surveys)} surveys \u00b7 ${num(d.n_obs)} obs`],
  ];
  statRows.forEach(([lbl, val]) => {
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = '#9aa0a6';
    ctx.fillText(lbl, innerX, cy);
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#e6e9ed';
    ctx.textAlign = 'right';
    ctx.fillText(val, innerX + innerW, cy);
    ctx.textAlign = 'left';
    cy += 24;
  });
  cy += 14;

  ctx.font = '11px Arial, sans-serif';
  ctx.fillStyle = '#9aa0a6';
  ctx.fillText('OBSERVATIONS BY YEAR', innerX, cy);
  cy += 18;
  if (hasYears) {
    const { y0, y1, n, gap, barW } = layout;
    const byYear = {};
    d.years.forEach(o => byYear[o.y] = o.n);
    const max = Math.max(...d.years.map(o => o.n));
    const baseline = cy + barsAreaH - 20;
    for (let i = 0; i < n; i++) {
      const yr = y0 + i, cnt = byYear[yr] || 0;
      const h = cnt ? (6 + (barsAreaH - 34) * cnt / max) : 2;
      const bx = innerX + i * (barW + gap);
      ctx.fillStyle = mixHex(color, cnt ? 85 : 13, bg);
      ctx.fillRect(bx, baseline - h, barW, h);
      if (cnt > 0) {
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.save();
        ctx.translate(bx + barW / 2, baseline - h - 4);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#c8cdd2';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(cnt), 2, 0);
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
      }
    }
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#9aa0a6';
    ctx.fillText(String(y0), innerX, baseline + 16);
    ctx.textAlign = 'right';
    ctx.fillText(String(y1), innerX + innerW, baseline + 16);
    ctx.textAlign = 'left';
    cy += barsAreaH;
  } else {
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = '#6c757d';
    ctx.fillText('no dates', innerX, cy + 10);
    cy += barsAreaH;
  }
  cy += 20;

  ctx.font = '11px Arial, sans-serif';
  ctx.fillStyle = '#9aa0a6';
  ctx.fillText('SEASONALITY (BY MONTH)', innerX, cy);
  cy += 26;
  const byMonth = {};
  (d.months || []).forEach(o => byMonth[o.m] = o.n);
  const maxM = Math.max(1, ...Object.values(byMonth));
  const mGap = 4, mBarW = (innerW - 11 * mGap) / 12;
  for (let i = 0; i < 12; i++) {
    const cnt = byMonth[i + 1] || 0;
    const op = 13 + 87 * cnt / maxM;
    const cellX = innerX + i * (mBarW + mGap);
    if (cnt > 0) {
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.fillStyle = '#c8cdd2';
      ctx.textAlign = 'center';
      ctx.fillText(String(cnt), cellX + mBarW / 2, cy - 6);
      ctx.textAlign = 'left';
    }
    roundRectPath(ctx, cellX, cy, mBarW, monthAreaH - 20, 3);
    ctx.fillStyle = mixHex(color, op, bg);
    ctx.fill();
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillStyle = '#0b0c0e';
    ctx.textAlign = 'center';
    ctx.fillText(MONTHS[i], cellX + mBarW / 2, cy + (monthAreaH - 20) / 2 + 4);
    ctx.textAlign = 'left';
  }
}
function measureCoverageCardHeight(d, width) {
  const hasYears = d.years && d.years.length;
  const barsAreaH = hasYears ? 155 : 40;
  // padY appears twice: once for the title block's own top offset
  // (cardTop = padY + 66 in drawCoverageCardCanvas), once as the bottom
  // margin reserved below the card's last content row (month pills) so
  // that row doesn't spill past the card's rounded-rect bottom edge.
  const padY = 20;
  return padY + 66 + 22 + 30 + 3 * 24 + 14 + 18 + barsAreaH + 20 + 26 + 40 + padY;
}
async function renderCoverageCardPNGBlob(d, label, color, title, subtitle) {
  const scale = 4; // export resolution multiplier — bumped from 2 since 2x still looked soft zoomed in
  const W = 640;
  const H = measureCoverageCardHeight(d, W);
  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawCoverageCardCanvas(ctx, d, label, color, { width: W, height: H, title, subtitle });
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvText(header, rows) {
  return '\uFEFF' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}
function saveCSV(filename, header, rows) {
  const blob = new Blob([csvText(header, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
// Long-format export of everything the coverage card itself shows — date
// range, depth range, surveys/obs counts, the year bars, the month bars —
// straight from the pre-built card numbers. Companion to the PDF/PNG
// download; NOT the same thing as the separate "Download CSV" button,
// which queries real per-observation values live instead.
// Wide format — one row per (station, dataset), with every year and every
// month as its own column — reads naturally in a spreadsheet, unlike a
// stacked long/tidy table where each year is its own row.
// Scalar stats (date range, depth, surveys, obs) are dropped from this
// export entirely — they're already visible directly on the card PNG
// itself, so duplicating them in a companion file is just noise. Left
// long-format (one row per year/month), which is the natural shape for
// charting a time series in a spreadsheet — one row per period, easy to
// select-and-chart, instead of tens of columns to transpose first.
function buildYearCoverageTable(cards) {
  const header = ['year', 'station', 'dataset', 'obs'];
  const rows = [];
  cards.forEach(({ stationId, label, d }) => {
    (d.years || []).forEach(o => rows.push([o.y, stationId, label, o.n]));
  });
  return { header, rows };
}
function buildMonthCoverageTable(cards) {
  const header = ['month', 'station', 'dataset', 'obs'];
  const rows = [];
  cards.forEach(({ stationId, label, d }) => {
    (d.months || []).forEach(o => rows.push([MONTH_ABBR[o.m - 1] || o.m, stationId, label, o.n]));
  });
  return { header, rows };
}
// Bundles a card PNG plus any companion CSVs into one .zip so a download
// is a single file instead of 2-3 separate browser downloads landing at
// once. files: [{name, blob}] for the PNG, [{name, header, rows}] for CSVs.
async function downloadBundleZip(zipFilenameBase, pngFile, csvFiles) {
  const zip = new JSZip();
  zip.file(pngFile.name, pngFile.blob);
  (csvFiles || []).forEach(({ name, header, rows }) => {
    if (rows.length) zip.file(name, csvText(header, rows));
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${zipFilenameBase}.zip`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
// ---- observation download: DuckDB-WASM against the release parquet ---------
// Everything else on this page reads a prebuilt JSON coverage summary. The CSV
// download is the one feature that needs the observations themselves, and there
// is no API in front of the release — so the query runs in the browser, reading
// obs.parquet (~155 MB) over HTTP range requests. DuckDB prunes row groups with
// the dataset_key + lat/lon predicates, so a typical single-station export
// transfers a few MB, not the whole file; the picker shows a "Querying…" state
// because the first call also has to pull the wasm bundle.
//
// Loaded lazily and only on the download path, so a visitor who never exports
// pays nothing for it. Consequences worth knowing before extending this:
//   - it is a hard runtime dependency on jsDelivr (both the ESM entry point and
//     getJsDelivrBundles() for the wasm/worker), which nothing else here needs;
//   - the connection is cached in a module-level promise, so concurrent
//     downloads share one instance rather than instantiating N databases.
// If this grows past "download what you're looking at", it belongs behind a
// server-side query endpoint instead.
let DUCKDB_CONN_PROMISE = null;
async function getDuckDBConnection() {
  if (DUCKDB_CONN_PROMISE) return DUCKDB_CONN_PROMISE;
  DUCKDB_CONN_PROMISE = (async () => {
    const duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm');
    const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
    const workerUrl = URL.createObjectURL(new Blob(
      [`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }));
    const worker = new Worker(workerUrl);
    const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);
    return db.connect();
  })();
  return DUCKDB_CONN_PROMISE;
}
let OBS_BASE_URL_PROMISE = null;
async function obsParquetBase() {
  if (OBS_BASE_URL_PROMISE) return OBS_BASE_URL_PROMISE;
  OBS_BASE_URL_PROMISE = fetch('https://storage.googleapis.com/calcofi-db/ducklake/releases/latest.txt')
    .then(r => r.text())
    .then(v => `https://storage.googleapis.com/calcofi-db/ducklake/releases/${v.trim()}/parquet`);
  return OBS_BASE_URL_PROMISE;
}
// Station match is an exact grid_key equality, not a bbox around the station's
// nominal position. grid_key is denormalized onto every obs row precisely so
// consumers can group by station without a join, and it is 100% populated in
// the release — whereas a ship almost never occupies a station at its nominal
// coordinates, so a coordinate box has to guess a radius and silently returns
// nothing when it guesses low. Measured against v2026.08.04, a ±0.05° box found
// observations for only 173 of 213 bottle stations, 172 of 207 ichthyoplankton
// and 35 of 54 ZooDB — roughly one station in five offered a download button
// that came back "No matching rows returned". grid_key finds all of them, and
// an equality predicate prunes row groups better than two range predicates.
// The three datasets renamed in c643cd2 (provider = the curating organization),
// mapped both directions. variables.json is rebuilt by refresh.yml from the
// current release, so it carries the new keys — but a browser with a cached
// copy, or a rolled-back release, can still hand us the old ones. Querying the
// alias when a lookup comes back empty costs one extra round-trip in the rare
// case and avoids an empty CSV with no explanation in the common one.
const DATASET_KEY_ALIASES = {
  'sio_pic-zooplankton': 'pic_zooplankton', 'pic_zooplankton': 'sio_pic-zooplankton',
  'farallon_bird-mammal': 'calcofi_bird_mammal_census', 'calcofi_bird_mammal_census': 'farallon_bird-mammal',
  'sio_mesopelagic-fish': 'ucsd_sio_mesopelagic-fish', 'ucsd_sio_mesopelagic-fish': 'sio_mesopelagic-fish',
};
// Both arms carry measurement_type, life_stage and measurement_qual alongside
// the headline `variable`, because for a taxon they are not decoration: `obs`
// is one row per (taxon, life_stage, measurement_type), so a single ichthyo
// species has separate egg and larva rows, and separate abundance and
// std-haul-factor-corrected rows. Selecting only scientific_name collapses all
// of them into one `variable` column and the download reads as duplicate
// measurements of the same thing at the same time and depth. measurement_qual
// travels for the same reason it does everywhere else in the release — a value
// without its flag is not the value.
// The release publishes obs BOTH as one 155 MB obs.parquet and as
// obs/dataset_key=<key>/data_0.parquet, Hive-partitioned. Every query here
// filters to exactly one dataset, so the partition is always the right source
// and it is dramatically smaller — swfsc_ichthyo is 3.9 MB against the
// monolith's 155 MB, farallon_bird-mammal 1.0 MB, cce-lter_zoodb 0.1 MB.
//
// This is not a micro-optimization. Row-group statistics on obs.parquet barely
// prune: taxon_key has 6 distinct row-group minimums across 164 groups and
// grid_key 93, so a filter on either still streams most of the file, and
// DuckDB-WASM took over 3 minutes for two species at one station. Reading the
// partition instead makes the same query a few seconds.
//
// The explicit data_0.parquet filename is deliberate — globs need a LIST that
// plain HTTP object storage does not offer, so '.../*.parquet' 404s. If a
// partition is ever written as more than one file the read fails and the caller
// falls back to the monolith, which is slow but complete.
const obsPartitionUrl = (base, datasetKey) =>
  `${base}/obs/dataset_key=${encodeURIComponent(datasetKey)}/data_0.parquet`;
function buildObsSql(src, datasetKey, chosenVars, taxonKeys, stationPred, commonCols, esc) {
  const otherVars = chosenVars.filter(v => v.variable_type !== 'taxon');
  const parts = [];
  if (otherVars.length) {
    const list = otherVars.map(v => `'${esc(v.name)}'`).join(', ');
    parts.push(`SELECT o.measurement_type AS variable, o.measurement_type, o.life_stage,
        o.measurement_value AS value, o.measurement_qual, ${commonCols}
      FROM read_parquet('${src}') o
      WHERE o.dataset_key = '${esc(datasetKey)}' AND o.measurement_type IN (${list}) AND ${stationPred}`);
  }
  if (taxonKeys.length) {
    const keys = taxonKeys.map(k => `'${esc(k)}'`).join(', ');
    parts.push(`SELECT o.taxon_key AS variable, o.measurement_type, o.life_stage,
        o.measurement_value AS value, o.measurement_qual, ${commonCols}
      FROM read_parquet('${src}') o
      WHERE o.dataset_key = '${esc(datasetKey)}' AND o.taxon_key IN (${keys}) AND ${stationPred}`);
  }
  return parts.length
    ? parts.join('\nUNION ALL\n') + '\nORDER BY datetime, variable, life_stage, measurement_type'
    : null;
}
// scientific_name -> taxon_key, resolved once per session against taxon.parquet
// (59 KB, so this is nearly free) and cached.
//
// This exists to keep the obs scan filterable. Joining obs to taxon and putting
// the filter on t.scientific_name reads correctly but puts the only selective
// predicate on the far side of a join, so nothing prunes obs.parquet's row
// groups and DuckDB-WASM streams the whole 155 MB over HTTP range requests —
// measured at over 3 minutes for two species at one station, versus ~5 s for
// the same query natively. Resolving the names first turns it into
// `o.taxon_key IN (...)`, an ordinary pushdown-friendly filter on the scanned
// table, and the names are joined back on in JS from this same map.
let TAXON_KEY_MAP_PROMISE = null;
async function taxonKeyMap() {
  if (TAXON_KEY_MAP_PROMISE) return TAXON_KEY_MAP_PROMISE;
  TAXON_KEY_MAP_PROMISE = (async () => {
    const conn = await getDuckDBConnection();
    const base = await obsParquetBase();
    const res = await conn.query(
      `SELECT taxon_key, scientific_name FROM read_parquet('${base}/taxon.parquet')`);
    const byName = new Map(), byKey = new Map();
    res.toArray().map(r => (r.toJSON ? r.toJSON() : r)).forEach(r => {
      if (!r.scientific_name) return;
      byName.set(normTaxonName(r.scientific_name), r.taxon_key);
      byKey.set(r.taxon_key, r.scientific_name);
    });
    return { byName, byKey };
  })();
  return TAXON_KEY_MAP_PROMISE;
}
// One header for every observation CSV this app writes, single-station and
// comparison alike — they are the same query, so they must not drift into two
// different shapes.
const OBS_CSV_HEADER = ['station_id', 'dataset', 'variable', 'common_name', 'measurement_type',
  'life_stage', 'value', 'units', 'measurement_qual', 'year', 'month', 'datetime',
  'depth_m', 'obs_lat', 'obs_lon'];
const obsCsvRow = (stationId, label, vars, r) => [
  stationId, label, r.variable, commonNameFor(vars, r.variable), r.measurement_type,
  r.life_stage, r.value, unitsFor(vars, r.variable), r.measurement_qual,
  r.year, r.month, r.datetime, r.depth_min_m, r.obs_lat, r.obs_lon];
async function fetchRealObservations({ gridKey, datasetKey, chosenVars }) {
  const conn = await getDuckDBConnection();
  const base = await obsParquetBase();
  const { byName, byKey } = await taxonKeyMap();
  const esc = s => (s || '').replace(/'/g, "''");
  const stationPred = `o.grid_key = '${esc(gridKey)}'`;
  const commonCols = `o.grid_key, strftime(o.datetime, '%Y-%m-%dT%H:%M:%S') AS datetime,
      extract(year FROM o.datetime)::INT AS year, extract(month FROM o.datetime)::INT AS month,
      o.depth_min_m, o.latitude AS obs_lat, o.longitude AS obs_lon`;
  const taxonKeys = chosenVars.filter(v => v.variable_type === 'taxon')
    .map(v => byName.get(normTaxonName(v.name))).filter(Boolean);
  const runAgainst = async (dk, src) => {
    const sql = buildObsSql(src, dk, chosenVars, taxonKeys, stationPred, commonCols, esc);
    if (!sql) return [];
    const res = await conn.query(sql);
    // The taxon arm selects taxon_key as `variable` (see buildObsSql); swap in
    // the scientific name here so both arms hand back the same shape.
    return res.toArray().map(row => (row.toJSON ? row.toJSON() : row))
      .map(r => byKey.has(r.variable) ? { ...r, variable: byKey.get(r.variable) } : r);
  };
  const run = async dk => {
    try {
      return await runAgainst(dk, obsPartitionUrl(base, dk));
    } catch (err) {
      // Missing partition, or one written as more than one file — fall back to
      // the whole-table copy so a layout change degrades to slow, not broken.
      console.warn('obs partition unavailable for', dk, '— falling back to obs.parquet', err);
      return runAgainst(dk, `${base}/obs.parquet`);
    }
  };
  let rows = await run(datasetKey);
  const alias = DATASET_KEY_ALIASES[datasetKey];
  if (!rows.length && alias) rows = await run(alias);
  return rows;
}
function unitsFor(vars, name) {
  const v = vars.find(x => x.name === name);
  return (v && v.units) || '';
}
function commonNameFor(vars, name) {
  const v = vars.find(x => x.name === name);
  return (v && v.common_name) || '';
}
async function downloadRealObservations({ stationId, gridKey, datasetKey, label, vars, chosenNames }) {
  const chosenVars = vars.filter(v => chosenNames.includes(v.name));
  const rows = await fetchRealObservations({ gridKey, datasetKey, chosenVars });
  if (!rows.length) throw new Error('No matching rows returned.');
  const csvRows = rows.map(r => obsCsvRow(stationId, label, vars, r));
  saveCSV(`calcofi-${String(stationId).replace(/\s+/g, '_')}-${datasetKey}-observations.csv`,
    OBS_CSV_HEADER, csvRows);
}
function openVariablePickerModal(vars, runFn, isUnconfirmed) {
  const sortedVars = vars.slice().sort((a, b) => sortNameFor(a).localeCompare(sortNameFor(b)));
  const rows = sortedVars.map(v => {
    const unconfirmed = isUnconfirmed && isUnconfirmed(v);
    return `<label class="var-pick-row${unconfirmed ? ' var-pick-row-unconfirmed' : ''}"${unconfirmed ? ' title="No real per-station data confirms this species was recorded here — the count shown elsewhere is dataset-wide, not species-specific. Still selectable, but likely to come back empty."' : ''}>
      <input type="checkbox" class="var-pick-cb" value="${(v.name || '').replace(/"/g, '&quot;')}" checked>
      ${displayLabel(v)}${v.units ? ` <span class="var-pick-units">(${v.units})</span>` : ''}
    </label>`;
  }).join('');
  document.getElementById('modal-title').textContent = 'Select variables to export';
  document.getElementById('modal-body').innerHTML = `
    <div class="var-picker">
      <div class="var-picker-actions">
        <button type="button" class="var-picker-toggle" onclick="document.querySelectorAll('.var-pick-cb').forEach(c=>c.checked=true)">Select all</button>
        <button type="button" class="var-picker-toggle" onclick="document.querySelectorAll('.var-pick-cb').forEach(c=>c.checked=false)">Select none</button>
      </div>
      <div class="var-picker-list">${rows}</div>
      <button class="var-picker-confirm" id="var-picker-confirm">⬇ Download CSV</button>
      <div class="var-picker-status" id="var-picker-status"></div>
    </div>`;
  document.getElementById('modal-footer').style.display = 'none';
  document.getElementById('modal').classList.remove('modal-large');
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('var-picker-confirm').onclick = async () => {
    const chosen = [...document.querySelectorAll('.var-pick-cb:checked')].map(c => c.value);
    const btn = document.getElementById('var-picker-confirm');
    const status = document.getElementById('var-picker-status');
    if (!chosen.length) { status.textContent = 'Select at least one variable.'; return; }
    btn.disabled = true; btn.textContent = '⬇ Querying…';
    // The first export of a session pays for the DuckDB-WASM bundle as well as
    // the query — measured at roughly two minutes against ten seconds warm — so
    // say which one is happening rather than showing the same vague wait twice.
    status.textContent = DUCKDB_CONN_PROMISE
      ? 'Querying the CalCOFI release database…'
      : 'Setting up the query engine (one-time, ~1–2 min on first download), then querying…';
    try {
      await runFn(chosen);
      closeModal();
    } catch (err) {
      console.error(err);
      status.textContent = err.message === 'No matching rows returned.'
        ? 'No observations found for the selected variable(s) at this station.'
        : 'Could not fetch real observations — check the browser console for details.';
      btn.disabled = false; btn.textContent = '⬇ Download CSV';
    }
  };
}
async function downloadSingleStationCard(cardId) {
  const ctx = CARD_DL_CTX[cardId];
  if (!currentStation || !ctx) return;
  const s = currentStation;
  const filenameBase = `calcofi-${s.station_id.replace(/\s+/g, '_')}-${ctx.d.dataset_key}`;
  const pngBlob = await renderCoverageCardPNGBlob(ctx.d, ctx.label, ctx.color,
    `Station ${s.station_id}`, `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`);
  const cardArg = [{ stationId: s.station_id, label: ctx.label, d: ctx.d }];
  const years = buildYearCoverageTable(cardArg), months = buildMonthCoverageTable(cardArg);
  await downloadBundleZip(filenameBase,
    { name: `${filenameBase}.png`, blob: pngBlob },
    [
      { name: `${filenameBase}-observations-by-year.csv`, header: years.header, rows: years.rows },
      { name: `${filenameBase}-seasonality-by-month.csv`, header: months.header, rows: months.rows },
    ]);
}
// True if TAXON_STATIONS has ANY real per-species entry for this dataset —
// i.e. a species picker for it could actually distinguish "seen here" from
// "not seen here". False for datasets where taxon_coverage.json has no rows
// at all (Ichthyoplankton, CUFES, Mesopelagic Fish, ZooDB, Picoplankton &
// Bacteria, confirmed empty as of 2026-08) — for those, every species looks
// identically "available" regardless of station, so a picker would be
// theater, not a real filter.
function hasPerStationTaxonCoverage(datasetKey) {
  const prefix = datasetKey + '::';
  return Object.keys(TAXON_STATIONS).some(k => k.startsWith(prefix));
}
function downloadSingleStationCardCSV(cardId) {
  const ctx = CARD_DL_CTX[cardId];
  if (!currentStation || !ctx) return;
  const runDownload = chosenNames => downloadRealObservations({
    stationId: currentStation.station_id, gridKey: ctx.stationGridKey ?? currentStation.grid_key,
    datasetKey: ctx.d.dataset_key,
    label: ctx.label, vars: ctx.vars, chosenNames,
  });
  // Taxon-only card, no real per-station species data anywhere for this
  // dataset — skip the picker (it can't offer a meaningful choice) and just
  // pull every variable directly.
  if (ctx.vars.length && ctx.vars.every(v => v.variable_type === 'taxon') && !hasPerStationTaxonCoverage(ctx.d.dataset_key)) {
    const btn = document.getElementById('csvbtn-' + cardId);
    const original = btn && btn.textContent;
    if (btn) { btn.textContent = '⬇ Querying…'; btn.disabled = true; }
    runDownload(ctx.vars.map(v => v.name)).catch(err => {
      console.error(err);
      alert(err.message === 'No matching rows returned.'
        ? 'No observations found for this dataset at this station.'
        : 'Could not fetch real observations — check the browser console for details.');
    }).finally(() => { if (btn) { btn.textContent = original; btn.disabled = false; } });
    return;
  }
  // Not filtered — a species with no pre-built per-station coverage entry
  // (stationsForVarIsFallback) isn't necessarily absent, just untracked in
  // that summary file; the real observation query could still return
  // something for it. Excluding based on that risks hiding a species that
  // would've actually worked, so show everything and let the query itself
  // be the source of truth.
  openVariablePickerModal(ctx.vars, runDownload);
}
async function downloadSingleComparisonCard(cardId) {
  const ctx = CARD_COMPARE_CTX[cardId];
  if (!ctx) return;
  const filenameBase = `calcofi-comparison-${ctx.d.dataset_key}`;
  const stationLabel = `avg-${ctx.stations.length}-stations`;
  const pngBlob = await renderCoverageCardPNGBlob(ctx.d, ctx.label, ctx.color,
    `Averaged — ${ctx.stations.length} Stations`, 'Contributing stations in the companion CSV');
  const cardArg = [{ stationId: stationLabel, label: ctx.label, d: ctx.d }];
  const years = buildYearCoverageTable(cardArg), months = buildMonthCoverageTable(cardArg);
  await downloadBundleZip(filenameBase,
    { name: `${filenameBase}.png`, blob: pngBlob },
    [
      { name: `${filenameBase}-observations-by-year.csv`, header: years.header, rows: years.rows },
      { name: `${filenameBase}-seasonality-by-month.csv`, header: months.header, rows: months.rows },
      { name: `${filenameBase}-contributing-stations.csv`, header: ['station_id'], rows: ctx.stations.map(s => [s.station_id]) },
    ]);
}
// Runs fetchRealObservations once per contributing station for one card's
// dataset, merging results into one row list — same real-value columns as
// the single-station picker, plus which station each row actually came
// from (a comparison spans several).
async function fetchComparisonRealObservations(entries, datasetKey, chosenVars, label, vars) {
  const rows = [];
  for (const { station } of entries) {
    try {
      const stationRows = await fetchRealObservations({ gridKey: station.grid_key, datasetKey, chosenVars });
      stationRows.forEach(r => rows.push(obsCsvRow(station.station_id, label, vars, r)));
    } catch (err) {
      console.error('Query failed for station', station.station_id, datasetKey, err);
    }
  }
  return rows;
}
function downloadSingleComparisonCardCSV(cardId) {
  const ctx = CARD_COMPARE_CTX[cardId];
  if (!ctx) return;
  openVariablePickerModal(ctx.vars, async chosen => {
    const chosenVars = ctx.vars.filter(v => chosen.includes(v.name));
    const rows = await fetchComparisonRealObservations(ctx.entries, ctx.d.dataset_key, chosenVars, ctx.label, ctx.vars);
    if (!rows.length) throw new Error('No matching rows returned.');
    saveCSV(`calcofi-comparison-${ctx.d.dataset_key}-observations.csv`, OBS_CSV_HEADER, rows);
  });
}
function initYearSlider() {
  let mn = Infinity, mx = -Infinity;
  STATIONS.forEach(s => (s.datasets || []).forEach(d => (d.years || []).forEach(o => {
    if (o.y < mn) mn = o.y; if (o.y > mx) mx = o.y;
  })));
  if (!isFinite(mn) || mn === mx) return;
  G_MIN = mn; G_MAX = mx;
  const smin = document.getElementById('ys-min'), smax = document.getElementById('ys-max');
  smin.min = smax.min = mn; smin.max = smax.max = mx; smin.value = mn; smax.value = mx;
  const upd = () => {
    setYearRange(+smin.value, +smax.value);
    applyStyles(); if (selectedVar) highlight(selectedVar);
  };
  smin.addEventListener('input', () => { if (+smin.value > +smax.value) smin.value = smax.value; upd(); });
  smax.addEventListener('input', () => { if (+smax.value < +smin.value) smax.value = smin.value; upd(); });
  document.getElementById('ys-min-label').textContent = mn;
  document.getElementById('ys-max-label').textContent = mx;
  setFill(mn, mx);
  document.getElementById('year-slider').style.display = '';
}
// The slider's own min/max attributes always stay at the global range —
// deliberately NOT changed to lock a parameter's span, because a native
// range input rescales its whole track to fill [min,max] across its full
// width. That would make e.g. "2005" jump to the far-left edge instead of
// sitting at its correct ~73%-along position on the real 1949-2026
// timeline. Locking is instead enforced in JS (lockMin/lockMax, applied in
// setYearRange below), which stops the handle at the right physical
// position on a track that never rescales.
let lockMin = null, lockMax = null;
function setFill(a, b) {
  const pct = x => 100 * (x - G_MIN) / ((G_MAX - G_MIN) || 1);
  const f = document.getElementById('ys-fill');
  f.style.left = pct(a) + '%'; f.style.right = (100 - pct(b)) + '%';
}
// Moves the slider handles + labels + fill to [a, b], clamped to whatever
// is currently locked (or the full global range if nothing is). Doesn't
// touch the map/banner itself — callers refresh those, so this can be
// called from highlight() without a re-entrant loop.
function setYearRange(a, b) {
  if (G_MIN == null) return;
  const lo = lockMin ?? G_MIN, hi = lockMax ?? G_MAX;
  a = Math.max(lo, a); b = Math.min(hi, b);
  if (a > b) [a, b] = [b, a];
  yearRange = (a === G_MIN && b === G_MAX) ? null : [a, b];
  document.getElementById('ys-min').value = a;
  document.getElementById('ys-max').value = b;
  document.getElementById('ys-min-label').textContent = a;
  document.getElementById('ys-max-label').textContent = b;
  setFill(a, b);
}
// Locks the sliders' own draggable min/max to [lo, hi] — a real HTML
// range-input constraint, so the thumbs physically can't be dragged past
// it, not just a value that gets reset after the fact.
function lockYearRange(lo, hi) {
  lockMin = lo; lockMax = hi;
}
// A dataset's own coverage often stops well short of the slider's full
// 1949-2026 range (e.g. calcofi_phyllosoma ends in 2009) — this finds that
// dataset's real min/max year across every station, so selecting a
// variable can snap the slider to where its data actually is.
function datasetYearSpan(datasetKey) {
  // Same old/new dataset-key mismatch as taxonLookupKey() above: stations.json
  // only ever files bird/mammal and mesopelagic-fish stops under the *new*
  // key (farallon_bird-mammal / sio_mesopelagic-fish), while variables.json
  // still labels those variables with the *old* key. Without this fallback,
  // datasetYearSpan() for those species always returned null, so the year
  // slider silently kept whatever lock the previously-selected species left
  // it at instead of updating (reported 2026-08-22: selecting "Striped
  // Dolphin" after "Larvacean" left the slider showing Larvacean's 1951-2015
  // range even though the dolphin was only ever observed in 1990/2004/2015).
  const keys = [datasetKey];
  const alias = typeof DATASET_KEY_ALIASES !== 'undefined' ? DATASET_KEY_ALIASES[datasetKey] : null;
  if (alias) keys.push(alias);
  let mn = Infinity, mx = -Infinity;
  STATIONS.forEach(s => (s.datasets || []).forEach(d => {
    if (!keys.includes(d.dataset_key)) return;
    (d.years || []).forEach(o => { if (o.y < mn) mn = o.y; if (o.y > mx) mx = o.y; });
  }));
  // A pooled dataset has no station rows at all, so the loop above finds nothing
  // and the slider used to stay on the global span while a phytoplankton variable
  // was selected — showing 1949–2026 for a record that runs 1996–2022. Its years
  // live on the regions instead; same {y, n} shape, so the rest is unchanged.
  if (!isFinite(mn)) {
    REGIONS.forEach(r => (r.datasets || []).forEach(d => {
      if (!keys.includes(d.dataset_key)) return;
      (d.years || []).forEach(o => { if (o.y < mn) mn = o.y; if (o.y > mx) mx = o.y; });
    }));
  }
  return isFinite(mn) ? [mn, mx] : null;
}
// A taxon's own observation-year span (min/max across every station it was
// recorded at), distinct from datasetYearSpan()'s whole-dataset span above —
// lets selectVariable() lock the slider to where THIS species was actually
// seen rather than the whole dataset's range. Returns null when there's no
// per-species year breakdown for this taxon (taxonLookupKey() found nothing,
// or the entry it found has no year bins).
function taxonYearSpan(v) {
  const key = taxonLookupKey(v);
  const byStation = key && TAXON_YEARS[key];
  if (!byStation) return null;
  let mn = Infinity, mx = -Infinity;
  Object.values(byStation).forEach(years => (years || []).forEach(o => {
    if (o.y < mn) mn = o.y;
    if (o.y > mx) mx = o.y;
  }));
  return isFinite(mn) ? [mn, mx] : null;
}
function resetYearFilter() {
  setYearRange(G_MIN, G_MAX);
  applyStyles(); if (selectedVar) highlight(selectedVar);
}

// ---- category classification (used by the inventory panel + grouped search) --
const CAT_COUNTS = {};
const DATASET_VAR_COUNTS = {};

function contentKeywordGroup(v) {
  const n = (v.display_name || v.name || '').toLowerCase();
  if (n === 'sw_ph') return 'Carbonate System';
  if (n.startsWith('tsg')) return 'Physical Oceanography';
  if (n === 'chl_fluor' || n === 'par_surf' || n === 'pred_chl') return 'Productivity & Pigments';
  if (n === 'pred_sal_psu') return 'Physical Oceanography';
  if (n === 'ph' || n.startsWith('ph ') || n.startsWith('ph_') || n.includes('ph replicate')) return 'Carbonate System';
  // "dic" as a bare substring false-positives on any word that happens to contain
  // those 3 letters in sequence -- "Dictyochophyceae" (phytoplankton) and
  // "Appendicularia" (zooplankton) were landing in Carbonate System for exactly
  // this reason. Match the real variable names (dic, dic_rep1, dic_rep2) instead.
  if (['alkalinity', 'dissolved inorganic carbon', 'carbonate', 'pco2'].some(k => n.includes(k))
      || n === 'dic' || n.startsWith('dic_') || n.startsWith('dic ')) return 'Carbonate System';
  if (n === 'isus_v') return 'Nutrients & Chemistry';
  if (['phosphate', 'silicate', 'nitrate', 'nitrite', 'ammoni'].some(k => n.includes(k))) return 'Nutrients & Chemistry';
  // "par"/"spar" (light for photosynthesis) and "light_pct" (light intensity
  // for the C14 productivity incubation) pair with chlorophyll/C14 on the
  // same cast — grouped with productivity, not general physical readings.
  // Matched on exact name, not substring, since "par" as a bare substring
  // false-positives on species names (Bonaparte's Gull, Parakeet Auklet...).
  if (['chlorophyll', 'phaeopigment', 'c14', 'productivity', 'pigment', 'fluorescence', 'light_pct'].some(k => n.includes(k))
      || n === 'par' || n === 'spar' || n.startsWith('par ') || n.startsWith('spar ')) return 'Productivity & Pigments';
  if (['wind', 'wave', 'weather', 'cloud', 'visibility', 'bulb', 'atmospheric', 'barometric', 'secchi', 'forel'].some(k => n.includes(k))
      || n === 'water_color') return 'Meteorology & Sea State';
  if (['temperature', 'salinity', 'density', 'sigma', 'oxygen', 'o2', 'pressure', 'depth', 'dynamic height'].some(k => n.includes(k))) return 'Physical Oceanography';
  return null;
}
const DATASET_CATEGORY = {
  'swfsc_ichthyo': 'Fish Eggs & Larvae', 'swfsc_cufes': 'Fish Eggs & Larvae',
  'cce-lter_zoodb': 'Zooplankton', 'cce-lter_zooscan': 'Zooplankton',
  'sio_pic-zooplankton': 'Zooplankton', 'pic_zooplankton': 'Zooplankton', 'calcofi_phyllosoma': 'Zooplankton',
  'cce-lter_euphausiids': 'Euphausiids (Krill)', 'farallon_bird-mammal': 'Seabirds & Marine Mammals',
  'calcofi_bird_mammal_census': 'Seabirds & Marine Mammals',
  'calcofi_phytoplankton': 'Phytoplankton', 'calcofi_mets': 'Meteorology & Sea State',
  'ucsd_sio_mesopelagic-fish': 'Mesopelagic Fish', 'sio_mesopelagic-fish': 'Mesopelagic Fish', 'cce-lter_picoplankton-bacteria': 'Picoplankton & Bacteria',
  // decapod larvae picked from archived CalCOFI plankton tows — meroplankton,
  // so it belongs with Zooplankton rather than getting its own category of one
  'cdfw_dungeness-crab': 'Zooplankton'
};
const FAMILY_CATEGORY = {
  'Temperature': 'Physical Oceanography', 'Sea Surface Temperature': 'Physical Oceanography',
  'Salinity': 'Physical Oceanography', 'Sea Surface Salinity': 'Physical Oceanography',
  'Conductivity': 'Physical Oceanography', 'Sea Surface Conductivity': 'Physical Oceanography',
  'Density': 'Physical Oceanography', 'Sound Velocity': 'Physical Oceanography',
  'Oxygen': 'Physical Oceanography',
};
function categoryOf(v) {
  if (v.dataset_key === 'swfsc_ichthyo' && ['small_plankton_biomass', 'total_plankton_biomass'].includes(v.display_name)) return 'Zooplankton';
  const kg = contentKeywordGroup(v);
  if (kg) return kg;
  const fm = familyMemberFor(v);
  if (fm && FAMILY_CATEGORY[fm.family.name]) return FAMILY_CATEGORY[fm.family.name];
  // release first (each ingest declares `category`), then the local map for keys
  // the release does not carry, then the realm default
  const rel = DATASETS_META[v.dataset_key];
  return (rel && rel.category) || DATASET_CATEGORY[v.dataset_key] ||
         (dsMeta(v.dataset_key).realm === 'env' ? 'Physical Oceanography' : 'Other');
}
const CATEGORY_ORDER = ['Physical Oceanography', 'Nutrients & Chemistry', 'Productivity & Pigments',
  'Carbonate System', 'Meteorology & Sea State', 'Phytoplankton', 'Picoplankton & Bacteria', 'Zooplankton',
  'Euphausiids (Krill)', 'Seabirds & Marine Mammals', 'Mesopelagic Fish', 'Fish Eggs & Larvae'];
const CATEGORY_ICON = {
  'Physical Oceanography': '🌊',
  'Nutrients & Chemistry': '🧪',
  'Productivity & Pigments': '🌱',
  'Carbonate System': '🪸',
  'Meteorology & Sea State': '☁️',
  'Phytoplankton': '🔬',
  'Picoplankton & Bacteria': '🦠',
  'Zooplankton': '🦠',
  'Euphausiids (Krill)': '🦐',
  'Fish Eggs & Larvae': '🐟',
  'Mesopelagic Fish': '🐡',
  'Seabirds & Marine Mammals': '🐋',
};
function catLabel(c) { return CATEGORY_ICON[c] ? `${CATEGORY_ICON[c]} ${c}` : c; }

function buildCategories() {
  CANON_VARS.forEach(v => {
    // See inventoryVarsFor() — the By Dataset list shows Bottle/Cast as two
    // separate rows, so count into those synthetic keys instead of the flat
    // dataset_key here. Every other consumer of v.dataset_key (search,
    // panels, map highlighting) is untouched — this only feeds the count
    // shown in the top-level dataset list.
    const countKey = (v.dataset_key === 'calcofi_bottle')
      ? (CAST_SIDE_BOTTLE_FIELDS.has(v.name) ? 'calcofi_bottle_cast' : 'calcofi_bottle_hydro')
      : v.dataset_key;
    DATASET_VAR_COUNTS[countKey] = (DATASET_VAR_COUNTS[countKey] || 0) + 1;
    const c = categoryOf(v); if (c === 'Other') return;
    CAT_COUNTS[c] = (CAT_COUNTS[c] || 0) + 1;
  });
}

// ---- inventory panel — "What CalCOFI Measures", shown in the right side
// panel (#panel-empty) before any station is clicked. Ported from Betty's
// original station-portal build. Rows expand in place to list their
// variables; clicking a variable selects it (same as a search hit). Pure
// browse-and-choose — unlike the old top chip row, it doesn't highlight
// the map on its own. --------------------------------------------------
let inventoryMode = 'category';
let expandedInventoryGroup = null;
let expandedFamilyKey = null;
// `${familyName}::${memberLabel}` currently expanded in the search dropdown
// (its dataset-picker cards showing) — separate from expandedFamilyKey since
// the dropdown is a different listing with its own open/closed state.
let ddExpandedGroup = null;
let expandedGroupKey = null;

// Parameter "families" — near-duplicate parameters that measure related but
// genuinely different things (e.g. bottle Temperature vs shipboard Dry/Wet
// Bulb Temperature). Ported from Betty's original station-portal build
// (PARAMETER_FAMILIES) — names, member labels, and method notes are hers,
// kept verbatim where still accurate. Matched here by dataset_key + the
// representative's raw name (not the old ERDDAP variable_id, which doesn't
// exist in this schema). Members with no match in the release DB yet (old
// CUFES Start/Stop Temperature & Salinity sensors, Station Bottom Depth,
// Integrated Chlorophyll/C14 per-cast) are left out rather than guessed at.
const PARAMETER_FAMILIES = [
  {
    name: 'Temperature',
    members: [
      { type: 'group', label: 'Temperature', short: 'Standard',
        method: 'Seawater temperature — bottle sample, CTD cast, carbonate cast, or continuous underway (TSG) intake, depending on dataset',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'temperature', source: 'Bottle' },
          { dataset_key: 'calcofi_ctd-cast', match: 'temperature_ave', source: 'CTD Cast' },
          { dataset_key: 'calcofi_dic', match: 'ctdtemp_its90', source: 'Carbonate Cast' },
          { dataset_key: 'calcofi_mets', match: 'tsg1_temp_c_calibrated', source: 'METS (Underway)' },
        ] },
      { type: 'group', label: 'Sea Surface Temperature', short: 'SST',
        method: 'Hull-mounted temperature sensor (SBE48, in the transducer void)',
        sources: [
          { dataset_key: 'calcofi_mets', match: 'sst_c_corrected', source: 'METS (Underway)', note: 'SBE48 hull sensor, transducer void' },
        ] },
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'potential_temperature_1', label: 'Potential Temperature', short: 'Potential',
        method: 'CTD-mounted thermometer sensor, pressure-corrected potential temperature' },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'dry_air_temp', label: 'Dry Bulb Temperature', short: 'Dry Bulb',
        method: 'Shipboard air temp, sling psychrometer' },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'wet_air_temp', label: 'Wet Bulb Temperature', short: 'Wet Bulb',
        method: 'Shipboard air temp, sling psychrometer (humidity-adjusted)' },
    ],
  },
  {
    name: 'Oxygen',
    members: [
      { type: 'group', label: 'Oxygen Saturation', short: 'Standard',
        method: 'Oxygen percent saturation',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'oxygen_saturation', source: 'Bottle', note: 'Winkler-derived percent saturation (bottle sample)' },
          { dataset_key: 'calcofi_ctd-cast', match: 'oxygen_saturation_1', source: 'CTD Cast (sensor)', note: 'CTD-mounted electronic oxygen sensor, percent saturation' },
          { dataset_key: 'calcofi_mets', match: 'oxygen_sat_pct', source: 'METS (Underway)', note: 'Continuous underway sensor, reported in %' },
        ] },
      { type: 'group', label: 'Oxygen', short: 'Standard',
        method: 'Dissolved oxygen concentration — bottle sample, CTD sensor, or continuous underway system',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'oxygen_ml_l', source: 'Bottle', note: 'Winkler titration (bottle sample) — reported in mL/L, also available in µmol/kg' },
          { dataset_key: 'calcofi_ctd-cast', match: 'oxygen_ml_l_ave_sta_corr', source: 'CTD Cast', note: 'CTD-mounted electronic oxygen sensor, station-corrected average of both sensors' },
          { dataset_key: 'calcofi_mets', match: 'oxygen', source: 'METS (Underway)', note: 'Continuous underway sensor, reported in mL/L' },
        ] },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'oxygen_temp_c', label: 'Oxygen Sensor Temperature', short: 'Sensor Temp',
        method: "The oxygen sensor's own internal temperature reading, used to temperature-compensate the Oxygen measurement" },
    ],
  },
  {
    name: 'Salinity',
    members: [
      { type: 'group', label: 'Salinity', short: 'Standard',
        method: 'Seawater salinity — bench salinometer, CTD sensor, carbonate cast, or continuous underway (TSG) intake, depending on dataset',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'salinity', source: 'Bottle', note: 'Bench salinometer reading of the bottle sample' },
          { dataset_key: 'calcofi_ctd-cast', match: 'salinity_ave_corr', source: 'CTD Cast', note: 'CTD-mounted conductivity sensor, station-corrected average of both sensors' },
          { dataset_key: 'calcofi_dic', match: 'salinity_pss78', source: 'Carbonate Cast', note: 'CTD-mounted conductivity sensor, carbonate chemistry cast (PSS-78 scale)' },
          { dataset_key: 'calcofi_mets', match: 'tsg1_salinity_psu_calibrated', source: 'METS (Underway)', note: 'TSG75 unit, continuous underway intake sensor' },
        ] },
      { type: 'group', label: 'Sea Surface Salinity', short: 'SSS',
        method: 'Sea surface salinity from a dedicated surface sensor, separate from the ship\'s TSG intake sensor',
        sources: [
          { dataset_key: 'calcofi_mets', match: 'sss_psu_corrected', source: 'METS (Underway)' },
        ] },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'pred_sal_psu', label: 'Salinity (Predicted)', short: 'Predicted',
        method: 'Derived from a calibration of the TSG intake salinity against CalCOFI 0–7 m bottle salinity — not a direct sensor reading' },
    ],
  },
  {
    name: 'Conductivity',
    members: [
      { type: 'group', label: 'Conductivity', short: 'Standard',
        method: 'Continuous underway seawater conductivity from the ship\'s thermosalinograph intake',
        sources: [
          { dataset_key: 'calcofi_mets', match: 'tsg1_conductivity', source: 'METS (Underway)', note: 'TSG75 unit, continuous underway intake sensor, reported in mS/cm' },
        ] },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'ss_conductivity', label: 'Sea Surface Conductivity', short: 'SSC',
        method: 'Sea surface conductivity from a dedicated surface sensor' },
    ],
  },
  {
    name: 'Density',
    members: [
      { type: 'group', label: 'Density (Sigma Theta)', short: 'Standard',
        method: 'Potential density (reported as sigma-t)',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'sigma_theta', source: 'Bottle' },
          { dataset_key: 'calcofi_ctd-cast', match: 'sigma_theta_1', source: 'CTD Cast (station-corrected)' },
          { dataset_key: 'calcofi_mets', match: 'tsg1_density', source: 'METS (Underway)', note: 'TSG75 unit, continuous underway intake sensor, reported as sigma-t' },
        ] },
    ],
  },
  {
    name: 'Sound Velocity',
    members: [
      { type: 'group', label: 'Sound Velocity', short: 'Underway (TSG)',
        method: 'Continuous underway sound velocity from the ship\'s thermosalinograph intake',
        sources: [
          { dataset_key: 'calcofi_mets', match: 'tsg1_sound_velocity', source: 'METS (Underway)', note: 'TSG75 unit, continuous underway intake sensor, reported in m/sec' },
        ] },
    ],
  },
  {
    name: 'Dynamic Height',
    members: [
      { type: 'group', label: 'Dynamic Height', short: 'Standard',
        method: 'Dynamic height, in units of dynamic meters (work per unit mass)',
        sources: [
          { dataset_key: 'calcofi_ctd-cast', match: 'dynamic_height', source: 'CTD Cast' },
          { dataset_key: 'calcofi_bottle', match: 'r_dynamic_height', source: 'Bottle (reported)' },
        ] },
    ],
  },
  {
    name: 'Wind Direction',
    members: [
      { type: 'group', label: 'Wind Direction', short: 'Standard',
        method: 'Wind direction, reported using an abbreviated 360° azimuth circle (0° = true north, 180° = south)',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'wind_direction', source: 'Hydrographic Cast', note: 'Logged during the Bottle/CTD cast event' },
          { dataset_key: 'calcofi_mets', match: 'wind_dir_deg', source: 'METS (Underway)', note: 'Continuous underway sensor' },
        ] },
    ],
  },
  {
    name: 'Wind Speed',
    members: [
      { type: 'group', label: 'Wind Speed', short: 'Standard',
        method: 'Wind speed',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'wind_speed', source: 'Hydrographic Cast', note: 'Logged during the Bottle/CTD cast event, reported in knots' },
          { dataset_key: 'calcofi_mets', match: 'wind_speed_ms', source: 'METS (Underway)', note: 'Continuous underway sensor, reported in m/s' },
        ] },
    ],
  },
  {
    name: 'Photosynthetically Active Radiation',
    members: [
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'par', label: 'Photosynthetically Active Radiation', short: 'Standard',
        method: 'Photosynthetically active radiation, standard depth sensor' },
      { type: 'group', label: 'Surface Photosynthetically Active Radiation', short: 'Surface',
        method: 'Photosynthetically active radiation measured at the sea surface',
        sources: [
          { dataset_key: 'calcofi_ctd-cast', match: 'spar', source: 'CTD Cast' },
          { dataset_key: 'calcofi_mets', match: 'par_surf', source: 'METS (Underway)', note: 'Continuous underway sensor' },
        ] },
    ],
  },
  {
    name: 'pH',
    members: [
      { type: 'group', label: 'pH', short: 'Bottle',
        method: 'Degree of acidity/alkalinity of a solution',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'ph_rep1', source: 'Bottle', note: 'Bench pH meter reading of the bottle sample' },
          { dataset_key: 'calcofi_ctd-cast', match: 'ph', source: 'CTD Cast (sensor)', note: 'CTD-mounted electronic pH sensor — a different instrument than the bench meter used for bottle samples' },
          { dataset_key: 'calcofi_mets', match: 'sw_ph', source: 'Underway Sensor', note: 'Continuous underway seawater pH sensor' },
        ] },
    ],
  },
  {
    name: 'Alkalinity',
    members: [
      { type: 'group', label: 'Alkalinity', short: 'Bottle',
        method: 'Total alkalinity, titration analysis of the water sample',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'alkalinity_rep1', source: 'Bottle' },
          { dataset_key: 'calcofi_dic', match: 'alkalinity', source: 'Carbonate Cast' },
        ] },
    ],
  },
  {
    name: 'Dissolved Inorganic Carbon (DIC)',
    members: [
      { type: 'group', label: 'Dissolved Inorganic Carbon (DIC)', short: 'Bottle',
        method: 'Dissolved inorganic carbon (DIC), analysis of the water sample',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'dic_rep1', source: 'Bottle' },
          { dataset_key: 'calcofi_dic', match: 'dic', source: 'Carbonate Cast' },
        ] },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_salinity_psu', label: 'Salinity (DIC Analyzer)', short: 'DIC Analyzer',
        method: "The underway DIC analyzer's own intake salinity reading, used to correct its pCO2/pH output — not an independent seawater salinity reading" },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_temp_c', label: 'Temperature (DIC Analyzer)', short: 'DIC Analyzer',
        method: "The underway DIC analyzer's own intake temperature reading, used to correct its pCO2/pH output — not an independent seawater temperature reading" },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_valve', label: 'DIC Analyzer Valve Position', short: 'DIC Analyzer',
        method: "Which sample stream (seawater intake vs. reference gas/standard) the underway analyzer is currently reading — instrument state, not a chemistry measurement" },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_ph_raw', label: 'pH (DIC Analyzer, Raw)', short: 'DIC Analyzer',
        method: 'Raw pH from the underway DIC analyzer, before correction' },
    ],
  },
  {
    name: 'Pressure',
    members: [
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'pressure', label: 'Pressure', short: 'Standard',
        method: 'Pressure in decibars (dbar) from the CTD sensor — approximately equivalent to depth in meters' },
    ],
  },
  {
    name: 'Atmospheric Pressure',
    members: [
      { type: 'single', dataset_key: 'calcofi_mets', match: 'atm_pressure_mb', label: 'Atmospheric Pressure', short: 'Ship Level',
        method: 'Atmospheric pressure (ship level)' },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'atm_pressure_slc_mb', label: 'Atmospheric Pressure (SLC)', short: 'Sea-level Corrected',
        method: 'Atmospheric pressure, sea-level corrected' },
    ],
  },
  {
    name: 'Depth',
    members: [
      { type: 'group', label: 'Bottom Depth', short: 'Standard',
        method: 'Water depth at the sampling event (sea floor depth beneath the cast)',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'bottom_depth', source: 'Bottle', note: 'Logged at the Bottle/CTD cast event' },
          { dataset_key: 'calcofi_mets', match: 'bottom_depth_m', source: 'METS (Underway)', note: 'Single-beam echosounder, continuous underway' },
        ] },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'r_depth', label: 'Depth', short: 'From Pressure',
        method: 'Reprocessed depth, derived from pressure' },
    ],
  },
  {
    name: 'Secchi Depth',
    members: [
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'secchi_depth', label: 'Secchi Depth', short: 'Secchi',
        method: 'Secchi disk depth — water clarity, not a sensor reading' },
    ],
  },
  {
    name: 'Primary Productivity (C14 Assimilation)',
    members: [
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'c14_mean', label: 'C14 Assimilation', short: 'Standard',
        method: 'Light-bottle 14C uptake, per depth, bottle sample (mean of replicate measurements)' },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'c14_dark', label: 'C14 Assimilation (Dark Control)', short: 'Dark control',
        method: 'Dark/control bottle measurement, per depth, used as a baseline for the light-bottle uptake reading' },
    ],
  },
  {
    name: 'Chlorophyll-a',
    members: [
      { type: 'group', label: 'Chlorophyll-a', short: 'Standard',
        method: 'Fluorometric analysis of the bottle sample',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'chlorophyll_a', source: 'Bottle' },
          { dataset_key: 'calcofi_ctd-cast', match: 'btl_chlorophyll_a', source: 'CTD Cast (bottle sample)' },
        ] },
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'est_chlorophyll_a_sta_corr', label: 'Est. Chlorophyll-a', short: 'CTD Estimate',
        method: 'CTD-mounted inline fluorometer estimate, station-corrected' },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'chl_fluor', label: 'Chlorophyll Fluorescence', short: 'Fluor (Underway)',
        method: 'Continuous underway fluorescence sensor, reported in volts — a raw signal, not a calibrated Chl a concentration' },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'pred_chl', label: 'Chlorophyll-a (Predicted)', short: 'Predicted',
        method: 'Derived from a calibration of the underway fluorescence sensor against CalCOFI 0–7 m bottle Chl a' },
    ],
  },
  {
    name: 'Phaeopigment',
    members: [
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'phaeopigment', label: 'Phaeopigment', short: 'Standard',
        method: 'Fluorometric analysis of the bottle sample — a chlorophyll breakdown product, not chlorophyll itself' },
    ],
  },
];
// One "card" per data source inside a family's dropdown — bold official
// dataset name (not a short label like "Bottle"), the method note below,
// and a trailing arrow so it reads as a clickable action distinct from
// the dropdown toggle above it (that's an expand/collapse, this selects
// the variable and updates the map/slider).
// `showSource` is true when this card shares its dataset_key with another
// card in the same list — in that case the dataset name alone (e.g. two
// "CalCOFI NOAA Additional CTD" cards, one for the bottle sample collected
// during the cast and one for the CTD's own sensor) reads as a duplicate,
// so the source's own distinguishing label gets appended.
function sourceCardRow(it, showSource) {
  const official = officialNameFor(it.source.dataset_key) || it.source.source;
  const title = showSource ? `${official} — ${it.source.source}` : official;
  return `<div class="inventory-source-card" data-vid="${encodeURIComponent(it.v.variable_id)}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div class="inventory-subitem-name">${title}</div>
          ${it.source.note ? `<div class="inventory-family-method">${it.source.note}</div>` : ''}
        </div>
        <span class="inventory-source-arrow">→</span>
      </div>
    </div>`;
}
// True if two or more items in `its` share the same dataset_key — decides
// whether sourceCardRow needs to disambiguate with the source label.
function hasDupDataset(its) {
  const counts = {};
  its.forEach(it => counts[it.source.dataset_key] = (counts[it.source.dataset_key] || 0) + 1);
  return its.some(it => counts[it.source.dataset_key] > 1);
}
function familyMemberFor(v) {
  const raw = v.display_name || v.name;
  for (const fam of PARAMETER_FAMILIES) {
    for (const m of fam.members) {
      if (m.type === 'single' && m.dataset_key === v.dataset_key && m.match === raw) {
        return { family: fam, member: m };
      }
      if (m.type === 'group') {
        const src = m.sources.find(s => s.dataset_key === v.dataset_key && s.match === raw);
        if (src) return { family: fam, member: m, source: src };
      }
    }
  }
  return null;
}

function setInventoryMode(mode) {
  if (inventoryMode === mode) return;
  inventoryMode = mode;
  expandedInventoryGroup = null;
  expandedFamilyKey = null;
  expandedGroupKey = null;
  renderInventoryPanel();
}
// Escapes a value for safe embedding inside a double-quoted CSS attribute
// selector (only backslash and the quote itself can break it).
function attrEsc(v) { return String(v).replace(/["\\]/g, '\\$&'); }
// attrEsc above escapes for a CSS SELECTOR string (\" inside querySelector).
// This one escapes for an HTML ATTRIBUTE VALUE, where a backslash means nothing
// and a bare " would end the attribute early. Distinct jobs, easy to reach for
// the wrong one — the names say which is which.
const htmlAttr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Re-rendering #panel-empty replaces its entire innerHTML, but the
// container's own scrollTop is untouched — so when a toggle collapses
// other open sections and the content shrinks, the old scrollTop can end
// up past the new max scroll and the browser clamps it to the bottom
// (looks like a jump). This keeps whatever row the user just clicked
// pinned at the same screen position across the re-render: record its
// viewport offset before, run the state change + render, then nudge
// scrollTop by however much that same row moved.
function withScrollAnchor(selector, fn) {
  const container = document.getElementById('side-panel');
  const before = container ? container.querySelector(selector) : null;
  const beforeTop = before ? before.getBoundingClientRect().top : null;
  fn();
  if (container && beforeTop != null) {
    const after = container.querySelector(selector);
    if (after) container.scrollTop += after.getBoundingClientRect().top - beforeTop;
  }
}
function toggleInventoryGroup(key) {
  withScrollAnchor(`.inventory-row[data-key="${attrEsc(key)}"]`, () => {
    expandedInventoryGroup = (expandedInventoryGroup === key) ? null : key;
    renderInventoryPanel();
  });
}
function toggleFamily(key) {
  withScrollAnchor(`[data-family-key="${attrEsc(key)}"]`, () => {
    expandedFamilyKey = (expandedFamilyKey === key) ? null : key;
    expandedGroupKey = null;
    renderInventoryPanel();
  });
}
function toggleGroup(key) {
  withScrollAnchor(`[data-group-key="${attrEsc(key)}"]`, () => {
    expandedGroupKey = (expandedGroupKey === key) ? null : key;
    renderInventoryPanel();
  });
}
function inventoryVarsFor(key) {
  if (inventoryMode === 'dataset') {
    // calcofi_bottle is one DB table shared by two real collection programs
    // (Bottle chemistry + Cast meteorology/metadata — see CAST_SIDE_BOTTLE_FIELDS
    // and the station-accordion split in datasetAccordion()). Split it the same
    // way here in the top-level "By Dataset" list, so it doesn't show a single
    // "Hydrographic Bottle: 34" row that's actually a mix of both programs.
    if (key === 'calcofi_bottle_hydro') return CANON_VARS.filter(v => v.dataset_key === 'calcofi_bottle' && !CAST_SIDE_BOTTLE_FIELDS.has(v.name));
    if (key === 'calcofi_bottle_cast') return CANON_VARS.filter(v => v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name));
    return CANON_VARS.filter(v => v.dataset_key === key);
  }
  return CANON_VARS.filter(v => categoryOf(v) === key);
}
// Renders a group's variable list, nesting anything that matches a
// PARAMETER_FAMILIES member under one expandable umbrella row instead of
// listing every related-but-different reading as a separate flat row.
// Official CalCOFI Bottle/Cast Field Descriptions — mapped from the CSV's
// old field codes (e.g. "O2ml_L", "C14As1") to the release DB's raw
// variable names (e.g. "oxygen_ml_l", "c14_rep1"), since the two use
// completely different naming conventions. Typos/OCR artifacts in the
// source CSV are cleaned up (Kg/M³, µmol/kg, 360°, Celsius, Meteorological,
// Micrograms, fluorometrically). Takes priority over the release DB's own
// (terser) `description` field when a mapping exists.
const FIELD_DESCRIPTIONS = {
  // calcofi_bottle (Bottle_Field_Descriptions.csv)
  temperature: 'Water temperature in degrees Celsius',
  salinity: 'Salinity (Practical Salinity Scale 1978)',
  oxygen_ml_l: 'Milliliters oxygen per liter of seawater',
  sigma_theta: 'Potential Density (Sigma Theta), kg/m³',
  oxygen_saturation: 'Oxygen percent saturation',
  oxygen_umol_kg: 'Oxygen micromoles per kilogram seawater',
  chlorophyll_a: 'Micrograms Chlorophyll-a per liter seawater, measured fluorometrically',
  phaeopigment: 'Micrograms Phaeopigment per liter seawater, measured fluorometrically',
  phosphate: 'Micromoles Phosphate per liter of seawater',
  silicate: 'Micromoles Silicate per liter of seawater',
  nitrite: 'Micromoles Nitrite per liter of seawater',
  nitrate: 'Micromoles Nitrate per liter of seawater',
  ammonia: 'Micromoles Ammonia per liter of seawater',
  c14_rep1: '14C Assimilation of Replicate 1 (milligrams carbon per cubic meter of seawater per half light day)',
  c14_rep2: '14C Assimilation of Replicate 2 (milligrams carbon per cubic meter of seawater per half light day)',
  c14_dark: '14C Assimilation of Dark/Control Bottle (milligrams carbon per cubic meter of seawater per half light day)',
  c14_mean: 'Mean 14C Assimilation of Replicates 1 and 2 (milligrams carbon per cubic meter of seawater per half light day)',
  light_pct: 'Light intensities of the incubation tubes in the primary productivity experiment, expressed as percentages',
  r_depth: 'Reported Depth (from pressure) in meters',
  r_temperature: 'Reported (Potential) Temperature in degrees Celsius',
  r_dynamic_height: 'Reported Dynamic Height in units of dynamic meters (work per unit mass)',
  r_ammonium: 'Reported Ammonium concentration',
  r_oxygen_umol_kg: 'Reported Oxygen micromoles/kilogram',
  dic_rep1: 'Dissolved Inorganic Carbon micromoles per kilogram solution',
  dic_rep2: 'Dissolved Inorganic Carbon micromoles per kilogram solution (on a replicate sample)',
  alkalinity_rep1: 'Total Alkalinity micromoles per kilogram solution',
  alkalinity_rep2: 'Total Alkalinity micromoles per kilogram solution (on a replicate sample)',
  ph_rep1: 'pH (the degree of acidity/alkalinity of a solution)',
  ph_rep2: 'pH (the degree of acidity/alkalinity of a solution) on a replicate sample',

  // calcofi_ctd-cast (Cast_Field_Descriptions.csv) — only the surface
  // meteorology fields overlap; the CTD sensor variables (temperature_1/2,
  // salinity_1/2, oxygen sensors, etc.) aren't in this legacy field list.
  wave_direction: 'Wave direction, reported using an abbreviated 360° azimuth circle (0° = true north, 180° = south)',
  wave_height: 'Wave height in feet',
  wave_period: 'Wave period in seconds',
  wind_direction: 'Wind direction, reported using an abbreviated 360° azimuth circle (0° = true north, 180° = south)',
  wind_speed: 'Wind speed in knots',
  barometric_pressure: 'Barometric pressure in millibars, to the tenths',
  dry_air_temp: 'Dry air temperature from a sling psychrometer, in degrees Celsius',
  wet_air_temp: 'Wet air temperature from a sling psychrometer, in degrees Celsius',
  weather_code: '1-digit code from the World Meteorological Organization (WMO 4501)',
  cloud_type: '1-digit code from the World Meteorological Organization (WMO 0500)',
  cloud_amount: '1-digit code from the World Meteorological Organization, in oktas (WMO 2700)',
  visibility: '1-digit code from the World Meteorological Organization (WMO 4300)',
  secchi_depth: 'Secchi disk depth in meters',
  water_color: 'Water color on the Forel-Ule scale; only used in the CalCOFI dataset from 1988-10 through 1998-04',
  small_plankton_biomass: 'Standardized volume of plankton with individual displacement volumes <5 mL',
  total_plankton_biomass: 'Standardized volume of plankton in the sample',
  pressure: 'Pressure in decibars (dbar) from the CTD sensor — approximately equivalent to depth in meters',
  air_temp_c: 'Air temperature',
  uws_flow: 'Measure of water flow through the underway seawater system',
  rel_humidity_pct: 'Relative humidity',
  // calcofi_ctd-cast — the raw sensor voltage variables. Their source
  // `description` fields are identical (case-only) to their display labels
  // (e.g. "Fluorescence voltage" vs "Fluorescence Voltage"), so
  // descriptionFor()'s just-repeats-the-name check strips them to nothing.
  // Real descriptions here instead of relying on the source field.
  fluorescence_v: 'Raw voltage output from the fluorometer sensor, before conversion to chlorophyll-a concentration',

  het_bacteria: 'Heterotrophic bacteria abundance (FCM)',
  picoeukaryotes: 'Picoeukaryote abundance (FCM)',
  prochlorococcus: 'Prochlorococcus abundance (FCM)',
  synechococcus: 'Synechococcus abundance (FCM)',
};

// Falls back to the per-variable `description` field for loose (non-family)
// rows, same as Betty's original renderParamRow — skipped if it just
// repeats the label, or is one of a few generic boilerplate strings that
// show up verbatim across many unrelated variables.
const GENERIC_DESCRIPTION_BLOCKLIST = new Set(['quality code', 'zooplankton taxonomic observation', 'euphausiid species observation']);
function descriptionFor(v, label) {
  const officialDesc = FIELD_DESCRIPTIONS[v.display_name || v.name];
  if (officialDesc) return officialDesc;
  const desc = (v.description || '').trim();
  const descLower = desc.toLowerCase();
  if (desc && descLower !== label.toLowerCase() && !GENERIC_DESCRIPTION_BLOCKLIST.has(descLower)) {
    const wrapperMatch = desc.match(/^underway visual sighting record\s*\((.+)\)$/i);
    return wrapperMatch ? wrapperMatch[1] : desc;
  }
  return '';
}
// Splits "Seabirds & Marine Mammals" into subgroups the same way Zooplankton
// splits by source dataset — classified by genus (from the scientific
// name), falling back to a common-name keyword match for the handful of
// "(species group)" placeholder entries with no binomial. Verified against
// the real dataset: 113 birds, 32 mammals, 2 reptiles.
const MAMMAL_GENERA = new Set(['Berardius', 'Balaenoptera', 'Tursiops', 'Ziphius', 'Phocoenoides', 'Pseudorca',
  'Eschrichtius', 'Arctocephalus', 'Phocoena', 'Phoca', 'Megaptera', 'Orcinus', 'Mirounga', 'Callorhinus',
  'Lissodelphis', 'Lagenorhynchus', 'Globicephala', 'Kogia', 'Grampus', 'Enhydra', 'Physeter', 'Eumetopias',
  'Stenella', 'Delphinus', 'Zalophus']);
const REPTILE_GENERA = new Set(['Chelonia', 'Lepidochelys', 'Caretta', 'Dermochelys', 'Eretmochelys']);
function birdMammalGroup(v) {
  const name = (v.name || '').trim();
  const genus = name && !name.startsWith('(') ? name.split(' ')[0] : '';
  if (MAMMAL_GENERA.has(genus)) return 'Marine Mammals';
  if (REPTILE_GENERA.has(genus)) return 'Sea Turtles';
  if (genus) return 'Seabirds';
  const cn = (v.display_name || '').toLowerCase();
  if (['whale', 'dolphin', 'seal', 'porpoise', 'sea lion', 'otter'].some(k => cn.includes(k))) return 'Marine Mammals';
  if (cn.includes('turtle')) return 'Sea Turtles';
  return 'Seabirds';
}
// Splits "Fish Eggs & Larvae" the same way — first by dataset (CUFES vs
// Ichthyoplankton are different collection methods, not just different
// species), then Ichthyoplankton's ~1150 taxa further by rank (the ~460
// genus/family/order-level entries are a much smaller, separate browsing
// group) and by starting letter for the ~710 actual species (verified
// against the real counts: A-D 201, E-L 144, M-R 187, S-Z 177 — no
// external taxonomy lookup needed, so nothing here is guessed).
function fishEggsGroup(v) {
  if (v.dataset_key === 'swfsc_cufes') return 'CUFES (Underway Egg Counts)';
  // Genus/family/order and species used to be two separate groups, but rank
  // is already visually distinguishable via taxonLabel()'s one-word vs
  // two-word italic scientific name (e.g. "Thunnus" vs "Thunnus alalunga"),
  // so splitting them added a header without adding real distinction — and
  // it kept a genus and its own species apart alphabetically instead of
  // sitting next to each other.
  return 'Ichthyoplankton (Fish Eggs & Larvae)';
}
// Splits "Zooplankton" by dataset — ZooDB (net-tow holoplankton community),
// ZooScan (automated imaging, mostly order/class-level), and Phyllosoma
// (lobster larvae) are three genuinely different collection methods, not
// just different species, so mixing them into one flat list buries
// Phyllosoma's single entry among 52 others with no way to tell them apart.
function zooplanktonGroup(v) {
  if (v.dataset_key === 'calcofi_phyllosoma') return 'Phyllosoma (Lobster Larvae)';
  if (v.dataset_key === 'cce-lter_zooscan') return 'ZooScan (Imaged Zooplankton)';
  if (v.dataset_key === 'cce-lter_zoodb') return 'ZooDB (Holoplankton Community)';
  if (v.dataset_key === 'swfsc_ichthyo') return 'Zooplankton Biovolume';
  return 'Zooplankton';
}
const LOOSE_GROUPERS = {
  'Seabirds & Marine Mammals': { order: ['Seabirds', 'Marine Mammals', 'Sea Turtles'], group: birdMammalGroup },
  'Fish Eggs & Larvae': {
    order: ['CUFES (Underway Egg Counts)', 'Ichthyoplankton (Fish Eggs & Larvae)'],
    group: fishEggsGroup },
  'Zooplankton': {
    order: ['ZooDB (Holoplankton Community)', 'ZooScan (Imaged Zooplankton)', 'Zooplankton Biovolume', 'Phyllosoma (Lobster Larvae)', 'Zooplankton'],
    group: zooplanktonGroup },
};
// Explicit priority order for how families list within a category — puts
// the most commonly searched physical parameters first. Categories not
// listed here keep their current (roughly build-order) sequence. Loose
// (non-family) items already sort alphabetically below, which works fine
// for the handful of less-common physical readings (Beam Attenuation,
// Pressure, Transmissometer, Water Color).
const CATEGORY_ITEM_ORDER = {
  'Physical Oceanography': ['Temperature', 'Salinity', 'Density', 'Pressure', 'Atmospheric Pressure', 'Conductivity',
    'Depth', 'Oxygen', 'Dynamic Height', 'Sound Velocity'],
  'Productivity & Pigments': ['Chlorophyll-a', 'Phaeopigment', 'Primary Productivity (C14 Assimilation)', 'Photosynthetically Active Radiation'],
};
function renderVarList(groupKey, vars) {
  const families = {}, loose = [];
  vars.forEach(v => {
    const fm = familyMemberFor(v);
    if (fm) (families[fm.family.name] ||= { family: fm.family, items: [] }).items.push({ v, member: fm.member, source: fm.source });
    else loose.push(v);
  });
  const familyList = Object.values(families);
  const priority = CATEGORY_ITEM_ORDER[groupKey];
  if (priority) {
    familyList.sort((a, b) => {
      const ai = priority.indexOf(a.family.name), bi = priority.indexOf(b.family.name);
      return (ai === -1 ? priority.length : ai) - (bi === -1 ? priority.length : bi);
    });
  }
  const familyHtml = familyList.map(({ family, items }) => {
    const famKey = groupKey + '::' + family.name;
    const famOpen = expandedFamilyKey === famKey;
    // A group member (e.g. Temperature) may have several items sharing the
    // same member object, one per data source — dedupe into a single row.
    // A single member (e.g. Dry Bulb Temperature) always has exactly one.
    const byMember = new Map();
    items.forEach(it => { (byMember.get(it.member) || byMember.set(it.member, []).get(it.member)).push(it); });
    const orderedMembers = family.members.filter(m => byMember.has(m));

    // A family that boils down to exactly one group member (Alkalinity,
    // DIC, Sigma Theta...) has nothing distinct to say at the family level
    // that the member doesn't already say — skip the redundant outer
    // accordion and render its source list directly under the family name.
    if (byMember.size === 1 && [...byMember.keys()][0].type === 'group') {
      const [member, its] = [...byMember.entries()][0];
      if (its.length === 1) {
        return `<div class="inventory-subitem" data-vid="${encodeURIComponent(its[0].v.variable_id)}">
            <span class="inventory-subitem-name">${family.name}</span>
            <div class="inventory-family-method">${member.method}</div>
          </div>`;
      }
      const dupe1 = hasDupDataset(its);
      const sourceRows = famOpen ? its.map(it => sourceCardRow(it, dupe1)).join('') : '';
      return `<div class="inventory-subitem inventory-family-header" data-family-key="${famKey}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span class="inventory-subitem-name">${family.name}</span>
            <span class="inventory-umbrella-caret">${famOpen ? '▾' : '▸'}</span>
          </div>
          <span class="inventory-subitem-meta">${member.method}</span>
        </div>
        ${famOpen ? `<div class="inventory-sublinks"><div class="inventory-source-hint">Choose a dataset to view its coverage</div>${sourceRows}</div>` : ''}`;
    }
    // Same idea when a family reduces to exactly one plain 'single' member —
    // happens when a category filter splits a family's members apart (e.g.
    // Depth normally has 2 members, but Secchi Depth alone categorizes as
    // Meteorology & Sea State while the rest stay in Physical Oceanography).
    // One item behind an accordion is just a worse-looking loose row.
    if (byMember.size === 1 && [...byMember.keys()][0].type === 'single') {
      const [member, its] = [...byMember.entries()][0];
      return `<div class="inventory-subitem" data-vid="${encodeURIComponent(its[0].v.variable_id)}">
          <span class="inventory-subitem-name">${member.label}</span>
          <div class="inventory-family-method">${member.method}</div>
        </div>`;
    }

    const shortList = orderedMembers.map(m => m.short).join(', ');
    const memberRows = famOpen ? orderedMembers.map(member => {
      const its = byMember.get(member);
      if (member.type === 'single') {
        return `<div class="inventory-subitem" data-vid="${encodeURIComponent(its[0].v.variable_id)}">
            <span class="inventory-subitem-name">${member.label}</span>
            <div class="inventory-family-method">${member.method}</div>
          </div>`;
      }
      if (its.length === 1) {
        return `<div class="inventory-subitem" data-vid="${encodeURIComponent(its[0].v.variable_id)}">
            <span class="inventory-subitem-name">${member.label}</span>
            <div class="inventory-family-method">${member.method}</div>
          </div>`;
      }
      // group member: one row, expands to a source list (which dataset
      // measures it) instead of pretending each source is a different
      // parameter — matches Betty's "Temperature > Bottle; CTD Cast" model
      const grpKey = famKey + '::' + member.label;
      const grpOpen = expandedGroupKey === grpKey;
      const dupe2 = hasDupDataset(its);
      const sourceRows = grpOpen ? its.map(it => sourceCardRow(it, dupe2)).join('') : '';
      return `<div class="inventory-subitem inventory-family-header" data-group-key="${grpKey}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span class="inventory-subitem-name">${member.label}</span>
            <span class="inventory-umbrella-caret">${grpOpen ? '▾' : '▸'}</span>
          </div>
          <span class="inventory-subitem-meta">${member.method}</span>
        </div>
        ${grpOpen ? `<div class="inventory-sublinks"><div class="inventory-source-hint">Choose a dataset to view its coverage</div>${sourceRows}</div>` : ''}`;
    }).join('') : '';
    return `<div class="inventory-subitem inventory-family-header" data-family-key="${famKey}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span class="inventory-subitem-name">${family.name}</span>
          <span class="inventory-umbrella-caret">${famOpen ? '▾' : '▸'}</span>
        </div>
        <span class="inventory-subitem-meta">${shortList}</span>
      </div>
      ${famOpen ? `<div class="inventory-sublinks inventory-family-members">${memberRows}</div>` : ''}`;
  }).join('');
  const looseRow = (v, hidden) => {
    const label = displayLabel(v);
    const desc = descriptionFor(v, label);
    // Must match letterOf() exactly (common name first, scientific name
    // fallback) — this used to key off displayLabel() instead, which
    // ignores common_name entirely and falls back to the raw scientific
    // name. That mismatch is why clicking a jump-nav letter showed genus
    // entries under the wrong letter: the nav button and initial view used
    // the correct common-name letter, but the click handler re-filtered
    // using this attribute, computed a different (wrong) way.
    const letter = /[A-Za-z]/.test(sortNameFor(v)[0]) ? sortNameFor(v)[0].toUpperCase() : '#';
    return `<div class="inventory-subitem" data-vid="${encodeURIComponent(v.variable_id)}" data-letter="${letter}"${hidden ? ' style="display:none"' : ''}>
        <span class="inventory-subitem-name">${taxonLabel(v)}</span>
        ${desc ? `<span class="inventory-family-method">${desc}</span>` : ''}
      </div>`;
  };
  // A-Z jump nav for any subgroup long enough to actually need it (127
  // Seabirds & Marine Mammals scrolls fine without one; 709 Ichthyoplankton
  // species doesn't). Greyed-out letters have zero entries — kept visible
  // rather than removed, so the row's layout stays stable rather than
  // shifting around as data changes.
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterOf = v => { const l = sortNameFor(v)[0]; return /[A-Za-z]/.test(l) ? l.toUpperCase() : '#'; };
  const jumpNav = (listId, items, activeLetter) => {
    if (items.length < 150) return '';
    const present = new Set(items.map(letterOf));
    return `<div class="inventory-jumpnav" id="${listId}-nav">${ALPHABET.map(l => present.has(l)
      ? `<button class="inventory-jumpnav-btn${l === activeLetter ? ' inventory-jumpnav-btn-active' : ''}" onclick="jumpToLetter('${listId}','${l}')">${l}</button>`
      : `<span class="inventory-jumpnav-btn inventory-jumpnav-btn-off">${l}</span>`).join('')}</div>`;
  };
  const PINNED_LOOSE_ITEM = {};
  const PINNED_LOOSE_ITEM_LAST = { 'Nutrients & Chemistry': 'isus_v' };
  const pinned = PINNED_LOOSE_ITEM[groupKey];
  const pinnedLast = PINNED_LOOSE_ITEM_LAST[groupKey];
  loose.sort((a, b) => {
    if (pinned) {
      const aPinned = a.name === pinned, bPinned = b.name === pinned;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
    }
    if (pinnedLast) {
      const aLast = a.name === pinnedLast, bLast = b.name === pinnedLast;
      if (aLast !== bLast) return aLast ? 1 : -1;
    }
    const aTaxon = a.variable_type === 'taxon', bTaxon = b.variable_type === 'taxon';
    if (aTaxon !== bTaxon) return aTaxon ? -1 : 1;
    return sortNameFor(a).localeCompare(sortNameFor(b));
  });
  let looseHtml;
  const grouper = LOOSE_GROUPERS[groupKey];
  if (grouper) {
    const groups = {};
    loose.forEach(v => (groups[grouper.group(v)] ||= []).push(v));
    looseHtml = grouper.order.filter(g => groups[g]?.length)
      .map((g, i) => {
        const listId = groupKey.replace(/\W+/g, '') + '-' + i;
        const items = groups[g];
        const hasNav = items.length >= 150;
        // Default to the first available letter (usually A) instead of
        // starting fully collapsed — a large list still needs the nav to
        // browse further, but there's no reason to show nothing at all
        // until the user clicks something.
        const defaultLetter = hasNav ? (ALPHABET.find(l => items.some(v => letterOf(v) === l)) || null) : null;
        const nav = jumpNav(listId, items, defaultLetter);
        const rows = items.map(v => looseRow(v, hasNav && letterOf(v) !== defaultLetter)).join('');
        return `<div class="inventory-subcategory-header">${g}</div>
          ${nav}
          <div id="${listId}">${rows}</div>`;
      }).join('');
  } else {
    looseHtml = loose.map(v => looseRow(v, false)).join('');
  }
  return familyHtml + looseHtml || '<div class="inventory-subitem">No variables cataloged.</div>';
}
function jumpToLetter(listId, letter) {
  const container = document.getElementById(listId);
  const nav = document.getElementById(listId + '-nav');
  if (!container) return;
  container.querySelectorAll('.inventory-subitem[data-letter]').forEach(el => {
    el.style.display = el.dataset.letter === letter ? '' : 'none';
  });
  if (nav) nav.querySelectorAll('button.inventory-jumpnav-btn').forEach(b =>
    b.classList.toggle('inventory-jumpnav-btn-active', b.textContent === letter));
}
function renderInventoryPanel() {
  const empty = document.getElementById('panel-empty'); if (!empty) return;
  // Union the hardcoded presentation map with whatever dataset_keys the release
  // actually carries, so a dataset renamed since DATASET_META was last touched
  // still lists (named by dsMeta()'s release fallback, in the default grey)
  // instead of vanishing from this panel entirely. DATASET_VAR_COUNTS still
  // gates it, so a key with no variables in variables.json never appears.
  const keys = inventoryMode === 'dataset'
    ? [...new Set([...Object.keys(DATASET_META), ...Object.keys(DATASETS_META)])]
        .filter(k => DATASET_VAR_COUNTS[k]).sort((a, b) => dsMeta(a).label.localeCompare(dsMeta(b).label))
    : CATEGORY_ORDER.filter(c => CAT_COUNTS[c]);

  const rows = keys.map(k => {
    const count = inventoryMode === 'dataset' ? DATASET_VAR_COUNTS[k] : CAT_COUNTS[k];
    const label = inventoryMode === 'dataset' ? dsMeta(k).label : catLabel(k);
    const isOpen = expandedInventoryGroup === k;
    const sub = isOpen
      ? `<div class="inventory-sublist">${inventoryMode === 'dataset' ? renderFlatVarList(inventoryVarsFor(k)) : renderVarList(k, inventoryVarsFor(k))}</div>`
      : '';
    return `<div class="inventory-row${isOpen ? ' inventory-row-open' : ''}" data-key="${k}">
        <span class="inventory-label">${label}</span>
        <span class="inventory-count">${count}</span>
        <span class="inventory-arrow">${isOpen ? '↓' : '→'}</span>
      </div>${sub}`;
  }).join('');

  const subtitle = inventoryMode === 'dataset'
    ? 'Click a dataset below to see every variable it measures, or click any station on the map to see everything measured there'
    : 'Click a category below to see which variables it includes, or click any station on the map to see everything measured there';

  empty.innerHTML = `<div class="inventory-panel">
      <div class="inventory-title">WHAT CALCOFI MEASURES</div>
      <div class="inventory-subtitle">${subtitle}</div>
      <div class="inventory-view-tabs">
        <button class="inventory-view-tab${inventoryMode === 'category' ? ' inventory-view-tab-active' : ''}" onclick="setInventoryMode('category')">By Category</button>
        <button class="inventory-view-tab${inventoryMode === 'dataset' ? ' inventory-view-tab-active' : ''}" onclick="setInventoryMode('dataset')">By Dataset</button>
      </div>
      <div class="inventory-list">${rows}</div>
    </div>`;

  empty.querySelectorAll('.inventory-row[data-key]').forEach(el =>
    el.addEventListener('click', () => toggleInventoryGroup(el.dataset.key)));
  empty.querySelectorAll('.inventory-family-header[data-family-key]').forEach(el =>
    el.addEventListener('click', e => { e.stopPropagation(); toggleFamily(el.dataset.familyKey); }));
  empty.querySelectorAll('.inventory-family-header[data-group-key]').forEach(el =>
    el.addEventListener('click', e => { e.stopPropagation(); toggleGroup(el.dataset.groupKey); }));
  empty.querySelectorAll('.inventory-subitem[data-vid], .inventory-source-card[data-vid], .data-link[data-vid]').forEach(el =>
    el.addEventListener('click', e => { e.stopPropagation(); selectVariable(decodeURIComponent(el.dataset.vid)); }));
}

// ---- station markers ----
function baseStyle(s, dim = false) {
  const nd = s.n_datasets || 0, has = nd > 0;
  return {
    radius: has ? 3.5 + Math.sqrt(nd) * 1.9 : 3,
    weight: 1, color: has ? '#cfd8e3' : '#5a626b',
    fillColor: has ? '#4dabf7' : '#3a3f44',
    fillOpacity: dim ? 0.12 : (has ? 0.72 : 0.35),
    opacity: dim ? 0.2 : 0.9
  };
}
function renderStations() {
  STATIONS.forEach(s => {
    const m = L.circleMarker([s.lat, s.lon], baseStyle(s)).addTo(map);
    m.on('click', () => { if (compareMode) toggleStationSelection(s.grid_key); else openStation(s); });
    m.bindTooltip(`${s.station_id}` + (s.n_datasets ? ` · ${s.n_datasets} datasets` : ' · no data'),
      { direction: 'top', offset: [0, -2] });
    MARKERS[s.grid_key] = m;
  });
}

// ---- helpers ----
const yr = d => (d ? String(d).slice(0, 4) : '—');
const day = d => (d ? String(d).slice(0, 10) : '—');
const num = n => (n == null ? '0' : n.toLocaleString());
const ym = d => (d ? String(d).slice(0, 7) : '—');

function yearBars(years, color, large) {
  if (!years || !years.length) return '<div class="bars empty">no dates</div>';
  const y0 = years[0].y, y1 = years[years.length - 1].y, m = {};
  years.forEach(o => m[o.y] = o.n);
  const max = Math.max(...years.map(o => o.n));
  const scale = large ? 100 : 30;
  let cells = '';
  for (let y = y0; y <= y1; y++) {
    const n = m[y] || 0, h = n ? (6 + scale * n / max) : 1;
    cells += `<span class="ybar" style="height:${h}px;background:${color};opacity:${n ? 0.85 : 0.13}" data-tip="${y}: ${num(n)}"></span>`;
  }
  return `<div class="bars"><span class="yl">${y0}</span><div class="ybars">${cells}</div><span class="yl">${y1}</span></div>`;
}
function monthBars(months, color) {
  const m = {};
  (months || []).forEach(o => m[o.m] = o.n);
  const max = Math.max(1, ...Object.values(m));
  let cells = '';
  for (let i = 1; i <= 12; i++) {
    const n = m[i] || 0, op = 0.13 + 0.87 * n / max;
    cells += `<span class="mbar" style="background:${color};opacity:${op}" data-tip="${MONTHS[i - 1]}: ${num(n)}">${MONTHS[i - 1]}</span>`;
  }
  return `<div class="mbars">${cells}</div>`;
}
// Global delegated hover handling for the styled chart tooltip — one
// listener covers every bar rendered anywhere (station panel, modal),
// including bars added after the initial page load.
function initChartTooltip() {
  const tip = document.getElementById('chart-tooltip');
  if (!tip) return;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.ybar[data-tip], .mbar[data-tip], .depth-dot[data-tip]');
    if (!el) return;
    tip.textContent = el.dataset.tip;
    tip.style.display = 'block';
  });
  document.addEventListener('mousemove', e => {
    if (tip.style.display !== 'block') return;
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top = (e.clientY - 28) + 'px';
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.ybar[data-tip], .mbar[data-tip], .depth-dot[data-tip]')) tip.style.display = 'none';
  });
}
// ---- pin-to-compare: lets a person pin a dataset card from one station,
// click a different station, and still see the first one's numbers —
// solves the "have to scroll back and forth to compare stations" problem.
// PIN_CANDIDATES holds enough to redraw any card that's ever been rendered
// with a stationId (keyed by station+dataset+label, since Bottle/Cast share
// a dataset_key but need separate entries); PINNED_CARDS is just the
// person's actual picks. No cap — pin as many as you want.
const PIN_CANDIDATES = {};
let PINNED_CARDS = [];
const pinKeyFor = (stationId, datasetKey, label) => `${stationId}::${datasetKey}::${label}`;
const isPinned = key => PINNED_CARDS.some(p => p.key === key);
function togglePin(key) {
  const idx = PINNED_CARDS.findIndex(p => p.key === key);
  if (idx !== -1) {
    PINNED_CARDS.splice(idx, 1);
  } else {
    const cand = PIN_CANDIDATES[key];
    if (!cand) return;
    PINNED_CARDS.push({ key, ...cand });
  }
  renderPinnedTray();
  applyStyles();
  syncPinButtons(key);
}
// Flip just this card's button, instead of re-rendering the station panel.
// Both branches above used to end in openStation(currentStation), called purely
// to change one icon between 📍 and 📌. That rebuilds the panel's innerHTML,
// which resets every <details> accordion's open/closed state and the scroll
// position — so pinning a card you had scrolled down to threw away your place —
// and it ran applyStyles() a second time over all 218 markers on every toggle.
//
// Matched by comparing dataset.pinKey rather than building an attribute
// selector: a pin key is `${stationId}::${datasetKey}::${label}`, so it carries
// spaces and colons and would need escaping to be safe inside a selector string.
function syncPinButtons(key) {
  const pinned = isPinned(key);
  document.querySelectorAll('.ds-pin-btn').forEach(b => {
    if (b.dataset.pinKey !== key) return;
    b.classList.toggle('ds-pin-btn-active', pinned);
    b.title = pinned ? 'Unpin' : 'Pin to compare';
    b.textContent = pinned ? '📌' : '📍';
  });
}
let draggedPinKey = null;
function renderPinnedTray() {
  let tray = document.getElementById('pinned-tray');
  if (!PINNED_CARDS.length) { if (tray) tray.remove(); return; }
  // rebuilding via innerHTML below replaces the scrollable .pinned-tray-cards
  // element entirely, which would silently reset its scroll position back
  // to 0 on every render (including after a drag-to-reorder drop) — capture
  // it first and restore it after, so reordering doesn't jump the view.
  const prevCards = tray && tray.querySelector('.pinned-tray-cards');
  const prevScrollLeft = prevCards ? prevCards.scrollLeft : 0;
  if (!tray) {
    tray = document.createElement('div');
    tray.id = 'pinned-tray';
    document.body.appendChild(tray);
  }
  tray.innerHTML = `<div class="pinned-tray-header">
      <span>Comparing ${PINNED_CARDS.length} station${PINNED_CARDS.length === 1 ? '' : 's'}</span>
      <button class="pinned-tray-clear" onclick="PINNED_CARDS=[];renderPinnedTray();applyStyles();if(currentStation) openStation(currentStation);">Clear all</button>
    </div>
    <div class="pinned-tray-cards">
      ${PINNED_CARDS.map(p => `<div class="pinned-tray-item" draggable="true" data-pin-key="${p.key}" onclick="locatePinnedStation('${p.grid_key}')">
          <div class="pinned-tray-station"><span><span class="pinned-tray-drag-handle">⠿</span>Station ${p.station_id}</span>
            <button class="pinned-tray-unpin" onclick="event.stopPropagation(); togglePin('${p.key}')" aria-label="Unpin">✕</button>
          </div>
          ${datasetCard(p.d, { label: p.label, color: p.color })}
        </div>`).join('')}
    </div>`;
  const newCards = tray.querySelector('.pinned-tray-cards');
  if (newCards) newCards.scrollLeft = prevScrollLeft;
  // Drag-to-reorder — plain HTML5 drag/drop, no library. Rewired after every
  // render since innerHTML replaces the whole tray each time (same pattern
  // as every other delegated-listener block in this file).
  tray.querySelectorAll('.pinned-tray-item[data-pin-key]').forEach(el => {
    el.addEventListener('dragstart', () => {
      draggedPinKey = el.dataset.pinKey;
      el.classList.add('pinned-tray-item-dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('pinned-tray-item-dragging'));
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      const targetKey = el.dataset.pinKey;
      if (!draggedPinKey || draggedPinKey === targetKey) return;
      const fromIdx = PINNED_CARDS.findIndex(p => p.key === draggedPinKey);
      const toIdx = PINNED_CARDS.findIndex(p => p.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = PINNED_CARDS.splice(fromIdx, 1);
      PINNED_CARDS.splice(toIdx, 0, moved);
      draggedPinKey = null;
      renderPinnedTray();
    });
  });
}
// Pans the map to a pinned station and flashes its ring — lets you find
// where a card in the compare tray actually is, without switching the main
// panel away from whatever station you currently have open.
function locatePinnedStation(gridKey) {
  const s = BY_KEY[gridKey];
  const mk = MARKERS[gridKey];
  if (!s || !mk) return;
  const targetZoom = Math.max(map.getZoom(), 7);
  // The tray sits fixed at the bottom of the screen, on top of the map —
  // a plain flyTo centers on the full container height, unaware the bottom
  // ~40vh is covered. Shift the pan target by half the tray's actual height
  // (in map pixels, at the target zoom) so the station lands in the
  // visible area above it instead of right behind it.
  const trayEl = document.getElementById('pinned-tray');
  const trayHeight = trayEl ? trayEl.getBoundingClientRect().height : 0;
  const point = map.project([s.lat, s.lon], targetZoom).add([0, trayHeight / 2]);
  const target = map.unproject(point, targetZoom);
  map.flyTo(target, targetZoom, { duration: 0.5 });
  mk.bringToFront();
  const el = mk.getElement && mk.getElement();
  if (el) {
    el.classList.add('marker-flash');
    setTimeout(() => el.classList.remove('marker-flash'), 1200);
  }
}
function mixHex(hex, pct, base) {
  const parse = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hex), [r2, g2, b2] = parse(base);
  const p = pct / 100;
  const toHex = n => Math.round(n).toString(16).padStart(2, '0');
  const mix = (a, b) => a * p + b * (1 - p);
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}
// The "N surveys" figure on a dataset card is a count with nothing behind
// it — build_stations.sql now also carries the actual cruises (cruise_key +
// date + ship, via cov_cruises). Rather than a separate disclosure row (which
// read as an orphaned link floating between Coverage and the year bars), the
// affordance lives right on the number it explains: a small "i" chip after
// "N surveys" that toggles a collapsed-by-default list underneath the whole
// stats block. Toggle + expand area are rendered separately (surveysToggleBtn
// goes inside the Coverage stat's value; surveysExpandBlock goes after
// .ds-stats closes) since a <button> can't wrap block content sanely inline
// in a flex row — the click handler finds its own card's expand block via
// closest('.ds-card'), so no per-instance id bookkeeping is needed even with
// many cards on the page. stopPropagation keeps the click from also
// triggering the card's own onclick when the card is the modal-opening
// (opts.clickable) variant — same pattern as the pin/download buttons below.
// Both return '' when a card has no cruise list at all (older cached data,
// or a dataset whose cruise_key never made it into the release).
function surveysToggleBtn(cruises) {
  if (!cruises || !cruises.length) return '';
  return ` <button type="button" class="ds-surveys-icon-btn" title="Show the ${cruises.length} cruises behind this count"
      onclick="event.stopPropagation(); this.closest('.ds-card').querySelector('.ds-surveys-expand').classList.toggle('ds-surveys-expand-open')">i</button>`;
}
function surveysExpandBlock(cruises) {
  if (!cruises || !cruises.length) return '';
  // `cruises` is a list of bare cruise_key strings (stations.json); each
  // cruise's date/ship comes from CRUISE_REF (cruises.json) at render time.
  const rows = cruises.map(k => {
    const c = CRUISE_REF[k] || {};
    return `<li class="ds-survey-row">
      <span class="ds-survey-date">${ym(c.date_min)}</span>
      <span class="ds-survey-ship">${c.ship_name || '—'}</span>
      <span class="ds-survey-key">${k}</span>
    </li>`;
  }).join('');
  return `<div class="ds-surveys-expand"><ul class="ds-surveys-list">${rows}</ul></div>`;
}
function datasetCard(d, opts) {
  opts = opts || {};
  const meta = dsMeta(d.dataset_key);
  const label = opts.label || meta.label;
  const color = opts.color || meta.color;
  const depth = (d.depth_min != null || d.depth_max != null)
    ? `${Math.round(d.depth_min ?? 0)}–${Math.round(d.depth_max ?? 0)} m` : 'depth n/a';
  const clickAttrs = opts.clickable
    ? ` onclick="openDatasetCardModal('${d.dataset_key}', '${label.replace(/'/g, "\\'")}', '${color}')"` : '';
  // Registering the pin candidate is a side effect of rendering — same
  // pattern as MARKERS being populated during renderStations(). Only when
  // this card belongs to a real station (stationId set) and isn't already
  // the enlarged/pinned-tray rendering of itself (opts.large / no clickable
  // both signal "not the original small card").
  let pinBtn = '';
  if (opts.stationId && !opts.large) {
    const key = pinKeyFor(opts.stationId, d.dataset_key, label);
    PIN_CANDIDATES[key] = { station_id: opts.stationId, grid_key: opts.stationGridKey, label, color, d };
    const pinned = isPinned(key);
    // data-pin-key (not just the inline handler's argument) so togglePin can
    // find this exact button afterwards and flip it in place — see syncPinButtons.
    pinBtn = `<button class="ds-pin-btn${pinned ? ' ds-pin-btn-active' : ''}" title="${pinned ? 'Unpin' : 'Pin to compare'}"
        data-pin-key="${htmlAttr(key)}"
        onclick="event.stopPropagation(); togglePin('${key.replace(/'/g, "\\'")}')">${pinned ? '📌' : '📍'}</button>`;
  }
  let downloadBtn;
  const vars = opts.vars || CANON_VARS.filter(v => v.dataset_key === d.dataset_key);
  if (opts.compareContext) {
    const cardId = 'cmpcard' + (cardDownloadCounter++);
    CARD_COMPARE_CTX[cardId] = { d, label, color, stations: opts.compareContext, entries: opts.compareEntries || [], vars };
    downloadBtn = `<span class="ds-download-group">
        <button class="ds-download-link" title="Downloads a .zip with the card as a PNG plus its year/month coverage as CSV" onclick="event.stopPropagation(); downloadSingleComparisonCard('${cardId}')">⬇ PNG</button>
        <button class="ds-download-link" onclick="event.stopPropagation(); downloadSingleComparisonCardCSV('${cardId}')">⬇ CSV</button>
      </span>`;
  } else {
    const cardId = 'stncard' + (cardDownloadCounter++);
    CARD_DL_CTX[cardId] = { d, label, color, vars, stationGridKey: opts.stationGridKey };
    downloadBtn = `<span class="ds-download-group">
        <button class="ds-download-link" title="Downloads a .zip with the card as a PNG plus its year/month coverage as CSV" onclick="event.stopPropagation(); downloadSingleStationCard('${cardId}')">⬇ PNG</button>
        <button class="ds-download-link" id="csvbtn-${cardId}" onclick="event.stopPropagation(); downloadSingleStationCardCSV('${cardId}')">⬇ CSV</button>
      </span>`;
  }
  const avgBadge = opts.compareContext ? '<span class="ds-avg-badge" title="Values on this card are averaged across the contributing stations">AVG</span>' : '';
  const surveysToggle = surveysToggleBtn(d.cruises);
  const surveysExpand = surveysExpandBlock(d.cruises);
  return `<div class="ds-card${opts.clickable ? ' ds-card-clickable' : ''}${opts.large ? ' ds-card-large' : ''}" style="--c:${color};--card-bg:${mixHex(color, 6, '#0f1e35')}"${clickAttrs}>
      <div class="ds-head"><span class="ds-dot"></span><span class="ds-label">${label}</span>
        <div class="ds-head-right">${avgBadge}<span class="ds-realm ${d.realm}">${d.realm}</span></div>${pinBtn}</div>
      <div class="ds-stats">
        <div class="ds-stat"><span class="ds-stat-label">Date Range</span><span class="ds-stat-val">${day(d.time_min)} → ${day(d.time_max)}</span></div>
        <div class="ds-stat"><span class="ds-stat-label">Depth Range</span><span class="ds-stat-val">${depth}</span></div>
        <div class="ds-stat"><span class="ds-stat-label">Coverage</span><span class="ds-stat-val">${num(d.n_surveys)} surveys${surveysToggle} · ${num(d.n_obs)} obs</span></div>
      </div>
      ${surveysExpand}
      <div class="bars-label">observations by year</div>${yearBars(d.years, color, opts.large)}
      <div class="bars-label">seasonality (by month)</div>${monthBars(d.months, color)}
      <div class="ds-card-footer">${opts.clickable ? '<span class="ds-card-expand-hint">⤢ click to expand</span>' : '<span></span>'}${downloadBtn}</div>
    </div>`;
}
// Opens the enlarged, big-screen view of a dataset's coverage card for the
// currently open station — reuses the existing modal-backdrop/modal markup.
// `label`/`color` carry through the split-accordion override (Hydrographic
// Bottle vs Hydrographic Cast, both backed by dataset_key: calcofi_bottle —
// see datasetAccordion) so the enlarged modal matches whichever card the
// person actually clicked, indigo Cast color included.
function openDatasetCardModal(datasetKey, label, color) {
  if (!currentStation) return;
  const d = (currentStation.datasets || []).find(x => x.dataset_key === datasetKey);
  if (!d) return;
  const meta = dsMeta(d.dataset_key);
  document.getElementById('modal-title').textContent = `${label || meta.label} — Station ${currentStation.station_id}`;
  document.getElementById('modal-body').innerHTML = datasetCard(d, { large: true, label, color });
  document.getElementById('modal-footer').style.display = 'none';
  document.getElementById('modal').classList.add('modal-large');
  document.getElementById('modal-backdrop').classList.add('open');
}

// ---- station panel: per-dataset accordion (one row per dataset, first open) --
// Wraps the existing datasetCard() (reused as-is) in a native <details> row,
// plus a nested variable list for that dataset grouped by categoryOf() —
// ports Betty's original station-panel accordion onto the release-DB data.
// Flat, category-grouped variable list — name + description + units, no
// family/source accordion nesting. Used both for a station's per-dataset
// "Show Parameters" list and for the "By Dataset" browse panel, so a
// dataset's parameter list looks and reads the same in both places.
function renderFlatVarList(vars) {
  const byCat = {};
  vars.forEach(v => (byCat[categoryOf(v)] ||= []).push(v));
  const catRank = c => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? Infinity : i; };
  const catKeys = Object.keys(byCat).sort((a, b) => catRank(a) - catRank(b));
  return catKeys.map(c => `
      <div class="inventory-subcategory-header">${catLabel(c)}</div>
      ${byCat[c].map(v => {
          const label = displayLabel(v);
          const desc = descriptionFor(v, label);
          return `<div class="data-link" data-vid="${encodeURIComponent(v.variable_id)}">
              <div class="data-link-main">
                <span class="data-link-name">${resolvedLabel(v)}</span>
                ${desc ? `<div class="data-link-desc">${desc}</div>` : ''}
              </div>
              ${v.units ? `<span class="data-link-unit">${v.units}</span>` : ''}
            </div>`;
        }).join('')}`).join('')
    || '<div class="cov-empty">No cataloged variables.</div>';
}
function datasetAccordion(d, s, opts) {
  opts = opts || {};
  const label = opts.label || dsMeta(d.dataset_key).label;
  const vars = opts.vars || CANON_VARS.filter(v => v.dataset_key === d.dataset_key);
  const varList = renderFlatVarList(vars);
  return `<details class="ds-accordion-row" open>
      <summary class="ds-accordion-header">
        <span class="ds-accordion-label">${label}</span>
        <span class="ds-accordion-right">
          <span class="ds-accordion-count">${vars.length}</span>
          <span class="ds-accordion-chevron">▸</span>
        </span>
      </summary>
      <div class="ds-accordion-body">${datasetCard(d, { clickable: true, label, color: opts.color, stationId: s.station_id, stationGridKey: s.grid_key, vars })}
        <details class="params-toggle">
          <summary class="params-toggle-summary">Show Parameters</summary>
          <div class="params-list">${varList}</div>
        </details>
        ${decadeBlockFor(d, s, { clickable: true })}
      </div>
    </details>`;
}

// ---- station panel ----
// Single back-button slot at the top of the panel header — points at the
// station if one's open, otherwise back to the full category list.
// Matches Betty's original resetPanelUI()/openStation() pattern.
// Two distinct back-button states, matching Betty's original:
// - viewing a station directly -> always "All Categories" (there's no
//   "station within a station" to go back to)
// - viewing a variable -> "Back to Station X" if reached from one,
//   otherwise "All Categories"
function showBackToCategories() {
  const btn = document.getElementById('panel-back-btn');
  if (!btn) return;
  btn.textContent = '← All Categories';
  btn.onclick = () => clearAll();
  btn.style.display = '';
}
function updateBackButton() {
  const btn = document.getElementById('panel-back-btn');
  if (!btn) return;
  if (currentStation) {
    btn.textContent = `← Back to Station ${currentStation.station_id}`;
    btn.onclick = () => openStation(currentStation);
  } else {
    btn.textContent = '← All Categories';
    btn.onclick = () => clearAll();
  }
  btn.style.display = '';
}
function stationCardEntries(s) {
  return (s.datasets || []).flatMap(d => {
    if (d.dataset_key !== 'calcofi_bottle') return [{ d, label: dsMeta(d.dataset_key).label, color: dsMeta(d.dataset_key).color }];
    // If a station genuinely has zero recorded observations for one subset
    // (e.g. no weather/meteorology readings ever logged there, only bottle
    // chemistry), falling back to the OTHER subset's real numbers is
    // misleading — it looks like matching real coverage when there isn't
    // any. Show an honest empty state instead (day()/datasetCard already
    // render null/0 as "—"/"0 obs").
    const EMPTY_COV = { time_min: null, time_max: null, depth_min: null, depth_max: null, n_obs: 0, n_samples: 0, n_surveys: 0, years: null, months: null, cruises: [] };
    // If the file hasn't loaded (rare/pre-refresh), fall back to the shared
    // whole-dataset record — same graceful degradation as before this fix
    // existed. If it HAS loaded and this station simply has no entry for a
    // subset, that's a real zero — falling back to the other subset's
    // numbers there would misleadingly look like matching real coverage.
    const noDataFallback = bottleCastCovLoaded ? EMPTY_COV : d;
    const hydroCov = { ...d, ...(BOTTLE_CAST_COV[s.grid_key + '::calcofi_bottle_hydro'] || noDataFallback) };
    const castCov = { ...d, ...(BOTTLE_CAST_COV[s.grid_key + '::calcofi_bottle_cast'] || noDataFallback) };
    return [
      { d: hydroCov, label: 'Hydrographic Bottle', color: dsMeta('calcofi_bottle').color },
      { d: castCov, label: 'Hydrographic Cast', color: '#be8c63' },
    ];
  });
}
// Compare Stations tab content (feedback 2026-08-22: moved off the map
// overlay, and then out of the panel header, into its own tab alongside
// Overview and Depth Profiles — same lasso/line-select UI as before, just
// relocated to a place that doesn't compete for space with anything else).
// Static markup — doesn't depend on which station is open — so it's just
// dropped into the compare tab-content div fresh on every openStation().
function compareBarHtml() {
  return `<div class="compare-bar">
      <div class="compare-bar-header">
        <span id="compare-count">0 Selected</span>
        <button class="compare-bar-close" onclick="exitCompareModeAndReturnToOverview()" title="Exit compare mode">✕</button>
      </div>
      <div class="compare-bar-body">
        <p class="compare-bar-desc">Select multiple stations — click them on the map, lasso a group, or enter a line number — to generate one averaged coverage card per shared dataset.</p>
        <button class="compare-bar-lasso" id="lasso-select-btn" onclick="toggleLassoMode()"
          title="Draw a freehand shape on the map — every station inside it gets selected"><span id="lasso-select-label">✏️ Lasso Select</span></button>
        <div class="line-select-group" title="Type a CalCOFI line number and press Enter to add every station on it to the selection">
          <span class="line-select-or">OR</span>
          <div class="line-select-field">
            <label for="line-select-input">Line</label>
            <input type="text" id="line-select-input" placeholder="ex: 83.3" inputmode="decimal"
              onkeydown="if(event.key==='Enter') selectByLine()">
            <button type="button" class="line-select-hint" onclick="selectByLine()">↵ Enter</button>
          </div>
        </div>
        <div class="compare-bar-actions">
          <button class="compare-bar-btn" onclick="clearCompareSelection()">Clear</button>
          <button class="compare-bar-btn compare-bar-generate" id="compare-generate-btn" onclick="generateComparisonCards()" disabled>Compare</button>
        </div>
      </div>
    </div>`;
}
function openStation(s) {
  currentStation = s;
  applyStyles();
  document.getElementById('panel-empty').style.display = 'none';
  document.getElementById('panel-header').style.display = 'block';
  document.getElementById('panel-header').classList.remove('panel-header-flush');
  showBackToCategories();
  document.getElementById('panel-station-id').textContent = `Station ${s.station_id}`;
  document.getElementById('panel-coords').textContent =
    `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`;
  document.getElementById('panel-depth-summary').innerHTML = '';
  // Map clicks route to toggleStationSelection() instead of openStation()
  // while compareMode is active (see the marker click handler below), so
  // this is only ever a safety net — kept because it costs nothing and
  // documents that a freshly-opened station never starts mid-compare.
  if (compareMode) exitCompareMode();
  const c = document.getElementById('panel-content');
  // A specific (non-pooled) parameter is selected: skip the Overview/Depth
  // Profiles/Compare tab bar entirely and show just that parameter's own
  // info at this station (feedback 2026-08-22: "do not need overview and
  // depth and coverage"). "View full station coverage" (inside
  // speciesStationInfoHtml) is the way back to the regular tabbed view
  // below. Pooled datasets have no station-level affiliation, so they fall
  // through to the normal view.
  if (selectedVar && !isRegionPooled(selectedVar.dataset_key)) {
    c.innerHTML = speciesStationInfoHtml(selectedVar, s);
    return;
  }
  const dpCount = depthProfileCount(s);
  // Three tabs: Overview (existing dataset/decade content, unchanged), its
  // own Depth Profiles panel — previously nested at the bottom of Overview
  // inside a details toggle, now a first-class destination instead of one
  // more thing to scroll past — and Compare, which used to be a floating
  // map overlay (feedback 2026-08-22: "it was stacking with the species
  // popup and eating map space"). Depth tab is omitted entirely when a
  // station has no depth-resolved data, same as the old toggle's behavior;
  // Compare is always present, even at a station with no observations, so
  // compare mode stays reachable regardless of what's open.
  // Starts on whichever tab was last viewed (lastStationTab), not always
  // Overview — clicking through several stations while comparing depth
  // profiles shouldn't mean re-clicking "Depth Profiles" every single time.
  // Falls back to Overview if this particular station has no depth tab at
  // all, since there's nothing to land on.
  const startTab = (lastStationTab === 'depth' && dpCount) ? 'depth' : 'overview';
  const tabs = `<div class="panel-tabs">
      <button class="panel-tab${startTab === 'overview' ? ' active' : ''}" data-tab="overview">Overview</button>
      ${dpCount ? `<button class="panel-tab${startTab === 'depth' ? ' active' : ''}" data-tab="depth">Depth Profiles <span class="panel-tab-count">${dpCount}</span></button>` : ''}
      <button class="panel-tab" data-tab="compare">⛛ Compare</button>
    </div>`;
  const overviewInner = !s.n_datasets
    ? `<div class="cov-empty">No integrated-database observations recorded at this grid station.</div>`
    : `<div class="cov-summary">
        <div><span class="k">datasets</span><span class="v">${s.n_datasets}</span></div>
        <div><span class="k">surveys</span><span class="v">${num(s.n_surveys)}</span></div>
        <div><span class="k">observations</span><span class="v">${num(s.n_obs)}</span></div>
        <div title="This station's own observation date range — may differ from the year slider above, which spans every station site-wide."><span class="k">span</span><span class="v">${yr(s.time_min)}–${yr(s.time_max)}</span></div>
      </div>
      ${stationCardEntries(s).map(({ d, label }) => {
        if (d.dataset_key !== 'calcofi_bottle') return datasetAccordion(d, s);
        const all = CANON_VARS.filter(v => v.dataset_key === 'calcofi_bottle');
        const castVars = all.filter(v => CAST_SIDE_BOTTLE_FIELDS.has(v.name));
        const bottleVars = all.filter(v => !CAST_SIDE_BOTTLE_FIELDS.has(v.name));
        return label === 'Hydrographic Bottle'
          ? datasetAccordion(d, s, { label, vars: bottleVars })
          : datasetAccordion(d, s, { label, vars: castVars, color: '#be8c63' });
      }).join('')}`;
  c.innerHTML = `${tabs}
    <div class="panel-tab-content" data-tabpanel="overview"${startTab === 'overview' ? '' : ' style="display:none"'}>${overviewInner}</div>
    <div class="panel-tab-content" data-tabpanel="depth"${startTab === 'depth' ? '' : ' style="display:none"'}></div>
    <div class="panel-tab-content" data-tabpanel="compare" style="display:none">${compareBarHtml()}</div>`;
  c.querySelectorAll('.data-link[data-vid]').forEach(el =>
    el.addEventListener('click', () => selectVariable(decodeURIComponent(el.dataset.vid))));
  wirePanelTabs(c, s);
  if (startTab === 'depth') {
    renderDepthTab(c, s);
    document.getElementById('panel-depth-summary').innerHTML = depthSummaryFor(s);
  }
}
// Switches the active tab button/panel, and lazily fills the Depth Profiles
// panel with its rows (+ each row's own lazy chart) the first time it's
// switched to — matches the same "don't build it until it's actually looked
// at" approach the nested per-variable rows already use. Switching to/from
// the Compare tab also starts/stops compare mode — there's no separate
// toggle button anymore (feedback 2026-08-22).
function wirePanelTabs(c, s) {
  const tabBtns = c.querySelectorAll('.panel-tab');
  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.toggle('active', b === btn));
    c.querySelectorAll('.panel-tab-content').forEach(p =>
      p.style.display = (p.dataset.tabpanel === tab) ? '' : 'none');
    if (tab === 'compare') {
      document.getElementById('panel-depth-summary').innerHTML = '';
      enterCompareMode();
      return;
    }
    // Leaving the Compare tab for Overview/Depth always exits compare mode
    // — it has no visible indicator once its tab isn't showing, so leaving
    // it running silently in the background would make map clicks behave
    // unexpectedly (selecting for comparison) with no clue why.
    if (compareMode) exitCompareMode();
    lastStationTab = tab;
    // Sampled-depth/bathymetry note only means something next to the actual
    // depth profiles — stays out of the Overview tab entirely.
    document.getElementById('panel-depth-summary').innerHTML =
      tab === 'depth' ? depthSummaryFor(s) : '';
    if (tab === 'depth') renderDepthTab(c, s);
  }));
}
function renderDepthTab(c, s) {
  const panel = c.querySelector('.panel-tab-content[data-tabpanel="depth"]');
  if (panel.dataset.rendered) return;
  panel.dataset.rendered = '1';
  panel.innerHTML = `<div class="depth-profile-list">${depthProfileBlocks(s)}</div>`;
  panel.querySelectorAll('.depth-profile[data-dpkey]').forEach(row => {
    row.addEventListener('toggle', () => {
      if (!row.open || row.dataset.rendered) return;
      row.dataset.rendered = '1';
      const [datasetKey, , varName] = decodeURIComponent(row.dataset.dpkey).split('::');
      const rows = DEPTH_PROFILES[datasetKey][s.station_id][varName];
      const v = CANON_VARS.find(cv => cv.dataset_key === datasetKey && cv.name === varName);
      const unit = (v && v.units) || '';
      const meta = dsMeta(datasetKey);
      const chart = row.querySelector('.depth-profile-chart');
      chart.innerHTML = depthProfileSVG(rows, unit, meta.color, 280, 182, s.bathymetry_depth_m);
      chart.querySelector('svg').addEventListener('click', e => {
        e.stopPropagation();
        openDepthProfileModal(row.dataset.dpkey);
      });
    });
  });
}

// ---- plankton decade-means (station panel) ----------------------------------
// For the CCE-LTER Euphausiids dataset, decades.json carries the mean
// community density by decade at this station (built from the release DB by
// scripts/build_decades.sql). Ports PR #1's decade-means onto the release-DB
// data. Rendered as a horizontal bar chart (bar width proportional to that
// dataset's own max decade value) instead of a plain number list — the list
// version didn't make relative change across decades legible at a glance.
// Folded into that dataset's own accordion card (datasetAccordion) rather
// than sitting separately at the end of the panel.
//
// ZooDB is deliberately excluded (see DECADE_EXCLUDED_DATASETS) — its 33
// taxa span three overlapping taxonomic tiers (Class/Order/Family, e.g.
// Copepoda > Calanoida > Aetideidae), and a straight sum across all 33
// double- or triple-counts abundance in any tow where more than one tier
// was recorded for the same organisms. Verified against the real data:
// 48 of 350 tows have Copepoda + Calanoida + family-level entries all
// present simultaneously (triple-counted), and separately 79 of 350 tows
// (22.6%) have no copepod entry at all at any tier (a genuine gap, not
// fixable by any aggregation formula). A "fixed" number here would still
// be quietly wrong for a large fraction of the underlying tows, so the
// block is removed rather than shown with an aggregation that can't
// actually be trusted. Euphausiids has no equivalent hierarchy conflict.
const DECADE_EXCLUDED_DATASETS = new Set(['cce-lter_zoodb']);
const DECADE_UNITS = { 'cce-lter_zoodb': 'count/1000 m³', 'cce-lter_euphausiids': 'count/tow' };
function decadeBlockFor(d, s, opts) {
  opts = opts || {};
  if (DECADE_EXCLUDED_DATASETS.has(d.dataset_key)) return '';
  const rows = DECADES[d.dataset_key] && DECADES[d.dataset_key][s.station_id];
  if (!rows || !rows.length) return '';
  const meta = dsMeta(d.dataset_key), unit = DECADE_UNITS[d.dataset_key] || '';
  const sorted = rows.slice().sort((a, b) => a.decade.localeCompare(b.decade));
  const max = Math.max(...sorted.map(r => r.mean_density));
  const items = sorted.map(r => {
    const pct = max > 0 ? Math.max(4, Math.round(100 * r.mean_density / max)) : 0;
    return `<div class="dec-row">
        <span class="dec-yr">${r.decade}</span>
        <span class="dec-bar-track"><span class="dec-bar-fill" style="width:${pct}%"></span></span>
        <span class="dec-val">${num(Math.round(r.mean_density))}</span>
        <span class="dec-n">${r.n_tows}</span>
      </div>`;
  }).join('');
  // Clickable only in its normal (small) rendering — the enlarged modal
  // reuses this same function with opts.large, so it shouldn't itself be
  // clickable again. Purely a visibility aid (the card is small) — there's
  // no truncated/hidden data being revealed, same content either size.
  const clickAttrs = opts.clickable
    ? ` onclick="openDecadeModal('${d.dataset_key}')" style="cursor:pointer"` : '';
  return `<div class="dec-block${opts.large ? ' dec-block-large' : ''}${opts.clickable ? ' dec-block-clickable' : ''}" style="--c:${meta.color}"${clickAttrs}>
      <div class="dec-head">Mean density by decade <span class="dec-unit">(${unit})</span></div>
      <div class="dec-col-labels"><span></span><span></span><span>density</span><span>tows</span></div>
      ${items}
      ${opts.clickable ? '<div class="dec-block-expand-hint">⤢ click to expand</div>' : ''}
    </div>`;
}
// Opens the enlarged view of a station's decade-means block — same
// modal-backdrop/modal markup as openDatasetCardModal, just for this block
// instead of the main coverage card.
function openDecadeModal(datasetKey) {
  if (!currentStation) return;
  const d = (currentStation.datasets || []).find(x => x.dataset_key === datasetKey);
  if (!d) return;
  const meta = dsMeta(d.dataset_key);
  document.getElementById('modal-title').textContent = `${meta.label} — Mean Density by Decade — Station ${currentStation.station_id}`;
  document.getElementById('modal-body').innerHTML = decadeBlockFor(d, currentStation, { large: true });
  document.getElementById('modal-footer').style.display = 'none';
  document.getElementById('modal').classList.add('modal-large');
  document.getElementById('modal-backdrop').classList.add('open');
}

// ---- depth profiles (station panel) -----------------------------------------
// For any variable with depth-resolved measurements at a station, show a compact
// inline value-vs-depth chart (depth on the inverted y-axis, value on x). Sourced
// from depth_profiles.json (see DEPTH_PROFILES load above) — same per-station
// lookup pattern as DECADES/decadeBlocks just above.
// Builds the plot SVG. `w`/`h` let the modal render a larger version of the same
// chart from the same data, rather than a separate large-mode code path.
function depthProfileSVG(rows, unit, color, w, h, bathyDepth, large) {
  const sorted = rows.slice().sort((a, b) => a.depth_m - b.depth_m);
  const depths = sorted.map(r => r.depth_m), values = sorted.map(r => r.value);
  // Scale the axis to the SAMPLED depths only — never to the seafloor. Folding
  // bathyDepth in here squashed every shallow profile into a sliver at the top
  // of the plot (a 0–200 m bottle cast at a station with a 4,000 m seafloor got
  // 5% of the plot height); measured on the shipped data, 1,630 of the 4,095
  // profiles with a GEBCO depth — 40% — landed inside the top quarter. It also
  // made the `bathyDepth <= dMax` guard below tautological, so the seafloor line
  // drew even for casts that never went anywhere near it. Clipping instead of
  // rescaling is what lets that guard do its job.
  const dMin = 0, dMax = Math.max(...depths);
  const vMin = Math.min(...values), vMax = Math.max(...values);
  const peak = sorted.reduce((a, b) => (b.value > a.value ? b : a), sorted[0]);

  // Larger canvas (the enlarge modal) gets more padding, bigger text, bigger
  // dots and a thicker line — the small card's sizing looked comically tiny
  // blown up to modal size instead of actually being easier to read there.
  const padL = large ? 46 : 30, padT = large ? 20 : 14, padR = large ? 16 : 10, padB = large ? 34 : 24;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const x = v => padL + (vMax === vMin ? plotW / 2 : (v - vMin) / (vMax - vMin) * plotW);
  const y = d => padT + (dMax === dMin ? 0 : (d - dMin) / (dMax - dMin) * plotH);
  const dotR = large ? 5 : 3, dotRPeak = large ? 6.5 : 4, lineW = large ? 2.5 : 2;

  const pts = sorted.map(r => `${x(r.value).toFixed(1)},${y(r.depth_m).toFixed(1)}`).join(' ');
  const dots = sorted.map(r => {
    const isPeak = r === peak;
    return `<circle class="depth-dot" cx="${x(r.value).toFixed(1)}" cy="${y(r.depth_m).toFixed(1)}"
        r="${isPeak ? dotRPeak : dotR}" fill="${isPeak ? 'var(--accent2)' : color}" stroke="var(--panel)" stroke-width="1.5"
        data-tip="${Math.round(r.depth_m)} m: ${r.value.toFixed(2)} ${unit}"></circle>`;
  }).join('');

  // Seafloor line — same convention as ctd-viz's build_profile_plotly():
  // dashed horizontal line + "seafloor ≈ Xm" label, only drawn when a depth
  // was actually supplied and it falls within the plotted range (a station
  // whose cast never got anywhere near the seafloor shouldn't show one).
  const bathy = (bathyDepth != null && bathyDepth >= dMin && bathyDepth <= dMax)
    ? `<line x1="${padL}" y1="${y(bathyDepth).toFixed(1)}" x2="${padL + plotW}" y2="${y(bathyDepth).toFixed(1)}"
         class="dp-seafloor"/>
       <text x="${padL + plotW}" y="${(y(bathyDepth) - (large ? 6 : 4)).toFixed(1)}" class="dp-seafloor-label" text-anchor="end">seafloor ≈ ${Math.round(bathyDepth)} m</text>`
    : '';

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="overflow:visible" class="${large ? 'dp-large' : ''}">
      <text x="0" y="${padT - (large ? 10 : 8)}" class="dp-axis-label">depth (m)</text>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" class="dp-axis"/>
      <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" class="dp-axis"/>
      <text x="${padL - (large ? 8 : 6)}" y="${padT + 4}" class="dp-tick" text-anchor="end">${Math.round(dMin)}</text>
      <text x="${padL - (large ? 8 : 6)}" y="${padT + plotH + 4}" class="dp-tick" text-anchor="end">${Math.round(dMax)}</text>
      <text x="${padL}" y="${padT + plotH + (large ? 22 : 14)}" class="dp-tick">${vMin.toFixed(1)}</text>
      <text x="${padL + plotW}" y="${padT + plotH + (large ? 22 : 14)}" class="dp-tick" text-anchor="end">${vMax.toFixed(1)}</text>
      <text x="${padL + plotW / 2}" y="${padT + plotH + (large ? 30 : 20)}" class="dp-axis-label" text-anchor="middle">value (${unit})</text>
      ${bathy}
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${lineW}" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>`;
}
// Sampled depth range across every depth-resolved variable at this station,
// compared against the GEBCO bathymetry estimate (see bathymetry.json load
// block) — shown once at the top of the panel instead of only inside each
// individual depth-profile chart, so you don't have to open one to get a
// sense of how deep this station was actually sampled.
function depthSummaryFor(s) {
  let dMin = Infinity, dMax = -Infinity;
  Object.keys(DEPTH_PROFILES).forEach(datasetKey => {
    const byStation = DEPTH_PROFILES[datasetKey][s.station_id];
    if (!byStation) return;
    Object.values(byStation).forEach(rows => rows.forEach(r => {
      if (r.depth_m < dMin) dMin = r.depth_m;
      if (r.depth_m > dMax) dMax = r.depth_m;
    }));
  });
  if (dMin === Infinity) return '';
  const sampledLine = `<div class="panel-depth-row"><span class="dsum-label">Sampled Depth</span> <span class="dsum-val">${Math.round(dMin)}–${Math.round(dMax)} m</span></div>`;
  if (s.bathymetry_depth_m == null) return sampledLine;
  const seafloor = s.bathymetry_depth_m;
  return `${sampledLine}
    <div class="panel-depth-row">
      <span class="dsum-label">Seafloor (GEBCO)</span> <span class="dsum-val">≈ ${Math.round(seafloor)} m</span>
    </div>`;
}
function depthProfileBlocks(s) {
  return (s.datasets || []).map(d => {
    const byVar = DEPTH_PROFILES[d.dataset_key] && DEPTH_PROFILES[d.dataset_key][s.station_id];
    if (!byVar) return '';
    const meta = dsMeta(d.dataset_key);
    return dedupeDepthVars(byVar).map(varName => {
      const rows = byVar[varName];
      if (!rows || rows.length < 2) return '';
      const v = CANON_VARS.find(cv => cv.dataset_key === d.dataset_key && cv.name === varName);
      const label = v ? resolvedLabel(v) : depthVarLabel(varName);
      const unit = (v && v.units) || '';
      const depths = rows.map(r => r.depth_m);
      const key = encodeURIComponent(`${d.dataset_key}::${s.station_id}::${varName}`);
      // Nested per-variable row — collapsed by default (text only, no SVG
      // built yet). The chart for THIS variable is built lazily on its own
      // toggle listener (wired in openStation()), same lazy pattern as the
      // outer "Show Depth Profiles" section, just one level deeper — a
      // station with 20 depth-resolved variables no longer means building
      // 20 SVGs the moment the outer section opens.
      return `<details class="depth-profile" style="--c:${meta.color}" data-dpkey="${key}">
          <summary class="depth-profile-row-summary">
            <span class="depth-profile-param">${label}${unit ? ` <span class="depth-profile-unit">(${unit})</span>` : ''}</span>
            <span class="depth-profile-meta"><span class="depth-profile-range">${Math.round(Math.min(...depths))}–${Math.round(Math.max(...depths))} m</span> · ${rows.length} depths</span>
          </summary>
          <div class="depth-profile-chart"></div>
        </details>`;
    }).join('');
  }).join('');
}
// Count only — cheap, no SVG building — used to decide whether to show the
// toggle at all and what count to put in its label. Uses the same dedup as
// depthProfileBlocks() so the count always matches what actually renders.
function depthProfileCount(s) {
  return (s.datasets || []).reduce((n, d) => {
    const byVar = DEPTH_PROFILES[d.dataset_key] && DEPTH_PROFILES[d.dataset_key][s.station_id];
    if (!byVar) return n;
    return n + dedupeDepthVars(byVar).filter(varName => byVar[varName] && byVar[varName].length >= 2).length;
  }, 0);
}
// Collapsed by default (unlike decadeBlocks, which is small and always-on) —
// a station can have dozens of variables with depth-resolved data, and every
// one of those is a real SVG built from a fetched row set, so eagerly
// rendering all of them was the actual slowdown. Each row builds its own
// chart lazily (wired in renderDepthTab) and is cached once built.
// Click-to-expand — reuses the existing modal-backdrop/modal markup, same as
// openDatasetCardModal above, just at a larger fixed size for the same SVG.
function openDepthProfileModal(dpkey) {
  const [datasetKey, stationId, varName] = decodeURIComponent(dpkey).split('::');
  const rows = DEPTH_PROFILES[datasetKey] && DEPTH_PROFILES[datasetKey][stationId] && DEPTH_PROFILES[datasetKey][stationId][varName];
  if (!rows) return;
  const meta = dsMeta(datasetKey);
  const v = CANON_VARS.find(cv => cv.dataset_key === datasetKey && cv.name === varName);
  const label = v ? resolvedLabel(v) : depthVarLabel(varName);
  const unit = (v && v.units) || '';
  const station = STATIONS.find(st => st.station_id === stationId);
  document.getElementById('modal-title').textContent = `${label} — Station ${stationId}`;
  document.getElementById('modal-body').innerHTML = depthProfileSVG(rows, unit, meta.color, 560, 400, station && station.bathymetry_depth_m, true);
  document.getElementById('modal-footer').style.display = 'none';
  document.getElementById('modal').classList.add('modal-large');
  document.getElementById('modal-backdrop').classList.add('open');
}

// ---- variable search ----
const searchInput = document.getElementById('search');
const dropdown = document.getElementById('dropdown');

function wireSearch() {
  // Debounced rather than capped. renderDropdown() no longer slices to 60 hits
  // (deliberately — a broad query should show every real match, not hide them
  // behind a "+N more"), but that means a one-letter query builds ~1,900 rows
  // and attaches ~1,900 listeners. Firing that on literally every keystroke was
  // the actual cost; doing it once the typing pauses keeps the full result set
  // without the per-keystroke rebuild.
  let ddTimer = null;
  searchInput.addEventListener('input', () => {
    ddExpandedGroup = null;
    clearTimeout(ddTimer);
    ddTimer = setTimeout(() => renderDropdown(searchInput.value.trim()), 120);
  });
  searchInput.addEventListener('focus', () => renderDropdown(searchInput.value.trim()));
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) dropdown.classList.remove('open');
  });
}
// Capped Levenshtein distance — good enough for 1-2 char typos on short words.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}
// True if `token` is a plain substring anywhere in `text`, or — for tokens
// long enough that fuzzy matching won't just add noise — if some word in
// `text` is within edit-distance 1 of `token` (handles small typos).
function tokenHits(text, token) {
  if (text.includes(token)) return true;
  if (token.length < 4) return false;
  return text.split(/\W+/).some(w => w.length >= 3 && editDistance(token, w, 1) <= 1);
}
// Query is split into whitespace-separated tokens; every token must hit
// somewhere in the combined searchable text (order-independent "contains"),
// so "krill pacific" matches "Pacific Krill" and a variable isn't missed
// just because the matched word happens to be second/third in its name.
function varMatch(v, q) {
  // Family labels (e.g. "Primary Productivity (C14 Assimilation)") live in
  // PARAMETER_FAMILIES, not on the variable record itself — without pulling
  // them in here, renaming a family updates every display but not search.
  const fm = familyMemberFor(v);
  const familyText = fm ? [fm.family.name, fm.member.label, fm.member.short] : [];
  const text = [v.name, v.display_name, v.common_name, ...(v.keywords || []), ...familyText]
    .filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(tok => tokenHits(text, tok));
}
function ddItem(v, nested) {
  const fm = familyMemberFor(v);
  const name = fm ? fm.member.label : resolvedLabel(v);
  return `<div class="dd-item${nested ? ' dd-item-nested' : ''}" data-id="${encodeURIComponent(v.variable_id)}">
      <span class="dd-dot" style="background:${datasetColorFor(v)}"></span>
      <span class="dd-name">${name}</span>
      <span class="dd-meta">${datasetLabelFor(v)}${v.units ? ' · ' + v.units : ''} · ${v.realm}</span>
    </div>`;
}
function renderDropdown(q) {
  // empty query (just clicked into the search bar) -> show everything,
  // grouped by category, instead of closing the dropdown
  const hits = q ? CANON_VARS.filter(v => varMatch(v, q)) : CANON_VARS;
  if (!hits.length) {
    dropdown.innerHTML = `<div class="dd-empty">no variables match “${q}”</div>`;
  } else {
    // bucket by category (search-bar grouping, matches the browse panel's own order)
    const byCat = {};
    hits.forEach(v => (byCat[categoryOf(v)] ||= []).push(v));
    const catRank = c => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? Infinity : i; };
    const catKeys = Object.keys(byCat).sort((a, b) => catRank(a) - catRank(b));
    const DEPRIORITIZED_LABELS = new Set(['Potential Temperature', 'Dry Bulb Temperature', 'Wet Bulb Temperature',
      'Salinity (Predicted)', 'Oxygen Sensor Temperature', 'Sea Surface Temperature', 'Sea Surface Salinity',
      'Atmospheric Pressure (SLC)', 'Sea Surface Conductivity', 'Bottom Depth']);
    const ddSortKey = (v, groupKey) => {
      const fm = familyMemberFor(v);
      if (fm && DEPRIORITIZED_LABELS.has(fm.member.label)) return [3, '', 0, sortNameFor(v)];
      const priority = CATEGORY_ITEM_ORDER[groupKey];
      const famIdx = fm && priority ? priority.indexOf(fm.family.name) : -1;
      // Within a family, match its hand-declared member order (e.g.
      // Temperature: Dry Bulb, Standard, Wet Bulb, Potential) rather than
      // alphabetizing — that order is intentional, same as what expanding
      // the family in By Category shows. Group-type members with multiple
      // sources (Bottle/CTD/DIC etc.) tie-break by that member's own
      // declared source order, so dedup below always keeps the intended
      // primary source (e.g. Bottle for Temperature), not an arbitrary one.
      const memberIdx = fm ? fm.family.members.indexOf(fm.member) : -1;
      const sourceIdx = fm && fm.source ? fm.member.sources.indexOf(fm.source) : -1;
      if (fm && famIdx !== -1) return [0, famIdx, memberIdx, sourceIdx];
      if (fm) return [1, fm.family.name, memberIdx, sourceIdx];
      return [2, '', 0, sortNameFor(v)];
    };
    dropdown.innerHTML = catKeys.map(c => {
      const sorted = byCat[c].slice().sort((a, b) => {
        const ka = ddSortKey(a, c), kb = ddSortKey(b, c);
        for (let i = 0; i < ka.length; i++) { if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; }
        return 0;
      });
      const groups = {};
      const loose = [];
      sorted.forEach(v => {
        const fm = familyMemberFor(v);
        if (fm && fm.source) {
          const key = fm.family.name + '::' + fm.member.label;
          (groups[key] ||= { member: fm.member, its: [] }).its.push({ v, member: fm.member, source: fm.source });
        } else {
          loose.push(v);
        }
      });
      const groupKeys = Object.keys(groups);
      const itemCount = groupKeys.length + loose.length;
      const rowsHtml = [];
      sorted.forEach(v => {
        const fm = familyMemberFor(v);
        if (fm && fm.source) {
          const key = fm.family.name + '::' + fm.member.label;
          if (groups[key]._rendered) return;
          groups[key]._rendered = true;
          const { member, its } = groups[key];
          if (its.length === 1) {
            rowsHtml.push(ddItem(its[0].v, false));
            return;
          }
          const open = ddExpandedGroup === key;
          rowsHtml.push(`<div class="dd-group-toggle" data-dd-group-key="${encodeURIComponent(key)}">
              <span class="dd-dot dd-dot-empty"></span>
              <span class="dd-name">${member.label}<span class="dd-group-caret">${open ? '▾' : '▸'}</span></span>
              <span class="dd-meta">${its.length} datasets</span>
            </div>${open ? `<div class="dd-group-sources">${its.map(it => ddItem(it.v, true)).join('')}</div>` : ''}`);
        } else {
          rowsHtml.push(ddItem(v));
        }
      });
      return `
        <div class="dropdown-group-header">
          <span>${c}</span>
          <span class="dropdown-group-count">${itemCount}</span>
        </div>
        ${rowsHtml.join('')}`;
    }).join('');
  }
  dropdown.querySelectorAll('.dd-item').forEach(el =>
    el.addEventListener('mousedown', () => selectVariable(decodeURIComponent(el.dataset.id))));
  dropdown.querySelectorAll('.dd-group-toggle[data-dd-group-key]').forEach(el =>
    el.addEventListener('mousedown', () => toggleDdGroup(decodeURIComponent(el.dataset.ddGroupKey))));
  dropdown.classList.add('open');
}
// Expands/collapses a group-type family member's dataset picker within the
// search dropdown (see renderDropdown) — re-renders against whatever's
// currently typed, same pattern as toggleFamily() for the browse panel.
function toggleDdGroup(key) {
  ddExpandedGroup = (ddExpandedGroup === key) ? null : key;
  renderDropdown(searchInput.value.trim());
}

function selectVariable(vid) {
  const v = VARS.find(x => x.variable_id === vid);
  if (!v) return;
  selectedVar = v;
  dropdown.classList.remove('open');
  searchInput.value = resolvedPlainLabel(v);
  // Prefer this species' own observation-year span over the dataset-wide
  // one when it exists (see taxonYearSpan() above) — falls back to the old
  // dataset-wide span for measurement-type variables and taxa with no
  // per-species year breakdown.
  const span = (v.variable_type === 'taxon' && taxonYearSpan(v)) || datasetYearSpan(v.dataset_key);
  if (span) { lockYearRange(span[0], span[1]); setYearRange(span[0], span[1]); }
  else { lockYearRange(null, null); setYearRange(G_MIN, G_MAX); }
  highlight(v);
  showVariablePanel(v);
}
function stationsForVarIsFallback(v) {
  if (v.variable_type !== 'taxon') return false;
  return !taxonLookupKey(v);
}
// Banner text for a pooled dataset. Falls back to the old explanation-only
// wording when regions.json is absent, so the page keeps working without it.
function regionBannerText(v) {
  const nr = regionsForVar(v).size;
  if (!nr) return `<b>${datasetLabelFor(v)}</b> is <span class="banner-note" title="${POOLED_WHY}">${POOLED_SHORT}</span>`;
  const total = (DS_REGIONS[v.dataset_key] || new Set()).size;
  // Only claim the year window when the count honors it, exactly as the station
  // path does — and say how many observations carry no resolvable date at all,
  // because for this dataset that is 40% of them, not a rounding error.
  const undated = regionUndatedObs(v);
  const yearNote = (!yearRange || !regionsForVarIsYearAware(v)) ? ''
    : ` in <b>${yearRange[0]}–${yearRange[1]}</b>`;
  const undatedNote = undated
    ? ` <span class="banner-note" title="These observations resolve no cruise, so they carry no date and cannot be filtered by year. They are counted in the region totals regardless of the slider.">(${undated.toLocaleString()} undated)</span>`
    : '';
  return `${nr} of ${total} pooled region${total === 1 ? '' : 's'} with `
    + `<b>${datasetLabelFor(v)}</b> coverage` + yearNote + undatedNote
    + ` <span class="banner-note" title="${POOLED_WHY}">(pooled, not per-station)</span>`;
}
function highlight(v) {
  selectedVar = v;
  document.getElementById('clear-btn').classList.add('visible');
  applyStyles();
  const n = stationsForVar(v).size;
  document.getElementById('year-slider').classList.toggle('var-active', n > 0);
  const banner = document.getElementById('search-banner');
  // Only claim the year range when the number actually reflects it. On the
  // per-taxon path it doesn't (no year bins in taxon_coverage.json), so say
  // "all years" rather than printing an unfiltered count under a filtered label.
  const yearAware = stationsForVarIsYearAware(v);
  const isAggregateSpan = DATASET_SPAN_IS_AGGREGATE.has(v.dataset_key);
  const isFallback = stationsForVarIsFallback(v);
  // No separate "(dataset-wide, not species-specific)" parenthetical here
  // anymore — scopeNoteHtml()'s "— Dataset-Wide" tag below says the same
  // thing, and showing both said it twice (feedback 2026-08-22).
  const yearNote = !yearRange ? ''
    : yearAware
      ? ` in <b>${yearRange[0]}–${yearRange[1]}</b>`
        + (isAggregateSpan
          ? ` <span class="banner-note" title="${datasetLabelFor(v)} combines many separately-added parameters — this is the whole dataset's coverage span, not necessarily this specific parameter's.">(dataset span)</span>`
          : '')
    : ` <span class="banner-note" title="Per-taxon coverage has no year breakdown yet, so this count spans the full record regardless of the slider.">(all years)</span>`;
  banner.innerHTML = `<b style="color:${datasetColorFor(v)}">${resolvedLabel(v)}</b> — `
    + (isRegionPooled(v.dataset_key)
        // "0 stations with Phytoplankton coverage" is false: the coverage exists,
        // it just isn't resolved to stations. Since regions.json we can give the
        // real number — the pooled regions it WAS collected across — instead of
        // only explaining the absence of a station count.
        ? regionBannerText(v)
        : `${n} station${n === 1 ? '' : 's'} with <b>${datasetLabelFor(v)}</b> coverage` + yearNote
          + scopeNoteHtml(v, isAggregateSpan, yearAware, isFallback));
  banner.style.display = 'block';
}
// The em dash sits outside the underlined <span> on purpose (feedback
// 2026-08-22: "i dont want the underscore hyerliked") — the dotted
// underline/hover-help styling is meant to flag the label text as having
// more detail on hover, not the dash, which is just punctuation joining it
// to the sentence.
function scopeNoteHtml(v, isAggregateSpan, yearAware, isFallback) {
  if (v.variable_type === 'taxon') {
    const span = taxonYearSpan(v);
    if (span) {
      return ` — <span class="banner-note species-specific" title="Locked to ${resolvedPlainLabel(v)}'s own observation years, not the whole dataset's.">Species Range</span>`;
    }
    if (isFallback) {
      return ` — <span class="banner-note" title="No per-station breakdown exists yet for this specific species — this is every station with any ${datasetLabelFor(v)} data, not necessarily stations where this species was actually recorded.">Dataset-Wide</span>`;
    }
    return '';
  }
  // Measurement-type parameter: skip this note when another note already
  // covers the same ground — "(dataset span)" for aggregate datasets, or
  // "(all years)" when there's no year breakdown at all.
  if (!yearAware || isAggregateSpan) return '';
  return ` — <span class="banner-note" title="${datasetLabelFor(v)} doesn't track year coverage per individual parameter — this is the whole dataset's operating span.">Dataset-Wide</span>`;
}
// The pooled equivalent of "Collected at N stations". Degrades to the original
// explanation-only wording when regions.json is absent.
function regionPanelCount(v) {
  const n = regionsForVar(v).size;
  if (!n) return 'Pooled by region — no per-station coverage';
  const total = (DS_REGIONS[v.dataset_key] || new Set()).size;
  return `Collected across ${n} of ${total} pooled region${total === 1 ? '' : 's'}`;
}
// Per-region observation counts for the selected variable. Worth showing because
// the regions are not interchangeable — they are the gradient this dataset exists
// to measure, from the inshore NE to the Central Pacific Offshore.
function regionPanelBreakdown(v) {
  const sel = regionsForVar(v);
  if (!sel.size) return '';
  const rows = REGIONS.map(r => {
    const t = v.aphia_id
      ? (r.taxa || []).find(x => x.dataset_key === v.dataset_key &&
                                 x.aphia_id === String(v.aphia_id))
      : null;
    const d = t || (r.datasets || []).find(x => x.dataset_key === v.dataset_key);
    if (!d) return '';
    const on = sel.has(r.region_key);
    return `<div class="region-row${on ? '' : ' region-row-off'}">`
      + `<span class="region-name" title="${r.description} — ${r.n_stations} pooled stations, `
      + `${(r.area_km2 || 0).toLocaleString()} km²">${r.region_key}</span>`
      + `<span class="region-obs">${(d.n_obs || 0).toLocaleString()}</span></div>`;
  }).join('');
  return rows ? `<div class="region-breakdown">${rows}</div>` : '';
}
// External-link icon (e.g. before "AphiaID ####" in the WoRMS field) -
// shared wherever variableInfoFieldsHtml is rendered (feedback 2026-08-22:
// "better match image 2" - icon instead of a plain underlined link).
const EXTERNAL_LINK_ICON = '<svg class="varinfo-ext-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
// Dataset/Description/Units/WoRMS fields, shared by the no-station side
// panel (showVariablePanel) and the station-open species view
// (speciesStationInfoHtml) so the two views never drift out of sync. The
// station-count/fallback/pooled note is built separately by each caller,
// since only showVariablePanel needs the pooled-regions branch.
function variableInfoFieldsHtml(v, opts) {
  opts = opts || {};
  const spacer = opts.spacer || '<br>';
  const countClass = opts.countClass || 'panel-station-count';
  const fallbackClass = opts.fallbackClass || 'panel-fallback-note';
  // includeCount: false lets a caller (showVariablePanel) render the count/
  // fallback lines itself, merged into its own note box alongside the
  // "click a station" hint, instead of getting them as separate free-
  // floating lines here (feedback 2026-08-22: station count + hint
  // consolidated into one box).
  const includeCount = opts.includeCount !== false;
  const stationCount = stationsForVar(v).size;
  const rawDesc = descriptionFor(v, displayLabel(v)) || v.description || 'No description available.';
  const desc = rawDesc === 'No description available.' ? `<span class="panel-desc-placeholder">${rawDesc}</span>` : rawDesc;
  const datasetLine = `<b>Dataset:</b> ${datasetLabelFor(v)}${spacer}`;
  const countLine = `<span class="${countClass}">Collected at ${stationCount} station${stationCount === 1 ? '' : 's'}</span>`;
  const fallbackLine = !stationsForVarIsFallback(v) ? '' : `<span class="${fallbackClass}">No per-station breakdown exists yet for this species — this count is every station with any ${datasetLabelFor(v)} data, not confirmed sightings of this species specifically.</span>`;
  return `${datasetLine}
      <b>Description:</b> ${desc}${spacer}
      ${v.units ? `<b>Units:</b> ${v.units}${spacer}` : ''}
      ${v.aphia_id ? `<b>WoRMS:</b> <a target="_blank" rel="noopener" href="https://www.marinespecies.org/aphia.php?p=taxdetails&id=${v.aphia_id}" class="varinfo-ext-link">${EXTERNAL_LINK_ICON}AphiaID ${v.aphia_id}</a>${spacer}` : ''}
      ${includeCount ? countLine : ''}
      ${includeCount ? fallbackLine : ''}`;
}
function variableSourceUrl(v) {
  return (v.dataset_key === 'swfsc_ichthyo' && ZOOPLANKTON_VOLUME_FIELDS.has(v.name))
    ? datasetUrlFor('sio_pic-zooplankton')
    : (v.source && (v.source.access_url || v.source.metadata_url)) || datasetUrlFor(v.dataset_key);
}
// Per-station observation years for the currently-selected taxon, using the
// same aphia_id-then-name key priority as stationsForVar()/
// stationsForVarIsYearAware() above, so this can never disagree with the
// count/highlight logic about which taxon-coverage entry applies.
function selectedTaxonYearsAt(gridKey) {
  const v = selectedVar;
  if (!v || v.variable_type !== 'taxon') return null;
  const key = taxonLookupKey(v);
  const years = key && TAXON_YEARS[key] && TAXON_YEARS[key][gridKey];
  return years && years.length ? years.slice().sort((a, b) => a.y - b.y) : null;
}
// Merged "N stations collected" + "observed at this station in: years" note
// for the station-open species view - one bordered box (feedback
// 2026-08-22: option B over option C, "keep the outline").
function speciesStationNoteHtml(v, s) {
  const stationCount = stationsForVar(v).size;
  const fallbackNote = !stationsForVarIsFallback(v) ? '' : `<span class="spinfo-note-fallback">No per-station breakdown exists yet for this species — this count is every station with any ${datasetLabelFor(v)} data, not confirmed sightings of this species specifically.</span>`;
  const years = selectedTaxonYearsAt(s.grid_key);
  // One flowing line/paragraph rather than a label line + a separate years
  // line — reads as a sentence instead of a label:value pair (feedback
  // 2026-08-22: "instead of separate line"). Only the year itself is
  // bold/accent-colored; the "(×N)" repeat count and the comma separators
  // between years are both muted so they don't compete with the year for
  // attention (feedback 2026-08-22: "does orange commas make sense").
  const yearsBlock = !years ? '' : `<span class="spinfo-note-years">
      <span class="spinfo-note-years-label">${resolvedPlainLabel(v)} observed at this station in: </span>${years.map(o => {
        const yr = `<span class="spinfo-note-years-year">${o.y}</span>`;
        return o.n > 1 ? `${yr} <span class="spinfo-note-years-count">(×${o.n})</span>` : yr;
      }).join(', ')}
    </span>`;
  return `<div class="spinfo-note">
      <span class="spinfo-note-count">Collected at ${stationCount} station${stationCount === 1 ? '' : 's'}</span>
      ${fallbackNote}
      ${yearsBlock}
    </div>`;
}
// Species-focused panel content once a specific (non-pooled) parameter is
// selected while a station is open - replaces the Overview/Depth Profiles
// tab bar and the coverage-card list entirely (feedback 2026-08-22: "do not
// need overview and depth and coverage").
function speciesStationInfoHtml(v, s) {
  const src = variableSourceUrl(v);
  return `<div class="spinfo">
      <div class="spinfo-rule"></div>
      <div class="spinfo-title">${resolvedLabel(v)}</div>
      <div class="spinfo-body">
        ${variableInfoFieldsHtml(v, { spacer: '<br>', includeCount: false })}
      </div>
      ${speciesStationNoteHtml(v, s)}
      ${src ? `<a href="${src}" target="_blank" rel="noopener" class="spinfo-open-btn">Open Dataset ↗</a>` : ''}
      <a href="#" onclick="viewFullStationCoverage(); return false;" class="spinfo-full-link">View Full Station Coverage — All Parameters →</a>
    </div>`;
}
// Escape hatch from the species-focused view back to the normal tabbed
// coverage view for this same station - clears the species selection
// (search, banner, slider lock) and re-opens the station fresh.
function viewFullStationCoverage() {
  selectedVar = null;
  document.getElementById('clear-btn').classList.remove('visible');
  document.getElementById('year-slider').classList.remove('var-active');
  if (G_MIN != null) { lockYearRange(G_MIN, G_MAX); setYearRange(G_MIN, G_MAX); }
  const banner = document.getElementById('search-banner');
  banner.style.display = 'none'; banner.innerHTML = '';
  searchInput.value = '';
  dropdown.classList.remove('open');
  applyStyles();
  openStation(currentStation);
}
function showVariablePanel(v) {
  if (currentStation) {
    // Reached by clicking a parameter inside an already-open station's list,
    // or by searching while a station's already open — re-opening the
    // station re-evaluates selectedVar and switches it to the species-
    // focused view (see openStation), dropping the tab bar entirely rather
    // than just swapping the Overview tab's content.
    openStation(currentStation);
    return;
  }
  // A region-pooled dataset has no station count to give, and no station to send
  // anyone clicking to — so it gets the explanation instead of a bare "0", and
  // every prompt to pick a station off the map is suppressed rather than
  // pointing at a map with nothing highlighted.
  const pooled = isRegionPooled(v.dataset_key);
  // No station open yet — the side panel is free, so species info goes
  // there in full. Reuses the same name/sci-name/rule header treatment and
  // spinfo-* body styling as the station-open species view (speciesStationInfoHtml)
  // so the two never drift apart visually (feedback 2026-08-22: "better
  // match [the station-open look] instead of [the old plain layout]").
  document.getElementById('panel-empty').style.display = 'none';
  document.getElementById('panel-header').style.display = 'block';
  document.getElementById('panel-header').classList.add('panel-header-flush');
  updateBackButton();
  const { main, sci } = speciesTitleParts(v);
  document.getElementById('panel-station-id').innerHTML = main || sci || '';
  document.getElementById('panel-coords').innerHTML = (main && sci)
    ? `<i>${sci}</i>`
    : (pooled ? 'Pooled across stations into 4 regions' : '');
  document.getElementById('panel-depth-summary').innerHTML = '<div class="varinfo-rule"></div>';
  const src = variableSourceUrl(v);
  const stationCount = stationsForVar(v).size;
  const fallbackNote = !stationsForVarIsFallback(v) ? '' : `<span class="spinfo-note-fallback">No per-station breakdown exists yet for this species — this count is every station with any ${datasetLabelFor(v)} data, not confirmed sightings of this species specifically.</span>`;
  const noteInner = pooled
    ? `<span class="spinfo-note-count">${regionPanelCount(v)}</span>
       <span class="spinfo-note-fallback">${POOLED_WHY}</span>
       ${regionPanelBreakdown(v)}`
    : `<span class="spinfo-note-count">${stationCount} station${stationCount === 1 ? '' : 's'} collected</span>
       ${fallbackNote}
       <span class="spinfo-note-hint">Click a highlighted station on the map to view year(s) this species was observed.</span>`;
  document.getElementById('panel-content').innerHTML = `
    <div class="panel-info-block">
      <div class="spinfo-body">
        ${variableInfoFieldsHtml(v, { spacer: '<br>', includeCount: false })}
      </div>
      <div class="spinfo-note">
        ${noteInner}
      </div>
      ${src ? `<a href="${src}" target="_blank" rel="noopener" class="spinfo-open-btn">Open Dataset ↗</a>` : ''}
    </div>`;
}

// ---- inline-handler globals (referenced by index.html) ----
function clearAll() {
  selectedVar = null;
  currentStation = null;
  lastStationTab = 'overview';
  searchInput.value = '';
  dropdown.classList.remove('open');
  document.getElementById('clear-btn').classList.remove('visible');
  document.getElementById('year-slider').classList.remove('var-active');
  if (G_MIN != null) { lockYearRange(G_MIN, G_MAX); setYearRange(G_MIN, G_MAX); }
  const banner = document.getElementById('search-banner');
  banner.style.display = 'none'; banner.innerHTML = '';
  applyStyles();
  document.getElementById('panel-header').style.display = 'none';
  document.getElementById('panel-header').classList.remove('panel-header-flush');
  document.getElementById('panel-back-btn').style.display = 'none';
  document.getElementById('panel-content').innerHTML = '';
  document.getElementById('panel-empty').style.display = '';
  if (compareMode) exitCompareMode();
}
function togglePanel() { document.getElementById('side-panel').classList.toggle('collapsed'); }
function showAboutModal() { document.getElementById('about-backdrop').classList.add('open'); }
function hideAboutModal() { document.getElementById('about-backdrop').classList.remove('open'); }
// ---- user feedback ---------------------------------------------------------
// Posted straight to a Google Form's formResponse endpoint — no backend to run
// and nothing to keep alive, which is the right trade for a static Pages site.
//
// TODO(before merge): this form must live in a CalCOFI-owned Google account,
// not a personal one. The "Email (optional)" field means real user addresses
// land in whatever Drive owns it, and a form tied to an individual disappears
// when that account does. Confirm ownership, then record the form's edit URL in
// the repo README so the next person can find the responses.
//
// The entry.* ids come from the form's own field names — they change if a
// question is deleted and re-added, so edit questions in place.
const FEEDBACK_ENDPOINT = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSctJ6UHOwUYvhnvgAC12UhTdjDvv05cqxxkQXUA3Sz3aOWBbQ/formResponse';
const FEEDBACK_ENTRIES = {
  working: 'entry.776933298',
  improve: 'entry.1913371976',
  broken: 'entry.1714444848',
  email: 'entry.765283935'
};
function showFeedbackModal() {
  document.getElementById('feedback-backdrop').classList.add('open');
}
function hideFeedbackModal() {
  document.getElementById('feedback-backdrop').classList.remove('open');
  document.getElementById('feedback-form').style.display = '';
  document.getElementById('feedback-thanks').style.display = 'none';
}
function closeFeedbackModal(e) { if (e.target.id === 'feedback-backdrop') hideFeedbackModal(); }
function submitFeedback(e) {
  e.preventDefault();
  const btn = document.getElementById('feedback-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  const fd = new FormData();
  fd.append(FEEDBACK_ENTRIES.working, document.getElementById('fb-working').value);
  fd.append(FEEDBACK_ENTRIES.improve, document.getElementById('fb-improve').value);
  fd.append(FEEDBACK_ENTRIES.broken, document.getElementById('fb-broken').value);
  fd.append(FEEDBACK_ENTRIES.email, document.getElementById('fb-email').value);
  // no-cors is mandatory here (Google Forms sends no CORS headers), which means
  // the response is opaque: status is always 0 and .then() fires for a 500 just
  // as it does for a 200. Only a genuine network failure rejects. So the
  // confirmation below says the feedback was *sent*, not that it was received —
  // claiming delivery we cannot observe would be the wrong message to show.
  fetch(FEEDBACK_ENDPOINT, { method: 'POST', mode: 'no-cors', body: fd })
    .then(() => {
      document.getElementById('feedback-form').style.display = 'none';
      document.getElementById('feedback-thanks').style.display = 'block';
      document.getElementById('feedback-form').reset();
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'Submit';
      alert('Something went wrong sending that — check your connection and try again.');
    });
}
// ---- guided tour: a single callout that repositions itself next to
// whatever element the current step is about, with a small arrow pointing
// at it — like the CTD app's own tour, instead of one static wall of text.
const WALKTHROUGH_DISMISS_KEY = 'calcofi_walkthrough_dismissed';
let tourStepIndex = 0;
// Some steps need the app to actually be in a certain state first (a
// station open, so its cards/pin icon exist to point at) — `before()` runs
// right before that step is shown. Picks the first station with real depth
// data so the Depth Profiles tab step has something behind it too.
const WALKTHROUGH_STEPS = [
  { selector: '#search', title: 'Search', body: 'Type a common or scientific name — "chlorophyll", "nitrate", "Sardinops sagax" — results are grouped by category in the search bar dropdown. When a parameter comes from more than one dataset, like Temperature, you\'ll see multiple source options — click one to view its coverage.' },
  { selector: '.inventory-view-tabs', title: 'By Category vs. By Dataset',
    // .inventory-view-tabs only exists in the default browse view (no
    // station/species open) — starting the tour from any other pane meant
    // renderTourStep() found no target and silently skipped this step
    // entirely (feedback 2026-08-22: "has nowhere to go"). clearAll() forces
    // back to that browse view first so the highlight always has something
    // to point at, no matter which pane the tour was launched from.
    before: () => clearAll(),
    body: 'Use By Category when you know what you\'re looking for — if something is measured by more than one instrument, those readings are grouped together in a dropdown. Use By Dataset to see what parameters a specific dataset monitors.', offsetX: -20 },
  { selector: '#map', title: 'Click any station', body: 'Click any station to open its full coverage: every dataset measured there, its date range, and depth profiles for each variable, where available.', placement: 'corner-top-right', offsetY: -50,
    highlightPadTop: 3, highlightPadRight: 0, highlightPadLeft: -4, highlightPadBottom: -3 },
  { selector: '.ds-card', title: 'Station overview', body: "Click any card to enlarge it. Each one shows a dataset's date range, depth range, and the number of surveys and individual measurements across time.",
    before: () => openTourExampleStation(), placement: 'left', highlightOffsetX: 2 },
  { selector: '.ds-download-group', title: 'Download PNG vs. CSV', body: "PNG downloads the card itself as an image, just what you see. CSV downloads the underlying data — broken out by parameter(s), where that's available for the dataset — as a spreadsheet-ready file instead of a picture.",
    before: () => openTourExampleStation(), placement: 'left' },
  { selector: '#year-slider', title: 'Year slider', body: "Spans CalCOFI's full record by default. Selecting a parameter narrows the slider to when that parameter was actually measured. Drag either handle to see how station coverage changes over time for a selected parameter.",
    offsetY: 40, highlightPadX: -17 },
  { selector: '.panel-tab[data-tab="depth"]', title: 'Depth Profiles', body: "Shows how each variable actually changes with depth at this station, plus a seafloor line from GEBCO bathymetry where available — GEBCO is a modeled estimate, not a direct sounding, so small mismatches with the sampled depth are expected.",
    before: () => { openTourExampleStation(); const btn = document.querySelector('.panel-tab[data-tab="depth"]'); if (btn && !btn.classList.contains('active')) btn.click(); },
    placement: 'left' },
  { selector: '.ds-pin-btn', title: 'Pin to compare', body: 'Pin a card to keep it visible even after you click a different station — pin cards from multiple stations and compare them side by side in a tray at the bottom. Drag pinned cards to reorder them, or click one to pan the map back to that station.',
    // The previous step switches to the Depth Profiles tab, which hides
    // the Overview tab (and its pin buttons) entirely — a hidden element's
    // bounding rect collapses to (0,0), which is why this used to jump to
    // the top-left corner. Switch back to Overview first so the real card
    // is visible and measurable again.
    before: () => { const btn = document.querySelector('.panel-tab[data-tab="overview"]'); if (btn && !btn.classList.contains('active')) btn.click(); },
    placement: 'corner-top-right', offsetY: -50, calloutAnchorSelector: '#map' },
  { selector: '.panel-tab[data-tab="compare"]', title: 'Compare Stations', body: 'A different way to compare: click this tab to start, then select stations three ways — click individual stations directly, draw a freehand lasso around a group, or type a CalCOFI line number to grab every station on that line. Then generate one averaged coverage card per dataset across your whole selection.',
    before: () => openTourExampleStation(), placement: 'left' },
];
// Whether THIS tour run opened the example station itself. Only then is the
// station the tour's to clean up — see endTour().
let tourOpenedStation = false;
function openTourExampleStation() {
  if (currentStation) return;
  const s = STATIONS.find(st => st.n_datasets > 0 && depthProfileCount(st) > 0) || STATIONS.find(st => st.n_datasets > 0);
  if (s) { openStation(s); tourOpenedStation = true; }
}
function startWalkthroughTour() {
  tourStepIndex = 0;
  tourOpenedStation = false;
  renderTourStep();
}
function endTour() {
  document.getElementById('tour-callout').style.display = 'none';
  const hl = document.getElementById('tour-highlight-box');
  if (hl) hl.style.display = 'none';
  window.removeEventListener('resize', repositionTour);
  window.removeEventListener('scroll', repositionTour, true);
  localStorage.setItem(WALKTHROUGH_DISMISS_KEY, '1');
  // Only clear what the tour itself put on screen. The `?` button can start a
  // tour mid-session, and an unconditional clearAll() there threw away the
  // variable and station the person had already chosen just because they
  // glanced at the help.
  if (tourOpenedStation) clearAll();
  tourOpenedStation = false;
}
function tourNext() {
  if (tourStepIndex < WALKTHROUGH_STEPS.length - 1) { tourStepIndex++; renderTourStep(); }
  else endTour();
}
function tourPrev() {
  if (tourStepIndex > 0) { tourStepIndex--; renderTourStep(); }
}
// A separate floating highlight box, not a class added to the target
// element itself — the old approach (a box-shadow attached directly to
// e.g. #map) gets silently clipped by the map's own container (Leaflet
// needs overflow on its container), and couldn't be nudged independently
// of the element's real position. This one is appended straight to <body>,
// so nothing can clip it, and `highlightOffsetX/Y` per step can shift it a
// few pixels without moving the actual UI element underneath.
function positionTourHighlight(target, step) {
  let hl = document.getElementById('tour-highlight-box');
  if (!hl) {
    hl = document.createElement('div');
    hl.id = 'tour-highlight-box';
    document.body.appendChild(hl);
  }
  const r = target.getBoundingClientRect();
  const padX = step.highlightPadX != null ? step.highlightPadX : 3;
  const padY = step.highlightPadY != null ? step.highlightPadY : 3;
  const padL = step.highlightPadLeft != null ? step.highlightPadLeft : padX;
  const padR = step.highlightPadRight != null ? step.highlightPadRight : padX;
  const padT = step.highlightPadTop != null ? step.highlightPadTop : padY;
  const padB = step.highlightPadBottom != null ? step.highlightPadBottom : padY;
  const hx = step.highlightOffsetX || 0, hy = step.highlightOffsetY || 0;
  hl.style.left = (r.left - padL + hx) + 'px';
  hl.style.top = (r.top - padT + hy) + 'px';
  hl.style.width = Math.max(0, r.width + padL + padR) + 'px';
  hl.style.height = Math.max(0, r.height + padT + padB) + 'px';
  hl.style.display = 'block';
}
function renderTourStep() {
  const step = WALKTHROUGH_STEPS[tourStepIndex];
  if (step.before) step.before();
  const callout = document.getElementById('tour-callout');
  // Give the DOM a tick to update (e.g. openStation()'s innerHTML rebuild)
  // before measuring where the target actually ended up.
  setTimeout(() => {
    const target = document.querySelector(step.selector);
    if (!target) { tourNext(); return; }
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    positionTourHighlight(target, step);
    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-body').textContent = step.body;
    document.getElementById('tour-progress').textContent = `${tourStepIndex + 1} / ${WALKTHROUGH_STEPS.length}`;
    document.getElementById('tour-prev-btn').style.visibility = tourStepIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('tour-next-btn').textContent = tourStepIndex === WALKTHROUGH_STEPS.length - 1 ? 'Done' : 'Next';
    callout.style.display = 'block';
    const calloutTarget = step.calloutAnchorSelector ? (document.querySelector(step.calloutAnchorSelector) || target) : target;
    positionTourCallout(calloutTarget, callout, step);
    window.addEventListener('resize', repositionTour);
    // Capture phase: the side panel scrolls in its own element, and scroll
    // events don't bubble — steps 4 and 6 point at .ds-card/.ds-pin-btn INSIDE
    // that panel, so without capture the ring stays put while the card it's
    // ringing scrolls away.
    window.addEventListener('scroll', repositionTour, true);
  }, 30);
}
// Re-measures the current step's target and moves the ring + callout to match.
// Both are position:fixed, placed from a one-shot getBoundingClientRect(), so
// without this they detach from their target on any resize or panel scroll.
// Cheap enough to run raw, but rAF-throttled since scroll fires in bursts.
let tourRepositionPending = false;
function repositionTour() {
  const callout = document.getElementById('tour-callout');
  if (!callout || callout.style.display === 'none') return;
  if (tourRepositionPending) return;
  tourRepositionPending = true;
  requestAnimationFrame(() => {
    tourRepositionPending = false;
    const step = WALKTHROUGH_STEPS[tourStepIndex];
    const target = document.querySelector(step.selector);
    if (!target) return;
    positionTourHighlight(target, step);
    const calloutTarget = step.calloutAnchorSelector ? (document.querySelector(step.calloutAnchorSelector) || target) : target;
    positionTourCallout(calloutTarget, callout, step);
  });
}
// Three placement modes:
// - default: below the target, flipping above if there's no room (used for
//   small, normal-sized controls like the search bar or the toggle tabs)
// - 'left': callout sits just to the left of the target with an arrow
//   pointing right at it — for elements inside the narrow side panel, where
//   "below" would either spill off the bottom or overlap the next card
// - 'corner-top-right': for a target that fills most of the screen (the
//   map) — below/above flip logic breaks down for something that tall, so
//   this insets the callout near the target's top-right corner instead
// `offsetY` nudges the final vertical position down a bit further, for
// steps whose default spot reads as too cramped against a small widget.
function positionTourCallout(target, callout, step) {
  callout.style.width = (step.width || 340) + 'px';
  const r = target.getBoundingClientRect();
  const cw = callout.offsetWidth, ch = callout.offsetHeight;
  const offsetY = step.offsetY || 0, offsetX = step.offsetX || 0;
  callout.classList.remove('tour-arrow-top', 'tour-arrow-bottom', 'tour-arrow-right', 'tour-no-arrow');

  if (step.placement === 'corner-top-right') {
    const left = Math.max(8, r.right - cw - 20);
    const top = Math.min(r.top + 70 + offsetY, window.innerHeight - ch - 8);
    callout.style.left = left + 'px';
    callout.style.top = Math.max(8, top) + 'px';
    callout.classList.add('tour-no-arrow');
    return;
  }
  if (step.placement === 'left') {
    const left = Math.max(8, r.left - cw - 10 + offsetX);
    const top = Math.min(Math.max(8, r.top + offsetY), window.innerHeight - ch - 8);
    callout.style.left = left + 'px';
    callout.style.top = top + 'px';
    callout.classList.add('tour-arrow-right');
    callout.style.setProperty('--arrow-y', Math.min(Math.max(20, r.top + r.height / 2 - top), ch - 20) + 'px');
    return;
  }
  if (step.placement === 'above') {
    const left = Math.min(Math.max(8, r.left + offsetX), window.innerWidth - cw - 8);
    const top = Math.max(8, r.top - ch - 14 + offsetY);
    callout.style.left = left + 'px';
    callout.style.top = top + 'px';
    callout.classList.add('tour-arrow-bottom');
    callout.style.setProperty('--arrow-x', Math.min(Math.max(20, r.left + r.width / 2 - left), cw - 20) + 'px');
    return;
  }
  let left = Math.min(Math.max(8, r.left + offsetX), window.innerWidth - cw - 8);
  let top = r.bottom + 14 + offsetY;
  let arrowSide = 'top';
  if (top + ch > window.innerHeight - 8) { top = r.top - ch - 14; arrowSide = 'bottom'; }
  callout.style.left = left + 'px';
  callout.style.top = Math.max(8, top) + 'px';
  callout.classList.add(arrowSide === 'top' ? 'tour-arrow-top' : 'tour-arrow-bottom');
  callout.style.setProperty('--arrow-x', Math.min(Math.max(20, r.left + r.width / 2 - left), cw - 20) + 'px');
}
function maybeAutoShowWalkthrough() {
  if (!localStorage.getItem(WALKTHROUGH_DISMISS_KEY)) startWalkthroughTour();
}
function closeModal(e) {
  if (e && e.target && !e.target.classList.contains('modal-backdrop')) return;
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('modal').classList.remove('modal-large');
  document.getElementById('modal-footer').style.display = '';
}
