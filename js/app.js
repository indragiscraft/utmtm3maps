/**
 * WebGIS Coordinate Tracker
 * Real-time coordinate display on mouse movement
 * With automatic UTM & TM3 conversion (proj4js)
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
  map: {
    center: [-6.8828, 107.775879],
    zoom: 6,
    minZoom: 3,
    maxZoom: 19
  },
  basemaps: {
    'Streets': {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }
    },
    'Satellite': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }
    },
    'Terrain': {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; OpenTopoMap',
        maxZoom: 17
      }
    },
    'Dark': {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      options: {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
      }
    }
  },
  geojsonLayers: [
    {
      id: 'tm3',
      name: 'TM3 Zone Indonesia',
      file: 'data/TM3 Zone Indonesia.geojson',
      color: '#00d4ff',
      fillOpacity: 0.08,
      weight: 1.5,
      visible: false
    },
    {
      id: 'utm',
      name: 'UTM Zone World',
      file: 'data/UTM Zone World.geojson',
      color: '#7b61ff',
      fillOpacity: 0.05,
      weight: 1,
      visible: false
    }
  ],
  geocodeUrl: 'https://nominatim.openstreetmap.org/search',
  geocodeDelay: 500
};

// ============================================
// TM3 Zone Definitions (SRGI2013 - BIG Indonesia)
// Reference: ITRF2014, Epoch 2021.0
// ============================================
const TM3_ZONES = [
  { code: "46.2", epsg: 9476, centralMeridian: 94.5, lonMin: 93, lonMax: 96 },
  { code: "47.1", epsg: 9487, centralMeridian: 97.5, lonMin: 96, lonMax: 99 },
  { code: "47.2", epsg: 9487, centralMeridian: 100.5, lonMin: 99, lonMax: 102 },
  { code: "48.1", epsg: 9488, centralMeridian: 103.5, lonMin: 102, lonMax: 105 },
  { code: "48.2", epsg: 9488, centralMeridian: 106.5, lonMin: 105, lonMax: 108 },
  { code: "49.1", epsg: 9489, centralMeridian: 109.5, lonMin: 108, lonMax: 111 },
  { code: "49.2", epsg: 9489, centralMeridian: 112.5, lonMin: 111, lonMax: 114 },
  { code: "50.1", epsg: 9490, centralMeridian: 115.5, lonMin: 114, lonMax: 117 },
  { code: "50.2", epsg: 9490, centralMeridian: 118.5, lonMin: 117, lonMax: 120 },
  { code: "51.1", epsg: 9491, centralMeridian: 121.5, lonMin: 120, lonMax: 123 },
  { code: "51.2", epsg: 9491, centralMeridian: 124.5, lonMin: 123, lonMax: 126 },
  { code: "52.1", epsg: 9492, centralMeridian: 127.5, lonMin: 126, lonMax: 129 },
  { code: "52.2", epsg: 9492, centralMeridian: 130.5, lonMin: 129, lonMax: 132 },
  { code: "53.1", epsg: 9493, centralMeridian: 133.5, lonMin: 132, lonMax: 135 },
  { code: "53.2", epsg: 9493, centralMeridian: 136.5, lonMin: 135, lonMax: 138 },
  { code: "54.1", epsg: 9494, centralMeridian: 139.5, lonMin: 138, lonMax: 141 }
];

const TM3_SCALE_FACTOR = 0.9999;
const TM3_FALSE_EASTING = 200000;
const TM3_FALSE_NORTHING = 1500000;
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

// ============================================
// App State
// ============================================
const state = {
  map: null,
  baseLayers: {},
  activeBasemap: 'Streets',
  geojsonLayers: {},
  geojsonVisible: {},
  clickMarker: null,
  coordFormat: 'dd',
  searchTimeout: null,
  layerPanelOpen: false,
  brandingInfoOpen: false
};

// ============================================
// Coordinate Utilities
// ============================================
function ddToDms(dd, isLat) {
  const dir = isLat ? (dd >= 0 ? 'N' : 'S') : (dd >= 0 ? 'E' : 'W');
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(2);
  return `${deg}° ${String(min).padStart(2, '0')}' ${String(sec).padStart(5, '0')}" ${dir}`;
}

function formatCoord(lat, lng, format) {
  if (format === 'dms') {
    return { lat: ddToDms(lat, true), lng: ddToDms(lng, false) };
  }
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

// ============================================
// UTM & TM3 Conversion Utilities (proj4)
// ============================================
function convertGeoToUTM(lat, lng) {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const hemisphere = lat >= 0 ? 'N' : 'S';
  const utmProj = `+proj=utm +zone=${zone} ${hemisphere === 'S' ? '+south' : ''} +datum=WGS84 +units=m +no_defs`;
  const result = proj4(WGS84, utmProj, [lng, lat]);
  return { zone, hemisphere, easting: result[0], northing: result[1] };
}

function getTM3Zone(lng) {
  return TM3_ZONES.find(z => lng >= z.lonMin && lng < z.lonMax) || null;
}

function convertGeoToTM3(lat, lng) {
  const zone = getTM3Zone(lng);
  if (!zone) return null;
  const tm3Proj = `+proj=tmerc +lat_0=0 +lon_0=${zone.centralMeridian} +k=${TM3_SCALE_FACTOR} +x_0=${TM3_FALSE_EASTING} +y_0=${TM3_FALSE_NORTHING} +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs`;
  const result = proj4(WGS84, tm3Proj, [lng, lat]);
  return { zone: zone.code, epsg: zone.epsg, easting: result[0], northing: result[1] };
}

// Reverse: UTM → Geographic
function convertUTMToGeo(zone, hemisphere, easting, northing) {
  const utmProj = `+proj=utm +zone=${zone} ${hemisphere === 'S' ? '+south' : ''} +datum=WGS84 +units=m +no_defs`;
  const result = proj4(utmProj, WGS84, [easting, northing]);
  return { lat: result[1], lng: result[0] };
}

// Reverse: TM3 → Geographic
function convertTM3ToGeo(zoneCode, easting, northing) {
  const zone = TM3_ZONES.find(z => z.code === zoneCode);
  if (!zone) return null;
  const tm3Proj = `+proj=tmerc +lat_0=0 +lon_0=${zone.centralMeridian} +k=${TM3_SCALE_FACTOR} +x_0=${TM3_FALSE_EASTING} +y_0=${TM3_FALSE_NORTHING} +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs`;
  const result = proj4(tm3Proj, WGS84, [easting, northing]);
  return { lat: result[1], lng: result[0] };
}

// Parse UTM/TM3 input strings
function parseUTMInput(query) {
  // Formats: "51N 334096.36 9844529.43" or "51 N 334096 9844529" or "UTM 51N 334096 9844529"
  const m = query.match(/^(?:utm\s+)?(\d{1,2})\s*([NSns])\s+([\d.]+)\s+([\d.]+)$/i);
  if (!m) return null;
  const zone = parseInt(m[1]);
  const hemi = m[2].toUpperCase();
  const easting = parseFloat(m[3]);
  const northing = parseFloat(m[4]);
  if (zone < 1 || zone > 60 || isNaN(easting) || isNaN(northing)) return null;
  return { zone, hemisphere: hemi, easting, northing };
}

function parseTM3Input(query) {
  // Formats: "TM3 51.1 200978 1344535" or "tm3 49.2 200000 1500000" or "49.2 200000 1500000"
  let m = query.match(/^(?:tm3\s+)?([\d]+\.?[\d]*)\s+([\d.]+)\s+([\d.]+)$/i);
  if (!m) return null;
  let zoneCode = m[1];
  const easting = parseFloat(m[2]);
  const northing = parseFloat(m[3]);
  // Try exact match first, then try appending .1 or .2 for short zone codes
  let zone = TM3_ZONES.find(z => z.code === zoneCode);
  if (!zone && !zoneCode.includes('.')) {
    zone = TM3_ZONES.find(z => z.code.startsWith(zoneCode + '.'));
    if (zone) zoneCode = zone.code;
  }
  if (!zone || isNaN(easting) || isNaN(northing)) return null;
  return { zoneCode, easting, northing };
}

// ============================================
// Map Initialization
// ============================================
function initMap() {
  state.map = L.map('map', {
    center: CONFIG.map.center,
    zoom: CONFIG.map.zoom,
    minZoom: CONFIG.map.minZoom,
    maxZoom: CONFIG.map.maxZoom,
    zoomControl: false,
    attributionControl: true
  });

  state.map.attributionControl.setPosition('bottomright');

  // Create basemap layers
  Object.entries(CONFIG.basemaps).forEach(([name, config]) => {
    state.baseLayers[name] = L.tileLayer(config.url, config.options);
  });

  // Add default basemap
  state.baseLayers[state.activeBasemap].addTo(state.map);

  // Add scale bar
  L.control.scale({
    position: 'bottomleft',
    maxWidth: 150,
    metric: true,
    imperial: false
  }).addTo(state.map);

  // Add custom controls (order: fullscreen, location, fitWorld, LAYERS, then ZOOM)
  addCustomControls();
}

// ============================================
// Custom Map Controls
// ============================================
function addCustomControls() {
  // Top group: Fullscreen, My Location, Fit World
  const TopControlGroup = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'custom-control leaflet-bar');
      L.DomEvent.disableClickPropagation(container);

      // My location
      const locBtn = L.DomUtil.create('a', 'custom-control-btn', container);
      locBtn.href = '#';
      locBtn.title = 'My Location';
      locBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
      L.DomEvent.on(locBtn, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        goToMyLocation();
      });

      // Fit world
      const worldBtn = L.DomUtil.create('a', 'custom-control-btn', container);
      worldBtn.href = '#';
      worldBtn.title = 'Reset View';
      worldBtn.innerHTML = '<i class="fas fa-globe-asia"></i>';
      L.DomEvent.on(worldBtn, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        state.map.setView(CONFIG.map.center, CONFIG.map.zoom);
      });

      return container;
    }
  });

  // Layers Panel Control (below Fit World)
  const LayersPanelControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'layer-panel-control');
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      // Toggle button
      const toggleBtn = L.DomUtil.create('a', 'custom-control-btn layer-toggle-btn-ctrl', container);
      toggleBtn.href = '#';
      toggleBtn.title = 'Layers';
      toggleBtn.innerHTML = '<i class="fas fa-layer-group"></i>';

      // Dropdown
      const dropdown = L.DomUtil.create('div', 'layer-dropdown-ctrl', container);

      // Title
      const title = L.DomUtil.create('div', 'layer-dropdown-title', dropdown);
      title.textContent = 'Map Layers';

      // Basemap section title
      const basemapTitle = L.DomUtil.create('div', 'layer-group-title', dropdown);
      basemapTitle.textContent = 'Basemap';

      // Basemap radio items
      Object.keys(CONFIG.basemaps).forEach(name => {
        const label = L.DomUtil.create('label', 'layer-item', dropdown);
        const radio = L.DomUtil.create('input', '', label);
        radio.type = 'radio';
        radio.name = 'basemap';
        radio.value = name;
        radio.checked = name === state.activeBasemap;

        const mark = L.DomUtil.create('span', 'layer-radio-mark', label);
        const labelText = L.DomUtil.create('span', 'layer-item-label', label);

        const displayNames = {
          'Streets': 'Streets (OSM)',
          'Satellite': 'Satellite (Esri)',
          'Terrain': 'Terrain',
          'Dark': 'Dark (CartoDB)'
        };
        labelText.textContent = displayNames[name] || name;

        radio.addEventListener('change', () => switchBasemap(name));
      });

      // Overlays section title
      const overlayTitle = L.DomUtil.create('div', 'layer-group-title', dropdown);
      overlayTitle.textContent = 'Overlays';

      // GeoJSON overlay checkboxes
      CONFIG.geojsonLayers.forEach(lyr => {
        const label = L.DomUtil.create('label', 'layer-item', dropdown);
        const cb = L.DomUtil.create('input', 'geojson-toggle', label);
        cb.type = 'checkbox';
        cb.value = lyr.id;
        cb.checked = lyr.visible;

        const mark = L.DomUtil.create('span', 'layer-check-mark', label);
        mark.innerHTML = '<i class="fas fa-check"></i>';

        const labelText = L.DomUtil.create('span', 'layer-item-label', label);
        labelText.textContent = lyr.name;

        const dot = L.DomUtil.create('span', 'layer-color-dot', label);
        dot.style.background = lyr.color;

        cb.addEventListener('change', () => toggleGeoJSONLayer(lyr.id, cb.checked));
      });

      // Toggle behaviour
      L.DomEvent.on(toggleBtn, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        state.layerPanelOpen = !state.layerPanelOpen;
        dropdown.classList.toggle('visible', state.layerPanelOpen);
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          state.layerPanelOpen = false;
          dropdown.classList.remove('visible');
        }
      });

      return container;
    }
  });

  state.map.addControl(new TopControlGroup());

  // Zoom control (BEFORE layers panel, so it appears above layers)
  L.control.zoom({ position: 'topright' }).addTo(state.map);

  // Layers panel control (below zoom)
  state.map.addControl(new LayersPanelControl());
}

function goToMyLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      state.map.flyTo([latitude, longitude], 14, { duration: 1.5 });
      if (state.clickMarker) state.map.removeLayer(state.clickMarker);
      const pulseIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#00d4ff;border:3px solid white;
          box-shadow:0 0 12px rgba(0,212,255,0.6);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      const popupContent = buildLocationPopup(latitude, longitude, 'Your Location');
      state.clickMarker = L.marker([latitude, longitude], { icon: pulseIcon })
        .addTo(state.map)
        .bindPopup(popupContent, { maxWidth: 340, className: 'custom-popup' })
        .openPopup();

      // Offset map view so popup is fully visible
      setTimeout(() => {
        const px = state.map.project([latitude, longitude], state.map.getZoom());
        px.y -= 200; // shift view up so popup shows above search bar
        const newCenter = state.map.unproject(px, state.map.getZoom());
        state.map.panTo(newCenter, { animate: true, duration: 0.5 });
      }, 1400); // after flyTo completes
    },
    () => { },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ============================================
// Coordinate Tracking (Mouse Move) + UTM/TM3
// ============================================
function initCoordinateTracking() {
  const latVal = document.getElementById('coord-lat');
  const lngVal = document.getElementById('coord-lng');
  const zoomVal = document.getElementById('zoom-level');

  // UTM info elements
  const utmZoneEl = document.getElementById('info-utm-zone');
  const utmEastingEl = document.getElementById('info-utm-easting');
  const utmNorthingEl = document.getElementById('info-utm-northing');

  // TM3 info elements
  const tm3ZoneEl = document.getElementById('info-tm3-zone');
  const tm3EpsgEl = document.getElementById('info-tm3-epsg');
  const tm3EastingEl = document.getElementById('info-tm3-easting');
  const tm3NorthingEl = document.getElementById('info-tm3-northing');

  function updateAll(lat, lng) {
    // Update DD / DMS
    const coords = formatCoord(lat, lng, state.coordFormat);
    latVal.textContent = coords.lat;
    lngVal.textContent = coords.lng;

    // Update UTM
    try {
      const utm = convertGeoToUTM(lat, lng);
      utmZoneEl.textContent = `${utm.zone}${utm.hemisphere}`;
      utmEastingEl.textContent = utm.easting.toFixed(5);
      utmNorthingEl.textContent = utm.northing.toFixed(5);
    } catch {
      utmZoneEl.textContent = '—';
      utmEastingEl.textContent = '—';
      utmNorthingEl.textContent = '—';
    }

    // Update TM3
    const tm3Section = document.getElementById('info-tm3-section');
    try {
      const tm3 = convertGeoToTM3(lat, lng);
      if (tm3) {
        tm3ZoneEl.textContent = tm3.zone;
        tm3EpsgEl.textContent = `EPSG:${tm3.epsg}`;
        tm3EastingEl.textContent = tm3.easting.toFixed(5);
        tm3NorthingEl.textContent = tm3.northing.toFixed(5);
        if (tm3Section) tm3Section.style.display = '';
      } else {
        if (tm3Section) tm3Section.style.display = 'none';
      }
    } catch {
      if (tm3Section) tm3Section.style.display = 'none';
    }
  }

  // Desktop mouse
  state.map.on('mousemove', (e) => updateAll(e.latlng.lat, e.latlng.lng));

  // Mobile / pan
  state.map.on('move', () => {
    const c = state.map.getCenter();
    updateAll(c.lat, c.lng);
  });

  // Zoom level
  function updateZoom() { zoomVal.textContent = state.map.getZoom().toFixed(0); }
  state.map.on('zoomend', updateZoom);
  updateZoom();

  // Initial
  const c = state.map.getCenter();
  updateAll(c.lat, c.lng);

  // Format toggle
  document.getElementById('coord-format-btn').addEventListener('click', () => {
    state.coordFormat = state.coordFormat === 'dd' ? 'dms' : 'dd';
    document.querySelector('#coord-format-btn span').textContent = state.coordFormat === 'dd' ? 'DD' : 'DMS';
    const center = state.map.getCenter();
    updateAll(center.lat, center.lng);
  });

  // Click coordinate sections to copy
  document.querySelectorAll('.coord-section').forEach(section => {
    section.addEventListener('click', () => {
      const text = `${latVal.textContent}, ${lngVal.textContent}`;
      navigator.clipboard.writeText(text).then(() => showCopyToast('Coordinates copied!')).catch(() => { });
    });
  });
}

// ============================================
// Click to Place Marker
// ============================================
function initClickMarker() {
  state.map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (state.clickMarker) state.map.removeLayer(state.clickMarker);

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:linear-gradient(135deg,#00d4ff,#7b61ff);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const dd = formatCoord(lat, lng, 'dd');
    const dms = formatCoord(lat, lng, 'dms');

    // UTM conversion for popup
    let utmStr = '';
    try {
      const utm = convertGeoToUTM(lat, lng);
      utmStr = `
        <div class="popup-row">
          <span class="popup-label">UTM Zone</span>
          <span class="popup-val">${utm.zone}${utm.hemisphere}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">UTM E</span>
          <span class="popup-val">${utm.easting.toFixed(5)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">UTM N</span>
          <span class="popup-val">${utm.northing.toFixed(5)}</span>
        </div>`;
    } catch { }

    // TM3 conversion for popup
    let tm3Str = '';
    try {
      const tm3 = convertGeoToTM3(lat, lng);
      if (tm3) {
        tm3Str = `
          <div class="popup-row">
            <span class="popup-label">TM3 Zone</span>
            <span class="popup-val">${tm3.zone} (EPSG:${tm3.epsg})</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">TM3 E</span>
            <span class="popup-val">${tm3.easting.toFixed(5)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">TM3 N</span>
            <span class="popup-val">${tm3.northing.toFixed(5)}</span>
          </div>`;
      }
    } catch { }

    // Build UTM copy string
    let utmCopyStr = '';
    let tm3CopyStr = '';
    try {
      const utm = convertGeoToUTM(lat, lng);
      utmCopyStr = `${utm.zone}${utm.hemisphere} ${utm.easting.toFixed(5)} ${utm.northing.toFixed(5)}`;
    } catch { }
    try {
      const tm3 = convertGeoToTM3(lat, lng);
      if (tm3) tm3CopyStr = `${tm3.zone} ${tm3.easting.toFixed(5)} ${tm3.northing.toFixed(5)}`;
    } catch { }

    const popupContent = `
      <div class="coord-popup">
        <div class="popup-title">
          <i class="fas fa-map-pin"></i> Coordinates
        </div>
        <div class="popup-grid">
          <div class="popup-row">
            <span class="popup-label">Lat (DD)</span>
            <span class="popup-val">${dd.lat}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Lng (DD)</span>
            <span class="popup-val">${dd.lng}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Lat (DMS)</span>
            <span class="popup-val">${dms.lat}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Lng (DMS)</span>
            <span class="popup-val">${dms.lng}</span>
          </div>
          ${utmStr}
          ${tm3Str}
        </div>
        <div class="popup-actions">
          <button class="popup-btn copy-btn" onclick="copyClickCoords('${dd.lat}, ${dd.lng}')">
            <i class="fas fa-copy"></i> DD
          </button>
          ${utmCopyStr ? `<button class="popup-btn copy-btn" onclick="copyClickCoords('${utmCopyStr}')"><i class="fas fa-copy"></i> UTM</button>` : ''}
          ${tm3CopyStr ? `<button class="popup-btn copy-btn" onclick="copyClickCoords('${tm3CopyStr}')"><i class="fas fa-copy"></i> TM3</button>` : ''}
        </div>
      </div>
    `;

    state.clickMarker = L.marker([lat, lng], { icon: pinIcon })
      .addTo(state.map)
      .bindPopup(popupContent, { maxWidth: 340, className: 'custom-popup' })
      .openPopup();
  });
}

function copyClickCoords(text) {
  navigator.clipboard.writeText(text).then(() => showCopyToast('Coordinates copied!')).catch(() => { });
}

function showCopyToast(message) {
  const toast = document.getElementById('copy-toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
}

// ============================================
// Search / Geocoding
// ============================================
function initSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearBtn.classList.toggle('visible', query.length > 0);

    if (query.length < 3) {
      results.classList.remove('visible');
      results.innerHTML = '';
      return;
    }

    // TM3 input check (check first — zone codes like 53.1 can conflict with lat/lng)
    const tm3Parsed = parseTM3Input(query);
    if (tm3Parsed) {
      try {
        const geo = convertTM3ToGeo(tm3Parsed.zoneCode, tm3Parsed.easting, tm3Parsed.northing);
        if (geo && geo.lat >= -90 && geo.lat <= 90 && geo.lng >= -180 && geo.lng <= 180) {
          results.innerHTML = `
            <div class="search-result-item" onclick="flyToCoord(${geo.lat}, ${geo.lng})">
              <span class="search-result-icon"><i class="fas fa-map-marked-alt"></i></span>
              <div class="search-result-text">
                <div class="search-result-name">${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}</div>
                <div class="search-result-type">TM3 Zone ${tm3Parsed.zoneCode} → ${tm3Parsed.easting.toFixed(5)} E, ${tm3Parsed.northing.toFixed(5)} N</div>
              </div>
            </div>`;
          results.classList.add('visible');
          return;
        }
      } catch { }
    }

    // UTM input check
    const utmParsed = parseUTMInput(query);
    if (utmParsed) {
      try {
        const geo = convertUTMToGeo(utmParsed.zone, utmParsed.hemisphere, utmParsed.easting, utmParsed.northing);
        if (geo.lat >= -90 && geo.lat <= 90 && geo.lng >= -180 && geo.lng <= 180) {
          results.innerHTML = `
            <div class="search-result-item" onclick="flyToCoord(${geo.lat}, ${geo.lng})">
              <span class="search-result-icon"><i class="fas fa-crosshairs"></i></span>
              <div class="search-result-text">
                <div class="search-result-name">${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}</div>
                <div class="search-result-type">UTM ${utmParsed.zone}${utmParsed.hemisphere} → ${utmParsed.easting.toFixed(5)} E, ${utmParsed.northing.toFixed(5)} N</div>
              </div>
            </div>`;
          results.classList.add('visible');
          return;
        }
      } catch { }
    }

    // Coordinate input check (lat, lng)
    const coordMatch = query.match(/^\s*(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)\s*$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        results.innerHTML = `
          <div class="search-result-item" onclick="flyToCoord(${lat}, ${lng})">
            <span class="search-result-icon"><i class="fas fa-map-pin"></i></span>
            <div class="search-result-text">
              <div class="search-result-name">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
              <div class="search-result-type">Go to coordinates (Lat, Lng)</div>
            </div>
          </div>`;
        results.classList.add('visible');
        return;
      }
    }

    clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(() => searchLocation(query), CONFIG.geocodeDelay);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    results.classList.remove('visible');
    results.innerHTML = '';
    input.focus();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) results.classList.remove('visible');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { results.classList.remove('visible'); input.blur(); }
  });
}

async function searchLocation(query) {
  const results = document.getElementById('search-results');
  results.innerHTML = '<div class="search-loading"><i class="fas fa-circle-notch"></i> Searching...</div>';
  results.classList.add('visible');

  try {
    const url = `${CONFIG.geocodeUrl}?format=json&q=${encodeURIComponent(query)}&limit=6&accept-language=en,id`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await response.json();

    if (data.length === 0) {
      results.innerHTML = '<div class="search-no-results"><i class="fas fa-search"></i> No results found</div>';
      return;
    }

    results.innerHTML = data.map(item => `
      <div class="search-result-item" onclick="flyToResult(${item.lat}, ${item.lon}, '${item.display_name.replace(/'/g, "\\'")}')">
        <span class="search-result-icon"><i class="fas fa-map-marker-alt"></i></span>
        <div class="search-result-text">
          <div class="search-result-name">${item.display_name}</div>
          <div class="search-result-type">${item.type || ''} · ${parseFloat(item.lat).toFixed(4)}, ${parseFloat(item.lon).toFixed(4)}</div>
        </div>
      </div>
    `).join('');
  } catch {
    results.innerHTML = '<div class="search-no-results">Search failed. Try again.</div>';
  }
}

// Shared popup builder for search/location results
function buildLocationPopup(lat, lng, title) {
  const dd = formatCoord(lat, lng, 'dd');
  const dms = formatCoord(lat, lng, 'dms');

  let utmStr = '';
  let utmCopyStr = '';
  try {
    const utm = convertGeoToUTM(lat, lng);
    utmStr = `
      <div class="popup-row"><span class="popup-label">UTM Zone</span><span class="popup-val">${utm.zone}${utm.hemisphere}</span></div>
      <div class="popup-row"><span class="popup-label">UTM E</span><span class="popup-val">${utm.easting.toFixed(5)}</span></div>
      <div class="popup-row"><span class="popup-label">UTM N</span><span class="popup-val">${utm.northing.toFixed(5)}</span></div>`;
    utmCopyStr = `${utm.zone}${utm.hemisphere} ${utm.easting.toFixed(5)} ${utm.northing.toFixed(5)}`;
  } catch { }

  let tm3Str = '';
  let tm3CopyStr = '';
  try {
    const tm3 = convertGeoToTM3(lat, lng);
    if (tm3) {
      tm3Str = `
        <div class="popup-row"><span class="popup-label">TM3 Zone</span><span class="popup-val">${tm3.zone} (EPSG:${tm3.epsg})</span></div>
        <div class="popup-row"><span class="popup-label">TM3 E</span><span class="popup-val">${tm3.easting.toFixed(5)}</span></div>
        <div class="popup-row"><span class="popup-label">TM3 N</span><span class="popup-val">${tm3.northing.toFixed(5)}</span></div>`;
      tm3CopyStr = `${tm3.zone} ${tm3.easting.toFixed(5)} ${tm3.northing.toFixed(5)}`;
    }
  } catch { }

  return `
    <div class="coord-popup">
      <div class="popup-title"><i class="fas fa-map-pin"></i> ${title || 'Coordinates'}</div>
      <div class="popup-grid">
        <div class="popup-row"><span class="popup-label">Lat (DD)</span><span class="popup-val">${dd.lat}</span></div>
        <div class="popup-row"><span class="popup-label">Lng (DD)</span><span class="popup-val">${dd.lng}</span></div>
        <div class="popup-row"><span class="popup-label">Lat (DMS)</span><span class="popup-val">${dms.lat}</span></div>
        <div class="popup-row"><span class="popup-label">Lng (DMS)</span><span class="popup-val">${dms.lng}</span></div>
        ${utmStr}
        ${tm3Str}
      </div>
      <div class="popup-actions">
        <button class="popup-btn copy-btn" onclick="copyClickCoords('${dd.lat}, ${dd.lng}')"><i class="fas fa-copy"></i> DD</button>
        ${utmCopyStr ? `<button class="popup-btn copy-btn" onclick="copyClickCoords('${utmCopyStr}')"><i class="fas fa-copy"></i> UTM</button>` : ''}
        ${tm3CopyStr ? `<button class="popup-btn copy-btn" onclick="copyClickCoords('${tm3CopyStr}')"><i class="fas fa-copy"></i> TM3</button>` : ''}
      </div>
    </div>`;
}

function placeMarkerWithPopup(lat, lng, title) {
  if (state.clickMarker) state.map.removeLayer(state.clickMarker);
  const pinIcon = L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#00d4ff,#7b61ff);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });
  const popupContent = buildLocationPopup(lat, lng, title);
  state.clickMarker = L.marker([lat, lng], { icon: pinIcon })
    .addTo(state.map)
    .bindPopup(popupContent, { maxWidth: 340, className: 'custom-popup' })
    .openPopup();

  // Offset map view so popup is fully visible
  setTimeout(() => {
    const px = state.map.project([lat, lng], state.map.getZoom());
    px.y -= 200;
    const newCenter = state.map.unproject(px, state.map.getZoom());
    state.map.panTo(newCenter, { animate: true, duration: 0.5 });
  }, 1400);
}

function flyToResult(lat, lng, name) {
  state.map.flyTo([lat, lng], 14, { duration: 1.2 });
  document.getElementById('search-results').classList.remove('visible');
  document.getElementById('search-input').value = name;
  placeMarkerWithPopup(lat, lng, name);
}

function flyToCoord(lat, lng) {
  state.map.flyTo([lat, lng], 14, { duration: 1.2 });
  document.getElementById('search-results').classList.remove('visible');
  document.getElementById('search-input').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  placeMarkerWithPopup(lat, lng, 'Coordinates');
}

// ============================================
// Basemap Switching
// ============================================
function switchBasemap(name) {
  if (state.baseLayers[state.activeBasemap]) state.map.removeLayer(state.baseLayers[state.activeBasemap]);
  if (state.baseLayers[name]) { state.baseLayers[name].addTo(state.map); state.activeBasemap = name; }
}

// ============================================
// GeoJSON Layers
// ============================================
async function loadGeoJSONLayers() {
  for (const layerConfig of CONFIG.geojsonLayers) {
    try {
      const response = await fetch(layerConfig.file);
      if (!response.ok) continue;
      const data = await response.json();

      const geojsonLayer = L.geoJSON(data, {
        style: () => ({
          color: layerConfig.color,
          weight: layerConfig.weight,
          fillOpacity: layerConfig.fillOpacity,
          opacity: 0.8,
          fillColor: layerConfig.color
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          if (props) {
            const entries = Object.entries(props).filter(([, v]) => v != null && v !== '');
            if (entries.length > 0) {
              const html = entries.map(([k, v]) =>
                `<div class="popup-row"><span class="popup-label">${k}</span><span class="popup-val">${v}</span></div>`
              ).join('');
              layer.bindPopup(`<div class="overlay-popup"><div class="popup-grid">${html}</div></div>`, {
                maxWidth: 220, className: 'custom-popup'
              });
            }
          }
          layer.on('mouseover', () => layer.setStyle({ weight: layerConfig.weight + 2, fillOpacity: layerConfig.fillOpacity + 0.12 }));
          layer.on('mouseout', () => layer.setStyle({ weight: layerConfig.weight, fillOpacity: layerConfig.fillOpacity }));
        }
      });

      state.geojsonLayers[layerConfig.id] = geojsonLayer;
      state.geojsonVisible[layerConfig.id] = layerConfig.visible;
      if (layerConfig.visible) geojsonLayer.addTo(state.map);
    } catch (err) {
      console.warn(`Failed to load GeoJSON: ${layerConfig.name}`, err);
    }
  }
}

function toggleGeoJSONLayer(id, visible) {
  const layer = state.geojsonLayers[id];
  if (!layer) return;
  if (visible) { layer.addTo(state.map); } else { state.map.removeLayer(layer); }
  state.geojsonVisible[id] = visible;
}

// ============================================
// Branding Panel Toggle
// ============================================
function initBrandingPanel() {
  const toggle = document.getElementById('branding-toggle');
  const info = document.getElementById('branding-info');
  const chevron = document.getElementById('branding-chevron');

  toggle.addEventListener('click', () => {
    state.brandingInfoOpen = !state.brandingInfoOpen;
    info.classList.toggle('open', state.brandingInfoOpen);
    chevron.classList.toggle('open', state.brandingInfoOpen);
  });
}

// ============================================
// Loading Screen
// ============================================
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hide');
    setTimeout(() => overlay.remove(), 600);
  }
}

// ============================================
// Initialize Everything
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initCoordinateTracking();
  initClickMarker();
  initSearch();
  initBrandingPanel();
  await loadGeoJSONLayers();
  hideLoading();
});
