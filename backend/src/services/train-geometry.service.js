// backend/src/services/train-geometry.service.js
const fs = require("fs");
const path = require("path");

const TRAINS_GEOM_PATH = path.join(__dirname, "../../data/normalized/trains_geometry.json");
const STATIONS_PATH = path.join(__dirname, "../../data/normalized/stations.json");
const TRAIN_STOPS_PATH = path.join(__dirname, "../../data/normalized/train_stops.json");
const HOTOSM_PATH = path.join(__dirname, "../../data/downloads/hotosm/railways.geojson");

let isInitialized = false;
const geomMap = new Map();
const stationsMap = new Map();
let trainStopsMap = {};
const geometryCache = new Map();

// Spatial index for physical railway track ways
const CELL_SIZE = 0.05; // ~5km grid cells
const trackGrid = new Map();
let totalPhysicalWays = 0;

function getCellKey(lng, lat) {
  return `${Math.floor(lng / CELL_SIZE)}_${Math.floor(lat / CELL_SIZE)}`;
}

function initGeometryService() {
  if (isInitialized) return;

  try {
    // 1. Load Station Master
    if (fs.existsSync(STATIONS_PATH)) {
      const stList = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
      stList.forEach((s) => {
        if (s.station_code) stationsMap.set(s.station_code, s);
      });
      console.log(`⚡ TrainGeometryService loaded ${stationsMap.size} official railway stations`);
    }

    // 2. Load Train Stops Sequence
    if (fs.existsSync(TRAIN_STOPS_PATH)) {
      trainStopsMap = JSON.parse(fs.readFileSync(TRAIN_STOPS_PATH, "utf8"));
      console.log(`⚡ TrainGeometryService loaded timetabled stops for ${Object.keys(trainStopsMap).length} trains`);
    }

    // 3. Load Fallback Pre-indexed Geometries
    if (fs.existsSync(TRAINS_GEOM_PATH)) {
      const list = JSON.parse(fs.readFileSync(TRAINS_GEOM_PATH, "utf8"));
      if (Array.isArray(list)) {
        list.forEach((t) => {
          if (t && t.train_no) geomMap.set(String(t.train_no).trim(), t);
        });
      } else if (typeof list === "object") {
        Object.values(list).forEach((t) => {
          if (t && t.train_no) geomMap.set(String(t.train_no).trim(), t);
        });
      }
      console.log(`⚡ TrainGeometryService loaded ${geomMap.size} baseline route geometries`);
    }

    // 4. Load Physical Railway Ways (OpenStreetMap Track Network)
    if (fs.existsSync(HOTOSM_PATH)) {
      const t0 = Date.now();
      const rawOsm = JSON.parse(fs.readFileSync(HOTOSM_PATH, "utf8"));
      const validWays = (rawOsm.features || [])
        .filter((f) => f.geometry?.type === "LineString" && f.geometry.coordinates.length >= 2)
        .map((f, id) => ({ id, coords: f.geometry.coordinates }));

      validWays.forEach((w) => {
        const seenCells = new Set();
        for (const pt of w.coords) {
          const k = getCellKey(pt[0], pt[1]);
          if (!seenCells.has(k)) {
            seenCells.add(k);
            if (!trackGrid.has(k)) trackGrid.set(k, []);
            trackGrid.get(k).push(w);
          }
        }
      });

      totalPhysicalWays = validWays.length;
      console.log(`⚡ TrainGeometryService indexed ${totalPhysicalWays} OSM physical railway ways into ${trackGrid.size} spatial cells in ${Date.now() - t0}ms`);
    }

    isInitialized = true;
  } catch (err) {
    console.warn("TrainGeometryService initialization issue:", err.message);
  }
}

function getWaysInBoundingBox(minLng, minLat, maxLng, maxLat) {
  const minX = Math.floor(minLng / CELL_SIZE);
  const maxX = Math.floor(maxLng / CELL_SIZE);
  const minY = Math.floor(minLat / CELL_SIZE);
  const maxY = Math.floor(maxLat / CELL_SIZE);
  const matched = new Set();

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const cellWays = trackGrid.get(`${x}_${y}`);
      if (cellWays) {
        for (const w of cellWays) matched.add(w);
      }
    }
  }

  return Array.from(matched);
}

/**
 * Routes a single hop between two stations strictly along the physical OSM railway tracks.
 * Returns the high-precision track coordinates, bookended by startPt and endPt.
 */
