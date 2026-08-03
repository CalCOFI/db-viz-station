/* CalCOFI Station Data Portal — integrated-DB coverage view.
 *
 * Stations ARE the integrated-DB `grid` cells. Each station carries per-dataset
 * coverage (time/depth ranges, obs/sample/survey counts, year + month bins) from
 * public/data/stations.json (built by scripts/build_stations.sql). Variable search
 * (public/data/variables.json) highlights the stations where that variable's
 * dataset has coverage. No live queries — all summaries are prebuilt. */

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
  'pic_zooplankton': 'SIO PIC Net-Tow Biovolume', // pre-rename key — still what's actually ingested as of 2026-08
  'cce-lter_euphausiids': 'CalCOFI Euphausiid Database',
  'calcofi_phyllosoma': 'CalCOFI Lobster Phyllosoma',
  'cce-lter_zoodb': 'CalCOFI ZooDB',
  'cce-lter_zooscan': 'ZooScan PRPOOS Zooplankton',
  'farallon_bird-mammal': 'CalCOFI Bird & Mammal Census',
  'calcofi_bird_mammal_census': 'CalCOFI Bird & Mammal Census', // pre-rename key — still what's actually ingested as of 2026-08
  'calcofi_mets': 'CalCOFI Underway Meteorological (METS) Data',
  'sio_mesopelagic-fish': 'CalCOFI Mesopelagic Fish Archive',
  'ucsd_sio_mesopelagic-fish': 'CalCOFI Mesopelagic Fish Archive', // pre-rename key — still what's actually ingested as of 2026-08
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
  'pic_zooplankton':       { label: 'Zooplankton',                     realm: 'bio', color: '#69db7c' }, // pre-rename key — still what's actually ingested as of 2026-08
  'cce-lter_euphausiids':  { label: 'Euphausiids (Krill)',              realm: 'bio', color: '#b197fc' },
  'calcofi_phyllosoma':    { label: 'Phyllosoma (Lobster Larvae)',      realm: 'bio', color: '#f783ac' },
  'cce-lter_zoodb':        { label: 'ZooDB (Holoplankton Community)',   realm: 'bio', color: '#38d9a9' },
  'cce-lter_zooscan':      { label: 'ZooScan (Imaged Zooplankton)',     realm: 'bio', color: '#a9e34b' },
  'farallon_bird-mammal':  { label: 'Seabirds & Marine Mammals',        realm: 'bio', color: '#ff8787' },
  'calcofi_bird_mammal_census': { label: 'Seabirds & Marine Mammals',   realm: 'bio', color: '#ff8787' }, // pre-rename key — still what's actually ingested as of 2026-08
  'calcofi_mets':          { label: 'Underway Meteorological (METS) Data', realm: 'env', color: '#74c0fc' },
  'sio_mesopelagic-fish': { label: 'Mesopelagic Fish',             realm: 'bio', color: '#5c7cfa' },
  'ucsd_sio_mesopelagic-fish': { label: 'Mesopelagic Fish',             realm: 'bio', color: '#5c7cfa' }, // pre-rename key — still what's actually ingested as of 2026-08
  'cce-lter_picoplankton-bacteria': { label: 'Picoplankton & Bacteria', realm: 'bio', color: '#94d82d' }
};
const dsMeta = id => DATASET_META[id] || { label: id, realm: 'bio', color: '#adb5bd' };
// Fallback external link for datasets whose variables carry no
// source.access_url in the data itself — currently just METS.
const DATASET_URL_FALLBACK = { 'calcofi_mets': 'https://calcofi.org/data/oceanographic-data/underway/' };
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
function datasetLabelFor(v) {
  const meta = dsMeta(v.dataset_key);
  if (v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name)) return 'Hydrographic Cast';
  return meta.label;
}
// Same idea as datasetLabelFor — Hydrographic Cast variables share
// calcofi_bottle's dataset_key, so dsMeta(v.dataset_key) alone would give
// them Bottle's blue everywhere (dropdown dots, search banner, station
// cards). Indigo (#be8c63) is used for every Cast-side rendering instead,
// distinct from Bottle's #4dabf7 and every other dataset's color.
function datasetColorFor(v) {
  if (v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name)) return '#be8c63';
  return dsMeta(v.dataset_key).color;
}
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
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
  // Higher-rank ZooDB/ZooScan taxa with well-established English common
  // names. Family-level taxa (Aetideidae, Calanidae, Candaciidae,
  // Eucalanidae, Euchaetidae, Heterorhabdidae, Lucicutiidae, Metridinidae,
  // Oithonidae, Pasiphaeidae, Pontellidae, Scolecitrichidae, Tomopteridae,
  // Galatheidae, Atlantidae) and a few suborders (Ergasilida) are left out —
  // no real common name in general use, just the scientific name.
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
  // CCE-LTER Picoplankton & Bacteria — raw field is 'het_bacteria', cleans to
  // 'het bacteria' via cleanFieldName(); title-casing alone would leave "Het"
  // instead of spelling out "Heterotrophic".
  'het bacteria': 'Heterotrophic Bacteria',
  // Phytoplankton class-level taxa — well-established common names. The
  // genus/species entries below them (Leucocryptos marina, Meringosphaera,
  // Phaeocystis, Pterosperma spp., Richelia intracellularis) have no real
  // common name in general use, so those are left as scientific names only.
  'bacillariophyceae': 'Diatom (Bacillariophyceae)',
  'coccolithophyceae': 'Coccolithophore (Coccolithophyceae)',
  'dictyochophyceae': 'Silicoflagellate (Dictyochophyceae)',
  'dinophyceae': 'Dinoflagellate (Dinophyceae)',
  // calcofi_mets (Underway METS) — raw fields are heavily abbreviated
  // (temp/pct/rad/dir/deg/etc.), so toTitleCase() alone produces things
  // like "Atm Pressure Slc Mb" instead of a real label.
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
  // release-DB-specific (not in the old ERDDAP pipeline)
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
  base = base.replace(/(^|_)btl(_|$)/, '$1').replace(/_$/, ''); // drop the "btl" token itself
  base = base.replace(/_(ave_sta_corr|sta_corr|cruise_corr|corr)$/, '');
  base = base.replace(/_(1|2|ave)$/, '');
  base = base.replace(/_?rep(?:licate)?\d+$/, '');
  if (base === 'c14_mean') base = 'c14';

  let cleaned = cleanFieldName(base);
  cleaned = cleaned.replace(/\s+of\s*$/i, '').trim();
  let resolved = DISPLAY_NAME_FIXES[cleaned] || DISPLAY_NAME_FIXES[cleaned.toLowerCase()] || toTitleCase(cleaned);
  // release DB marks bottle-collected readings with a "btl" token — always a
  // genuinely different collection method from the CTD sensor equivalent,
  // so spell it out instead of letting it merge invisibly
  if (hasBottleMarker) resolved = 'Bottle ' + resolved;
  // release DB prefixes pre-QC values with "r_" (e.g. "r_temperature" is the
  // reported value before QC, distinct from the QC'd "temperature") — spell
  // that out instead of title-casing it into "R Temperature"
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
  // common_name is patched in from several different source pipelines
  // (ucsd_sio_mesopelagic-fish, ZooDB, Ichthyoplankton, ...) with no shared
  // casing guarantee, so it's normalized to title case here. Minor
  // connector words (of/and/the/a/an/in/on/at/for/to/from/with) stay
  // lowercase unless they're the first word, so "man-of-war fish" becomes
  // "Man-of-War Fish", not "Man-Of-War Fish" or "Man-of-war Fish".
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
  // Single-word sci names (Copepoda, Chaetognatha, ...) with no common_name
  // in the source data fall back to the manually-curated DISPLAY_NAME_FIXES
  // list, keyed by lowercase sci name as "Common Name (Sci Name)". Pull
  // just the common-name half out so it renders through the same styled
  // wrapper below as data-sourced common names — otherwise these fell
  // through to the plain, unstyled displayLabel() path and their
  // parenthetical looked inconsistent with the rest of the list.
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
  n = n.replace(/^r_/, '');                                   // pre-QC prefix
  n = n.replace(/_(ave_sta_corr|sta_corr|cruise_corr|corr)$/, ''); // correction stage
  n = n.replace(/_(1|2|ave)$/, '');                             // sensor pair
  n = n.replace(/_?rep(?:licate)?\d+$/, '');                    // replicate
  if (n === 'c14_mean') n = 'c14';                              // mean of the c14 replicates
  if (n === 'oxygen_ml_l' || n === 'oxygen_umol_kg') n = 'oxygen';         // unit duplicate
  if (n === 'oxygen_btl_ml_l' || n === 'oxygen_btl_umol_kg') n = 'oxygen_btl'; // unit duplicate (bottle)
  if (n === 'ammonium') n = 'ammonia';                          // naming inconsistency, same nutrient
  return n;
}
function canonicalKey(v) { return v.dataset_key + '::' + canonicalBase(v.display_name || v.name || ''); }
function repScore(v) {
  const n = (v.display_name || v.name || '').toLowerCase();
  let score = 0;
  if (n.startsWith('r_')) score += 10;                          // pre-QC reported value
  if (/_(1|2)(_|$)/.test(n)) score += 5;                        // single-sensor reading
  if (/corr/.test(n) && !/ave/.test(n)) score += 2;             // per-sensor correction, not yet averaged
  if ((v.description || '').includes("QC'd")) score -= 3;       // explicitly the QC'd final product
  if (n.includes('umol_kg')) score += 0.5;                      // slight preference for mL/L (CalCOFI's legacy unit)
  return score + n.length * 0.01;                               // tie-break: shorter/simpler name
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
  // Unidentified METS fields — no known meaning, can't be named/categorized
  // responsibly. Re-add once the source column mapping is found.
  'calcofi_mets::unknown_measurement_1', 'calcofi_mets::unknown_measurement_2',
  // Raw per-unit TSG duplicates that the METS standardization was supposed to
  // collapse (see the Temperature/Salinity/Conductivity/Density/Sound Velocity
  // family sources above, which all standardize on TSG1 as the single
  // representative sensor) but which the family-match logic doesn't catch,
  // since they're never referenced as a `match` value in any family — they
  // were falling through to the loose list as raw title-cased leftovers
  // ("Tsg2 Salinity Psu", "Tsg3 Density", etc.). Same physical quantity,
  // different physical sensor unit — not distinct data, so removed rather
  // than folded. tsg1_salinity_psu (uncalibrated) is removed too since the
  // Salinity family already surfaces tsg1_salinity_psu_calibrated as the one
  // TSG1 card. Re-add individually if TSG1 turns out not to be the right
  // canonical unit (open question in Betty's handoff notes).
  'calcofi_mets::tsg1_salinity_psu', 'calcofi_mets::tsg2_density', 'calcofi_mets::tsg2_salinity_psu',
  'calcofi_mets::tsg3_density', 'calcofi_mets::tsg3_salinity_psu', 'calcofi_mets::tsg5_salinity_psu',
  // Rest of the numbered-unit duplicates (raw tsg1_temp_c, plus every
  // tsg2/2b/3/5 temp/conductivity/sound-velocity field) — same "different
  // physical sensor unit, not distinct data" reasoning as the tsg2/3/5
  // salinity/density fields above. Every parameter here already has its
  // one representative card from TSG1 in the families above.
  'calcofi_mets::tsg1_temp_c', 'calcofi_mets::tsg2_temp_c', 'calcofi_mets::tsg2b_temp_c',
  'calcofi_mets::tsg2_conductivity', 'calcofi_mets::tsg2_sound_velocity',
  'calcofi_mets::tsg3_temp_c', 'calcofi_mets::tsg3_conductivity', 'calcofi_mets::tsg3_sound_velocity',
  'calcofi_mets::tsg5_temp_c',
  // Raw sea-surface salinity reading — the Sea Surface Salinity family
  // member above now surfaces only sss_psu_corrected as the one SSS card,
  // same fix as the raw sst_c exclusion below.
  'calcofi_mets::sss_psu',
  // Raw SBE48 sea-surface temperature reading — the Sea Surface Temperature
  // family member above now surfaces only sst_c_corrected as the one SST
  // card, so the uncalibrated raw reading is dropped rather than left to
  // leak through as its own loose row.
  'calcofi_mets::sst_c',
  // Predicted temperature products — removed from the browsable list per
  // request. Were Temperature family members (Temperature (Predicted),
  // Sea Surface Temperature (Predicted)); label mapping and category-fix
  // exact-match entries removed alongside this.
  'calcofi_mets::pred_temp_c', 'calcofi_mets::pred_sst_c',
  // bottom_depth_mb_m (multibeam) was already documented above (Depth
  // family, Bottom Depth member) as sharing one card with the single-beam
  // reading — "one card per dataset, not one per field" — but was never
  // actually added here, so it kept leaking through as its own loose
  // "Bottom Depth (MB)" row instead of being absorbed into that card.
  'calcofi_mets::bottom_depth_mb_m',
  // Abundance, from the compound dataset_key
  // "swfsc_ichthyo;ucsd_sio_mesopelagic-fish" — a data-pipeline artifact (a
  // field genuinely shared by two source datasets, joined with a literal
  // semicolon rather than resolving to one real dataset) that doesn't match
  // any entry in DATASET_META/DATASET_CATEGORY, so it fell through into the
  // uncategorized "Other" bucket and had 0 real station coverage — flagged
  // during the parameter-naming audit, now confirmed live and removed.
  // Re-add once the pipeline resolves it to one real dataset_key.
  'swfsc_ichthyo;ucsd_sio_mesopelagic-fish::abundance',
]);
// ---- Euphausiid species: station-coverage stand-in (VARS synthesis removed) ----
// CalCOFI/workflows PR #72 landed: variables.json now carries the real 37-species
// breakdown directly (no more aggregate "Euphausiidae" row), so the VARS-synthesis
// half of this block is gone — buildCanonicalVars() sees the real taxon records
// like any other dataset.
//
// euphausiid_species_coverage.json is still fetched below, but now only for
// TAXON_STATIONS (per-station highlighting): build_stations.sql's taxon_coverage.json
// join doesn't have euphausiid coverage yet, so per-species station highlighting
// would otherwise fall back to whole-dataset coverage. Once that join lands too,
// delete the euphausiid-specific merge in the fetch handler below and let the
// generic taxon_coverage.json loop cover it like every other taxon dataset.
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
const BY_KEY = {}, MARKERS = {}, DS_STATIONS = {};   // dataset_key -> Set(grid_key)
const DECADES = {};   // dataset_key -> station_id -> [{decade, mean_density, n_tows}]
// "dataset_key::aphia_id" -> Set(grid_key) — per-taxon, per-dataset station
// coverage from the optional
// taxon_coverage.json (see load block below). Empty until/unless that file
// exists; every consumer below falls back to dataset-wide coverage when a
// given aphia_id has no entry here.
const TAXON_STATIONS = {};
// "dataset_key::aphia_id" (or "::name::...") -> { grid_key -> years[] } — the
// per-station, per-year breakdown for taxa where the source data actually
// has one (currently just euphausiids, from euphausiid_species_coverage.json's
// own `years` field). Lets stationsForVar() genuinely respect the year
// slider for these taxa instead of always returning the all-time station
// set — see stationsForVarIsYearAware().
const TAXON_YEARS = {};
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
const DEPTH_PROFILES = {};   // dataset_key -> station_id -> variable_name -> [{depth_m, value}]
// True once depth_profiles.json.gz has finished loading and reshaping (even if
// it was absent/empty). Distinguishes "still in flight, a Depth Profiles tab may
// yet appear" from "loaded, this station genuinely has no depth-resolved data" —
// same not-loaded-vs-real-zero distinction as bottleCastCovLoaded above.
let depthProfilesReady = false;
let selectedVar = null;
// ---- station compare/averaging mode ----
// When active, clicking a marker toggles it into selectedGridKeys instead of
// opening the station panel. generateComparisonCards() then builds one
// synthetic averaged `d` object per dataset_key represented among the
// selected stations, and renders them with the existing datasetCard()
// (large mode) inside the shared modal — same rendering path as the single-
// station "expand card" modal, just fed averaged numbers instead of one
// station's real ones.
let compareMode = false;
let selectedGridKeys = new Set();
// Rubber-band selection: drag a rectangle over the map to select every
// station inside it in one motion, instead of clicking each one — the
// difference matters once you're picking 15-20 stations for an average.
let lassoMode = false;
let lassoPoints = null;      // array of {x,y} containerPoints traced during the drag
let lastComparisonStations = []; // stations behind the most recent generateComparisonCards() call — used by downloadComparisonReport()
let lastComparisonCards = []; // [{d, label}] averaged card data from the same call — used by downloadComparisonReport()'s text rendering
let CARD_COMPARE_CTX = {}; // cardId -> {datasetKey, label, stations} — for per-card downloads on averaged comparison cards
let CARD_DL_CTX = {}; // cardId -> {d, label} — for per-card downloads on regular (non-comparison) station cards
let cardDownloadCounter = 0;
let currentStation = null; // persists across variable selections — the back button points here until "All Categories" is clicked
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
// decades.json (per-station decade-means for the plankton datasets) is optional —
// tolerate its absence so the map still loads before the first refresh builds it.
Promise.all([
  fetch('./data/stations.json').then(r => r.json()),
  fetch('./data/variables.json').then(r => r.json()),
  fetch('./data/decades.json').then(r => r.ok ? r.json() : []).catch(() => []),
  // taxon_coverage.json: one row per (grid_key, aphia_id) — per-taxon station
  // coverage, separate from the per-dataset coverage baked into stations.json.
  // Optional and additive: when absent, station counts/highlighting fall back
  // to dataset-wide (today's behavior, e.g. every ZooDB taxon showing the
  // same "54 stations" regardless of how often that specific taxon was
  // actually recorded — see 2026-07 investigation). When present, per-taxon
  // numbers are used automatically — no other code change needed either way.
  fetch('./data/taxon_coverage.json').then(r => r.ok ? r.json() : []).catch(() => []),
  // bottle_cast_coverage.json: one row per (grid_key, subset) — real
  // per-subset coverage for the split Hydrographic Bottle/Cast cards.
  // Optional/additive, same tolerant pattern as the rest.
  fetch('./data/bottle_cast_coverage.json').then(r => { bottleCastCovLoaded = r.ok; return r.ok ? r.json() : []; }).catch(() => []),
  // bathymetry.json: one row per (grid_key, bathymetry_depth_m) — seafloor
  // depth sampled from GEBCO 2025, the same source + method the CalCOFI/apps
  // ctd-viz app uses (bathymetry isn't in the release DB yet — tracked as
  // CalCOFI/workflows#54 — so this is the same app-side stopgap that app
  // already relies on, just precomputed once instead of sampled live).
  // Optional/additive: absent means depth-profile charts just don't draw a
  // seafloor line, same as before this existed.
  fetch('./data/bathymetry.json').then(r => r.ok ? r.json() : []).catch(() => []),
  // euphausiid_species_coverage.json: one row per (grid_key, scientific_name)
  // — built from the real BTEDB raw export (225 wide Genus_species_stage
  // columns), matched to the existing 218-station grid by Line/Station.
  // Rough/demo-quality (only ~44% of historical tows land on a currently
  // known grid station; life stages summed together per species). Real
  // per-species *variable* records now come from variables.json directly
  // (CalCOFI/workflows PR #72 landed) — this file is only still needed for
  // per-station highlighting, since build_stations.sql's taxon_coverage.json
  // join doesn't cover euphausiids yet. Drop this fetch once that lands too.
  fetch('./data/euphausiid_species_coverage.json').then(r => r.ok ? r.json() : []).catch(() => []),
  // bird_mammal_species_coverage.json: one row per (grid_key, scientific_name)
  // — built from the Farallon Institute CCE-LTER package (knb-lter-cce.255),
  // joining each of the three cruise types' observation table to its transect
  // log on GIS key for real date + lat/lon, then matched to the 218-station
  // grid the same way as the euphausiid join. Partial/known-incomplete: the
  // package's embedded species-code dictionary only resolves 75 of the 292
  // distinct codes actually used (the rest — 217 codes — are still raw,
  // unidentified codes with no name to key on), and of those 75, only 46
  // cross-matched to a scientific name already in variables.json (the rest
  // are ambiguous multi-species groupings like "Unknown whale" with no
  // single scientific name, or spelling mismatches not yet reconciled).
  // Covers ~46 of the ~149 bird/mammal taxa in the catalog; the remainder
  // still show "(all years)" until the fuller code dictionary from the
  // earlier RREAS/Farallon/BeachCOMBER resolution effort is available here.
  fetch('./data/bird_mammal_species_coverage.json').then(r => r.ok ? r.json() : []).catch(() => [])
]).then(([st, va, dm, tc, bc, bathy, ec, bm]) => {
  STATIONS = st; VARS = va;
  (dm || []).forEach(r => { ((DECADES[r.dataset_key] ||= {})[r.station_id] ||= []).push(r); });
  (tc || []).forEach(r => (TAXON_STATIONS[r.dataset_key + '::' + r.aphia_id] ||= new Set()).add(r.grid_key));
  // Keyed by scientific_name as a fallback for the 5 species with no
  // resolved aphia_id yet (see the Nematoscelis/"Hansarsia" synonym
  // question) — stationsForVar() checks aphia_id first, name second.
  (ec || []).forEach(r => {
    if (r.aphia_id) {
      (TAXON_STATIONS['cce-lter_euphausiids::' + r.aphia_id] ||= new Set()).add(r.grid_key);
      ((TAXON_YEARS['cce-lter_euphausiids::' + r.aphia_id] ||= {})[r.grid_key] = r.years);
    }
    (TAXON_STATIONS['cce-lter_euphausiids::name::' + r.scientific_name] ||= new Set()).add(r.grid_key);
    ((TAXON_YEARS['cce-lter_euphausiids::name::' + r.scientific_name] ||= {})[r.grid_key] = r.years);
  });
  // Same pattern as euphausiids above, keyed by scientific_name (no aphia_id
  // resolved for this join yet) — populated under both the current and
  // pre-rename dataset_key, same dual-key safety as DATASET_META until the
  // release DB actually ships with the renamed key.
  (bm || []).forEach(r => {
    ['farallon_bird-mammal', 'calcofi_bird_mammal_census'].forEach(dk => {
      (TAXON_STATIONS[dk + '::name::' + r.scientific_name] ||= new Set()).add(r.grid_key);
      ((TAXON_YEARS[dk + '::name::' + r.scientific_name] ||= {})[r.grid_key] = r.years);
    });
  });
  (bc || []).forEach(r => { BOTTLE_CAST_COV[r.grid_key + '::' + r.subset] = r; });
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
  depthProfilesPromise = fetchGzJson('./data/depth_profiles.json.gz')
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
  const y0 = d.time_min ? +String(d.time_min).slice(0, 4) : null;   // fallback: extent overlap
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
// NOTE: the taxon-level path only respects the year-range slider where real
// per-year data exists (TAXON_YEARS — currently just euphausiids, via
// euphausiid_species_coverage.json's own `years` field). Add year bins to
// taxon_coverage.json's build if year-filtered counts are needed for the
// rest of the taxon-level catalog too.
function taxonStationsInRange(stationSet, yearsByStation) {
  if (!yearRange || !yearsByStation) return stationSet;
  const [a, b] = yearRange;
  return new Set([...stationSet].filter(gk => {
    const years = yearsByStation[gk];
    return years && years.some(o => o.y >= a && o.y <= b);
  }));
}
function stationsForVar(v) {
  const key = v.dataset_key + '::' + v.aphia_id;
  if (v.aphia_id && TAXON_STATIONS[key]) return taxonStationsInRange(TAXON_STATIONS[key], TAXON_YEARS[key]);
  const nameKey = v.dataset_key + '::name::' + v.name;
  if (!v.aphia_id && TAXON_STATIONS[nameKey]) return taxonStationsInRange(TAXON_STATIONS[nameKey], TAXON_YEARS[nameKey]);
  return new Set(STATIONS.filter(s => activeDatasets(s).some(d => d.dataset_key === v.dataset_key)).map(s => s.grid_key));
}
// Whether the count stationsForVar() returns for `v` actually honors the year
// slider. True on the per-taxon path only where TAXON_YEARS has real per-year
// data for this specific taxon (euphausiids); false for the rest of the
// taxon-level catalog, which is still all-time regardless of the slider.
// Callers must not assert a year range next to a number this returns false
// for: the banner used to read "N stations … in 1950–1980" with an all-time
// N, which reads as a filtered count and isn't one.
function stationsForVarIsYearAware(v) {
  if (v.aphia_id && TAXON_STATIONS[v.dataset_key + '::' + v.aphia_id]) return !!TAXON_YEARS[v.dataset_key + '::' + v.aphia_id];
  if (!v.aphia_id && TAXON_STATIONS[v.dataset_key + '::name::' + v.name]) return !!TAXON_YEARS[v.dataset_key + '::name::' + v.name];
  return true;
}
// calcofi_mets aggregates ~54 distinct raw parameters (per-unit TSG sensors,
// meteorology, derived/predicted products) that were installed, retired, or
// added to the release DB at different times — datasetYearSpan() (and the
// auto-snap in selectVariable() that calls it) can only see the dataset's
// overall min/max year across ALL of those parameters combined, not any one
// parameter's own coverage. So selecting a single METS parameter still
// locks/labels the slider to the whole dataset's span, which can overstate
// how far back or how recent that specific parameter's real data goes.
// Flagged here so the banner can caveat it instead of implying a precision
// the data doesn't actually have. Add other multi-parameter datasets here if
// the same gap turns up for them.
const DATASET_SPAN_IS_AGGREGATE = new Set(['calcofi_mets']);

function applyStyles() {
  const selSet = selectedVar ? stationsForVar(selectedVar) : null;
  STATIONS.forEach(s => {
    const mk = MARKERS[s.grid_key]; if (!mk) return;
    const active = activeDatasets(s), nd = active.length;
    if (selectedVar) {
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
    // The station currently open in the side panel gets a white ring on
    // top of whatever style was just applied above. This used to be a
    // solid filled disc specifically to stay visually distinct from the
    // cyan compare-selection ring — but now that compare mode suppresses
    // this marker entirely (below), the two never appear at once, so a
    // plain outline reads just as clearly as "you are here" without
    // needing the extra fill.
    // Suppressed while compare mode is active: "you are here" (single-
    // station browsing) and "these are selected for comparison" are two
    // different questions, and showing both at once — especially since the
    // open station is often unrelated to whatever's being compared — just
    // reads as two competing highlights on the map with no clear meaning.
    // Compare mode owns the map's "special marker" attention while it's on;
    // the white ring comes back once you exit back to single-station
    // browsing (see toggleCompareMode).
    if (!compareMode && currentStation && s.grid_key === currentStation.grid_key) {
      mk.setStyle({ color: '#ffffff', weight: 3 });
      mk.bringToFront();
    }
    // Compare-mode selection ring — cyan, distinct from the gold pinned
    // ring and white current-station ring above, drawn last so it wins if
    // a station happens to be both selected and pinned/current.
    if (selectedGridKeys.has(s.grid_key)) {
      mk.setStyle({ color: '#00e5ff', weight: 3 });
      mk.bringToFront();
    }
  });
}

// ---- station compare/averaging mode ----
function toggleCompareMode() {
  compareMode = !compareMode;
  // The compare control lives in one spot on the map (top-right): the
  // collapsed launcher and the expanded panel swap places there rather
  // than living in separate corners.
  document.getElementById('compare-toggle-btn').style.display = compareMode ? 'none' : 'flex';
  document.getElementById('compare-bar').style.display = compareMode ? 'block' : 'none';
  if (!compareMode) {
    selectedGridKeys.clear();
    updateCompareBar();
    if (lassoMode) toggleLassoMode();
  }
  applyStyles(); // entering: hides the white current-station disc; exiting: restores it
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
  // Don't start a lasso when the mousedown lands on a station marker itself
  // (an SVG <path>/<circle>) — let its own click handler run instead, so a
  // single click on one marker still toggles just that station even while
  // lasso mode is on.
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
  // Only keep a point if it's moved a few pixels from the last one — a raw
  // mousemove firehose would otherwise pile up hundreds of near-duplicate
  // points along a slow drag for no benefit to the traced shape.
  const last = lassoPoints[lassoPoints.length - 1];
  if (Math.hypot(e.containerPoint.x - last.x, e.containerPoint.y - last.y) < 2) return;
  lassoPoints.push(e.containerPoint);
  updateLassoPolygon();
}
// Standard ray-casting point-in-polygon test.
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
      // Center missed — a hand-drawn lasso rarely lands exactly on a
      // marker's true center, so also test a ring of points around the
      // marker's actual rendered radius. If any of those overlap the
      // polygon, the marker visually clips the drawn line and should count.
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
// Select-by-line: CalCOFI stations sit along numbered transect lines
// (s.line, e.g. 80, 90, or historical fractional lines like 66.7) — often
// the more natural unit to compare than an arbitrary map shape.
// Tolerance of 0.05 absorbs float rounding on the underlying line value
// without matching an adjacent line.
// Select-by-line: CalCOFI transect lines are often fractional
// "in-between" lines (66.7, 73.3, 76.7, 93.3, etc.), while people naturally
// type the whole-number line they mean (73, 76, 93). Matching by floor
// instead of exact/near-exact value means "73" catches a station on line
// 73.3 too, rather than reporting no match against a station that's
// visibly labeled 073.3 on the map.
function selectByLine() {
  const input = document.getElementById('line-select-input');
  const target = parseFloat(input.value);
  if (isNaN(target)) return;
  let matched = 0;
  STATIONS.forEach(s => {
    if (s.n_datasets && s.line != null && Math.floor(s.line) === Math.floor(target)) { selectedGridKeys.add(s.grid_key); matched++; }
  });
  input.value = '';
  updateCompareBar();
  applyStyles();
  if (!matched) alert(`No stations with data found on line ${target}.`);
}
function toggleStationSelection(gridKey) {
  const s = BY_KEY[gridKey];
  if (!s || !s.n_datasets) return; // nothing to average for a station with no data
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
  const n = selectedGridKeys.size;
  document.getElementById('compare-count').textContent = `${n} Selected`;
  document.getElementById('compare-generate-btn').disabled = n < 2;
}
// Averages a list of {y,n}/{m,n} histograms (one per contributing station)
// into a single histogram: for each key that appears in ANY contributor,
// sum n across all contributors (0 for ones missing that key) and divide
// by the contributor count — so a year only one station has data for still
// shows as a real average across the whole selected set, not just the
// stations that happened to have it.
function averageHistograms(lists, keyField) {
  const sums = {}, count = lists.length;
  lists.forEach(list => (list || []).forEach(o => { sums[o[keyField]] = (sums[o[keyField]] || 0) + o.n; }));
  return Object.keys(sums).map(k => ({ [keyField]: keyField === 'y' ? +k : +k, n: Math.round((sums[k] / count) * 10) / 10 }))
    .sort((a, b) => a[keyField] - b[keyField]);
}
function generateComparisonCards() {
  const stations = [...selectedGridKeys].map(k => BY_KEY[k]).filter(Boolean);
  if (stations.length < 2) return;
  // dataset_key -> list of {station, d} — one entry per station that has that dataset
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
    comparisonCards.push({ d: avgD, label: meta.label, color: meta.color, n, total: stations.length });
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
      ${datasetCard(avgD, { large: true, label: meta.label, color: meta.color, compareContext: contributingStations })}`;
  }).join('');
  lastComparisonCards = comparisonCards;
  document.getElementById('modal-title').textContent = `Averaged Coverage — ${stations.length} stations selected`;
  const downloadBtnHtml = `<button class="download-btn cards-download-btn" id="comparison-download-btn" onclick="downloadComparisonReport()"
      title="Download a PDF with a map screenshot, these averaged coverage cards, and the selected stations' coordinates">
      ⬇ Download coverage cards
    </button>`;
  document.getElementById('modal-body').innerHTML = downloadBtnHtml + (cardsHtml || '<div class="cov-empty">No datasets in common.</div>');
  document.getElementById('modal-footer').style.display = 'none';
  document.getElementById('modal').classList.add('modal-large');
  document.getElementById('modal-backdrop').classList.add('open');
  lastComparisonStations = stations; // used by downloadComparisonReport()
}

// ---- download report (map screenshot + coverage cards + station list) ----
// Slices a tall canvas across as many PDF pages as needed, scaled to the
// page's usable width. firstPageStartY lets the first slice start below
// whatever heading text is already on that page; later pages start at the
// plain top margin.
// Prints a list of text lines, starting a new page whenever one would run
// past the bottom margin — so a long station list is never silently
// truncated, just spread across as many pages as it needs.
// Draws a bordered, zebra-striped table of stations — Station ID /
// Latitude / Longitude columns with a header row — instead of a bare list
// of "id (lat, lon)" lines. Paginates row by row. Returns the y position
// after the table.
// Adds a light border frame and a "CalCOFI Station Data Portal / Page X of
// Y" footer to every page already in the doc. Called once right before
// doc.save(), after all content/pages exist, rather than threaded through
// every page-building step individually.
function finalizeDocChrome(doc, marginPt) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 154, 160);
    doc.text('CalCOFI Station Data Portal', marginPt, h - 12);
    doc.text(`Page ${p} of ${total}`, w - marginPt, h - 12, { align: 'right' });
  }
}
// A short colored rule under the main title, for a bit of visual identity
// beyond plain black text — same accent color as the coverage card that
// follows, so the two feel like one document rather than two styles glued
// together.
function drawTitleRule(doc, marginPt, y, color, widthPt) {
  const [r, g, b] = hexRGB(color);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(2);
  doc.line(marginPt, y, marginPt + Math.min(widthPt || 120, 160), y);
}
// Draws a consistent header block — bold title, colored accent rule, muted
// subtitle line — shared by all four PDF downloads so they read as one
// document style instead of four slightly different ones. Leaves the doc's
// text color/weight reset to plain black/normal before returning, so
// whatever's drawn next doesn't inherit the subtitle's muted gray.
// Returns the y position to continue drawing below it.
function drawReportHeader(doc, title, subtitle, marginPt, color) {
  doc.setFont(undefined, 'bold');
  doc.setFontSize(17);
  doc.setTextColor(20, 22, 26);
  doc.text(title, marginPt, marginPt);
  drawTitleRule(doc, marginPt, marginPt + 9, color);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(122, 126, 132);
  doc.text(subtitle, marginPt, marginPt + 27);
  doc.setTextColor(20, 22, 26);
  return marginPt + 46;
}
// Embeds an image with a thin frame around it, instead of a bare
// doc.addImage — small touch, but a raw unbordered map screenshot sitting
// directly on white page background looked unfinished.
function drawFramedImage(doc, dataUrl, x, y, w, h) {
  doc.addImage(dataUrl, 'PNG', x, y, w, h);
  doc.setDrawColor(210, 212, 217);
  doc.setLineWidth(0.75);
  doc.rect(x, y, w, h, 'S');
}
// A one-line caption under a map image spelling out what a highlighted
// marker means — the color alone (a white disc, a cyan ring) has no
// explanatory power once it's a static image outside the app, so this
// makes it explicit instead of assuming the reader already knows.
function drawMapCaption(doc, marginPt, y, text) {
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(130, 134, 140);
  doc.text(text, marginPt, y);
  return y + 14;
}
function drawStationTable(doc, stations, marginPt, y, usableWidth) {
  const rowH = 15;
  const colW = [usableWidth * 0.45, usableWidth * 0.275, usableWidth * 0.275];
  const colX = [marginPt, marginPt + colW[0], marginPt + colW[0] + colW[1]];
  const headers = ['STATION ID', 'LATITUDE', 'LONGITUDE'];
  y = ensureSpace(doc, y, rowH * 2, marginPt);
  doc.setFillColor(230, 232, 236);
  doc.rect(marginPt, y, usableWidth, rowH, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(60, 64, 70);
  headers.forEach((h, i) => doc.text(h, colX[i] + 5, y + 10.5));
  doc.setFont(undefined, 'normal');
  y += rowH;
  stations.forEach((s, i) => {
    y = ensureSpace(doc, y, rowH, marginPt);
    if (i % 2 === 1) {
      doc.setFillColor(244, 245, 247);
      doc.rect(marginPt, y, usableWidth, rowH, 'F');
    }
    doc.setDrawColor(221, 221, 226);
    doc.setLineWidth(0.4);
    doc.rect(marginPt, y, usableWidth, rowH, 'S');
    doc.setFontSize(9);
    doc.setTextColor(20, 22, 26);
    doc.text(s.station_id, colX[0] + 5, y + 10.5);
    doc.text(s.lat.toFixed(4), colX[1] + 5, y + 10.5);
    doc.text(s.lon.toFixed(4), colX[2] + 5, y + 10.5);
    y += rowH;
  });
  return y;
}
// Starts a new page if `needed` points of vertical space aren't left before
// the bottom margin — used by the card text renderer below so a card never
// gets silently cut off mid-block the way an unpaginated image would.
function ensureSpace(doc, y, needed, marginPt) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - marginPt) { doc.addPage(); return marginPt; }
  return y;
}
// Wraps `text` to `maxWidth` and prints it line by line, paginating as
// needed. Returns the y position after the last line.
function writeWrapped(doc, text, x, y, maxWidth, marginPt, lineHeight) {
  doc.splitTextToSize(text, maxWidth).forEach(line => {
    y = ensureSpace(doc, y, lineHeight, marginPt);
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}
// Renders a coverage card as plain text — label, date/depth/coverage
// stats, then every year and every month with its actual observation
// count — instead of a screenshot. Card downloads used to rasterize the
// on-screen card with html2canvas, which (a) depended on a third-party
// library that could fail to parse the page's CSS (see the color-mix()
// incident) and (b) buried the real numbers inside an image instead of
// searchable/copyable text. This reads the same underlying data
// (`years`/`months`/etc.) the bar-chart card reads, so the PDF always has
// real content — never a screenshot, never a "couldn't capture" fallback.
// Returns the y position after the card, for chaining multiple cards down
// one page/report.
// Draws every [label, count] pair as ONE continuous horizontal line —
// a narrow bar per entry (height proportional to count, so the trend
// reads at a glance) with its exact "label: count" printed as small
// rotated text growing upward from the bar's top, so nothing wraps to a
// second row regardless of how many entries there are. Requested
// specifically after a multi-row grid version wasn't what "keep it in one
// line" meant — this is a literal single row. Returns the y position
// after the strip.
function drawTimelineStrip(doc, pairs, marginPt, y, usableWidth, color, rowH) {
  const barMaxH = 34;
  const n = pairs.length;
  if (!n) return y;
  const cellW = usableWidth / n;
  // Horizontal value labels need roughly (characters × fontSize × 0.55) of
  // width to clear their neighbors — for a 4-digit comma-formatted number
  // ("2,860") at the smallest font size that's ~15pt. Below that, fall
  // back to vertical (90°) labels instead: at 90° a label's horizontal
  // footprint is just the font's stroke thickness, independent of how many
  // digits it has, so — confirmed by an actual collision check against a
  // 72-year span (the densest real case), not just eyeballing it — even
  // adjacent labels clear each other with no staggering needed. An earlier
  // attempt staggered alternating labels onto two vertical "lanes" to fix
  // collisions at 45°, but that's gone now: it's unnecessary at 90° and
  // made the chart harder to read with every other label at a different
  // height.
  const useHorizontalValues = cellW >= 15;
  const valueZoneH = barMaxH + (useHorizontalValues ? 16 : 22);
  const yearZoneH = 34;
  rowH = rowH || (valueZoneH + yearZoneH);
  y = ensureSpace(doc, y, rowH, marginPt);
  const max = Math.max(1, ...pairs.map(p => p[1]));
  const baseline = y + valueZoneH;
  doc.setDrawColor(226, 227, 231);
  doc.setLineWidth(0.5);
  doc.line(marginPt, baseline, marginPt + usableWidth, baseline);
  const [cR, cG, cB] = hexRGB(color || '#4dabf7');
  const fontSize = cellW < 7 ? 5 : cellW < 11 ? 5.5 : 6.5;
  pairs.forEach(([lbl, cnt], i) => {
    const cx = marginPt + i * cellW + cellW / 2;
    const barW = Math.max(0.6, cellW * 0.62);
    if (cnt > 0) {
      // sqrt, not linear — with one big outlier year (a common CalCOFI
      // pattern), a linear scale crushes every smaller-but-still-real value
      // down to the same 2pt floor (e.g. 8 and 21 both landing at
      // 16*8/191≈0.7 and 16*21/191≈1.8, both clamped to the same minimum —
      // visually identical despite being a very different count). Square
      // root keeps meaningfully different counts visually distinct even
      // when one year dwarfs the rest.
      const barH = Math.max(3, barMaxH * Math.sqrt(cnt / max));
      doc.setFillColor(cR, cG, cB);
      doc.rect(cx - barW / 2, baseline - barH, barW, barH, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(50, 53, 58);
      if (useHorizontalValues) {
        doc.text(num(Math.round(cnt)), cx, baseline - barH - 3, { align: 'center' });
      } else {
        doc.text(num(Math.round(cnt)), cx, baseline - barH - 3, { angle: 90 });
      }
    } else {
      // No bar at all for a genuine zero — a full-saturation colored
      // sliver (even a 1pt-tall one) reads as "there's a little data here,"
      // which is the opposite of what a zero count means.
      doc.setFont(undefined, 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(180, 183, 188);
      if (useHorizontalValues) {
        doc.text('0', cx, baseline - 3, { align: 'center' });
      } else {
        doc.text('0', cx, baseline - 3, { angle: 90 });
      }
    }
    // Year — fixed row below the baseline (like a normal chart x-axis),
    // growing down-right, normal weight. Anchoring it to the baseline
    // rather than the bar top means every year sits at the same height
    // regardless of that year's count, so the sequence reads left-to-right
    // in a straight line instead of zig-zagging with the bar heights.
    doc.setFont(undefined, 'normal');
    doc.setTextColor(110, 114, 120);
    doc.text(String(lbl), cx - fontSize * 0.2, baseline + 7, { angle: -45 });
  });
  doc.setFont(undefined, 'normal');
  return y + rowH;
}
// Estimates a recurring survey cadence from a month-by-month observation
// count — by testing each candidate interval's best-fitting phase (e.g.
// for quarterly: Jan/Apr/Jul/Oct vs Feb/May/Aug/Nov vs Mar/Jun/Sep/Dec)
// and picking whichever concentrates the most observations into the
// fewest, evenly-spaced months. k=1 is deliberately excluded — every
// month trivially sums to 100% of the total, so it can never lose this
// comparison and isn't a real signal. Requires the winning phase to
// capture a clear majority (55%+) of the total before calling it a
// pattern; returns null rather than guessing if nothing stands out.
function estimateSamplingFrequency(monthCounts) {
  const total = monthCounts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  // Restricted to cadences that are actually realistic for this kind of
  // survey — quarterly, semi-annual, or a single annual season. Bimonthly
  // (k=2) and "three times a year" (k=4) were removed: they're not real
  // sampling patterns here, and structurally had an unfair advantage in
  // this comparison anyway — a phase with more months in it (bimonthly has
  // 6, vs quarterly's 4) sums a larger fraction of any reasonably-spread
  // activity almost automatically, regardless of whether that cadence
  // reflects anything real about how the surveys were actually run.
  const candidates = [
    { k: 3, label: 'quarterly' },
    { k: 6, label: 'semi-annual (twice a year)' },
    { k: 12, label: 'a single annual season' },
  ];
  let best = null;
  candidates.forEach(({ k, label }) => {
    for (let offset = 0; offset < k; offset++) {
      const months = [];
      let sum = 0, activeCount = 0;
      for (let m = offset; m < 12; m += k) {
        sum += monthCounts[m];
        if (monthCounts[m] > 0) activeCount++;
        months.push(m);
      }
      const frac = sum / total;
      // A phase can capture a huge fraction of the total for the wrong
      // reason: if only 2 months in the whole year have any activity at
      // all, whichever phase happens to contain both of them "wins" with
      // 100%, even though that's just 2 data points, not a recurring
      // pattern — e.g. two surveys 6 months apart (genuinely semi-annual)
      // can make quarterly look like a perfect fit purely because the
      // other 2 quarterly months are zero. Requiring most of the phase's
      // OWN months to show real activity (not just that the total lands in
      // that phase) rules that out.
      const density = activeCount / months.length;
      if (density < 0.6) continue;
      if (!best || frac > best.frac) best = { k, label, frac, months };
    }
  });
  // Lower bar than before (was 0.55) — with only these three, realistic
  // candidates left, a clear quarterly pattern in real (noisy) data often
  // lands in the 45-55% range rather than the 55%+ that was achievable
  // when wider, unrealistic phases were still in the running.
  if (!best || best.frac < 0.4) return null;
  // A wider phase (quarterly's 4 months, semi-annual's 2) will almost
  // always sum to more than a single month does, just by having more
  // terms — so a genuinely single-peak pattern (one big survey month, the
  // rest near-zero) can still "win" as quarterly purely because its phase
  // happens to contain that one peak plus some low-noise filler months,
  // not because there's real recurring structure. If one month alone
  // explains most of what the winning phase captured, it's more honest to
  // call that a single season than a multi-peak cadence.
  if (best.k !== 12) {
    const maxMonth = Math.max(...monthCounts);
    const maxFrac = maxMonth / total;
    if (maxFrac / best.frac > 0.7) {
      const peakMonth = monthCounts.indexOf(maxMonth);
      best = { k: 12, label: 'a single annual season', frac: maxFrac, months: [peakMonth] };
    }
  }
  const monthList = best.months.map(m => MONTH_ABBR[m]).join(', ');
  return `Sampling pattern: approximately ${best.label} (concentrated in ${monthList} — ${Math.round(best.frac * 100)}% of observations)`;
}
function renderCardText(doc, d, label, marginPt, y, opts) {
  opts = opts || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - marginPt * 2;
  const lh = 13;
  y = ensureSpace(doc, y, 70, marginPt); // keep the header block from splitting across a page break
  if (opts.withLabel !== false) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(label, marginPt, y);
    doc.setFont(undefined, 'normal');
    y += lh + 2;
  }

  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  y = ensureSpace(doc, y, lh, marginPt);
  doc.text('Observations by Year', marginPt, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  if (d.years && d.years.length) {
    const byYear = {};
    d.years.forEach(o => byYear[o.y] = o.n);
    const pairs = [];
    for (let yr = d.years[0].y; yr <= d.years[d.years.length - 1].y; yr++) pairs.push([String(yr), byYear[yr] || 0]);
    y = drawTimelineStrip(doc, pairs, marginPt, y, usableWidth, opts.color);
  } else {
    doc.setFontSize(9);
    y = ensureSpace(doc, y, lh, marginPt);
    doc.text('no dates', marginPt, y);
    y += lh;
  }
  y += 14;

  // Reserves room for the heading + sampling-pattern text + chart together
  // (~140pt, generous enough for the text to wrap onto two lines) — not
  // just the heading's own line height. Without this, the heading and text
  // could fit at the bottom of a page while the chart itself got pushed
  // alone onto the next one, splitting one section across two pages.
  y = ensureSpace(doc, y, 140, marginPt);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('Seasonality by Month', marginPt, y);
  y += 14; // was 5 — not enough clearance below a 10pt heading, the next line's text visibly overlapped it
  const byMonth = {};
  (d.months || []).forEach(o => byMonth[o.m] = o.n);
  const monthPairs = MONTH_ABBR.map((name, i) => [name, byMonth[i + 1] || 0]);
  const freqText = estimateSamplingFrequency(monthPairs.map(p => p[1]));
  if (freqText) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(20, 22, 26);
    // writeWrapped, not a single doc.text() call — the unwrapped version ran
    // straight off the right edge of the page for longer generated strings.
    y = writeWrapped(doc, freqText, marginPt, y, usableWidth, marginPt, 12);
    y += 6;
  }
  doc.setFont(undefined, 'normal');
  y = drawTimelineStrip(doc, monthPairs, marginPt, y, usableWidth, opts.color);
  y += 12;
  return y;
}
// Converts a "#rrggbb" hex string to a [r,g,b] 0-255 array for jsPDF's
// setFillColor/setDrawColor/setTextColor, which want separate channels
// rather than a hex string.
function hexRGB(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
// Draws the coverage card as native vector shapes and text — same visual
// design as the on-screen dark card (.ds-card/.ybar/.mbar in styles.css),
// same color/opacity math as yearBars()/monthBars() — but with jsPDF
// primitives instead of a rasterized DOM screenshot. This replaced an
// html2canvas capture of the actual card: raster screenshots of small text
// and thin bars come out visibly soft/blurry once scaled up to fill a PDF
// page, a hard limit of html2canvas's own text rendering that more capture
// resolution only partially compensates for. Vector shapes have no such
// ceiling — sharp at any zoom or print size, and the resulting PDF is
// smaller too. Returns the y position after the card.
function renderCardVector(doc, d, label, color, marginPt, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardW = pageWidth - marginPt * 2;
  const padX = 10, padY = 10;
  const bg = mixHex(color, 6, '#0f1e35');
  const [bgR, bgG, bgB] = hexRGB(bg);
  const [cR, cG, cB] = hexRGB(color);
  const hasYears = d.years && d.years.length;
  const barsAreaH = hasYears ? 34 : 12;
  const cardH = padY + 16 /*header*/ + 3 * 12 /*stats*/ + 10 /*gap*/ + 11 /*bars-label*/ + barsAreaH
    + 20 /*gap*/ + 11 /*bars-label*/ + 13 /*month bars*/ + padY;

  y = ensureSpace(doc, y, cardH + 14, marginPt);
  const top = y;

  doc.setFillColor(bgR, bgG, bgB);
  doc.roundedRect(marginPt, top, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(58, 63, 68);
  doc.setLineWidth(0.75);
  doc.roundedRect(marginPt, top, cardW, cardH, 4, 4, 'S');
  doc.setFillColor(cR, cG, cB);
  doc.rect(marginPt, top, 2.5, cardH, 'F'); // left accent bar, matches border-left: 3px solid var(--c)

  let cy = top + padY;
  // header: dot + label + realm badge
  doc.setFillColor(cR, cG, cB);
  doc.circle(marginPt + padX + 3, cy + 2.5, 3, 'F');
  doc.setTextColor(230, 233, 237);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(label, marginPt + padX + 10, cy + 5.5);
  const realm = d.realm || 'env';
  const isBio = realm === 'bio';
  const badgeFillHex = isBio ? '#69db7c' : '#4dabf7';
  const badgeTextRGB = isBio ? [140, 233, 154] : [116, 192, 247];
  const badgeText = realm.toUpperCase();
  doc.setFont(undefined, 'bold');
  doc.setFontSize(7);
  const badgeTextW = doc.getTextWidth(badgeText);
  const badgeW = badgeTextW + 10, badgeH = 12;
  const badgeX = marginPt + cardW - padX - badgeW;
  const [badgeR, badgeG, badgeB] = hexRGB(mixHex(badgeFillHex, isBio ? 16 : 18, bg));
  doc.setFillColor(badgeR, badgeG, badgeB);
  doc.roundedRect(badgeX, cy - 3.5, badgeW, badgeH, 6, 6, 'F');
  doc.setTextColor(badgeTextRGB[0], badgeTextRGB[1], badgeTextRGB[2]);
  doc.text(badgeText, badgeX + badgeW / 2, cy + 4.5, { align: 'center' });
  cy += 16;

  // stats: Date Range / Depth Range / Coverage
  doc.setFont(undefined, 'normal');
  const depth = (d.depth_min != null || d.depth_max != null)
    ? `${Math.round(d.depth_min ?? 0)}\u2013${Math.round(d.depth_max ?? 0)} m` : 'depth n/a';
  const statRows = [
    ['DATE RANGE', `${day(d.time_min)} - ${day(d.time_max)}`],
    ['DEPTH RANGE', depth],
    ['COVERAGE', `${num(d.n_surveys)} surveys \u00b7 ${num(d.n_obs)} obs`],
  ];
  statRows.forEach(([lbl, val]) => {
    doc.setFontSize(7);
    doc.setTextColor(154, 160, 166);
    doc.text(lbl, marginPt + padX, cy + 4);
    doc.setFontSize(9);
    doc.setTextColor(230, 233, 237);
    doc.text(val, marginPt + cardW - padX, cy + 4, { align: 'right' });
    cy += 12;
  });
  cy += 10;

  // year bars
  doc.setFontSize(7);
  doc.setTextColor(154, 160, 166);
  doc.text('OBSERVATIONS BY YEAR', marginPt + padX, cy + 4);
  cy += 11;
  const barsAreaW = cardW - padX * 2;
  if (hasYears) {
    const y0 = d.years[0].y, y1 = d.years[d.years.length - 1].y;
    const byYear = {};
    d.years.forEach(o => byYear[o.y] = o.n);
    const max = Math.max(...d.years.map(o => o.n));
    const n = y1 - y0 + 1;
    const gap = 0.6, barW = Math.max(0.4, (barsAreaW - (n - 1) * gap) / n);
    const baseline = cy + barsAreaH;
    for (let i = 0; i < n; i++) {
      const yr = y0 + i, cnt = byYear[yr] || 0;
      const h = cnt ? (4 + 26 * cnt / max) : 1;
      const barColor = mixHex(color, cnt ? 85 : 13, bg);
      doc.setFillColor(...hexRGB(barColor));
      doc.rect(marginPt + padX + i * (barW + gap), baseline - h, barW, h, 'F');
    }
    doc.setFontSize(7);
    doc.setTextColor(154, 160, 166);
    doc.text(String(y0), marginPt + padX, baseline + 8);
    doc.text(String(y1), marginPt + cardW - padX, baseline + 8, { align: 'right' });
    cy += barsAreaH + 20;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text('no dates', marginPt + padX, cy + 6);
    cy += barsAreaH;
  }

  // month bars
  doc.setFontSize(7);
  doc.setTextColor(154, 160, 166);
  doc.text('SEASONALITY (BY MONTH)', marginPt + padX, cy + 4);
  cy += 11;
  const byMonth = {};
  (d.months || []).forEach(o => byMonth[o.m] = o.n);
  const maxM = Math.max(1, ...Object.values(byMonth));
  const mGap = 1.2, mBarW = (barsAreaW - 11 * mGap) / 12;
  for (let i = 0; i < 12; i++) {
    const cnt = byMonth[i + 1] || 0;
    const op = 13 + 87 * cnt / maxM; // percent, matches 0.13 + 0.87*n/max
    const cellColor = mixHex(color, op, bg);
    const cellX = marginPt + padX + i * (mBarW + mGap);
    doc.setFillColor(...hexRGB(cellColor));
    doc.roundedRect(cellX, cy, mBarW, 13, 1.5, 1.5, 'F');
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(11, 12, 14);
    doc.text(MONTHS[i], cellX + mBarW / 2, cy + 9, { align: 'center' });
    doc.setFont(undefined, 'normal');
  }
  return top + cardH + 14;
}
// Temporarily re-centers the live map on one station or fits it to several,
// captures that view, then restores whatever view the person had before —
// so a download shows the relevant station(s) in context instead of
// whatever part of the coast happened to be on screen when they clicked
// download, without permanently moving the map out from under them.
// Standard Web Mercator tile math (what every {z}/{x}/{y} XYZ tile server,
// including the CARTO basemap this app already uses, is indexed by) —
// converts a lat/lon into "world pixel" coordinates at a given zoom, where
// one tile is TILE_SIZE x TILE_SIZE world pixels. Used to place both the
// tile images and the markers from the exact same source coordinates,
// instead of asking Leaflet where it currently thinks something is.
const TILE_SIZE = 256;
function lonToWorldX(lon, zoom) {
  return (lon + 180) / 360 * TILE_SIZE * Math.pow(2, zoom);
}
function latToWorldY(lat, zoom) {
  const rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * TILE_SIZE * Math.pow(2, zoom);
}
function loadTileImage(z, x, y) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const subdomains = 'abcd';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // a missing tile shouldn't fail the whole map
    img.src = `https://${subdomains[(x + y) % subdomains.length]}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
  });
}
// Highest zoom (capped at maxZoom) at which every point fits within
// canvasW x canvasH pixels with the given padding — the same job
// Leaflet's fitBounds() does, computed by hand.
function pickZoomToFit(points, canvasW, canvasH, padding, maxZoom) {
  if (points.length <= 1) return maxZoom;
  const lats = points.map(p => p[0]), lons = points.map(p => p[1]);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  for (let z = maxZoom; z >= 1; z--) {
    const w = lonToWorldX(lonMax, z) - lonToWorldX(lonMin, z);
    const h = latToWorldY(latMin, z) - latToWorldY(latMax, z); // lat max -> smaller world-Y
    if (w + padding * 2 <= canvasW && h + padding * 2 <= canvasH) return z;
  }
  return 1;
}
// Renders the map onto a plain canvas — fetching the same CARTO tile
// images directly by URL and drawing every station marker ourselves with
// the projection math above — instead of screenshotting Leaflet's live DOM
// via html2canvas. Four separate attempts at making that DOM capture
// reliable (disabling worldCopyJump, capturing the live element instead of
// a clone, invalidateSize with and without the preceding jump) each
// produced a different symptom, none confirmed fixed, all reasoned
// blind without a way to test against the real map. That pattern — not
// converging, and a new distortion each time — pointed at the capture
// approach itself rather than any one specific bug within it. This sidesteps
// the whole category: every pixel here comes directly from the same lat/lon
// data the app already has, computed once, not captured from a separate
// stateful library's current rendering.
function captureMapForStations(stationList) {
  const canvasW = 1200, canvasH = 490, padding = 70, maxZoom = 6;
  const points = stationList.map(s => [s.lat, s.lon]);
  const zoom = pickZoomToFit(points, canvasW, canvasH, padding, maxZoom);
  const lats = points.map(p => p[0]), lons = points.map(p => p[1]);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const originWorldX = lonToWorldX(centerLon, zoom) - canvasW / 2;
  const originWorldY = latToWorldY(centerLat, zoom) - canvasH / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1a2e';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const maxTileIndex = Math.pow(2, zoom) - 1;
  const tileMinX = Math.floor(originWorldX / TILE_SIZE), tileMaxX = Math.floor((originWorldX + canvasW) / TILE_SIZE);
  const tileMinY = Math.floor(originWorldY / TILE_SIZE), tileMaxY = Math.floor((originWorldY + canvasH) / TILE_SIZE);
  const tilePromises = [];
  for (let tx = tileMinX; tx <= tileMaxX; tx++) {
    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
      if (ty < 0 || ty > maxTileIndex) continue;
      // Wrap the tile X index around the world so panning near the
      // antimeridian still resolves to a real tile — worldCopyJump was one
      // of the theories in the old approach; this sidesteps it structurally
      // by never asking Leaflet to decide which world-copy to show.
      const wrappedTx = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
      const px = tx * TILE_SIZE - originWorldX, py = ty * TILE_SIZE - originWorldY;
      tilePromises.push(loadTileImage(zoom, wrappedTx, ty).then(img => { if (img) ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE); }));
    }
  }

  return Promise.all(tilePromises).then(() => {
    // Every known station, faint, as map context — same visual language as
    // the live app's default (unselected) marker style.
    STATIONS.forEach(s => {
      const wx = lonToWorldX(s.lon, zoom) - originWorldX, wy = latToWorldY(s.lat, zoom) - originWorldY;
      if (wx < -20 || wx > canvasW + 20 || wy < -20 || wy > canvasH + 20) return;
      const has = (s.n_datasets || 0) > 0;
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = has ? 'rgba(77,171,247,0.72)' : 'rgba(58,63,68,0.35)';
      ctx.strokeStyle = has ? '#cfd8e3' : '#5a626b';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    // The station(s) this export is actually about — solid white disc for
    // a single station (matches the on-screen "current station" marker),
    // cyan ring for a multi-station comparison (matches the on-screen
    // compare-selection ring) — same color language as the live app, drawn
    // independently rather than read off it.
    stationList.forEach(s => {
      const wx = lonToWorldX(s.lon, zoom) - originWorldX, wy = latToWorldY(s.lat, zoom) - originWorldY;
      ctx.beginPath();
      ctx.arc(wx, wy, 7, 0, 2 * Math.PI);
      if (stationList.length === 1) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    });
    return canvas;
  });
}
function downloadSingleStationCard(cardId) {
  const ctx = CARD_DL_CTX[cardId];
  if (!currentStation || !ctx) return;
  const s = currentStation;
  captureMapForStations([s]).then(mapCanvas => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 36, pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    let y = drawReportHeader(doc, `${ctx.label} — Station ${s.station_id}`,
      `Coordinates: ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}   ·   Generated ${new Date().toLocaleDateString()}`, margin, ctx.color);
    if (mapCanvas) {
      const h = Math.min(182, mapCanvas.height * (usableWidth / mapCanvas.width));
      drawFramedImage(doc, mapCanvas.toDataURL('image/png'), margin, y, usableWidth, h);
      y = drawMapCaption(doc, margin, y + h + 14, '\u2022 White marker — this station');
    } else {
      doc.setFontSize(9);
      doc.text('(Map screenshot unavailable in this browser — check the console for the specific error.)', margin, y);
      y += 20;
    }
    y = renderCardVector(doc, ctx.d, ctx.label, ctx.color, margin, y);
    y += 16; // extra breathing room before the reference section
    y = ensureSpace(doc, y, 40, margin);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Full values (reference)', margin, y);
    doc.setFont(undefined, 'normal');
    renderCardText(doc, ctx.d, ctx.label, margin, y + 20, { withLabel: false, color: ctx.color });
    finalizeDocChrome(doc, margin);
    doc.save(`calcofi-${s.station_id.replace(/\s+/g, '_')}-${ctx.d.dataset_key}.pdf`);
  });
}
function downloadSingleComparisonCard(cardId) {
  const ctx = CARD_COMPARE_CTX[cardId];
  if (!ctx) return;
  captureMapForStations(ctx.stations).then(mapCanvas => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 36, pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    let y = drawReportHeader(doc, `${ctx.label} — Averaged Across ${ctx.stations.length} Stations`,
      `Generated ${new Date().toLocaleDateString()}`, margin, ctx.color);
    if (mapCanvas) {
      const h = Math.min(182, mapCanvas.height * (usableWidth / mapCanvas.width));
      drawFramedImage(doc, mapCanvas.toDataURL('image/png'), margin, y, usableWidth, h);
      y = drawMapCaption(doc, margin, y + h + 14, '\u2022 Cyan ring — stations included in this average');
    } else {
      doc.setFontSize(9);
      doc.text('(Map screenshot unavailable in this browser — check the console for the specific error.)', margin, y);
      y += 20;
    }
    y = renderCardVector(doc, ctx.d, ctx.label, ctx.color, margin, y);
    y += 16; // extra breathing room before the reference section
    y = ensureSpace(doc, y, 40, margin);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Full values (reference)', margin, y);
    doc.setFont(undefined, 'normal');
    y = renderCardText(doc, ctx.d, ctx.label, margin, y + 20, { withLabel: false, color: ctx.color });
    y = ensureSpace(doc, y, 40, margin);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Contributing Stations (${ctx.stations.length})`, margin, y);
    doc.setFont(undefined, 'normal');
    drawStationTable(doc, ctx.stations, margin, y + 16, usableWidth);
    finalizeDocChrome(doc, margin);
    doc.save(`calcofi-comparison-${ctx.d.dataset_key}.pdf`);
  });
}
function downloadStationReport() {
  if (!currentStation) return;
  const s = currentStation;
  const btn = document.getElementById('station-download-btn');
  const original = btn.textContent;
  btn.textContent = '⬇ Preparing…';
  btn.disabled = true;
  captureMapForStations([s]).then(mapCanvas => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 36, pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    let y = drawReportHeader(doc, `CalCOFI Station ${s.station_id}`,
      `Coordinates: ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}   ·   Datasets: ${s.n_datasets || 0}   ·   Generated ${new Date().toLocaleDateString()}`,
      margin, '#4dabf7');
    if (mapCanvas) {
      const mapH = Math.min(182, mapCanvas.height * (usableWidth / mapCanvas.width));
      drawFramedImage(doc, mapCanvas.toDataURL('image/png'), margin, y, usableWidth, mapH);
      y = drawMapCaption(doc, margin, y + mapH + 14, '\u2022 White marker — this station');
    } else {
      doc.setFontSize(9);
      doc.text('(Map screenshot unavailable in this browser.)', margin, y);
      y += 20;
    }
    const entries = stationCardEntries(s);
    entries.forEach(({ d, label, color }) => {
      y = ensureSpace(doc, y, 200, margin);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, y);
      doc.setFont(undefined, 'normal');
      const yAfterCard = renderCardVector(doc, d, label, color, margin, y + 20);
      y = renderCardText(doc, d, label, margin, yAfterCard, { withLabel: false, color }) + 20;
    });
    if (!entries.length) {
      doc.addPage();
      doc.setFontSize(9);
      doc.text('No datasets at this station.', margin, margin);
    }
    finalizeDocChrome(doc, margin);
    doc.save(`calcofi-station-${s.station_id.replace(/\s+/g, '_')}.pdf`);
  }).catch(err => {
    console.error(err);
    alert('Could not generate the PDF — check the browser console for details.');
  }).finally(() => { btn.textContent = original; btn.disabled = false; });
}
function downloadComparisonReport() {
  const stations = lastComparisonStations;
  if (!stations.length) return;
  const btn = document.getElementById('comparison-download-btn');
  const original = btn.textContent;
  btn.textContent = '⬇ Preparing…';
  btn.disabled = true;
  captureMapForStations(stations).then(mapCanvas => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 36, pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    let y = drawReportHeader(doc, `CalCOFI Averaged Coverage — ${stations.length} stations selected`,
      `Generated ${new Date().toLocaleDateString()}`, margin, '#4dabf7');
    if (mapCanvas) {
      const mapH = Math.min(182, mapCanvas.height * (usableWidth / mapCanvas.width));
      drawFramedImage(doc, mapCanvas.toDataURL('image/png'), margin, y, usableWidth, mapH);
      y = drawMapCaption(doc, margin, y + mapH + 14, '\u2022 Cyan ring — stations included in this average');
    } else {
      doc.setFontSize(9);
      doc.text('(Map screenshot unavailable in this browser.)', margin, y);
      y += 20;
    }
    y = ensureSpace(doc, y, 60, margin);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Selected Stations (${stations.length})`, margin, y);
    doc.setFont(undefined, 'normal');
    y = drawStationTable(doc, stations, margin, y + 16, usableWidth) + 20;
    if (lastComparisonCards.length) {
      lastComparisonCards.forEach(({ d, label, color, n, total }) => {
        y = ensureSpace(doc, y, 220, margin);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(label, margin, y);
        doc.setFont(undefined, 'italic');
        doc.setFontSize(9);
        y = writeWrapped(doc, `Averaged across ${n} of ${total} selected stations that have ${label} data`, margin, y + 18, usableWidth, margin, 13);
        doc.setFont(undefined, 'normal');
        const yAfterCard = renderCardVector(doc, d, label, color, margin, y + 6);
        y = renderCardText(doc, d, label, margin, yAfterCard, { withLabel: false, color }) + 20;
      });
    } else {
      doc.addPage();
      doc.setFontSize(9);
      doc.text('No datasets in common.', margin, margin);
    }
    finalizeDocChrome(doc, margin);
    doc.save(`calcofi-comparison-${stations.length}-stations.pdf`);
  }).catch(err => {
    console.error(err);
    alert('Could not generate the PDF — check the browser console for details.');
  }).finally(() => { btn.textContent = original; btn.disabled = false; });
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
// CAVEAT: this is a dataset-wide span, not a per-variable one — for a
// single-parameter dataset that's the same thing, but for a multi-parameter
// dataset like calcofi_mets it's the min/max across every one of its ~54
// parameters combined, which can be wider than any individual parameter's
// real coverage. See DATASET_SPAN_IS_AGGREGATE below, which flags this for
// the banner caveat.
function datasetYearSpan(datasetKey) {
  let mn = Infinity, mx = -Infinity;
  STATIONS.forEach(s => (s.datasets || []).forEach(d => {
    if (d.dataset_key !== datasetKey) return;
    (d.years || []).forEach(o => { if (o.y < mn) mn = o.y; if (o.y > mx) mx = o.y; });
  }));
  return isFinite(mn) ? [mn, mx] : null;
}
function resetYearFilter() {
  setYearRange(G_MIN, G_MAX);
  applyStyles(); if (selectedVar) highlight(selectedVar);
}

