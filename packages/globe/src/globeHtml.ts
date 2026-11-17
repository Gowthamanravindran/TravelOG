// Builds the self-contained HTML page that runs inside the WebView.
// The map library and country shapes are baked in, so only satellite imagery needs the network.
// All map logic lives in the page; React Native sends data in and receives events out.
import { defaultTheme, type GlobeTheme } from './theme';
import { MAPLIBRE_CSS, MAPLIBRE_JS } from './maplibreAssets';

export { defaultTheme, type GlobeTheme } from './theme';

export type GlobeQuality = 'auto' | 'high' | 'low';

export type GlobeConfig = {
  theme: GlobeTheme;
  /** 'auto' starts high and drops to low if the device cannot hold ~28 fps. */
  quality: GlobeQuality;
  /** XYZ raster tile URL template. Empty string disables imagery. */
  imageryUrl: string;
  imageryMaxZoom: number;
  imageryAttribution: string;
  /** Send a perf sample every 2 s while the globe is moving. */
  benchmark: boolean;
  /** Tapping a country zooms to it and shows its name. */
  focusOnTap: boolean;
  /** Flag images as data URIs, keyed by two-letter country code. */
  flags: Record<string, string>;
};

export type GlobeData = {
  countries: unknown; // GeoJSON FeatureCollection, features carry { iso, name }
  tiny: { iso: string; name: string; lng: number; lat: number }[];
};

// NASA Blue Marble tiles (public-domain imagery) served from a community mirror.
// Fine for testing. For launch, copy zoom levels 0-5 to your own CDN and point imageryUrl there.
export const DEFAULT_IMAGERY_URL =
  'https://cdn.jsdelivr.net/gh/freetiler/nasa-bluemarble/tiles/{z}/{x}/{y}.jpeg';

// Makes JSON safe to place inside a <script> tag.
function safeJson(value: unknown): string {
  const BS = String.fromCharCode(92);
  return JSON.stringify(value)
    .split('<')
    .join(BS + 'u003c')
    .split(String.fromCharCode(0x2028))
    .join(BS + 'u2028')
    .split(String.fromCharCode(0x2029))
    .join(BS + 'u2029');
}

function pageCss(theme: GlobeTheme): string {
  const rim = (alpha: number) => 'rgba(' + theme.rim + ',' + alpha + ')';
  return [
    'html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }',
    'body { background-color: ' + theme.space + '; -webkit-user-select: none; user-select: none;',
    '  -webkit-tap-highlight-color: transparent; touch-action: none; }',
    '#map { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }',
    '#stars { position: absolute; left: 0; top: 0; will-change: transform; }',
    '#map { background: transparent; }',
    '#rim { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: none; box-sizing: border-box;',
    '  border: 1.5px solid ' + rim(0.95) + '; will-change: transform;',
    '  box-shadow: 0 0 14px 3px ' +
      rim(0.85) +
      ', 0 0 46px 12px ' +
      rim(0.4) +
      ', inset 0 0 22px 3px ' +
      rim(0.5) +
      '; }',
    '#rim.lite { box-shadow: 0 0 10px 2px ' + rim(0.7) + '; }',
    '.country-pop .maplibregl-popup-content { background: ' +
      theme.tag +
      '; color: ' +
      theme.tagText +
      '; padding: 7px 13px; border-radius: 14px;',
    '  font: 600 14px -apple-system, Roboto, "Segoe UI", sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,0.45); white-space: nowrap; }',
    '.country-pop .maplibregl-popup-tip { border-top-color: ' + theme.tag + ' !important; }',
    '.country-pop, .country-pop * { pointer-events: none !important; }',
    '.maplibregl-ctrl-attrib { font-size: 9px; opacity: 0.55; }',
  ].join(String.fromCharCode(10));
}

