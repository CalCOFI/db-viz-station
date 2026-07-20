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
    attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19 }));

// dataset display metadata: label + color + realm (env = cool, bio = warm)
// Official dataset names — Betty's original app's exact titles where they
// exist (pulled from her ERDDAP crosswalk report, e.g. "CalCOFI SIO
// Hydrographic Bottle Data"), falling back to the workflows ingest
// scripts' dataset_meta.dataset_name for datasets that weren't in her old
// portal (DIC, phytoplankton, the combined bird/mammal census). Used as
// the card title when a parameter's family dropdown lists its sources.
const DATASET_OFFICIAL_NAME = {
  'calcofi_bottle': 'CalCOFI SIO Hydrographic Bottle Data',
  'calcofi_ctd-cast': 'CalCOFI NOAA Additional CTD',
  'calcofi_dic': 'CalCOFI Carbonate Chemistry',
  'calcofi_phytoplankton': 'CalCOFI Phytoplankton (Venrick)',
  'swfsc_ichthyo': 'CalCOFI NOAA Ichthyoplankton Tows',
  'swfsc_cufes': 'CalCOFI NOAA Continuous Underway Fish-Egg Sampler (CUFES)',
  'pic_zooplankton': 'SIO PIC Net-Tow Biovolume',
  'cce-lter_euphausiids': 'CalCOFI Euphausiid Database',
  'calcofi_phyllosoma': 'CalCOFI Lobster Phyllosoma',
  'cce-lter_zoodb': 'CalCOFI ZooDB',
  'cce-lter_zooscan': 'ZooScan PRPOOS Zooplankton',
  'calcofi_bird_mammal_census': 'CalCOFI Bird & Mammal Census',
};
const DATASET_META = {
  'calcofi_bottle':             { label: 'Hydrographic Bottle',              realm: 'env', color: '#4dabf7' },
  'calcofi_ctd-cast':           { label: 'CTD',                              realm: 'env', color: '#3bc9db' },
  'calcofi_dic':                { label: 'Carbonate Chemistry / DIC',        realm: 'env', color: '#63e6be' },
  'calcofi_phytoplankton':      { label: 'Phytoplankton',                    realm: 'bio', color: '#12b886' },
  'swfsc_ichthyo':              { label: 'Ichthyoplankton (Fish Eggs & Larvae)', realm: 'bio', color: '#ffa94d' },
  'swfsc_cufes':                { label: 'CUFES Fish Eggs',                  realm: 'bio', color: '#ffd43b' },
  'pic_zooplankton':            { label: 'Zooplankton',                     realm: 'bio', color: '#69db7c' },
  'cce-lter_euphausiids':       { label: 'Euphausiids (Krill)',              realm: 'bio', color: '#b197fc' },
  'calcofi_phyllosoma':         { label: 'Phyllosoma (Lobster Larvae)',      realm: 'bio', color: '#f783ac' },
  'cce-lter_zoodb':             { label: 'ZooDB (Holoplankton Community)',   realm: 'bio', color: '#38d9a9' },
  'cce-lter_zooscan':           { label: 'ZooScan (Imaged Zooplankton)',     realm: 'bio', color: '#a9e34b' },
  'calcofi_bird_mammal_census': { label: 'Seabirds & Marine Mammals',        realm: 'bio', color: '#ff8787' }
};
const dsMeta = id => DATASET_META[id] || { label: id, realm: 'bio', color: '#adb5bd' };
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

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
  'dic': 'DIC', 'oxygen ml l': 'Oxygen', 'oxygen umol kg': 'Oxygen',
  'reported salinity sva': 'Reported Specific Volume Anomaly', 'salinity sva': 'Specific Volume Anomaly',
  'par': 'PAR', 'spar': 'Surface PAR', 'isus v': 'ISUS Voltage',
  'ctdtemp its90': 'CTD Temperature (ITS-90)', 'salinity pss78': 'Salinity (PSS-78)',
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
// For species/taxon variables, appends the scientific name (stored in the
// release DB's `name` field) as an italic parenthetical after the common
// name — matches Betty's original taxonDisplayLabel pattern. Skipped when
// there's no separate common name (the label already IS the scientific
// name, e.g. class-level entries like "Bacillariophyceae").
function taxonLabel(v) {
  if (v.variable_type !== 'taxon') return displayLabel(v);
  const sci = (v.name || '').trim();
  if (v.common_name) {
    const label = displayLabel(v);
    if (!sci || sci.toLowerCase() === label.toLowerCase() || sci.includes('(')) return label;
    return `${label} <i style="color:var(--muted);font-weight:400;">(${sci})</i>`;
  }
  // No common name — the raw scientific name IS the label. Use it as-is
  // (already correctly cased in the source, e.g. "Panulirus interruptus")
  // rather than title-casing it, which wrongly capitalizes the species
  // epithet into "Panulirus Interruptus". Single-word entries (class-level
  // names like "Bacillariophyceae") don't have this problem, so they still
  // go through the normal display pipeline.
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
]);
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
let selectedVar = null;
let currentStation = null; // persists across variable selections — the back button points here until "All Categories" is clicked