// ---- category classification (used by the inventory panel + grouped search) --
const CAT_COUNTS = {};         // category -> variable count
const DATASET_VAR_COUNTS = {}; // dataset_key -> variable count

function contentKeywordGroup(v) {
  const n = (v.display_name || v.name || '').toLowerCase();
  // 'sw_ph' (calcofi_mets) doesn't match any of the ph patterns below (no
  // leading "ph"), so it was falling through to calcofi_mets's raw dataset
  // default of Meteorology & Sea State — exact-name fix rather than
  // broadening the substring check, which risks new false positives.
  if (n === 'sw_ph') return 'Carbonate System';
  // All TSG-prefixed fields (tsg1/2/2b/3/5 temp, conductivity, salinity,
  // density, sound velocity — including raw/uncalibrated variants not
  // covered by the family's representative field) are physical
  // oceanography sensor readings, same as the TSG1 reading already shown
  // there. Matched before the dataset-default fallback so they don't land
  // in Meteorology & Sea State just because their abbreviated names
  // ("tsg2_temp_c") don't contain the literal "temperature" substring.
  if (n.startsWith('tsg')) return 'Physical Oceanography';
  // calcofi_mets: 'chl_fluor'/'par_surf'/'pred_chl' don't contain the literal
  // "fluorescence"/"par "/"chlorophyll" substrings the checks below look
  // for, and the pred_* fields don't contain "temperature"/"salinity" —
  // same abbreviation-mismatch bug as sw_ph above, found by auditing where
  // every calcofi_mets field actually landed after the family-category fix.
  if (n === 'chl_fluor' || n === 'par_surf' || n === 'pred_chl') return 'Productivity & Pigments';
  if (n === 'pred_sal_psu') return 'Physical Oceanography';
  if (n === 'ph' || n.startsWith('ph ') || n.startsWith('ph_') || n.includes('ph replicate')) return 'Carbonate System';
  // "dic" as a bare substring false-positives on any word that happens to contain
  // those 3 letters in sequence -- "Dictyochophyceae" (phytoplankton) and
  // "Appendicularia" (zooplankton) were landing in Carbonate System for exactly
  // this reason. Match the real variable names (dic, dic_rep1, dic_rep2) instead.
  if (['alkalinity', 'dissolved inorganic carbon', 'carbonate', 'pco2'].some(k => n.includes(k))
      || n === 'dic' || n.startsWith('dic_') || n.startsWith('dic ')) return 'Carbonate System';
  // ISUS is an in-situ UV nitrate sensor — was wrongly forced to Physical
  // Oceanography; it measures nitrate, so it belongs with the other
  // nutrient readings below.
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
  'ucsd_sio_mesopelagic-fish': 'Mesopelagic Fish', 'sio_mesopelagic-fish': 'Mesopelagic Fish', 'cce-lter_picoplankton-bacteria': 'Picoplankton & Bacteria'
};
// Family membership is a more reliable category signal than keyword-matching
// the raw name for members whose raw fields are heavily abbreviated (e.g.
// calcofi_mets's 'sst_c'/'tsg1_temp_c' don't contain the literal substring
// "temperature", so contentKeywordGroup() misses them and they were falling
// through to calcofi_mets's raw dataset default of Meteorology & Sea State —
// found via screenshot: the whole Temperature/Salinity/Conductivity/Density/
// Sound Velocity/Oxygen family set was landing there instead of Physical
// Oceanography, even though the display label was already correct).
// Checked AFTER contentKeywordGroup so already-correct keyword-driven cases
// (Alkalinity/DIC/pH -> Carbonate System, Wind -> Meteorology) are untouched.
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
  return DATASET_CATEGORY[v.dataset_key] || (dsMeta(v.dataset_key).realm === 'env' ? 'Physical Oceanography' : 'Other');
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
let inventoryMode = 'category';   // 'category' | 'dataset'
let expandedInventoryGroup = null; // category name or dataset_key currently expanded
let expandedFamilyKey = null;      // `${group}::${familyName}` currently expanded within a listing
// `${familyName}::${memberLabel}` currently expanded in the search dropdown
// (its dataset-picker cards showing) — separate from expandedFamilyKey since
// the dropdown is a different listing with its own open/closed state.
let ddExpandedGroup = null;
let expandedGroupKey = null;       // `${familyKey}::${groupMemberLabel}` currently expanded within a family — the source-list level (e.g. Temperature -> Bottle/CTD Cast/Carbonate Cast)

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
          // calcofi_mets (Underway METS) — TSG1/2/2b/3/5 are separate
          // physical thermosalinograph units all landing in the same
          // calcofi_mets dataset, not genuinely different data, so only
          // one representative field is surfaced (TSG1's calibrated
          // variant). The dedicated sea-surface sensor (sst_c/sst_c_
          // corrected) is a likely-different sensor per the standardization
          // notes, so it gets its own member below rather than being folded
          // in here.
          { dataset_key: 'calcofi_mets', match: 'tsg1_temp_c_calibrated', source: 'METS (Underway)' },
        ] },
      { type: 'group', label: 'Sea Surface Temperature', short: 'SST',
        method: 'Hull-mounted temperature sensor (SBE48, in the transducer void)',
        sources: [
          // sst_c and sst_c_corrected are the same SBE48 sensor, raw vs
          // calibrated — one physical instrument, not two, so only the
          // corrected reading is surfaced as the representative field
          // (same "one card per dataset" pattern as TSG1's calibrated
          // variant above). Raw sst_c is excluded below.
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
          // calcofi_mets — same one-card-per-dataset reasoning as
          // Temperature/Salinity above.
          { dataset_key: 'calcofi_mets', match: 'oxygen', source: 'METS (Underway)', note: 'Continuous underway sensor, reported in mL/L' },
        ] },
      // oxygen_temp_c: the naming follows the same "<parameter>_temp_c"
      // pattern as air_temp_c (Air Temperature) and dic_temp_c (Temperature
      // (DIC Analyzer)) elsewhere in this dataset — a temperature reading
      // taken BY or FOR a specific instrument, not general seawater/air
      // temperature. Confirmed by the ship's underway processing notes:
      // "temperature of the water oxygen measurements were made on" — the
      // oxygen sensor's own reading, not an independent seawater temperature.
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
          // calcofi_mets — same one-card-per-dataset reasoning as
          // Temperature above; sea-surface sensor (sss_psu/sss_psu_
          // corrected) is a likely-different sensor per the standardization
          // notes, so it gets its own member below.
          { dataset_key: 'calcofi_mets', match: 'tsg1_salinity_psu_calibrated', source: 'METS (Underway)', note: 'TSG75 unit, continuous underway intake sensor' },
        ] },
      { type: 'group', label: 'Sea Surface Salinity', short: 'SSS',
        method: 'Sea surface salinity from a dedicated surface sensor, separate from the ship\'s TSG intake sensor',
        sources: [
          // sss_psu and sss_psu_corrected are the same dedicated surface
          // sensor, raw vs calibrated — one physical instrument, not two,
          // so only the corrected reading is surfaced as the representative
          // field (same pattern as Sea Surface Temperature above). Raw
          // sss_psu is excluded below.
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
      // Sea Surface Conductivity (ss_conductivity) — ss_ prefix signals the
      // same dedicated-surface-sensor pattern as sst_/sss_ above, likely a
      // different sensor than the TSG1 intake reading, not a duplicate.
      { type: 'single', dataset_key: 'calcofi_mets', match: 'ss_conductivity', label: 'Sea Surface Conductivity', short: 'SSC',
        method: 'Sea surface conductivity from a dedicated surface sensor' },
    ],
  },
  {
    name: 'Density',
    members: [
      // Same TSG-redundancy reasoning as Temperature/Salinity above — folded
      // into one member with 3 sources instead of two near-duplicate rows.
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
      // Same TSG-redundancy reasoning as Temperature/Salinity above.
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
    // Same collision pattern as Bottom Depth — calcofi_bottle's wind_direction
    // (logged during the Bottle/CTD cast, shipboard weather log) and
    // calcofi_mets's wind_dir_deg (continuous underway) were two disconnected
    // raw fields both auto-resolving to the identical label "Wind Direction"
    // with nothing linking them — found via the same duplicate-row audit
    // that caught Bottom Depth. Kept as its own top-level family (not nested
    // under a combined "Wind" umbrella) since Direction and Speed are
    // independently useful parameters, not variants of one measurement.
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
    // Same collision pattern as Wind Direction above.
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
      // The underway DIC/pCO2 analyzer needs its own intake temperature and
      // salinity to compute and correct its pCO2/pH output — same role as
      // Oxygen Sensor Temperature under Oxygen above. Not general seawater
      // temperature/salinity readings, so kept here as support data for this
      // instrument rather than merged into the Physical Oceanography
      // Temperature/Salinity families.
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_salinity_psu', label: 'Salinity (DIC Analyzer)', short: 'DIC Analyzer',
        method: "The underway DIC analyzer's own intake salinity reading, used to correct its pCO2/pH output — not an independent seawater salinity reading" },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_temp_c', label: 'Temperature (DIC Analyzer)', short: 'DIC Analyzer',
        method: "The underway DIC analyzer's own intake temperature reading, used to correct its pCO2/pH output — not an independent seawater temperature reading" },
      // Valve position is instrument state, not a chemistry measurement —
      // which sample stream (seawater intake vs. reference gas/standard) the
      // underway analyzer is currently reading. Same support-data role as
      // Salinity/Temperature (DIC Analyzer) above, so nested here rather
      // than left as an unaffiliated loose row.
      { type: 'single', dataset_key: 'calcofi_mets', match: 'dic_valve', label: 'DIC Analyzer Valve Position', short: 'DIC Analyzer',
        method: "Which sample stream (seawater intake vs. reference gas/standard) the underway analyzer is currently reading — instrument state, not a chemistry measurement" },
      // A different physical sensor than pH (Bottle/CTD/Underway) above —
      // this is the underway DIC analyzer's own raw pH output, not another
      // dataset measuring the same pH. Own card, not a pH source.
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
    // Ship-level and sea-level-corrected atmospheric pressure were two
    // separate loose rows with no umbrella linking them — same fold pattern
    // as Bottom Depth/Atmospheric Pressure (SLC) above sharing one family.
    name: 'Atmospheric Pressure',
    members: [
      { type: 'single', dataset_key: 'calcofi_mets', match: 'atm_pressure_mb', label: 'Atmospheric Pressure', short: 'Ship Level',
        method: 'Atmospheric pressure (ship level)' },
      { type: 'single', dataset_key: 'calcofi_mets', match: 'atm_pressure_slc_mb', label: 'Atmospheric Pressure (SLC)', short: 'Sea-level Corrected',
        method: 'Atmospheric pressure, sea-level corrected' },
    ],
  },
  {
    // Bottom Depth (seafloor depth beneath the cast) is folded in here as
    // its own member rather than kept as a separate family — same umbrella
    // pattern as Dry Bulb/Wet Bulb nesting under Temperature. It's a
    // conceptually different quantity than water-column Depth above it
    // (bathymetry-style echosounder reading vs. depth derived from
    // pressure), but grouping by "depth" is the browsing convention here,
    // not strict quantity-type separation.
    // Secchi Depth used to live here too, but its raw field name
    // ("secchi_depth") matches contentKeywordGroup()'s 'secchi' keyword
    // before family membership is even checked, so it always displayed
    // under Meteorology & Sea State, never here — nesting it in this family
    // was a structural trap (looked like a Depth member, never rendered as
    // one). Given its own standalone family below instead, matching where
    // it actually shows up: it's a water-clarity reading, not a
    // depth/position measurement like Bottom Depth and Depth are.
    name: 'Depth',
    members: [
      // Was previously 3 unrelated raw fields across 2 datasets with no
      // shared label, showing as duplicate/colliding "Bottom Depth" rows in
      // the browse panel.
      { type: 'group', label: 'Bottom Depth', short: 'Standard',
        method: 'Water depth at the sampling event (sea floor depth beneath the cast)',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'bottom_depth', source: 'Bottle', note: 'Logged at the Bottle/CTD cast event' },
          // bottom_depth_mb_m (multibeam) is the same calcofi_mets dataset
          // as the single-beam reading below — one card per dataset, not
          // one per field, so only one is surfaced. Single-beam picked as
          // representative since it's the more consistently populated of
          // the two; still unconfirmed which one is actually preferred —
          // flagged in Betty's open questions list.
          { dataset_key: 'calcofi_mets', match: 'bottom_depth_m', source: 'METS (Underway)', note: 'Single-beam echosounder, continuous underway' },
        ] },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'r_depth', label: 'Depth', short: 'From Pressure',
        method: 'Reprocessed depth, derived from pressure' },
    ],
  },
  {
    // Standalone family, deliberately separate from Depth above — see the
    // comment there. Lands under Meteorology & Sea State via
    // contentKeywordGroup()'s 'secchi' keyword match, alongside wave/wind/
    // cloud readings, since it's optically measuring water clarity, not a
    // physical depth/position quantity.
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
  const official = DATASET_OFFICIAL_NAME[it.source.dataset_key] || it.source.source;
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

  // cce-lter_picoplankton-bacteria — flow cytometry counts
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
    // Render in the priority order defined on the family (most commonly
    // wanted first, Predicted last) rather than Map insertion order, which
    // just reflects whatever order the raw variables happened to arrive in.
    const orderedMembers = family.members.filter(m => byMember.has(m));

    // A family that boils down to exactly one group member (Alkalinity,
    // DIC, Sigma Theta...) has nothing distinct to say at the family level
    // that the member doesn't already say — skip the redundant outer
    // accordion and render its source list directly under the family name.
    if (byMember.size === 1 && [...byMember.keys()][0].type === 'group') {
      const [member, its] = [...byMember.entries()][0];
      // Only one dataset behind this member (e.g. Conductivity — just
      // METS) — nothing to choose between, so render it as a plain
      // clickable row instead of a "choose a dataset" accordion of one.
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
      // group member: one row, expands to a source list (which dataset
      // measures it) instead of pretending each source is a different
      // parameter — matches Betty's "Temperature > Bottle; CTD Cast" model.
      // If there's only one dataset behind it, there's nothing to choose,
      // so skip the accordion and make it a plain clickable row.
      if (its.length === 1) {
        return `<div class="inventory-subitem" data-vid="${encodeURIComponent(its[0].v.variable_id)}">
            <span class="inventory-subitem-name">${member.label}</span>
            <div class="inventory-family-method">${member.method}</div>
          </div>`;
      }
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
  // Phytoplankton has no PARAMETER_FAMILIES groups — every item here is a
  // loose row. "Phytoplankton Abundance" is a community-level measurement,
  // not a taxon, so the taxa-first sort below already puts it last.
  const PINNED_LOOSE_ITEM = {};
  // Items pinned to the bottom of a loose list instead of sorting
  // alphabetically — e.g. a raw sensor voltage listed alongside the actual
  // nutrient concentrations it's a proxy for.
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
    if (aTaxon !== bTaxon) return aTaxon ? -1 : 1; // taxa first, community-level metrics last
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
  const keys = inventoryMode === 'dataset'
    ? Object.keys(DATASET_META).filter(k => DATASET_VAR_COUNTS[k]).sort((a, b) => dsMeta(a).label.localeCompare(dsMeta(b).label))
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
  if (idx !== -1) { PINNED_CARDS.splice(idx, 1); renderPinnedTray(); applyStyles(); if(currentStation) openStation(currentStation); return; }
  const cand = PIN_CANDIDATES[key];
  if (!cand) return;
  PINNED_CARDS.push({ key, ...cand });
  renderPinnedTray();
  applyStyles();
  if (currentStation) openStation(currentStation); // updates this card's pin icon to "pinned"
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
// Computes the same tint the CSS used to do with color-mix() (a P% mix of
// `hex` into `base`) but as a plain solid hex string. html2canvas 1.4.1
// (used by the card-download PDF feature) throws "unsupported color
// function" on CSS color-mix() and aborts the whole capture, so .ds-card's
// background is set from this instead of color-mix() in the stylesheet —
// see the --card-bg usage below and the plain var(--card-bg) fallback in
// styles.css. Only needs to handle the #rrggbb hex strings DATASET_META
// actually uses.
function mixHex(hex, pct, base) {
  const parse = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hex), [r2, g2, b2] = parse(base);
  const p = pct / 100;
  const toHex = n => Math.round(n).toString(16).padStart(2, '0');
  const mix = (a, b) => a * p + b * (1 - p);
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
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
    pinBtn = `<button class="ds-pin-btn${pinned ? ' ds-pin-btn-active' : ''}" title="${pinned ? 'Unpin' : 'Pin to compare'}"
        onclick="event.stopPropagation(); togglePin('${key}')">${pinned ? '📌' : '📍'}</button>`;
  }
  // Per-card download — every card gets its own PDF regardless of whether
  // it belongs to a single open station (uses currentStation for coords)
  // or is an averaged comparison card (opts.compareContext carries the
  // specific stations that contributed to THIS dataset, which can differ
  // per card since not every selected station has every dataset). Renders
  // as native vector shapes (see renderCardVector) plus exact-value text
  // (renderCardText) rather than a screenshot of the card — no DOM element
  // needed, just the underlying data.
  let downloadBtn;
  if (opts.compareContext) {
    const cardId = 'cmpcard' + (cardDownloadCounter++);
    CARD_COMPARE_CTX[cardId] = { d, label, color, stations: opts.compareContext };
    downloadBtn = `<button class="ds-download-link" onclick="event.stopPropagation(); downloadSingleComparisonCard('${cardId}')">⬇ Download card</button>`;
  } else {
    const cardId = 'stncard' + (cardDownloadCounter++);
    CARD_DL_CTX[cardId] = { d, label, color };
    downloadBtn = `<button class="ds-download-link" onclick="event.stopPropagation(); downloadSingleStationCard('${cardId}')">⬇ Download card</button>`;
  }
  const avgBadge = opts.compareContext ? '<span class="ds-avg-badge" title="Values on this card are averaged across the contributing stations">AVG</span>' : '';
  return `<div class="ds-card${opts.clickable ? ' ds-card-clickable' : ''}${opts.large ? ' ds-card-large' : ''}" style="--c:${color};--card-bg:${mixHex(color, 6, '#0f1e35')}"${clickAttrs}>
      <div class="ds-head"><span class="ds-dot"></span><span class="ds-label">${label}</span>
        <div class="ds-head-right">${avgBadge}<span class="ds-realm ${d.realm}">${d.realm}</span></div>${pinBtn}</div>
      <div class="ds-stats">
        <div class="ds-stat"><span class="ds-stat-label">Date Range</span><span class="ds-stat-val">${day(d.time_min)} → ${day(d.time_max)}</span></div>
        <div class="ds-stat"><span class="ds-stat-label">Depth Range</span><span class="ds-stat-val">${depth}</span></div>
        <div class="ds-stat"><span class="ds-stat-label">Coverage</span><span class="ds-stat-val">${num(d.n_surveys)} surveys · ${num(d.n_obs)} obs</span></div>
      </div>
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
      <div class="ds-accordion-body">${datasetCard(d, { clickable: true, label, color: opts.color, stationId: s.station_id, stationGridKey: s.grid_key })}
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
// Returns the {d, label} pairs that make up a station's coverage cards —
// same split-Bottle/Cast logic used on-screen (see the comment above the
// call site in openStation), shared so the PDF report's text rendering
// always matches exactly what the panel shows, card for card.
function stationCardEntries(s) {
  return (s.datasets || []).flatMap(d => {
    if (d.dataset_key !== 'calcofi_bottle') return [{ d, label: dsMeta(d.dataset_key).label, color: dsMeta(d.dataset_key).color }];
    // If a station genuinely has zero recorded observations for one subset
    // (e.g. no weather/meteorology readings ever logged there, only bottle
    // chemistry), falling back to the OTHER subset's real numbers is
    // misleading — it looks like matching real coverage when there isn't
    // any. Show an honest empty state instead (day()/datasetCard already
    // render null/0 as "—"/"0 obs").
    const EMPTY_COV = { time_min: null, time_max: null, depth_min: null, depth_max: null, n_obs: 0, n_samples: 0, n_surveys: 0, years: null, months: null };
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
function openStation(s) {
  currentStation = s;
  applyStyles(); // rings the clicked marker — see the currentStation block in applyStyles()
  document.getElementById('panel-empty').style.display = 'none';
  document.getElementById('panel-header').style.display = 'block';
  showBackToCategories();
  document.getElementById('panel-station-id').textContent = `Station ${s.station_id}`;
  document.getElementById('panel-coords').textContent =
    `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`;
  document.getElementById('panel-depth-summary').innerHTML = '';
  document.getElementById('compare-control').style.display = 'block';
  const c = document.getElementById('panel-content');
  if (!s.n_datasets) {
    c.innerHTML = `<div class="cov-empty">No integrated-database observations recorded at this grid station.</div>`;
    return;
  }
  // calcofi_bottle is one physical DB table shared by two real-world
  // collection programs (Bottle chemistry + Cast meteorology/metadata — see
  // CAST_SIDE_BOTTLE_FIELDS). Split it into two accordion rows so Dry Bulb,
  // Wet Bulb, Water Color etc. don't sit under a "Hydrographic Bottle"
  // header. Coverage stats (date range/depth/year-month bars) come from the
  // optional bottle_cast_coverage.json when this station has an entry there
  // (real per-subset numbers); otherwise both cards fall back to the shared
  // whole-dataset record `d`, same as before that file existed.
  const cards = stationCardEntries(s).map(({ d, label }) => {
    if (d.dataset_key !== 'calcofi_bottle') return datasetAccordion(d, s);
    const all = CANON_VARS.filter(v => v.dataset_key === 'calcofi_bottle');
    const castVars = all.filter(v => CAST_SIDE_BOTTLE_FIELDS.has(v.name));
    const bottleVars = all.filter(v => !CAST_SIDE_BOTTLE_FIELDS.has(v.name));
    return label === 'Hydrographic Bottle'
      ? datasetAccordion(d, s, { label, vars: bottleVars })
      : datasetAccordion(d, s, { label, vars: castVars, color: '#be8c63' });
  }).join('');
  const dpCount = depthProfileCount(s);
  // Two tabs: Overview (existing dataset/decade content, unchanged) and its
  // own Depth Profiles panel — previously nested at the bottom of Overview
  // inside a details toggle, now a first-class destination instead of one
  // more thing to scroll past. Depth tab is omitted entirely when a station
  // has no depth-resolved data, same as the old toggle's behavior.
  // Starts on whichever tab was last viewed (lastStationTab), not always
  // Overview — clicking through several stations while comparing depth
  // profiles shouldn't mean re-clicking "Depth Profiles" every single time.
  // Falls back to Overview if this particular station has no depth tab at
  // all, since there's nothing to land on.
  const startTab = (lastStationTab === 'depth' && dpCount) ? 'depth' : 'overview';
  const tabs = dpCount ? `<div class="panel-tabs">
      <button class="panel-tab${startTab === 'overview' ? ' active' : ''}" data-tab="overview">Overview</button>
      <button class="panel-tab${startTab === 'depth' ? ' active' : ''}" data-tab="depth">Depth Profiles <span class="panel-tab-count">${dpCount}</span></button>
    </div>` : '';
  c.innerHTML = `${tabs}
    <div class="panel-tab-content" data-tabpanel="overview"${startTab === 'depth' ? ' style="display:none"' : ''}>
      <div class="cov-summary">
        <div><span class="k">datasets</span><span class="v">${s.n_datasets}</span></div>
        <div><span class="k">surveys</span><span class="v">${num(s.n_surveys)}</span></div>
        <div><span class="k">observations</span><span class="v">${num(s.n_obs)}</span></div>
        <div title="This station's own observation date range — may differ from the year slider above, which spans every station site-wide."><span class="k">span</span><span class="v">${yr(s.time_min)}–${yr(s.time_max)}</span></div>
      </div>
      <button class="download-btn cards-download-btn" id="station-download-btn" onclick="downloadStationReport()"
        title="Download a PDF with a map screenshot, this station's coverage cards, and its coordinates">
        ⬇ Download coverage cards
      </button>${cards}
    </div>
    <div class="panel-tab-content" data-tabpanel="depth"${startTab === 'overview' ? ' style="display:none"' : ''}></div>`;
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
// at" approach the nested per-variable rows already use.
function wirePanelTabs(c, s) {
  const tabBtns = c.querySelectorAll('.panel-tab');
  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.toggle('active', b === btn));
    lastStationTab = btn.dataset.tab;
    c.querySelectorAll('.panel-tab-content').forEach(p =>
      p.style.display = (p.dataset.tabpanel === btn.dataset.tab) ? '' : 'none');
    // Sampled-depth/bathymetry note only means something next to the actual
    // depth profiles — stays out of the Overview tab entirely.
    document.getElementById('panel-depth-summary').innerHTML =
      btn.dataset.tab === 'depth' ? depthSummaryFor(s) : '';
    if (btn.dataset.tab === 'depth') renderDepthTab(c, s);
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
    // Same ordering as the By Category browse panel: family members grouped
    // together by that category's CATEGORY_ITEM_ORDER priority (e.g.
    // Temperature/Salinity/Density/Oxygen before Beam Attenuation), members
    // alphabetized within their family, then loose (non-family) items
    // alphabetically after every family. No cap — a broad query shows every
    // real match rather than hiding results behind a "+N more" count.
    // Potential/Dry Bulb/Wet Bulb Temperature are single-type Temperature
    // members, so they'd otherwise cluster right at the top with the main
    // Temperature toggle (same family priority tier). Pushed to the very
    // bottom of the whole category instead — below even the loose items —
    // since they're air temp / a computed variant, not what most searches
    // for "temperature" actually want first.
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
      // Group-type family members (Temperature, Salinity, Density, Oxygen,
      // Oxygen Saturation, Dynamic Height) come from more than one dataset —
      // rather than listing "Temperature — Hydrographic Bottle", "— CTD
      // Cast Files", "— Carbonate Chemistry / DIC" as 3+ near-duplicate
      // rows, show the parameter name once as a toggle; clicking it expands
      // the same dataset-picker cards By Category uses (sourceCardRow),
      // instead of guessing which source the person wants.
      const groups = {}; // "Family::Member" -> [{v, member, source}, ...]
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
      const groupKeys = Object.keys(groups); // already in sorted order (first-seen)
      const itemCount = groupKeys.length + loose.length;
      const rowsHtml = [];
      sorted.forEach(v => {
        const fm = familyMemberFor(v);
        if (fm && fm.source) {
          const key = fm.family.name + '::' + fm.member.label;
          if (groups[key]._rendered) return; // already emitted this group's row
          groups[key]._rendered = true;
          const { member, its } = groups[key];
          // Only one dataset behind this member — nothing to pick between,
          // so render it as a normal item instead of a toggle-of-one.
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
  const span = datasetYearSpan(v.dataset_key);
  if (span) { lockYearRange(span[0], span[1]); setYearRange(span[0], span[1]); }  // once, on new selection only
  highlight(v);
  showVariablePanel(v);
}
function highlight(v) {
  selectedVar = v;
  document.getElementById('clear-btn').classList.add('visible');
  applyStyles();  // uses whatever yearRange currently is — doesn't touch the slider
  const n = stationsForVar(v).size;
  document.getElementById('year-slider').classList.toggle('var-active', n > 0);
  const banner = document.getElementById('search-banner');
  // Only claim the year range when the number actually reflects it. On the
  // per-taxon path it doesn't (no year bins in taxon_coverage.json), so say
  // "all years" rather than printing an unfiltered count under a filtered label.
  const yearAware = stationsForVarIsYearAware(v);
  const isAggregateSpan = DATASET_SPAN_IS_AGGREGATE.has(v.dataset_key);
  const yearNote = !yearRange ? ''
    : yearAware
      ? ` in <b>${yearRange[0]}–${yearRange[1]}</b>`
        + (isAggregateSpan
          ? ` <span class="banner-note" title="${datasetLabelFor(v)} combines many separately-added parameters — this is the whole dataset's coverage span, not necessarily this specific parameter's.">(dataset span)</span>`
          : '')
    : ` <span class="banner-note" title="Per-taxon coverage has no year breakdown yet, so this count spans the full record regardless of the slider.">(all years)</span>`;
  banner.innerHTML = `<b style="color:${datasetColorFor(v)}">${resolvedLabel(v)}</b> — `
    + `${n} stations with <b>${datasetLabelFor(v)}</b> coverage`
    + yearNote;
  banner.style.display = 'block';
}
function showVariablePanel(v) {
  const meta = dsMeta(v.dataset_key);
  document.getElementById('panel-empty').style.display = 'none';
  document.getElementById('panel-header').style.display = 'block';
  updateBackButton();
  document.getElementById('panel-station-id').textContent = resolvedPlainLabel(v);
  document.getElementById('panel-coords').textContent = 'Select a highlighted station';
  document.getElementById('panel-depth-summary').innerHTML = '';
  document.getElementById('compare-control').style.display = 'none';
  const stationCount = stationsForVar(v).size;
  const desc = descriptionFor(v, displayLabel(v)) || v.description || 'No description available.';
  const src = (v.source && (v.source.access_url || v.source.metadata_url)) || DATASET_URL_FALLBACK[v.dataset_key];
  document.getElementById('panel-content').innerHTML = `
    <div class="panel-info-block">
      <b>Dataset:</b> ${datasetLabelFor(v)}<br><br>
      <b>Description:</b> ${desc}<br><br>
      ${v.units ? `<b>Units:</b> ${v.units}<br><br>` : ''}
      ${v.aphia_id ? `<b>WoRMS:</b> <a target="_blank" rel="noopener" href="https://www.marinespecies.org/aphia.php?p=taxdetails&id=${v.aphia_id}">AphiaID ${v.aphia_id}</a><br><br>` : ''}
      <span class="panel-station-count">Collected at ${stationCount} station${stationCount === 1 ? '' : 's'}</span>
      <span class="panel-hint">Click a highlighted station on the map to open its full coverage.</span>
      ${src ? `<a href="${src}" target="_blank" rel="noopener" class="panel-open-dataset-btn">Open Dataset ↗</a>` : ''}
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
  applyStyles();  // clears the variable highlight and any parameter-specific year window
  document.getElementById('panel-header').style.display = 'none';
  document.getElementById('panel-back-btn').style.display = 'none';
  document.getElementById('panel-content').innerHTML = '';
  document.getElementById('panel-empty').style.display = '';
  if (compareMode) toggleCompareMode();
}
function togglePanel() { document.getElementById('side-panel').classList.toggle('collapsed'); }
function showAboutModal() { document.getElementById('about-backdrop').classList.add('open'); }
function hideAboutModal() { document.getElementById('about-backdrop').classList.remove('open'); }
// ---- feedback: a custom-styled form (matches the rest of the portal UI)
// that submits directly to the Google Form's backend endpoint, instead of
// showing Google's own form UI in an iframe. entry.* field IDs and the
// formResponse URL come from viewing the published form's page source —
// they're stable for a given form (Google doesn't rotate them), but if the
// form is ever rebuilt from scratch with new questions, these need updating.
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
  // Reset to the form view for next time, in case it was left on the thanks screen.
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
  // mode: 'no-cors' — Google's formResponse endpoint doesn't send CORS headers,
  // so the browser blocks reading the response either way. This still submits
  // the data (confirmed via the spreadsheet/Responses tab); we just can't
  // inspect success/failure from the response itself, so we optimistically
  // show the thank-you state once the request has been sent.
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
  { selector: '.inventory-view-tabs', title: 'By Category vs. By Dataset', body: 'Use By Category when you know what you\'re looking for — if something is measured by more than one instrument, those readings are grouped together in a dropdown. Use By Dataset to see what parameters a specific dataset monitors.', offsetX: -20 },
  { selector: '#map', title: 'Click any station', body: 'Click any station to open its full coverage: every dataset measured there, its date range, and depth profiles for each variable, where available.', placement: 'corner-top-right', offsetY: -50,
    highlightPadTop: 3, highlightPadRight: 0, highlightPadLeft: -4, highlightPadBottom: -3 },
  { selector: '.ds-card', title: 'Station overview', body: "Click any card to enlarge it. Each one shows a dataset's date range, depth range, and the number of surveys and individual measurements across time.",
    before: () => openTourExampleStation(), placement: 'left', highlightOffsetX: 2 },
  { selector: '#year-slider', title: 'Year slider', body: "Spans CalCOFI's full record by default. Selecting a parameter narrows the slider to when that parameter was actually measured.",
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
  { selector: '#compare-toggle-btn', title: 'Compare Stations', body: 'A different way to compare: click here to start, then select stations three ways — click individual stations directly, draw a freehand lasso around a group, or type a CalCOFI line number to grab every station on that line. Then generate one averaged coverage card per dataset across your whole selection.',
    // #compare-control (this button's wrapper) only becomes visible once a
    // station has been opened at least once — same reason the earlier
    // steps call this.
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
    if (!target) { tourNext(); return; } // target never rendered (e.g. no depth data anywhere) — skip it
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    positionTourHighlight(target, step);
    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-body').textContent = step.body;
    document.getElementById('tour-progress').textContent = `${tourStepIndex + 1} / ${WALKTHROUGH_STEPS.length}`;
    document.getElementById('tour-prev-btn').style.visibility = tourStepIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('tour-next-btn').textContent = tourStepIndex === WALKTHROUGH_STEPS.length - 1 ? 'Done' : 'Next';
    callout.style.display = 'block';
    // The callout's own position can target a different element than the
    // highlight ring (calloutAnchorSelector) — e.g. Pin's ring stays on the
    // actual pin icon, but its text bubble sits in the same screen spot the
    // map step used, rather than crowding the side panel.
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
    if (!target) return;   // target vanished mid-step — leave the callout where it is
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