// Plain ES5, no template strings, so it runs on old WebViews and embeds safely.
export const globePageScript = `
function post(msg) {
  var text = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
  else console.log('[globe] ' + text);
}

// Calls made before the map has loaded are queued and replayed.
var pending = [];
window.globe = {};
['setData', 'flyTo', 'setSpin', 'setQuality', 'focusCountry', 'clearSelection', 'setCountryTap', 'setReduceMotion', 'fitPoints', 'fitCountries', 'setInset', 'setTapMode', 'goHome', 'setFocus'].forEach(function (name) {
  window.globe[name] = function () { pending.push([name, Array.prototype.slice.call(arguments)]); };
});

// Star field. One screen-sized tile is drawn once and repeated 2 x 2 on a canvas twice the
// screen size; moving the stars is then a single GPU transform with no redrawing.
var starTileW = 0, starTileH = 0;
function drawStars() {
  var c = document.getElementById('stars');
  var d = Math.min(window.devicePixelRatio || 1, 1.5);
  var w = window.innerWidth, h = window.innerHeight;
  starTileW = w; starTileH = h;
  var tile = document.createElement('canvas');
  tile.width = Math.round(w * d); tile.height = Math.round(h * d);
  var g = tile.getContext('2d');
  g.scale(d, d);
  var seed = 20261117;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var n = Math.round(w * h / 850);
  for (var i = 0; i < n; i++) {
    var x = rnd() * w, y = rnd() * h, k = rnd();
    var size = k < 0.78 ? 0.5 + rnd() * 0.5 : (k < 0.96 ? 1 + rnd() * 0.6 : 1.7 + rnd() * 0.8);
    var alpha = 0.5 + rnd() * 0.5;
    var tint = rnd() < 0.25 ? '190,215,255' : (rnd() < 0.1 ? '255,235,205' : '255,255,255');
    if (CFG.theme.starTints === false) tint = '255,255,255';
    // Draw wrapped copies so stars on a tile edge are not cut in half at the seam.
    for (var ox = -1; ox <= 1; ox++) {
      for (var oy = -1; oy <= 1; oy++) {
        var px = x + ox * w, py = y + oy * h;
        if (px < -12 || px > w + 12 || py < -12 || py > h + 12) continue;
        if (size > 1.6) {
          var glow = g.createRadialGradient(px, py, 0, px, py, size * 4.5);
          glow.addColorStop(0, 'rgba(' + tint + ',0.35)');
          glow.addColorStop(1, 'rgba(' + tint + ',0)');
          g.fillStyle = glow;
          g.beginPath(); g.arc(px, py, size * 4.5, 0, 6.2832); g.fill();
        }
        g.fillStyle = 'rgba(' + tint + ',' + alpha + ')';
        g.beginPath(); g.arc(px, py, size, 0, 6.2832); g.fill();
      }
    }
  }
  c.width = tile.width * 2; c.height = tile.height * 2;
  c.style.width = (2 * w) + 'px'; c.style.height = (2 * h) + 'px';
  var cg = c.getContext('2d');
  for (var tx = 0; tx < 2; tx++) for (var ty = 0; ty < 2; ty++) cg.drawImage(tile, tx * tile.width, ty * tile.height);
}
drawStars();

function start() {
  var THEME = CFG.theme;
  var dpr = window.devicePixelRatio || 1;
  var auto = CFG.quality === 'auto';
  var quality = CFG.quality === 'low' ? 'low' : 'high';
  var hasImagery = !!CFG.imageryUrl;
  var EMPTY = { type: 'FeatureCollection', features: [] };
  // MapLibre's built-in atmosphere adds a sun glare on the horizon; it is off and replaced by the rim below.
  var SKY_OFF = { 'atmosphere-blend': 0 };

  var sources = {
    countries: { type: 'geojson', data: DATA.countries, promoteId: 'iso' },
    tiny: {
      type: 'geojson', promoteId: 'iso',
      data: {
        type: 'FeatureCollection',
        features: DATA.tiny.map(function (t) {
          return { type: 'Feature', properties: { iso: t.iso, name: t.name }, geometry: { type: 'Point', coordinates: [t.lng, t.lat] } };
        })
      }
    },
    places: { type: 'geojson', data: EMPTY, cluster: true, clusterRadius: 36, clusterMaxZoom: 5 },
    route: { type: 'geojson', data: EMPTY },
    leg: { type: 'geojson', data: EMPTY },
    candidates: { type: 'geojson', data: EMPTY },
    stops: { type: 'geojson', data: EMPTY },
    labels: { type: 'geojson', data: EMPTY }
  };
  if (hasImagery) {
    sources.imagery = {
      type: 'raster', tiles: [CFG.imageryUrl], tileSize: 256,
      maxzoom: CFG.imageryMaxZoom, attribution: CFG.imageryAttribution
    };
  }

  var VISITED = ['boolean', ['feature-state', 'visited'], false];
  var SELECTED = ['boolean', ['feature-state', 'selected'], false];
  var IS_CLUSTER = ['has', 'point_count'];
  var NOT_CLUSTER = ['!', ['has', 'point_count']];

  var layers = [
    { id: 'ocean', type: 'background', paint: { 'background-color': THEME.ocean } },
    // Flat land sits under the imagery: it is the hit-test layer and the fallback when tiles are missing.
    { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': THEME.land } }
  ];
  if (hasImagery) {
    layers.push({
      id: 'imagery', type: 'raster', source: 'imagery',
      layout: { visibility: quality === 'high' ? 'visible' : 'none' },
      paint: { 'raster-fade-duration': 200 }
    });
  }
  layers.push(
    { id: 'visited', type: 'fill', source: 'countries',
      paint: { 'fill-color': THEME.visited, 'fill-opacity': ['case', VISITED, hasImagery && quality === 'high' ? 0.6 : 1, 0] } },
    { id: 'borders', type: 'line', source: 'countries',
      paint: { 'line-color': hasImagery && quality === 'high' ? 'rgba(255,255,255,0.35)' : THEME.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 5, 1] } },
    { id: 'selected', type: 'line', source: 'countries',
      paint: { 'line-color': '#ffffff', 'line-width': ['case', SELECTED, 2.5, VISITED, 1.5, 0] } },
    { id: 'route', type: 'line', source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': THEME.route, 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [2, 1.5] } },
    // The newest leg of the route while it draws itself from the previous stop.
    { id: 'leg', type: 'line', source: 'leg',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': THEME.route, 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [2, 1.5] } },
    // Countries too small to see as shapes: faint dots once zoomed in, solid dots when visited.
    { id: 'tiny-all', type: 'circle', source: 'tiny', minzoom: 2.5,
      paint: { 'circle-radius': 2.5, 'circle-color': '#ffffff',
               'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2.5, 0, 3.2, 0.7] } },
    { id: 'tiny-visited', type: 'circle', source: 'tiny',
      paint: { 'circle-radius': 3.5, 'circle-color': THEME.visited,
               'circle-opacity': ['case', VISITED, 1, 0],
               'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1,
               'circle-stroke-opacity': ['case', VISITED, 1, 0] } },
    { id: 'clusters', type: 'circle', source: 'places', filter: IS_CLUSTER,
      paint: { 'circle-radius': ['step', ['get', 'point_count'], 10, 10, 14, 50, 19],
               'circle-color': THEME.pin, 'circle-opacity': 0.9,
               'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } },
    { id: 'places-halo', type: 'circle', source: 'places', filter: NOT_CLUSTER,
      paint: { 'circle-radius': 11, 'circle-color': THEME.pin, 'circle-opacity': 0.25 } },
    { id: 'places-dot', type: 'circle', source: 'places', filter: NOT_CLUSTER,
      paint: { 'circle-radius': 5, 'circle-color': THEME.pin,
               'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } },
    // Name tags for every selected country. Each tag is a small image drawn in the page, so no
    // font server is needed, and MapLibre hides tags that would overlap or sit behind the globe.
    { id: 'labels', type: 'symbol', source: 'labels',
      layout: { 'icon-image': ['get', 'img'], 'icon-anchor': 'bottom', 'icon-offset': [0, -3], 'icon-padding': 1 } },
    // Tags for place pins sit above country tags, so a city wins when the two would overlap.
    { id: 'place-labels', type: 'symbol', source: 'places', filter: ['all', NOT_CLUSTER, ['has', 'img']],
      layout: { 'icon-image': ['get', 'img'], 'icon-anchor': 'bottom', 'icon-offset': [0, -8], 'icon-padding': 1 } },
    // Cities that could be added: hollow dots with a name tag where there is room.
    { id: 'candidates-dot', type: 'circle', source: 'candidates',
      paint: { 'circle-radius': 5.5, 'circle-color': THEME.space,
               'circle-stroke-color': THEME.pin, 'circle-stroke-width': 2 } },
    { id: 'candidate-labels', type: 'symbol', source: 'candidates', filter: ['has', 'img'],
      layout: { 'icon-image': ['get', 'img'], 'icon-anchor': 'bottom', 'icon-offset': [0, -8], 'icon-padding': 1 } },
    // Picked cities, in visit order: a filled pin carrying its number, always drawn.
    { id: 'stops-dot', type: 'symbol', source: 'stops',
      layout: { 'icon-image': ['get', 'num'], 'icon-allow-overlap': true, 'icon-ignore-placement': true } },
    { id: 'stop-labels', type: 'symbol', source: 'stops', filter: ['has', 'img'],
      layout: { 'icon-image': ['get', 'img'], 'icon-anchor': 'bottom', 'icon-offset': [0, -15], 'icon-padding': 1 } }
  );

  var map;
  try {
    map = new maplibregl.Map({
      container: 'map',
      center: [78, 18],
      zoom: 1.4,
      minZoom: 0.2, // low enough for the whole Earth to fit a short visible band
      maxZoom: 7,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      pixelRatio: Math.min(dpr, 2),
      style: { version: 8, projection: { type: 'globe' }, sky: SKY_OFF, sources: sources, layers: layers }
    });
  } catch (err) {
    post({ type: 'error', fatal: true, message: 'Map could not start: ' + (err && err.message) });
    return;
  }
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Natural Earth' }), 'bottom-left');

  // ---- blue outline ------------------------------------------------------
  // A ring sized to the globe's silhouette. It only changes with zoom and latitude,
  // so a plain spin does not touch the DOM.
  var rim = document.createElement('div');
  rim.id = 'rim';
  map.getCanvasContainer().appendChild(rim);
  var rimKey = '';
  function updateRim() {
    var el = map.getCanvas();
    var w = el.clientWidth, h = el.clientHeight;
    var fov = (map.getVerticalFieldOfView ? map.getVerticalFieldOfView() : 36.87) * Math.PI / 180;
    var focal = 0.5 * h / Math.tan(fov / 2);
    var R = 512 * Math.pow(2, map.getZoom()) / (2 * Math.PI) / Math.cos(map.getCenter().lat * Math.PI / 180);
    var D = focal + R;
    var r = focal * R / Math.sqrt(D * D - R * R);
    var show = r < Math.sqrt(w * w + h * h) / 2 + 60;
    // The globe is centred in the padded view (the part the app's drawer leaves showing).
    var pad = map.getPadding ? map.getPadding() : null;
    var cy = pad ? (h + (pad.top || 0) - (pad.bottom || 0)) / 2 : h / 2;
    var key = show ? [Math.round(r * 2) / 2, w, h, Math.round(cy * 2) / 2].join(',') : 'off';
    if (key === rimKey) return;
    rimKey = key;
    if (!show) { rim.style.display = 'none'; return; }
    rim.style.display = 'block';
    rim.style.width = rim.style.height = (2 * r) + 'px';
    rim.style.transform = 'translate(' + (w / 2 - r) + 'px,' + (cy - r) + 'px)';
  }
  map.on('move', updateRim);
  map.on('resize', updateRim);
  updateRim();

  // ---- stars follow the rotation -------------------------------------------
  // Stars sit far behind the globe, so they drift the opposite way to the surface in front.
  // A full turn moves them a whole number of tiles, which keeps the wrap at 180 degrees seamless.
  var STAR_TILES_PER_TURN = 5;
  var starsEl = document.getElementById('stars');
  function moveStars() {
    var c = map.getCenter();
    var x = c.lng / 360 * STAR_TILES_PER_TURN * starTileW;
    var y = -c.lat / 360 * STAR_TILES_PER_TURN * starTileW;
    x = ((x % starTileW) + starTileW) % starTileW - starTileW;
    y = ((y % starTileH) + starTileH) % starTileH - starTileH;
    starsEl.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }
  map.on('move', moveStars);
  window.addEventListener('resize', function () { drawStars(); moveStars(); });
  moveStars();

  // ---- quality ----------------------------------------------------------
  function applyQuality(q, reason, fps) {
    quality = q === 'low' ? 'low' : 'high';
    var high = quality === 'high';
    if (hasImagery) map.setLayoutProperty('imagery', 'visibility', high ? 'visible' : 'none');
    var showImagery = high && hasImagery;
    map.setPaintProperty('visited', 'fill-opacity', ['case', VISITED, showImagery ? 0.6 : 1, 0]);
    map.setPaintProperty('borders', 'line-color', showImagery ? 'rgba(255,255,255,0.35)' : THEME.border);
    rim.className = high ? '' : 'lite';
    map.setPixelRatio(Math.min(dpr, high ? 2 : 1.5));
    post({ type: 'quality', quality: quality, reason: reason || 'set', fps: fps == null ? null : fps });
  }

  // ---- auto-rotation ----------------------------------------------------
  var spinEnabled = true;
  var touching = false;
  var resumeAt = 0;
  var resumeTimer = null;
  var DEG_PER_SEC = 6;

  function canSpin() {
    return spinEnabled && !touching && !selected && !document.hidden && Date.now() >= resumeAt && map.getZoom() < 3;
  }
  var inSpin = false;
  function spin() {
    // easeTo stops any running animation first, which fires moveend and would re-enter here.
    if (inSpin || !canSpin()) return;
    inSpin = true;
    try {
      var c = map.getCenter();
      map.easeTo({ center: [c.lng - DEG_PER_SEC, c.lat], duration: 1000, easing: function (t) { return t; } });
    } finally {
      inSpin = false;
    }
  }
  function pause(ms) {
    resumeAt = Date.now() + ms;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(spin, ms + 50);
  }
  function onDown() { touching = true; clearTimeout(resumeTimer); dropCommand(); map.stop(); }
  function onUp() { touching = false; pause(3000); }
  map.on('touchstart', onDown);
  map.on('mousedown', onDown);
  map.on('touchend', onUp);
  map.on('touchcancel', onUp);
  map.on('mouseup', onUp);
  map.on('moveend', spin);
  document.addEventListener('visibilitychange', function () { if (document.hidden) map.stop(); else spin(); });

  // ---- frame-rate sampling ----------------------------------------------
  // Samples frame gaps only while the globe is moving. Used for the benchmark readout
  // and for the automatic drop to low quality.
  var gaps = [];
  var lastFrame = 0;
  var sampleStart = 0;
  var sampleTouched = false;
  var lowSamples = 0;
  var readyAt = 0;

  function flush(now) {
    var n = gaps.length;
    if (n >= 4) {
      var sum = 0, worst = 0, slow = 0;
      for (var i = 0; i < n; i++) { sum += gaps[i]; if (gaps[i] > worst) worst = gaps[i]; if (gaps[i] > 34) slow++; }
      var fps = Math.round(10000 * n / sum) / 10;
      if (CFG.benchmark) {
        post({ type: 'perf', fps: fps, worstMs: Math.round(worst), slowFrames: slow, frames: n,
               during: sampleTouched ? 'touch' : 'spin', quality: quality });
      }
      if (auto && quality === 'high' && now - readyAt > 1500) {
        lowSamples = fps < 28 ? lowSamples + 1 : 0;
        if (lowSamples >= 2) applyQuality('low', 'fps', fps);
      }
    }
    gaps = []; sampleStart = now; sampleTouched = false;
  }
  function frame(now) {
    if (map.isMoving()) {
      if (lastFrame) gaps.push(now - lastFrame); else if (!gaps.length) sampleStart = now;
      lastFrame = now;
      if (touching) sampleTouched = true;
      if (now - sampleStart >= 2000) flush(now);
    } else {
      lastFrame = 0;
    }
    requestAnimationFrame(frame);
  }

  // ---- data from React Native -------------------------------------------
  var selected = null;

  function arc(a, b) { // great-circle points between two [lng, lat]
    var R = Math.PI / 180;
    var la1 = a[1] * R, lo1 = a[0] * R, la2 = b[1] * R, lo2 = b[0] * R;
    var h = Math.pow(Math.sin((la2 - la1) / 2), 2) + Math.cos(la1) * Math.cos(la2) * Math.pow(Math.sin((lo2 - lo1) / 2), 2);
    var d = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    if (d < 1e-6) return [a, b];
    var n = Math.max(2, Math.ceil(d / R / 3));
    var out = [];
    for (var i = 0; i <= n; i++) {
      var f = i / n;
      var A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      var x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
      var y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
      var z = A * Math.sin(la1) + B * Math.sin(la2);
      out.push([Math.atan2(y, x) / R, Math.atan2(z, Math.sqrt(x * x + y * y)) / R]);
    }
    return out;
  }
  function routeLine(points) {
    if (!points || points.length < 2) return EMPTY;
    var coords = [];
    for (var i = 0; i < points.length - 1; i++) {
      var seg = arc([points[i].lng, points[i].lat], [points[i + 1].lng, points[i + 1].lat]);
      for (var j = i === 0 ? 0 : 1; j < seg.length; j++) coords.push(seg[j]);
    }
    // Keep longitudes continuous so the line does not jump across the date line.
    for (var k = 1; k < coords.length; k++) {
      while (coords[k][0] - coords[k - 1][0] > 180) coords[k][0] -= 360;
      while (coords[k][0] - coords[k - 1][0] < -180) coords[k][0] += 360;
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  }

  function tagName(name) { return name.length > 28 ? name.slice(0, 27) + '...' : name; } // keeps tags compact
  // Flag images: loaded once from data URIs passed in the config.
  var FLAG_W = 20, FLAG_H = 15, FLAG_RADIUS = 2.5;
  var flagCache = {};
  var flagTimer = null;
  function flagImage(a2) {
    if (!a2 || !CFG.flags[a2]) return null;
    var entry = flagCache[a2];
    if (!entry) {
      entry = flagCache[a2] = { img: new Image(), ok: false };
      entry.img.onload = function () { entry.ok = true; clearTimeout(flagTimer); flagTimer = setTimeout(function () { refreshLabels(); refreshPlaces(); }, 30); };
      entry.img.src = CFG.flags[a2];
    }
    return entry.ok ? entry.img : null;
  }
  function labelImage(text, flag) {
    var pr = Math.min(dpr, 2);
    var font = '600 13px -apple-system, Roboto, "Segoe UI", sans-serif';
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    g.font = font;
    var fw = flag ? FLAG_W : 0, fh = FLAG_H, gap = flag ? 6 : 0;
    var tw = Math.ceil(g.measureText(text).width);
    var w = tw + fw + gap + 22, h = 26, tip = 6, r = 13;
    c.width = Math.ceil(w * pr); c.height = Math.ceil((h + tip) * pr);
    g = c.getContext('2d');
    g.scale(pr, pr);
    g.fillStyle = THEME.tag;
    g.beginPath();
    g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(w / 2 + tip, h); g.lineTo(w / 2, h + tip); g.lineTo(w / 2 - tip, h);
    g.lineTo(r, h); g.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
    g.closePath(); g.fill();
    if (flag) {
      var fx = 10, fy = (h - fh) / 2;
      var rr = FLAG_RADIUS;
      g.save(); // clip to a slightly rounded rectangle
      g.beginPath();
      g.moveTo(fx + rr, fy); g.arcTo(fx + fw, fy, fx + fw, fy + fh, rr); g.arcTo(fx + fw, fy + fh, fx, fy + fh, rr);
      g.arcTo(fx, fy + fh, fx, fy, rr); g.arcTo(fx, fy, fx + fw, fy, rr); g.closePath(); g.clip();
      g.drawImage(flag, fx, fy, fw, fh);
      g.restore();
    }
    g.font = font; g.fillStyle = THEME.tagText; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(text, 11 + fw + gap, h / 2 + 0.5);
    return { image: g.getImageData(0, 0, c.width, c.height), pixelRatio: pr };
  }
  var visitedIds = [];
  function refreshLabels() { // every selected country gets a tag, except the focused one, which has the popup
    var features = [];
    visitedIds.forEach(function (id) {
      if (id === selected) return;
      var f = INDEX[id], t = TINY[id];
      var at = t ? [t.lng, t.lat] : (f ? [f.properties.cx, f.properties.cy] : null);
      if (!at) return;
      var flag = flagImage(INDEX[id] && INDEX[id].properties.a2);
      var img = 'tag-' + id + (flag ? '-f' : '');
      if (!map.hasImage(img)) {
        var made = labelImage(tagName(f ? f.properties.name : t.name), flag);
        map.addImage(img, made.image, { pixelRatio: made.pixelRatio });
      }
      features.push({ type: 'Feature', properties: { iso: id, img: img }, geometry: { type: 'Point', coordinates: at } });
    });
    map.getSource('labels').setData({ type: 'FeatureCollection', features: features });
  }

  // Pins for places (cities). Each gets a flag-and-name tag unless there are too many to label.
  var placesData = [];
  var MAX_PLACE_TAGS = 150;
  function refreshPlaces() {
    var tagged = placesData.length <= MAX_PLACE_TAGS;
    map.getSource('places').setData({
      type: 'FeatureCollection',
      features: placesData.map(function (p) {
        var props = { id: p.id, name: p.name };
        if (tagged) {
          var flag = flagImage(p.countryCode);
          var img = 'ptag-' + p.id + (flag ? '-f' : '');
          if (!map.hasImage(img)) {
            var made = labelImage(tagName(p.name), flag);
            map.addImage(img, made.image, { pixelRatio: made.pixelRatio });
          }
          props.img = img;
        }
        return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } };
      })
    });
  }

  function setData(d) {
    d = d || {};
    map.removeFeatureState({ source: 'countries' });
    map.removeFeatureState({ source: 'tiny' });
    visitedIds = (d.visited || []).map(function (iso) { return String(iso).toUpperCase(); });
    visitedIds.forEach(function (id) {
      map.setFeatureState({ source: 'countries', id: id }, { visited: true });
      map.setFeatureState({ source: 'tiny', id: id }, { visited: true });
    });
    if (selected) map.setFeatureState({ source: 'countries', id: selected }, { selected: true });
    placesData = d.places || [];
    refreshPlaces();
    candidatesData = d.candidates || [];
    refreshCandidates();
    var next = d.stops || [];
    var grewByOne = next.length === stopsData.length + 1 && stopsData.length >= 1 &&
      stopsData.every(function (p, i) { return p.id === next[i].id; });
    var before = stopsData;
    stopsData = next;
    refreshStops();
    // Country name tags would sit on top of city tags, so they step aside while cities are shown,
    // and so does the tapped country's popup (it would also swallow taps on the dots under it).
    if ((candidatesData.length || stopsData.length) && !held) label.remove();
    map.setLayoutProperty('labels', 'visibility', candidatesData.length || stopsData.length ? 'none' : 'visible');
    cancelLeg();
    if (!stopsData.length) {
      map.getSource('route').setData(routeLine(d.route));
    } else if (grewByOne && !still) {
      map.getSource('route').setData(routeLine(before));
      drawLeg(before[before.length - 1], next[next.length - 1]);
    } else {
      map.getSource('route').setData(routeLine(stopsData));
    }
    refreshLabels();
  }

  // ---- candidate cities and picked stops --------------------------------
  var candidatesData = [];
  var stopsData = [];
  var still = false; // Reduce motion: camera moves jump and the route appears whole
  var countryTap = true;
  function dur(ms) { return still ? 0 : ms; }
  function tagFor(prefix, p) {
    var flag = flagImage(p.countryCode);
    var img = prefix + p.id + (flag ? '-f' : '');
    if (!map.hasImage(img)) {
      var made = labelImage(tagName(p.name), flag);
      map.addImage(img, made.image, { pixelRatio: made.pixelRatio });
    }
    return img;
  }
  function numberImage(n) {
    var id = 'stop-' + n;
    if (map.hasImage(id)) return id;
    var pr = Math.min(dpr, 2), size = 26;
    var c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * pr);
    var g = c.getContext('2d');
    g.scale(pr, pr);
    g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2); g.closePath();
    g.fillStyle = THEME.pin; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = THEME.space; g.stroke();
    g.font = '700 13px -apple-system, Roboto, "Segoe UI", sans-serif';
    g.fillStyle = THEME.space; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 0.5);
    map.addImage(id, g.getImageData(0, 0, c.width, c.height), { pixelRatio: pr });
    return id;
  }
  function refreshCandidates() {
    map.getSource('candidates').setData({
      type: 'FeatureCollection',
      features: candidatesData.map(function (p) {
        return { type: 'Feature', properties: { id: p.id, name: p.name, img: tagFor('ctag-', p) },
                 geometry: { type: 'Point', coordinates: [p.lng, p.lat] } };
      })
    });
  }
  function refreshStops() {
    map.getSource('stops').setData({
      type: 'FeatureCollection',
      features: stopsData.map(function (p, i) {
        return { type: 'Feature', properties: { id: p.id, name: p.name, num: numberImage(i + 1), img: tagFor('stag-', p) },
                 geometry: { type: 'Point', coordinates: [p.lng, p.lat] } };
      })
    });
  }
  // The newest leg draws itself from the previous stop, then joins the route.
  var legFrame = null;
  function cancelLeg() {
    if (legFrame != null) { cancelAnimationFrame(legFrame); legFrame = null; }
    map.getSource('leg').setData(EMPTY);
  }
  function drawLeg(from, to) {
    var pts = arc([from.lng, from.lat], [to.lng, to.lat]);
    // Enough points for a smooth draw even on a short hop.
    if (pts.length < 24) {
      var fine = [];
      for (var k = 0; k < pts.length - 1; k++) {
        var steps = Math.ceil(24 / (pts.length - 1));
        for (var m = 0; m < steps; m++) {
          fine.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * m / steps, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * m / steps]);
        }
      }
      fine.push(pts[pts.length - 1]);
      pts = fine;
    }
    var t0 = performance.now(), LEG_MS = 400;
    function step(now) {
      var f = Math.min(1, (now - t0) / LEG_MS);
      var n = Math.max(2, Math.round(f * (pts.length - 1)) + 1);
      map.getSource('leg').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.slice(0, n) } });
      if (f < 1) { legFrame = requestAnimationFrame(step); return; }
      legFrame = null;
      map.getSource('route').setData(routeLine(stopsData));
      map.getSource('leg').setData(EMPTY);
    }
    legFrame = requestAnimationFrame(step);
  }
  function setCountryTap(on) { countryTap = !!on; }
  // How much of the bottom of the map is covered by the app's drawer. It becomes the camera's
  // bottom padding, so every move (fly, fit, focus, spin, the resting view) centres in the part
  // that shows. A resting globe is also re-sized to fit that part.
  var inset = 0;
  function pad() { return { top: 0, left: 0, right: 0, bottom: inset }; }
  // The move the app last asked for, kept while it is in flight. The app's drawer often changes
  // height just after it asks for a move, so a new inset arrives mid-flight: the move is then
  // aimed again at the new visible part, instead of being cut short by a padding change of its
  // own (Plan 75). A finger on the globe drops it.
  var command = null, commandMs = 0, commandTimer = null, quietUntil = 0;
  function dropCommand() { command = null; clearTimeout(commandTimer); }
  function move(ms, go) {
    command = go; commandMs = ms;
    clearTimeout(commandTimer);
    commandTimer = setTimeout(function () { command = null; }, dur(ms) + 80);
    quietUntil = Date.now() + dur(ms) + 80;
    go();
  }
  // Every asked-for move carries the padding with it, so the two arrive together.
  function flyCamera(center, zoom, ms) {
    map.flyTo({ center: center, zoom: zoom, padding: pad(), duration: dur(ms) });
  }
  // Fit a box inside the visible part, leaving the extra margins clear around it. The camera is worked
  // out against the padding it will end with, then flown to along with that padding.
  function flyBounds(bounds, extra, maxZoom, ms) {
    var was = map.getPadding(), cam = null;
    try {
      map.setPadding(pad());
      cam = map.cameraForBounds(bounds, { padding: extra, maxZoom: maxZoom });
    } catch (e) { cam = null; } // no room left to fit anything in
    map.setPadding(was);
    if (cam && isFinite(cam.zoom)) { flyCamera(cam.center, Math.min(cam.zoom, maxZoom), ms); return; }
    flyCamera([(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2], 1.2, ms);
  }
  function setInset(px) {
    inset = Math.max(0, Number(px) || 0);
    if (command) { pause(8000); move(commandMs, command); return; }
    var to = { padding: pad(), duration: dur(300) };
    if (!selected && map.getZoom() < 3 && !stopsData.length && !candidatesData.length) to.zoom = homeZoom();
    pause(600);
    quietUntil = Date.now() + dur(300) + 80;
    map.easeTo(to);
  }
  // The zoom at which the whole Earth fits the visible band. On a globe the drawn radius is
  // worldSize / (2 pi cos(latitude)), so the zoom depends on the resting latitude.
  var HOME_LAT = 18;
  function homeZoom() {
    var el = map.getContainer();
    var across = Math.min(el.clientWidth, el.clientHeight - inset) * 0.95;
    var z = Math.log(Math.PI * across * Math.cos(HOME_LAT * Math.PI / 180) / 512) / Math.LN2;
    return Math.max(0.2, z);
  }
  // Pull back to the whole Earth, keeping the side that is facing.
  function goHome() {
    var lng = map.getCenter().lng;
    pause(1200);
    move(900, function () {
      map.easeTo({ center: [lng, HOME_LAT], zoom: homeZoom(), padding: pad(), duration: dur(900) });
    });
  }
  // 'focus': a tapped country is outlined, named and zoomed to, then reported (the default).
  // 'report': the app is only told which country was tapped, and decides what happens.
  var tapMode = 'focus';
  function setTapMode(mode) { tapMode = mode === 'report' ? 'report' : 'focus'; }
  function debugSize() { // for scripts/globe/page-check.py
    var z = map.getZoom(), lat = map.getCenter().lat;
    return { diameter: 512 * Math.pow(2, z) / Math.PI / Math.cos(lat * Math.PI / 180), centerY: map.project(map.getCenter()).y, zoom: z,
             lng: map.getCenter().lng, lat: lat, selected: selected };
  }
  function setReduceMotion(on) { still = !!on; if (still) cancelLeg(); if (still && stopsData.length) map.getSource('route').setData(routeLine(stopsData)); }
  // Frame a set of points: one point zooms to it, several fit them all.
  function fitPoints(points) {
    if (!points || !points.length) return;
    pause(8000);
    if (points.length === 1) {
      move(900, function () { flyCamera([points[0].lng, points[0].lat], 4.2, 900); });
      return;
    }
    var s = 90, n = -90;
    points.forEach(function (p) { if (p.lat < s) s = p.lat; if (p.lat > n) n = p.lat; });
    var we = lngSpan(points.map(function (p) { return [p.lng, p.lng]; }));
    fitBox([we[0], s, we[1], n]);
  }
  // The west and east edges that hold every [west, east] interval in the shorter way round the
  // globe. Tokyo and Los Angeles are 102 degrees apart across the Pacific, not 258 the other way;
  // the eastern edge then runs past 180, which the map accepts.
  function lngSpan(intervals) {
    function edges(shift) {
      var w = 720, e = -720;
      intervals.forEach(function (iv) {
        var add = shift && (iv[0] + iv[1]) / 2 < 0 ? 360 : 0;
        if (iv[0] + add < w) w = iv[0] + add;
        if (iv[1] + add > e) e = iv[1] + add;
      });
      return [w, e];
    }
    var plain = edges(false), wrapped = edges(true);
    return wrapped[1] - wrapped[0] < plain[1] - plain[0] ? wrapped : plain;
  }
  function fitBox(box) {
    if (box[2] - box[0] > 200) { // most of the way round the globe: pull right back
      move(900, function () { flyCamera([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], 1.2, 900); });
      return;
    }
    move(900, function () {
      flyBounds([[box[0], Math.max(box[1], -80)], [box[2], Math.min(box[3], 84)]],
        { top: 90, bottom: 60, left: 48, right: 48 }, 4.6, 900);
    });
  }
  // Frame several countries at once (by ISO alpha-3).
  function fitCountries(isos) {
    var s = 90, n = -90, spans = [];
    (isos || []).forEach(function (iso) {
      var id = String(iso).toUpperCase();
      var f = INDEX[id], tiny = TINY[id];
      var box = f ? largestBox(f.geometry) : (tiny ? [tiny.lng, tiny.lat, tiny.lng, tiny.lat] : null);
      if (!box) return;
      spans.push([box[0], box[2]]);
      if (box[1] < s) s = box[1]; if (box[3] > n) n = box[3];
    });
    if (!spans.length) return;
    var we = lngSpan(spans), w = we[0], e = we[1];
    pause(8000);
    if (e - w < 1 && n - s < 1) { move(900, function () { flyCamera([(w + e) / 2, (s + n) / 2], 4.5, 900); }); return; }
    fitBox([w, s, e, n]);
  }
  function flyTo(lng, lat, zoom) {
    // A country the app is holding in focus keeps its outline and name while a city in it is flown to.
    if (selected && selected !== held) { map.setFeatureState({ source: 'countries', id: selected }, { selected: false }); selected = null; refreshLabels(); }
    if (!held) label.remove();
    pause(8000);
    move(900, function () { flyCamera([lng, lat], zoom == null ? 3.5 : zoom, 900); });
  }
  // Switching the spin off stops the spin's own drift, never a move the app asked for.
  function setSpin(on) {
    spinEnabled = !!on;
    if (on) spin(); else if (!command && Date.now() > quietUntil) map.stop();
  }
  function setQuality(q) { auto = q === 'auto'; lowSamples = 0; applyQuality(q === 'low' ? 'low' : 'high', 'set'); }

  // ---- taps ---------------------------------------------------------------
  var INDEX = {};
  DATA.countries.features.forEach(function (f) { INDEX[f.properties.iso] = f; });
  var TINY = {};
  DATA.tiny.forEach(function (t) { TINY[t.iso] = t; });
  var label = new maplibregl.Popup({
    closeButton: false, closeOnClick: false, closeOnMove: false,
    anchor: 'bottom', offset: 6, className: 'country-pop', maxWidth: 'none'
  });

  function largestBox(geom) { // bounding box of the biggest landmass, so far-off islands do not skew the zoom
    var rings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(function (p) { return p[0]; });
    var best = null, bestArea = -1;
    rings.forEach(function (ring) {
      var w = 180, s = 90, e = -180, n = -90;
      for (var i = 0; i < ring.length; i++) {
        var x = ring[i][0], y = ring[i][1];
        if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
      }
      var area = (e - w) * (n - s);
      if (area > bestArea) { bestArea = area; best = [w, s, e, n]; }
    });
    return best;
  }
  function focusCountry(iso, name) {
    var f = INDEX[iso], tiny = TINY[iso];
    var at = tiny ? [tiny.lng, tiny.lat] : (f ? [f.properties.cx, f.properties.cy] : null);
    if (!at) return;
    var el = document.createElement('span');
    el.style.cssText = 'display:inline-flex;align-items:center';
    var a2 = INDEX[iso] && INDEX[iso].properties.a2;
    if (a2 && CFG.flags[a2]) {
      var im = document.createElement('img');
      im.src = CFG.flags[a2];
      im.style.cssText = 'width:' + FLAG_W + 'px;height:' + FLAG_H + 'px;margin-right:6px;border-radius:' + FLAG_RADIUS + 'px';
      el.appendChild(im);
    }
    el.appendChild(document.createTextNode(tagName(name)));
    label.setLngLat(at).setDOMContent(el).addTo(map);
    var box = f ? largestBox(f.geometry) : null;
    var lngSpan = box ? box[2] - box[0] : 0, latSpan = box ? box[3] - box[1] : 0;
    pause(8000);
    move(900, function () {
      if (tiny || !box || (lngSpan < 1 && latSpan < 1)) {
        flyCamera(at, 4.5, 900);
      } else if (lngSpan > 200) { // wraps the globe (Antarctica)
        flyCamera(at, 1.2, 900);
      } else {
        flyBounds([[box[0], Math.max(box[1], -80)], [box[2], Math.min(box[3], 84)]],
          { top: 80, bottom: 50, left: 36, right: 36 }, 4.2, 900);
      }
    });
  }
  // The country the app is showing a page for (Explore). Unlike a tap's selection it is the
  // app's to hold: it stays outlined and named through new data and city flights, and is given
  // again whenever the page reloads. Null lets go of it and pulls back to the whole Earth.
  var held = null;
  function setFocus(iso) {
    var id = iso ? String(iso).toUpperCase() : null;
    if (id && !INDEX[id] && !TINY[id]) id = null;
    var had = held;
    held = id;
    if (id) { focusByIso(id); return; }
    if (!had) return;
    if (selected) { map.setFeatureState({ source: 'countries', id: selected }, { selected: false }); selected = null; }
    label.remove();
    refreshLabels();
    goHome();
  }

  function select(iso) {
    var had = !!selected;
    if (selected) map.setFeatureState({ source: 'countries', id: selected }, { selected: false });
    selected = iso || null;
    if (selected) {
      map.setFeatureState({ source: 'countries', id: selected }, { selected: true });
    } else {
      label.remove();
      // Tapping empty space after a selection pulls back out and lets the spin resume.
      if (had) { pause(1200); map.easeTo({ zoom: Math.min(map.getZoom(), homeZoom()), duration: dur(900) }); }
    }
    refreshLabels();
  }
  function focusByIso(iso) { // called from React Native, e.g. from a search result
    var id = String(iso).toUpperCase();
    var name = INDEX[id] ? INDEX[id].properties.name : (TINY[id] ? TINY[id].name : null);
    if (!name) return;
    select(id);
    focusCountry(id, name);
  }
  function postCountry(f) {
    if (tapMode === 'focus') {
      select(f.properties.iso);
      if (CFG.focusOnTap) focusCountry(f.properties.iso, f.properties.name);
    }
    post({ type: 'country', iso: f.properties.iso, name: f.properties.name, visited: !!(f.state && f.state.visited) });
  }
  map.on('click', function (e) {
    var r = 14; // finger-sized hit area for point features
    var box = [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]];

    var stopHits = map.queryRenderedFeatures(box, { layers: ['stops-dot'] });
    if (stopHits.length) {
      var sp = stopHits[0];
      post({ type: 'place', id: sp.properties.id, name: sp.properties.name,
             lng: sp.geometry.coordinates[0], lat: sp.geometry.coordinates[1] });
      return;
    }
    var candHits = map.queryRenderedFeatures(box, { layers: ['candidates-dot'] });
    if (candHits.length) {
      var cp = candHits[0];
      post({ type: 'candidate', id: cp.properties.id, name: cp.properties.name,
             lng: cp.geometry.coordinates[0], lat: cp.geometry.coordinates[1] });
      return;
    }
    var pins = map.queryRenderedFeatures(box, { layers: ['places-dot'] });
    if (pins.length) {
      var p = pins[0];
      post({ type: 'place', id: p.properties.id, name: p.properties.name,
             lng: p.geometry.coordinates[0], lat: p.geometry.coordinates[1] });
      return;
    }
    var clusters = map.queryRenderedFeatures(box, { layers: ['clusters'] });
    if (clusters.length) {
      var c = clusters[0];
      pause(8000);
      map.getSource('places').getClusterExpansionZoom(c.properties.cluster_id).then(function (z) {
        map.easeTo({ center: c.geometry.coordinates, zoom: Math.min(z + 0.3, 7), duration: 700 });
      });
      return;
    }
    if (!countryTap) return; // countries are not pickable on this step
    var tinyLayers = map.getZoom() >= 2.5 ? ['tiny-all', 'tiny-visited'] : ['tiny-visited'];
    var tiny = map.queryRenderedFeatures(box, { layers: tinyLayers }).filter(function (f) {
      return map.getZoom() >= 2.5 || (f.state && f.state.visited);
    });
    if (tiny.length) { postCountry(tiny[0]); return; }

    var hits = map.queryRenderedFeatures(e.point, { layers: ['land'] });
    if (hits.length) postCountry(hits[0]);
    else if (tapMode === 'focus') select(null); // in report mode the app owns the outline
  });

  // ---- imagery status and errors ----------------------------------------
  var imageryOk = false;
  map.on('sourcedata', function (e) {
    if (!imageryOk && e.sourceId === 'imagery' && e.tile) {
      imageryOk = true;
      post({ type: 'imagery', ok: true, ms: Math.round(performance.now() - T0) });
    }
  });
  map.on('error', function (e) {
    if (e && e.sourceId === 'imagery') return; // the flat land layer stays visible underneath
    post({ type: 'error', fatal: false, message: String((e && e.error && e.error.message) || e) });
  });

  // If the GPU context is lost and does not come back, ask React Native to reload the page.
  var canvas = map.getCanvas();
  var lost = false;
  canvas.addEventListener('webglcontextlost', function () {
    lost = true;
    setTimeout(function () { if (lost) post({ type: 'crash', reason: 'webglcontextlost' }); }, 3000);
  });
  canvas.addEventListener('webglcontextrestored', function () { lost = false; });

  // Ready as soon as the country shapes are in. Imagery is not waited for: on a slow or
  // offline connection the flat globe shows first and the imagery fades in when it arrives.
  var isReady = false;
  function maybeReady() {
    if (isReady || !map.getSource('countries') || !map.isSourceLoaded('countries')) return;
    isReady = true;
    map.off('sourcedata', maybeReady);
    window.globe = {
      setData: setData, flyTo: flyTo, setSpin: setSpin, setQuality: setQuality,
      focusCountry: focusByIso, clearSelection: function () { select(null); },
      setCountryTap: setCountryTap, setReduceMotion: setReduceMotion, fitPoints: fitPoints, fitCountries: fitCountries,
      setInset: setInset, setTapMode: setTapMode, goHome: goHome, setFocus: setFocus, debugSize: debugSize
    };
    if (quality === 'low') applyQuality('low', 'config');
    pending.forEach(function (call) { window.globe[call[0]].apply(null, call[1]); });
    pending = [];
    readyAt = performance.now();
    post({ type: 'ready', ms: Math.round(readyAt - T0), quality: quality, pixelRatio: map.getPixelRatio() });
    requestAnimationFrame(frame);
    spin();
    // Tile failures are often silent (404s, hung requests), so report by deadline instead.
    if (hasImagery) {
      setTimeout(function () {
        if (!imageryOk && quality === 'high') post({ type: 'imagery', ok: false });
      }, 8000);
    }
  }
  map.on('sourcedata', maybeReady);
  map.on('load', maybeReady);
}

if (typeof maplibregl === 'undefined') {
  post({ type: 'error', fatal: true, message: 'Map library failed to initialise on this WebView' });
} else {
  start();
}
`;

export function buildGlobeHtml(data: GlobeData, input: GlobeConfig): string {
  // Fields a caller's theme leaves out (tag colours, star tints) take the defaults.
  const config: GlobeConfig = { ...input, theme: { ...defaultTheme, ...input.theme } };
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />',
    '<style>',
    MAPLIBRE_CSS,
    '</style>',
    '<style>',
    pageCss(config.theme),
    '</style>',
    '</head><body><canvas id="stars"></canvas><div id="map"></div>',
    '<script>var T0 = performance.now(); var CFG = ',
    safeJson(config),
    '; var DATA = ',
    safeJson(data),
    ';</script>',
    '<script>',
    MAPLIBRE_JS,
    '</script>',
    '<script>',
    globePageScript,
    '</script>',
    '</body></html>',
  ].join('');
}