// ---- load prebuilt data ----
// decades.json (per-station decade-means for the plankton datasets) is optional —
// tolerate its absence so the map still loads before the first refresh builds it.
Promise.all([
  fetch('./data/stations.json').then(r => r.json()),
  fetch('./data/variables.json').then(r => r.json()),
  fetch('./data/decades.json').then(r => r.ok ? r.json() : []).catch(() => [])
]).then(([st, va, dm]) => {
  STATIONS = st; VARS = va;
  (dm || []).forEach(r => { ((DECADES[r.dataset_key] ||= {})[r.station_id] ||= []).push(r); });
  STATIONS.forEach(s => {
    BY_KEY[s.grid_key] = s;
    (s.datasets || []).forEach(d => { (DS_STATIONS[d.dataset_key] ||= new Set()).add(s.grid_key); });
  });
  renderStations();
  wireSearch();
  initYearSlider();
  initChartTooltip();
  buildCanonicalVars();
  buildCategories();
  renderInventoryPanel();
}).catch(e => console.error('load failed', e));

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

function applyStyles() {
  STATIONS.forEach(s => {
    const mk = MARKERS[s.grid_key]; if (!mk) return;
    const active = activeDatasets(s), nd = active.length;
    if (selectedVar) {
      const on = active.some(d => d.dataset_key === selectedVar.dataset_key);
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
  if (n === 'ph' || n.startsWith('ph ') || n.startsWith('ph_') || n.includes('ph replicate')) return 'Carbonate System';
  // "dic" as a bare substring false-positives on any word that happens to contain
  // those 3 letters in sequence -- "Dictyochophyceae" (phytoplankton) and
  // "Appendicularia" (zooplankton) were landing in Carbonate System for exactly
  // this reason. Match the real variable names (dic, dic_rep1, dic_rep2) instead.
  if (['alkalinity', 'dissolved inorganic carbon', 'carbonate', 'pco2'].some(k => n.includes(k))
      || n === 'dic' || n.startsWith('dic_') || n.startsWith('dic ')) return 'Carbonate System';
  if (['phosphate', 'silicate', 'nitrate', 'nitrite', 'ammoni'].some(k => n.includes(k))) return 'Nutrients & Chemistry';
  if (['chlorophyll', 'phaeopigment', 'c14', 'productivity', 'pigment', 'fluorescence'].some(k => n.includes(k))) return 'Productivity & Pigments';
  if (['wind', 'wave', 'weather', 'cloud', 'visibility', 'bulb', 'atmospheric', 'barometric', 'secchi', 'forel'].some(k => n.includes(k))) return 'Meteorology & Sea State';
  // Same issue with "par" (meant for the PAR light sensor, variables named
  // "par"/"spar") matching any species name containing those 3 letters --
  // Bonaparte's Gull, Parakeet Auklet, Paralichthys, etc.
  if (['temperature', 'salinity', 'density', 'sigma', 'oxygen', 'o2', 'pressure', 'depth', 'dynamic height'].some(k => n.includes(k))
      || n === 'par' || n === 'spar' || n.startsWith('par ') || n.startsWith('spar ')) return 'Physical Oceanography';
  return null;
}
const DATASET_CATEGORY = {
  'swfsc_ichthyo': 'Fish Eggs & Larvae', 'swfsc_cufes': 'Fish Eggs & Larvae',
  'cce-lter_zoodb': 'Zooplankton', 'cce-lter_zooscan': 'Zooplankton',
  'pic_zooplankton': 'Zooplankton', 'calcofi_phyllosoma': 'Zooplankton',
  'cce-lter_euphausiids': 'Euphausiids (Krill)', 'calcofi_bird_mammal_census': 'Seabirds & Marine Mammals',
  'calcofi_phytoplankton': 'Phytoplankton'
};
function categoryOf(v) {
  if (v.dataset_key === 'swfsc_ichthyo' && ['small_plankton_biomass', 'total_plankton_biomass'].includes(v.display_name)) return 'Zooplankton';
  return contentKeywordGroup(v) || DATASET_CATEGORY[v.dataset_key]
    || (dsMeta(v.dataset_key).realm === 'env' ? 'Physical Oceanography' : 'Other');
}
const CATEGORY_ORDER = ['Physical Oceanography', 'Nutrients & Chemistry', 'Productivity & Pigments',
  'Carbonate System', 'Meteorology & Sea State', 'Phytoplankton', 'Zooplankton', 'Euphausiids (Krill)',
  'Fish Eggs & Larvae', 'Seabirds & Marine Mammals'];

function buildCategories() {
  CANON_VARS.forEach(v => {
    DATASET_VAR_COUNTS[v.dataset_key] = (DATASET_VAR_COUNTS[v.dataset_key] || 0) + 1;
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
        method: 'In-situ seawater temperature (thermometer/CTD sensor)',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'temperature', source: 'Bottle' },
          { dataset_key: 'calcofi_ctd-cast', match: 'temperature_ave', source: 'CTD Cast' },
          { dataset_key: 'calcofi_dic', match: 'ctdtemp_its90', source: 'Carbonate Cast' },
        ] },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'dry_air_temp', label: 'Dry Bulb Temperature', short: 'Dry Bulb',
        method: 'Shipboard air temp, sling psychrometer — not seawater' },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'wet_air_temp', label: 'Wet Bulb Temperature', short: 'Wet Bulb',
        method: 'Shipboard air temp, sling psychrometer (humidity-adjusted) — not seawater' },
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'potential_temperature_1', label: 'Potential Temperature (CTD)', short: 'Potential (CTD)',
        method: 'CTD-mounted thermometer sensor, pressure-corrected potential temperature — a different computed quantity than raw in-situ temperature' },
    ],
  },
  {
    name: 'Oxygen',
    members: [
      { type: 'group', label: 'Oxygen', short: 'Bottle',
        method: 'Dissolved oxygen concentration',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'oxygen_ml_l', source: 'Bottle', note: 'Winkler titration (bottle sample) — reported in mL/L, also available in µmol/kg' },
          { dataset_key: 'calcofi_ctd-cast', match: 'oxygen_ml_l_ave_sta_corr', source: 'CTD Cast', note: 'CTD-mounted electronic oxygen sensor, station-corrected average of both sensors' },
        ] },
      { type: 'group', label: 'Oxygen Saturation', short: 'Bottle Saturation',
        method: 'Oxygen percent saturation — a different quantity than concentration',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'oxygen_saturation', source: 'Bottle', note: 'Winkler-derived percent saturation (bottle sample)' },
          { dataset_key: 'calcofi_ctd-cast', match: 'oxygen_saturation_1', source: 'CTD Cast (sensor)', note: 'CTD-mounted electronic oxygen sensor, percent saturation' },
        ] },
    ],
  },
  {
    name: 'Salinity',
    members: [
      { type: 'group', label: 'Salinity', short: 'Standard',
        method: 'Seawater salinity',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'salinity', source: 'Bottle', note: 'Bench salinometer reading of the bottle sample' },
          { dataset_key: 'calcofi_ctd-cast', match: 'salinity_ave_corr', source: 'CTD Cast', note: 'CTD-mounted conductivity sensor, station-corrected average of both sensors' },
          { dataset_key: 'calcofi_dic', match: 'salinity_pss78', source: 'Carbonate Cast', note: 'CTD-mounted conductivity sensor, carbonate chemistry cast (PSS-78 scale)' },
        ] },
    ],
  },
  {
    name: 'Sigma Theta',
    members: [
      { type: 'group', label: 'Sigma Theta', short: 'Standard',
        method: 'Potential density, computed from temperature/salinity',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'sigma_theta', source: 'Bottle' },
          { dataset_key: 'calcofi_ctd-cast', match: 'sigma_theta_1', source: 'CTD Cast (station-corrected)' },
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
    name: 'Photosynthetically Active Radiation',
    members: [
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'par', label: 'Photosynthetically Active Radiation', short: 'Standard',
        method: 'Photosynthetically active radiation, standard depth sensor' },
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'spar', label: 'Surface Photosynthetically Active Radiation', short: 'Surface',
        method: 'Photosynthetically active radiation, surface sensor — a different sensor placement, not just a different dataset' },
    ],
  },
  {
    name: 'Specific Volume Anomaly',
    members: [
      { type: 'group', label: 'Specific Volume Anomaly', short: 'CTD',
        method: 'Computed from temperature/salinity — a different scale than standard PSS-78 salinity',
        sources: [
          { dataset_key: 'calcofi_ctd-cast', match: 'specific_volume_anomaly', source: 'CTD Cast' },
          { dataset_key: 'calcofi_bottle', match: 'r_salinity_sva', source: 'Bottle (reported)', note: 'Pre-QC value' },
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
        ] },
    ],
  },
  {
    name: 'Alkalinity',
    members: [
      { type: 'group', label: 'Alkalinity', short: 'Bottle',
        method: 'Total alkalinity, titration of the bottle sample',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'alkalinity_rep1', source: 'Bottle' },
          { dataset_key: 'calcofi_dic', match: 'alkalinity', source: 'Carbonate Cast' },
        ] },
    ],
  },
  {
    name: 'DIC',
    members: [
      { type: 'group', label: 'DIC', short: 'Bottle',
        method: 'Dissolved inorganic carbon, analysis of the bottle sample',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'dic_rep1', source: 'Bottle' },
          { dataset_key: 'calcofi_dic', match: 'dic', source: 'Carbonate Cast' },
        ] },
    ],
  },
  {
    name: 'Depth',
    members: [
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'r_depth', label: 'Depth', short: 'From Pressure',
        method: 'Reprocessed depth, derived from pressure' },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'secchi_depth', label: 'Secchi Depth', short: 'Secchi',
        method: 'Secchi disk depth — water clarity, not a sensor reading' },
    ],
  },
  {
    name: 'C14 Assimilation',
    members: [
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'c14_mean', label: 'C14 Assimilation', short: 'Standard',
        method: 'Light-bottle 14C uptake, per depth, bottle sample (mean of replicate measurements)' },
      { type: 'single', dataset_key: 'calcofi_bottle', match: 'c14_dark', label: 'C14 Assimilation of the Experimental Control (Dark Bottle)', short: 'Dark control',
        method: 'Dark/control bottle, per depth — a different experimental condition, not just a different dataset' },
    ],
  },
  {
    name: 'Chlorophyll',
    members: [
      { type: 'group', label: 'Chlorophyll-a', short: 'Standard',
        method: 'Fluorometric analysis of the bottle sample',
        sources: [
          { dataset_key: 'calcofi_bottle', match: 'chlorophyll_a', source: 'Bottle' },
          { dataset_key: 'calcofi_ctd-cast', match: 'btl_chlorophyll_a', source: 'CTD Cast (bottle sample)' },
        ] },
      { type: 'single', dataset_key: 'calcofi_ctd-cast', match: 'est_chlorophyll_a_sta_corr', label: 'Est. Chlorophyll-a', short: 'CTD Estimate',
        method: 'CTD-mounted inline fluorometer estimate, station-corrected — a different instrument than lab analysis of the bottle sample' },
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
  return inventoryMode === 'dataset'
    ? CANON_VARS.filter(v => v.dataset_key === key)
    : CANON_VARS.filter(v => categoryOf(v) === key);
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
  // r_salinity_sva: intentionally NOT mapped here — the official CSV calls
  // this field "Reported Salinity (from Specific Volume Anomaly)", but
  // Ben's own description explicitly warns it's a different parameter/scale
  // than standard PSS-78 salinity. Keeping Ben's warning rather than
  // picking one source over the other — flagged to Betty to confirm.

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
  if (v.rank && v.rank !== 'Species') return 'Ichthyoplankton — Genus & Higher Taxa';
  return 'Ichthyoplankton — Species';
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
    order: ['CUFES (Underway Egg Counts)', 'Ichthyoplankton — Genus & Higher Taxa', 'Ichthyoplankton — Species'],
    group: fishEggsGroup },
  'Zooplankton': {
    order: ['ZooDB (Holoplankton Community)', 'ZooScan (Imaged Zooplankton)', 'Zooplankton Biovolume', 'Phyllosoma (Lobster Larvae)', 'Zooplankton'],
    group: zooplanktonGroup },
};
function renderVarList(groupKey, vars) {
  const families = {}, loose = [];
  vars.forEach(v => {
    const fm = familyMemberFor(v);
    if (fm) (families[fm.family.name] ||= { family: fm.family, items: [] }).items.push({ v, member: fm.member, source: fm.source });
    else loose.push(v);
  });
  const familyHtml = Object.values(families).map(({ family, items }) => {
    const famKey = groupKey + '::' + family.name;
    const famOpen = expandedFamilyKey === famKey;
    // A group member (e.g. Temperature) may have several items sharing the
    // same member object, one per data source — dedupe into a single row.
    // A single member (e.g. Dry Bulb Temperature) always has exactly one.
    const byMember = new Map();
    items.forEach(it => { (byMember.get(it.member) || byMember.set(it.member, []).get(it.member)).push(it); });

    // A family that boils down to exactly one group member (Alkalinity,
    // DIC, Sigma Theta...) has nothing distinct to say at the family level
    // that the member doesn't already say — skip the redundant outer
    // accordion and render its source list directly under the family name.
    if (byMember.size === 1 && [...byMember.keys()][0].type === 'group') {
      const [member, its] = [...byMember.entries()][0];
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

    const shortList = [...byMember.keys()].map(m => m.short).join(', ');
    const memberRows = famOpen ? [...byMember.entries()].map(([member, its]) => {
      if (member.type === 'single') {
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
    const letter = /[A-Za-z]/.test(label[0]) ? label[0].toUpperCase() : '#';
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
  const letterOf = v => { const l = displayLabel(v)[0]; return /[A-Za-z]/.test(l) ? l.toUpperCase() : '#'; };
  const jumpNav = (listId, items, activeLetter) => {
    if (items.length < 150) return '';
    const present = new Set(items.map(letterOf));
    return `<div class="inventory-jumpnav" id="${listId}-nav">${ALPHABET.map(l => present.has(l)
      ? `<button class="inventory-jumpnav-btn${l === activeLetter ? ' inventory-jumpnav-btn-active' : ''}" onclick="jumpToLetter('${listId}','${l}')">${l}</button>`
      : `<span class="inventory-jumpnav-btn inventory-jumpnav-btn-off">${l}</span>`).join('')}</div>`;
  };
  loose.sort((a, b) => {
    const aTaxon = a.variable_type === 'taxon', bTaxon = b.variable_type === 'taxon';
    if (aTaxon !== bTaxon) return aTaxon ? -1 : 1; // taxa first, community-level metrics last
    return displayLabel(a).localeCompare(displayLabel(b));
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
    ? Object.keys(DATASET_META).filter(k => DATASET_VAR_COUNTS[k])
    : CATEGORY_ORDER.filter(c => CAT_COUNTS[c]);

  const rows = keys.map(k => {
    const count = inventoryMode === 'dataset' ? DATASET_VAR_COUNTS[k] : CAT_COUNTS[k];
    const label = inventoryMode === 'dataset' ? dsMeta(k).label : k;
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
    m.on('click', () => openStation(s));
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
    const el = e.target.closest('.ybar[data-tip], .mbar[data-tip]');
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
    if (e.target.closest('.ybar[data-tip], .mbar[data-tip]')) tip.style.display = 'none';
  });
}
function datasetCard(d, opts) {
  opts = opts || {};
  const meta = dsMeta(d.dataset_key);
  const depth = (d.depth_min != null || d.depth_max != null)
    ? `${Math.round(d.depth_min ?? 0)}–${Math.round(d.depth_max ?? 0)} m` : 'depth n/a';
  const clickAttrs = opts.clickable
    ? ` onclick="openDatasetCardModal('${d.dataset_key}')"` : '';
  return `<div class="ds-card${opts.clickable ? ' ds-card-clickable' : ''}${opts.large ? ' ds-card-large' : ''}" style="--c:${meta.color}"${clickAttrs}>
      <div class="ds-head"><span class="ds-dot"></span><span class="ds-label">${meta.label}</span>
        <span class="ds-realm ${d.realm}">${d.realm}</span></div>
      <div class="ds-stats">
        <div class="ds-stat"><span class="ds-stat-label">Date Range</span><span class="ds-stat-val">${day(d.time_min)} → ${day(d.time_max)}</span></div>
        <div class="ds-stat"><span class="ds-stat-label">Depth Range</span><span class="ds-stat-val">${depth}</span></div>
        <div class="ds-stat"><span class="ds-stat-label">Coverage</span><span class="ds-stat-val">${num(d.n_surveys)} surveys · ${num(d.n_obs)} obs</span></div>
      </div>
      <div class="bars-label">observations by year</div>${yearBars(d.years, meta.color, opts.large)}
      <div class="bars-label">seasonality (by month)</div>${monthBars(d.months, meta.color)}
      ${opts.clickable ? '<div class="ds-card-expand-hint">⤢ click to expand</div>' : ''}
    </div>`;
}
// Opens the enlarged, big-screen view of a dataset's coverage card for the
// currently open station — reuses the existing modal-backdrop/modal markup.
function openDatasetCardModal(datasetKey) {
  if (!currentStation) return;
  const d = (currentStation.datasets || []).find(x => x.dataset_key === datasetKey);
  if (!d) return;
  const meta = dsMeta(d.dataset_key);
  document.getElementById('modal-title').textContent = `${meta.label} — Station ${currentStation.station_id}`;
  document.getElementById('modal-body').innerHTML = datasetCard(d, { large: true });
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
      <div class="inventory-subcategory-header">${c}</div>
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
function datasetAccordion(d) {
  const meta = dsMeta(d.dataset_key);
  const vars = CANON_VARS.filter(v => v.dataset_key === d.dataset_key);
  const varList = renderFlatVarList(vars);
  return `<details class="ds-accordion-row" open>
      <summary class="ds-accordion-header">
        <span class="ds-accordion-label">${meta.label}</span>
        <span class="ds-accordion-right">
          <span class="ds-accordion-count">${vars.length}</span>
          <span class="ds-accordion-chevron">▸</span>
        </span>
      </summary>
      <div class="ds-accordion-body">${datasetCard(d, { clickable: true })}
        <details class="params-toggle">
          <summary class="params-toggle-summary">Show Parameters</summary>
          <div class="params-list">${varList}</div>
        </details>
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
function openStation(s) {
  currentStation = s;
  document.getElementById('panel-empty').style.display = 'none';
  document.getElementById('panel-header').style.display = 'block';
  showBackToCategories();
  document.getElementById('panel-station-id').textContent = `Station ${s.station_id}`;
  document.getElementById('panel-coords').textContent =
    `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`;
  const c = document.getElementById('panel-content');
  if (!s.n_datasets) {
    c.innerHTML = `<div class="cov-empty">No integrated-database observations recorded at this grid station.</div>`;
    return;
  }
  const cards = (s.datasets || []).map(d => datasetAccordion(d)).join('');
  c.innerHTML = `<div class="cov-summary">
      <div><span class="k">datasets</span><span class="v">${s.n_datasets}</span></div>
      <div><span class="k">surveys</span><span class="v">${num(s.n_surveys)}</span></div>
      <div><span class="k">observations</span><span class="v">${num(s.n_obs)}</span></div>
      <div title="This station's own observation date range — may differ from the year slider above, which spans every station site-wide."><span class="k">span</span><span class="v">${yr(s.time_min)}–${yr(s.time_max)}</span></div>
    </div>${cards}${decadeBlocks(s)}`;
  c.querySelectorAll('.data-link[data-vid]').forEach(el =>
    el.addEventListener('click', () => selectVariable(decodeURIComponent(el.dataset.vid))));
}

// ---- plankton decade-means (station panel) ----------------------------------
// For the two CCE-LTER plankton datasets, decades.json carries the mean community
// density by decade at this station (built from the release DB by
// scripts/build_decades.sql). Ports PR #1's decade-means onto the release-DB data.
const DECADE_UNITS = { 'cce-lter_zoodb': 'count/1000 m³', 'cce-lter_euphausiids': 'count/tow' };
function decadeBlocks(s) {
  return (s.datasets || []).map(d => {
    const rows = DECADES[d.dataset_key] && DECADES[d.dataset_key][s.station_id];
    if (!rows || !rows.length) return '';
    const meta = dsMeta(d.dataset_key), unit = DECADE_UNITS[d.dataset_key] || '';
    const items = rows.slice().sort((a, b) => a.decade.localeCompare(b.decade)).map(r =>
      `<div class="dec-row"><span class="dec-yr">${r.decade}</span>`
      + `<span class="dec-val">${num(Math.round(r.mean_density))} <span class="dec-unit">${unit}</span>`
      + `<span class="dec-n">· ${r.n_tows} tow${r.n_tows === 1 ? '' : 's'}</span></span></div>`).join('');
    return `<div class="dec-block" style="--c:${meta.color}">`
      + `<div class="dec-head">Mean ${meta.label} density by decade</div>${items}</div>`;
  }).join('');
}

// ---- variable search ----
const searchInput = document.getElementById('search');
const dropdown = document.getElementById('dropdown');

function wireSearch() {
  searchInput.addEventListener('input', () => renderDropdown(searchInput.value.trim()));
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
  const text = [v.name, v.display_name, v.common_name, ...(v.keywords || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(tok => tokenHits(text, tok));
}
function ddItem(v) {
  const meta = dsMeta(v.dataset_key);
  const fm = familyMemberFor(v);
  // fm.source is only set for group-type family members (ones with more
  // than one dataset source, e.g. Oxygen: Hydrographic Bottle / CTD) —
  // for those, lead with the dataset name so two "Oxygen" rows don't read
  // as duplicates. Single-source members just use their normal label.
  const name = (fm && fm.source) ? `${fm.member.label} — ${meta.label}` : resolvedLabel(v);
  return `<div class="dd-item" data-id="${encodeURIComponent(v.variable_id)}">
      <span class="dd-dot" style="background:${meta.color}"></span>
      <span class="dd-name">${name}</span>
      <span class="dd-meta">${meta.label}${v.units ? ' · ' + v.units : ''} · ${v.realm}</span>
    </div>`;
}
function renderDropdown(q) {
  // empty query (just clicked into the search bar) -> show everything,
  // grouped by category, instead of closing the dropdown
  const hits = q ? CANON_VARS.filter(v => varMatch(v, q)).slice(0, 60) : CANON_VARS;
  if (!hits.length) {
    dropdown.innerHTML = `<div class="dd-empty">no variables match “${q}”</div>`;
  } else {
    // bucket by category (search-bar grouping, matches the browse panel's own order)
    const byCat = {};
    hits.forEach(v => (byCat[categoryOf(v)] ||= []).push(v));
    const catRank = c => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? Infinity : i; };
    const catKeys = Object.keys(byCat).sort((a, b) => catRank(a) - catRank(b));
    dropdown.innerHTML = catKeys.map(c => `
        <div class="dropdown-group-header">
          <span>${c}</span>
          <span class="dropdown-group-count">${byCat[c].length}</span>
        </div>
        ${byCat[c].map(ddItem).join('')}`).join('');
  }
  dropdown.querySelectorAll('.dd-item').forEach(el =>
    el.addEventListener('mousedown', () => selectVariable(decodeURIComponent(el.dataset.id))));
  dropdown.classList.add('open');
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
  const meta = dsMeta(v.dataset_key);
  applyStyles();  // uses whatever yearRange currently is — doesn't touch the slider
  const n = STATIONS.filter(s => activeDatasets(s).some(d => d.dataset_key === v.dataset_key)).length;
  document.getElementById('year-slider').classList.toggle('var-active', n > 0);
  const banner = document.getElementById('search-banner');
  banner.innerHTML = `<b style="color:${meta.color}">${resolvedLabel(v)}</b> — `
    + `${n} stations with <b>${meta.label}</b> coverage`
    + (yearRange ? ` in <b>${yearRange[0]}–${yearRange[1]}</b>` : '');
  banner.style.display = 'block';
}
function showVariablePanel(v) {
  const meta = dsMeta(v.dataset_key);
  document.getElementById('panel-empty').style.display = 'none';
  document.getElementById('panel-header').style.display = 'block';
  updateBackButton();
  document.getElementById('panel-station-id').textContent = resolvedPlainLabel(v);
  document.getElementById('panel-coords').textContent = 'Select a highlighted station';
  const stationCount = STATIONS.filter(s => activeDatasets(s).some(d => d.dataset_key === v.dataset_key)).length;
  const desc = descriptionFor(v, displayLabel(v)) || v.description || 'No description available.';
  const src = v.source && (v.source.access_url || v.source.metadata_url);
  document.getElementById('panel-content').innerHTML = `
    <div class="panel-info-block">
      <b>Dataset:</b> ${meta.label}<br><br>
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
}
function togglePanel() { document.getElementById('side-panel').classList.toggle('collapsed'); }
function showAboutModal() { document.getElementById('about-backdrop').classList.add('open'); }
function hideAboutModal() { document.getElementById('about-backdrop').classList.remove('open'); }
function closeModal(e) {
  if (e && e.target && !e.target.classList.contains('modal-backdrop')) return;
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('modal').classList.remove('modal-large');
  document.getElementById('modal-footer').style.display = '';
}
