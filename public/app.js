
const map = L.map('map', { center: [32.8, -120.2], zoom: 6, worldCopyJump: true })
  .addLayer(L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 19, crossOrigin: true }));

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
  'cce-lter_picoplankton-bacteria': { label: 'Picoplankton & Bacteria', realm: 'bio', color: '#94d82d' }
};
const dsMeta = id => DATASET_META[id] || { label: id, realm: 'bio', color: '#adb5bd' };
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
function datasetColorFor(v) {
  if (v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name)) return '#be8c63';
  if (v.dataset_key === 'swfsc_ichthyo' && ZOOPLANKTON_VOLUME_FIELDS.has(v.name)) return dsMeta('sio_pic-zooplankton').color;
  return dsMeta(v.dataset_key).color;
}
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  if (sci.includes(' ') && !sci.includes('(')) return `<i>${sci}</i>`;
  return displayLabel(v);
}
function resolvedLabel(v) {
  const fm = familyMemberFor(v);
  return fm ? fm.member.label : taxonLabel(v);
}
const sortNameFor = v => (v.variable_type === 'taxon' ? (v.common_name || v.name) : displayLabel(v)) || '';
function resolvedPlainLabel(v) {
  const fm = familyMemberFor(v);
  return fm ? fm.member.label : displayLabel(v);
}

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
let CANON_VARS = [];
const MERGE_DATASETS = new Set(['calcofi_bottle', 'calcofi_ctd-cast', 'calcofi_dic']);
const REMOVE_VARS = new Set([
  'calcofi_ctd-cast::btl_ammonium', 'calcofi_ctd-cast::btl_nitrate', 'calcofi_ctd-cast::btl_nitrite',
  'calcofi_ctd-cast::btl_phosphate', 'calcofi_ctd-cast::btl_silicate', 'calcofi_ctd-cast::btl_phaeopigment',
  'calcofi_ctd-cast::est_nitrate_sta_corr', 'calcofi_ctd-cast::est_nitrate_cruise_corr',
  'calcofi_ctd-cast::btl_depth',
  'calcofi_ctd-cast::btl_temperature', 'calcofi_ctd-cast::salinity_btl',
  'calcofi_ctd-cast::oxygen_btl_ml_l', 'calcofi_ctd-cast::oxygen_btl_umol_kg',
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
function buildCanonicalVars() {
  const merged = [], groups = {}, seenExact = new Set();
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
const TAXON_STATIONS = {};
const TAXON_YEARS = {};
const BOTTLE_CAST_COV = {};
let bottleCastCovLoaded = false;
const DEPTH_PROFILES = {};
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
let lastStationTab = 'overview';

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
const normTaxonName = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
Promise.all([
  fetch('./data/stations.json').then(r => r.json()),
  fetch('./data/variables.json').then(r => r.json()),
  fetch('./data/decades.json').then(r => r.ok ? r.json() : []).catch(() => []),
  fetch('./data/taxon_coverage.json').then(r => r.ok ? r.json() : []).catch(() => []),
  fetch('./data/bottle_cast_coverage.json').then(r => { bottleCastCovLoaded = r.ok; return r.ok ? r.json() : []; }).catch(() => []),
  fetch('./data/bathymetry.json').then(r => r.ok ? r.json() : []).catch(() => []),
  fetch('./data/euphausiid_species_coverage.json').then(r => r.ok ? r.json() : []).catch(() => []),
  fetch('./data/bird_mammal_species_coverage.json').then(r => r.ok ? r.json() : []).catch(() => [])
]).then(([st, va, dm, tc, bc, bathy, ec, bm]) => {
  STATIONS = st; VARS = va;
  (dm || []).forEach(r => { ((DECADES[r.dataset_key] ||= {})[r.station_id] ||= []).push(r); });
  (tc || []).forEach(r => (TAXON_STATIONS[r.dataset_key + '::' + r.aphia_id] ||= new Set()).add(r.grid_key));
  (ec || []).forEach(r => {
    if (r.aphia_id) {
      (TAXON_STATIONS['cce-lter_euphausiids::' + r.aphia_id] ||= new Set()).add(r.grid_key);
      ((TAXON_YEARS['cce-lter_euphausiids::' + r.aphia_id] ||= {})[r.grid_key] = r.years);
    }
    (TAXON_STATIONS['cce-lter_euphausiids::name::' + normTaxonName(r.scientific_name)] ||= new Set()).add(r.grid_key);
    ((TAXON_YEARS['cce-lter_euphausiids::name::' + normTaxonName(r.scientific_name)] ||= {})[r.grid_key] = r.years);
  });
  (bm || []).forEach(r => {
    ['farallon_bird-mammal', 'calcofi_bird_mammal_census'].forEach(dk => {
      (TAXON_STATIONS[dk + '::name::' + normTaxonName(r.scientific_name)] ||= new Set()).add(r.grid_key);
      ((TAXON_YEARS[dk + '::name::' + normTaxonName(r.scientific_name)] ||= {})[r.grid_key] = r.years);
    });
  });
  (bc || []).forEach(r => { BOTTLE_CAST_COV[r.grid_key + '::' + r.subset] = r; });
  const bathyByKey = {};
  (bathy || []).forEach(r => { bathyByKey[r.grid_key] = r.bathymetry_depth_m; });
  STATIONS.forEach(s => {
    BY_KEY[s.grid_key] = s;
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
  loadDepthProfiles().then(maybeAutoShowWalkthrough);
}).catch(e => console.error('load failed', e));

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
      if (currentStation) openStation(currentStation);
      return DEPTH_PROFILES;
    });
  return depthProfilesPromise;
}

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

function taxonStationsInRange(stationSet, yearsByStation) {
  if (!yearRange || !yearsByStation) return stationSet;
  const [a, b] = yearRange;
  return new Set([...stationSet].filter(gk => {
    const years = yearsByStation[gk];
    return years && years.some(o => o.y >= a && o.y <= b);
  }));
}
function stationsForVar(v) {
  if (v.aphia_id) {
    const key = v.dataset_key + '::' + v.aphia_id;
    if (TAXON_STATIONS[key]) return taxonStationsInRange(TAXON_STATIONS[key], TAXON_YEARS[key]);
  }
  const nameKey = v.dataset_key + '::name::' + normTaxonName(v.name);
  if (TAXON_STATIONS[nameKey]) return taxonStationsInRange(TAXON_STATIONS[nameKey], TAXON_YEARS[nameKey]);
  return new Set(STATIONS.filter(s => activeDatasets(s).some(d => d.dataset_key === v.dataset_key)).map(s => s.grid_key));
}
function stationsForVarIsYearAware(v) {
  if (v.aphia_id && TAXON_STATIONS[v.dataset_key + '::' + v.aphia_id]) return !!TAXON_YEARS[v.dataset_key + '::' + v.aphia_id];
  if (TAXON_STATIONS[v.dataset_key + '::name::' + normTaxonName(v.name)]) return !!TAXON_YEARS[v.dataset_key + '::name::' + normTaxonName(v.name)];
  return true;
}
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
      mk.setStyle(baseStyle(s, nd === 0));
    }
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

function toggleCompareMode() {
  compareMode = !compareMode;
  document.getElementById('compare-toggle-btn').style.display = compareMode ? 'none' : 'flex';
  document.getElementById('compare-bar').style.display = compareMode ? 'block' : 'none';
  if (!compareMode) {
    selectedGridKeys.clear();
    updateCompareBar();
    if (lassoMode) toggleLassoMode();
  }
  applyStyles();
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
  const n = selectedGridKeys.size;
  document.getElementById('compare-count').textContent = `${n} Selected`;
  document.getElementById('compare-generate-btn').disabled = n < 2;
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
const STATION_MATCH_DEG = 0.05;
const DATASET_KEY_ALIASES = {
  'sio_pic-zooplankton': 'pic_zooplankton', 'pic_zooplankton': 'sio_pic-zooplankton',
  'farallon_bird-mammal': 'calcofi_bird_mammal_census', 'calcofi_bird_mammal_census': 'farallon_bird-mammal',
  'sio_mesopelagic-fish': 'ucsd_sio_mesopelagic-fish', 'ucsd_sio_mesopelagic-fish': 'sio_mesopelagic-fish',
};
function buildObsSql(base, datasetKey, chosenVars, bbox, commonCols, esc) {
  const taxonVars = chosenVars.filter(v => v.variable_type === 'taxon');
  const otherVars = chosenVars.filter(v => v.variable_type !== 'taxon');
  const parts = [];
  if (otherVars.length) {
    const list = otherVars.map(v => `'${esc(v.name)}'`).join(', ');
    parts.push(`SELECT o.measurement_type AS variable, o.measurement_value AS value, ${commonCols}
      FROM read_parquet('${base}/obs.parquet') o
      WHERE o.dataset_key = '${esc(datasetKey)}' AND o.measurement_type IN (${list}) AND ${bbox}`);
  }
  if (taxonVars.length) {
    const names = taxonVars.map(v => `'${esc(v.name)}'`).join(', ');
    parts.push(`SELECT t.scientific_name AS variable, o.measurement_value AS value, ${commonCols}
      FROM read_parquet('${base}/obs.parquet') o
      JOIN read_parquet('${base}/taxon.parquet') t ON t.taxon_key = o.taxon_key
      WHERE o.dataset_key = '${esc(datasetKey)}' AND t.scientific_name IN (${names}) AND ${bbox}`);
  }
  return parts.length ? parts.join('\nUNION ALL\n') + '\nORDER BY datetime, variable' : null;
}
async function fetchRealObservations({ lat, lon, datasetKey, chosenVars }) {
  const conn = await getDuckDBConnection();
  const base = await obsParquetBase();
  const esc = s => (s || '').replace(/'/g, "''");
  const bbox = `latitude BETWEEN ${lat - STATION_MATCH_DEG} AND ${lat + STATION_MATCH_DEG}
      AND longitude BETWEEN ${lon - STATION_MATCH_DEG} AND ${lon + STATION_MATCH_DEG}`;
  const commonCols = `strftime(o.datetime, '%Y-%m-%dT%H:%M:%S') AS datetime,
      extract(year FROM o.datetime)::INT AS year, extract(month FROM o.datetime)::INT AS month,
      o.depth_min_m, o.latitude AS obs_lat, o.longitude AS obs_lon`;
  const sql = buildObsSql(base, datasetKey, chosenVars, bbox, commonCols, esc);
  if (!sql) return [];
  const result = await conn.query(sql);
  let rows = result.toArray().map(row => (row.toJSON ? row.toJSON() : row));
  const alias = DATASET_KEY_ALIASES[datasetKey];
  if (!rows.length && alias) {
    const aliasSql = buildObsSql(base, alias, chosenVars, bbox, commonCols, esc);
    if (aliasSql) {
      const aliasResult = await conn.query(aliasSql);
      rows = aliasResult.toArray().map(row => (row.toJSON ? row.toJSON() : row));
    }
  }
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
async function downloadRealObservations({ stationId, lat, lon, datasetKey, label, vars, chosenNames }) {
  const chosenVars = vars.filter(v => chosenNames.includes(v.name));
  const rows = await fetchRealObservations({ lat, lon, datasetKey, chosenVars });
  if (!rows.length) throw new Error('No matching rows returned.');
  const csvRows = rows.map(r => [
    stationId, label, r.variable, commonNameFor(vars, r.variable), r.value, unitsFor(vars, r.variable),
    r.year, r.month, r.datetime, r.depth_min_m, r.obs_lat, r.obs_lon]);
  saveCSV(`calcofi-${String(stationId).replace(/\s+/g, '_')}-${datasetKey}-observations.csv`,
    ['station_id', 'dataset', 'variable', 'common_name', 'value', 'units', 'year', 'month', 'datetime', 'depth_m', 'obs_lat', 'obs_lon'], csvRows);
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
    status.textContent = 'Querying the upstream database — this can take a moment.';
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
  const lat = ctx.stationLat ?? currentStation.lat, lon = ctx.stationLon ?? currentStation.lon;
  const runDownload = chosenNames => downloadRealObservations({
    stationId: currentStation.station_id, lat, lon, datasetKey: ctx.d.dataset_key,
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
      const stationRows = await fetchRealObservations({ lat: station.lat, lon: station.lon, datasetKey, chosenVars });
      stationRows.forEach(r => rows.push([
        station.station_id, label, r.variable, commonNameFor(vars, r.variable), r.value, unitsFor(vars, r.variable),
        r.year, r.month, r.datetime, r.depth_min_m, r.obs_lat, r.obs_lon]));
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
    saveCSV(`calcofi-comparison-${ctx.d.dataset_key}-observations.csv`,
      ['station_id', 'dataset', 'variable', 'common_name', 'value', 'units', 'year', 'month', 'datetime', 'depth_m', 'obs_lat', 'obs_lon'], rows);
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
let lockMin = null, lockMax = null;
function setFill(a, b) {
  const pct = x => 100 * (x - G_MIN) / ((G_MAX - G_MIN) || 1);
  const f = document.getElementById('ys-fill');
  f.style.left = pct(a) + '%'; f.style.right = (100 - pct(b)) + '%';
}
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
function lockYearRange(lo, hi) {
  lockMin = lo; lockMax = hi;
}
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

const CAT_COUNTS = {};
const DATASET_VAR_COUNTS = {};

function contentKeywordGroup(v) {
  const n = (v.display_name || v.name || '').toLowerCase();
  if (n === 'sw_ph') return 'Carbonate System';
  if (n.startsWith('tsg')) return 'Physical Oceanography';
  if (n === 'chl_fluor' || n === 'par_surf' || n === 'pred_chl') return 'Productivity & Pigments';
  if (n === 'pred_sal_psu') return 'Physical Oceanography';
  if (n === 'ph' || n.startsWith('ph ') || n.startsWith('ph_') || n.includes('ph replicate')) return 'Carbonate System';
  if (['alkalinity', 'dissolved inorganic carbon', 'carbonate', 'pco2'].some(k => n.includes(k))
      || n === 'dic' || n.startsWith('dic_') || n.startsWith('dic ')) return 'Carbonate System';
  if (n === 'isus_v') return 'Nutrients & Chemistry';
  if (['phosphate', 'silicate', 'nitrate', 'nitrite', 'ammoni'].some(k => n.includes(k))) return 'Nutrients & Chemistry';
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
    const countKey = (v.dataset_key === 'calcofi_bottle')
      ? (CAST_SIDE_BOTTLE_FIELDS.has(v.name) ? 'calcofi_bottle_cast' : 'calcofi_bottle_hydro')
      : v.dataset_key;
    DATASET_VAR_COUNTS[countKey] = (DATASET_VAR_COUNTS[countKey] || 0) + 1;
    const c = categoryOf(v); if (c === 'Other') return;
    CAT_COUNTS[c] = (CAT_COUNTS[c] || 0) + 1;
  });
}

let inventoryMode = 'category';
let expandedInventoryGroup = null;
let expandedFamilyKey = null;
let ddExpandedGroup = null;
let expandedGroupKey = null;

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
function attrEsc(v) { return String(v).replace(/["\\]/g, '\\$&'); }
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
    if (key === 'calcofi_bottle_hydro') return CANON_VARS.filter(v => v.dataset_key === 'calcofi_bottle' && !CAST_SIDE_BOTTLE_FIELDS.has(v.name));
    if (key === 'calcofi_bottle_cast') return CANON_VARS.filter(v => v.dataset_key === 'calcofi_bottle' && CAST_SIDE_BOTTLE_FIELDS.has(v.name));
    return CANON_VARS.filter(v => v.dataset_key === key);
  }
  return CANON_VARS.filter(v => categoryOf(v) === key);
}
const FIELD_DESCRIPTIONS = {
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
  fluorescence_v: 'Raw voltage output from the fluorometer sensor, before conversion to chlorophyll-a concentration',

  het_bacteria: 'Heterotrophic bacteria abundance (FCM)',
  picoeukaryotes: 'Picoeukaryote abundance (FCM)',
  prochlorococcus: 'Prochlorococcus abundance (FCM)',
  synechococcus: 'Synechococcus abundance (FCM)',
};

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
function fishEggsGroup(v) {
  if (v.dataset_key === 'swfsc_cufes') return 'CUFES (Underway Egg Counts)';
  return 'Ichthyoplankton (Fish Eggs & Larvae)';
}
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
    const byMember = new Map();
    items.forEach(it => { (byMember.get(it.member) || byMember.set(it.member, []).get(it.member)).push(it); });
    const orderedMembers = family.members.filter(m => byMember.has(m));

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
    const letter = /[A-Za-z]/.test(sortNameFor(v)[0]) ? sortNameFor(v)[0].toUpperCase() : '#';
    return `<div class="inventory-subitem" data-vid="${encodeURIComponent(v.variable_id)}" data-letter="${letter}"${hidden ? ' style="display:none"' : ''}>
        <span class="inventory-subitem-name">${taxonLabel(v)}</span>
        ${desc ? `<span class="inventory-family-method">${desc}</span>` : ''}
      </div>`;
  };
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
  if (currentStation) openStation(currentStation);
}
let draggedPinKey = null;
function renderPinnedTray() {
  let tray = document.getElementById('pinned-tray');
  if (!PINNED_CARDS.length) { if (tray) tray.remove(); return; }
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
function locatePinnedStation(gridKey) {
  const s = BY_KEY[gridKey];
  const mk = MARKERS[gridKey];
  if (!s || !mk) return;
  const targetZoom = Math.max(map.getZoom(), 7);
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
function datasetCard(d, opts) {
  opts = opts || {};
  const meta = dsMeta(d.dataset_key);
  const label = opts.label || meta.label;
  const color = opts.color || meta.color;
  const depth = (d.depth_min != null || d.depth_max != null)
    ? `${Math.round(d.depth_min ?? 0)}–${Math.round(d.depth_max ?? 0)} m` : 'depth n/a';
  const clickAttrs = opts.clickable
    ? ` onclick="openDatasetCardModal('${d.dataset_key}', '${label.replace(/'/g, "\\'")}', '${color}')"` : '';
  let pinBtn = '';
  if (opts.stationId && !opts.large) {
    const key = pinKeyFor(opts.stationId, d.dataset_key, label);
    PIN_CANDIDATES[key] = { station_id: opts.stationId, grid_key: opts.stationGridKey, label, color, d };
    const pinned = isPinned(key);
    pinBtn = `<button class="ds-pin-btn${pinned ? ' ds-pin-btn-active' : ''}" title="${pinned ? 'Unpin' : 'Pin to compare'}"
        onclick="event.stopPropagation(); togglePin('${key}')">${pinned ? '📌' : '📍'}</button>`;
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
    CARD_DL_CTX[cardId] = { d, label, color, vars, stationLat: opts.stationLat, stationLon: opts.stationLon };
    downloadBtn = `<span class="ds-download-group">
        <button class="ds-download-link" title="Downloads a .zip with the card as a PNG plus its year/month coverage as CSV" onclick="event.stopPropagation(); downloadSingleStationCard('${cardId}')">⬇ PNG</button>
        <button class="ds-download-link" id="csvbtn-${cardId}" onclick="event.stopPropagation(); downloadSingleStationCardCSV('${cardId}')">⬇ CSV</button>
      </span>`;
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
      <div class="ds-accordion-body">${datasetCard(d, { clickable: true, label, color: opts.color, stationId: s.station_id, stationGridKey: s.grid_key, stationLat: s.lat, stationLon: s.lon, vars })}
        <details class="params-toggle">
          <summary class="params-toggle-summary">Show Parameters</summary>
          <div class="params-list">${varList}</div>
        </details>
        ${decadeBlockFor(d, s, { clickable: true })}
      </div>
    </details>`;
}

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
    const EMPTY_COV = { time_min: null, time_max: null, depth_min: null, depth_max: null, n_obs: 0, n_samples: 0, n_surveys: 0, years: null, months: null };
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
  applyStyles();
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
      ${cards}
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
function wirePanelTabs(c, s) {
  const tabBtns = c.querySelectorAll('.panel-tab');
  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.toggle('active', b === btn));
    lastStationTab = btn.dataset.tab;
    c.querySelectorAll('.panel-tab-content').forEach(p =>
      p.style.display = (p.dataset.tabpanel === btn.dataset.tab) ? '' : 'none');
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
  const clickAttrs = opts.clickable
    ? ` onclick="openDecadeModal('${d.dataset_key}')" style="cursor:pointer"` : '';
  return `<div class="dec-block${opts.large ? ' dec-block-large' : ''}${opts.clickable ? ' dec-block-clickable' : ''}" style="--c:${meta.color}"${clickAttrs}>
      <div class="dec-head">Mean density by decade <span class="dec-unit">(${unit})</span></div>
      <div class="dec-col-labels"><span></span><span></span><span>density</span><span>tows</span></div>
      ${items}
      ${opts.clickable ? '<div class="dec-block-expand-hint">⤢ click to expand</div>' : ''}
    </div>`;
}
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

function depthProfileSVG(rows, unit, color, w, h, bathyDepth, large) {
  const sorted = rows.slice().sort((a, b) => a.depth_m - b.depth_m);
  const depths = sorted.map(r => r.depth_m), values = sorted.map(r => r.value);
  const dMin = 0, dMax = Math.max(...depths);
  const vMin = Math.min(...values), vMax = Math.max(...values);
  const peak = sorted.reduce((a, b) => (b.value > a.value ? b : a), sorted[0]);

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
function depthProfileCount(s) {
  return (s.datasets || []).reduce((n, d) => {
    const byVar = DEPTH_PROFILES[d.dataset_key] && DEPTH_PROFILES[d.dataset_key][s.station_id];
    if (!byVar) return n;
    return n + dedupeDepthVars(byVar).filter(varName => byVar[varName] && byVar[varName].length >= 2).length;
  }, 0);
}
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

const searchInput = document.getElementById('search');
const dropdown = document.getElementById('dropdown');

function wireSearch() {
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
function tokenHits(text, token) {
  if (text.includes(token)) return true;
  if (token.length < 4) return false;
  return text.split(/\W+/).some(w => w.length >= 3 && editDistance(token, w, 1) <= 1);
}
function varMatch(v, q) {
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
  const hits = q ? CANON_VARS.filter(v => varMatch(v, q)) : CANON_VARS;
  if (!hits.length) {
    dropdown.innerHTML = `<div class="dd-empty">no variables match “${q}”</div>`;
  } else {
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
  if (span) { lockYearRange(span[0], span[1]); setYearRange(span[0], span[1]); }
  highlight(v);
  showVariablePanel(v);
}
function stationsForVarIsFallback(v) {
  if (v.variable_type !== 'taxon') return false;
  if (v.aphia_id && TAXON_STATIONS[v.dataset_key + '::' + v.aphia_id]) return false;
  if (TAXON_STATIONS[v.dataset_key + '::name::' + normTaxonName(v.name)]) return false;
  return true;
}
function highlight(v) {
  selectedVar = v;
  document.getElementById('clear-btn').classList.add('visible');
  applyStyles();
  const n = stationsForVar(v).size;
  document.getElementById('year-slider').classList.toggle('var-active', n > 0);
  const banner = document.getElementById('search-banner');
  const yearAware = stationsForVarIsYearAware(v);
  const isAggregateSpan = DATASET_SPAN_IS_AGGREGATE.has(v.dataset_key);
  const isFallback = stationsForVarIsFallback(v);
  const fallbackNote = isFallback
    ? ` <span class="banner-note" title="No per-station breakdown exists yet for this specific species — this is every station with any ${datasetLabelFor(v)} data, not necessarily stations where this species was actually recorded.">(dataset-wide, not species-specific)</span>`
    : '';
  const yearNote = !yearRange ? ''
    : yearAware
      ? ` in <b>${yearRange[0]}–${yearRange[1]}</b>`
        + (isAggregateSpan
          ? ` <span class="banner-note" title="${datasetLabelFor(v)} combines many separately-added parameters — this is the whole dataset's coverage span, not necessarily this specific parameter's.">(dataset span)</span>`
          : '')
    : ` <span class="banner-note" title="Per-taxon coverage has no year breakdown yet, so this count spans the full record regardless of the slider.">(all years)</span>`;
  banner.innerHTML = `<b style="color:${datasetColorFor(v)}">${resolvedLabel(v)}</b> — `
    + `${n} stations with <b>${datasetLabelFor(v)}</b> coverage`
    + yearNote
    + fallbackNote;
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
  const src = (v.dataset_key === 'swfsc_ichthyo' && ZOOPLANKTON_VOLUME_FIELDS.has(v.name))
    ? DATASET_URL_FALLBACK['sio_pic-zooplankton']
    : (v.source && (v.source.access_url || v.source.metadata_url)) || DATASET_URL_FALLBACK[v.dataset_key];
  document.getElementById('panel-content').innerHTML = `
    <div class="panel-info-block">
      <b>Dataset:</b> ${datasetLabelFor(v)}<br><br>
      <b>Description:</b> ${desc}<br><br>
      ${v.units ? `<b>Units:</b> ${v.units}<br><br>` : ''}
      ${v.aphia_id ? `<b>WoRMS:</b> <a target="_blank" rel="noopener" href="https://www.marinespecies.org/aphia.php?p=taxdetails&id=${v.aphia_id}">AphiaID ${v.aphia_id}</a><br><br>` : ''}
      <span class="panel-station-count">Collected at ${stationCount} station${stationCount === 1 ? '' : 's'}</span>
      ${stationsForVarIsFallback(v) ? `<span class="panel-fallback-note">No per-station breakdown exists yet for this species — this count is every station with any ${datasetLabelFor(v)} data, not confirmed sightings of this species specifically.</span>` : ''}
      <span class="panel-hint">Click a highlighted station on the map to open its full coverage.</span>
      ${src ? `<a href="${src}" target="_blank" rel="noopener" class="panel-open-dataset-btn">Open Dataset ↗</a>` : ''}
    </div>`;
}

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
  document.getElementById('panel-back-btn').style.display = 'none';
  document.getElementById('panel-content').innerHTML = '';
  document.getElementById('panel-empty').style.display = '';
  if (compareMode) toggleCompareMode();
}
function togglePanel() { document.getElementById('side-panel').classList.toggle('collapsed'); }
function showAboutModal() { document.getElementById('about-backdrop').classList.add('open'); }
function hideAboutModal() { document.getElementById('about-backdrop').classList.remove('open'); }
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
const WALKTHROUGH_DISMISS_KEY = 'calcofi_walkthrough_dismissed';
let tourStepIndex = 0;
const WALKTHROUGH_STEPS = [
  { selector: '#search', title: 'Search', body: 'Type a common or scientific name — "chlorophyll", "nitrate", "Sardinops sagax" — results are grouped by category in the search bar dropdown. When a parameter comes from more than one dataset, like Temperature, you\'ll see multiple source options — click one to view its coverage.' },
  { selector: '.inventory-view-tabs', title: 'By Category vs. By Dataset', body: 'Use By Category when you know what you\'re looking for — if something is measured by more than one instrument, those readings are grouped together in a dropdown. Use By Dataset to see what parameters a specific dataset monitors.', offsetX: -20 },
  { selector: '#map', title: 'Click any station', body: 'Click any station to open its full coverage: every dataset measured there, its date range, and depth profiles for each variable, where available.', placement: 'corner-top-right', offsetY: -50,
    highlightPadTop: 3, highlightPadRight: 0, highlightPadLeft: -4, highlightPadBottom: -3 },
  { selector: '.ds-card', title: 'Station overview', body: "Click any card to enlarge it. Each one shows a dataset's date range, depth range, and the number of surveys and individual measurements across time.",
    before: () => openTourExampleStation(), placement: 'left', highlightOffsetX: 2 },
  { selector: '.ds-download-group', title: 'Download PNG vs. CSV', body: "PNG downloads the card itself as an image, just what you see. CSV downloads the underlying data — broken out by parameter(s), where that's available for the dataset — as a spreadsheet-ready file instead of a picture.",
    before: () => openTourExampleStation(), placement: 'left' },
  { selector: '#year-slider', title: 'Year slider', body: "Spans CalCOFI's full record by default. Selecting a parameter narrows the slider to when that parameter was actually measured.",
    offsetY: 40, highlightPadX: -17 },
  { selector: '.panel-tab[data-tab="depth"]', title: 'Depth Profiles', body: "Shows how each variable actually changes with depth at this station, plus a seafloor line from GEBCO bathymetry where available — GEBCO is a modeled estimate, not a direct sounding, so small mismatches with the sampled depth are expected.",
    before: () => { openTourExampleStation(); const btn = document.querySelector('.panel-tab[data-tab="depth"]'); if (btn && !btn.classList.contains('active')) btn.click(); },
    placement: 'left' },
  { selector: '.ds-pin-btn', title: 'Pin to compare', body: 'Pin a card to keep it visible even after you click a different station — pin cards from multiple stations and compare them side by side in a tray at the bottom. Drag pinned cards to reorder them, or click one to pan the map back to that station.',
    before: () => { const btn = document.querySelector('.panel-tab[data-tab="overview"]'); if (btn && !btn.classList.contains('active')) btn.click(); },
    placement: 'corner-top-right', offsetY: -50, calloutAnchorSelector: '#map' },
  { selector: '#compare-toggle-btn', title: 'Compare Stations', body: 'A different way to compare: click here to start, then select stations three ways — click individual stations directly, draw a freehand lasso around a group, or type a CalCOFI line number to grab every station on that line. Then generate one averaged coverage card per dataset across your whole selection.',
    before: () => openTourExampleStation(), placement: 'left' },
];
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
    window.addEventListener('scroll', repositionTour, true);
  }, 30);
}
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