function routeHopAlongTracks(startPt, endPt) {
  if (!startPt || !endPt) return null;

  const margin = 0.04; // ~4.5 km search margin
  const minLng = Math.min(startPt[0], endPt[0]) - margin;
  const maxLng = Math.max(startPt[0], endPt[0]) + margin;
  const minLat = Math.min(startPt[1], endPt[1]) - margin;
  const maxLat = Math.max(startPt[1], endPt[1]) + margin;

  const boxWays = getWaysInBoundingBox(minLng, minLat, maxLng, maxLat);
  if (boxWays.length === 0) return [startPt, endPt];

  const vertexMap = new Map();
  const vertices = [];

  function getVertexId(pt) {
    // ~30 meters resolution spatial hash
    const k = `${Math.round(pt[0] * 3333)}_${Math.round(pt[1] * 3333)}`;
    if (vertexMap.has(k)) return vertexMap.get(k);
    const id = vertices.length;
    vertices.push(pt);
    vertexMap.set(k, id);
    return id;
  }

  const adj = [];
  function addEdge(u, v) {
    while (adj.length <= Math.max(u, v)) adj.push([]);
    adj[u].push(v);
    adj[v].push(u);
  }

  boxWays.forEach((w) => {
    const coords = w.coords;
    for (let i = 0; i < coords.length - 1; i++) {
      const u = getVertexId(coords[i]);
      const v = getVertexId(coords[i + 1]);
      addEdge(u, v);
    }
  });

  if (vertices.length === 0) return [startPt, endPt];

  function findNearestTrackVertex(target) {
    let best = 0;
    let minD = Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const d = Math.hypot((vertices[i][0] - target[0]) * 104, (vertices[i][1] - target[1]) * 111);
      if (d < minD) {
        minD = d;
        best = i;
      }
    }
    return { id: best, distKm: minD };
  }

  const sV = findNearestTrackVertex(startPt);
  const eV = findNearestTrackVertex(endPt);

  // If station is further than 4.5km from any mapped track, fallback to direct connection
  if (sV.distKm > 4.5 || eV.distKm > 4.5) {
    return [startPt, endPt];
  }

  // Breadth-First Search along track network
  const dist = new Array(vertices.length).fill(Infinity);
  const prev = new Array(vertices.length).fill(null);
  dist[sV.id] = 0;
  const q = [sV.id];

  while (q.length > 0) {
    const u = q.shift();
    if (u === eV.id) break;
    const neighbors = adj[u] || [];
    for (const v of neighbors) {
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1;
        prev[v] = u;
        q.push(v);
      }
    }
  }

  if (prev[eV.id] !== null) {
    const pathCoords = [];
    let curr = eV.id;
    while (curr !== null) {
      pathCoords.unshift(vertices[curr]);
      curr = prev[curr];
    }
    return [startPt, ...pathCoords, endPt];
  }

  return [startPt, endPt];
}

/**
 * Simplifies consecutive micro-points to optimize Leaflet canvas rendering.
 */
function simplifyTrackCoordinates(coords, maxDistKm = 0.00004) {
  if (!coords || coords.length < 3) return coords || [];
  const clean = [coords[0]];

  for (let i = 1; i < coords.length - 1; i++) {
    const prev = clean[clean.length - 1];
    const curr = coords[i];
    const d = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    if (d >= maxDistKm) {
      clean.push([Number(curr[0].toFixed(6)), Number(curr[1].toFixed(6))]);
    }
  }

  const last = coords[coords.length - 1];
  clean.push([Number(last[0].toFixed(6)), Number(last[1].toFixed(6))]);
  return clean;
}

/**
 * Builds strictly ONE single continuous route matching the physical railway tracks.
 * Passes through every scheduled station and hugs every curve of the real OpenStreetMap permanent-way.
 */
function buildSingleTrainRouteCoordinates(trainNo, fallbackStops = []) {
  initGeometryService();

  const cleanNo = String(trainNo).trim();
  const rawStops =
    trainStopsMap[cleanNo] ||
    trainStopsMap[cleanNo.padStart(5, "0")] ||
    trainStopsMap[cleanNo.replace(/^0+/, "")] ||
    fallbackStops ||
    [];

  // If stops exist, route through physical tracks station by station
  if (rawStops && rawStops.length >= 2) {
    const assembledCoords = [];

    for (let i = 0; i < rawStops.length - 1; i++) {
      const s1 = rawStops[i];
      const s2 = rawStops[i + 1];

      const st1 = stationsMap.get(s1.station_code);
      const st2 = stationsMap.get(s2.station_code);

      const pt1 = st1?.longitude && st1?.latitude
        ? [st1.longitude, st1.latitude]
        : s1.longitude && s1.latitude
        ? [s1.longitude, s1.latitude]
        : null;

      const pt2 = st2?.longitude && st2?.latitude
        ? [st2.longitude, st2.latitude]
        : s2.longitude && s2.latitude
        ? [s2.longitude, s2.latitude]
        : null;

      if (!pt1 || !pt2) continue;

      const segment = routeHopAlongTracks(pt1, pt2);
      if (!segment || segment.length === 0) continue;

      if (assembledCoords.length === 0) {
        assembledCoords.push(...segment);
      } else {
        // Skip duplicate connection vertex
        assembledCoords.push(...segment.slice(1));
      }
    }

    if (assembledCoords.length >= 2) {
      return simplifyTrackCoordinates(assembledCoords);
    }
  }

  // Baseline fallback from geomMap if stops not indexed
  const geomItem =
    geomMap.get(cleanNo) ||
    geomMap.get(cleanNo.padStart(5, "0")) ||
    geomMap.get(cleanNo.replace(/^0+/, ""));

  return geomItem?.route_geometry?.coordinates || null;
}

function getEnhancedTrainGeometry(trainNo, fallbackStops = []) {
  const cleanNo = String(trainNo).trim();
  if (geometryCache.has(cleanNo)) {
    return geometryCache.get(cleanNo);
  }

  const coords = buildSingleTrainRouteCoordinates(cleanNo, fallbackStops);
  if (coords && coords.length > 1) {
    const geom = {
      type: "LineString",
      coordinates: coords,
    };
    geometryCache.set(cleanNo, geom);
    return geom;
  }

  return null;
}

module.exports = {
  initGeometryService,
  getEnhancedTrainGeometry,
  buildEnhancedRouteCoordinates: buildSingleTrainRouteCoordinates,
};
