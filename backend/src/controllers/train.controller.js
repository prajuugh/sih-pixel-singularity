// backend/src/controllers/train.controller.js
const fs = require("fs");
const path = require("path");
const liveTrainService = require("../services/live-train");
const { getEnhancedTrainGeometry } = require("../services/train-geometry.service");

const TRAINS_PATH = path.join(__dirname, "../../data/normalized/trains.json");
const TRAINS_GEOM_PATH = path.join(__dirname, "../../data/normalized/trains_geometry.json");
const TRAIN_STOPS_PATH = path.join(__dirname, "../../data/normalized/train_stops.json");

let trainsCache = [];
let trainStopsCache = {};
let trainsGeomCache = null;

try {
  if (fs.existsSync(TRAINS_PATH)) {
    trainsCache = JSON.parse(fs.readFileSync(TRAINS_PATH, "utf8"));
  }
} catch (err) {
  console.warn("Could not load normalized trains:", err.message);
}

try {
  if (fs.existsSync(TRAIN_STOPS_PATH)) {
    trainStopsCache = JSON.parse(fs.readFileSync(TRAIN_STOPS_PATH, "utf8"));
  }
} catch (err) {
  console.warn("Could not load normalized train stops:", err.message);
}

function findTrainInCache(trainNo) {
  const clean = String(trainNo).trim();
  return trainsCache.find(
    (t) =>
      t.train_no === clean ||
      t.train_no === clean.padStart(5, "0") ||
      t.train_no === clean.replace(/^0+/, "")
  );
}

function findStopsInCache(trainNo) {
  const clean = String(trainNo).trim();
  return (
    trainStopsCache[clean] ||
    trainStopsCache[clean.padStart(5, "0")] ||
    trainStopsCache[clean.replace(/^0+/, "")] ||
    []
  );
}

function getTrainGeometry(trainNo) {
  if (!trainsGeomCache) {
    try {
      if (fs.existsSync(TRAINS_GEOM_PATH)) {
        trainsGeomCache = JSON.parse(fs.readFileSync(TRAINS_GEOM_PATH, "utf8"));
      } else {
        trainsGeomCache = [];
      }
    } catch (e) {
      trainsGeomCache = [];
    }
  }
  const clean = String(trainNo).trim();
  const t = trainsGeomCache.find(
    (tr) =>
      tr.train_no === clean ||
      tr.train_no === clean.padStart(5, "0") ||
      tr.train_no === clean.replace(/^0+/, "")
  );
  return t?.route_geometry || null;
}

// GET /api/trains
async function getTrains(req, res, next) {
  try {
    const { search, type, zone, limit = 50, offset = 0 } = req.query;
    let results = trainsCache;

    if (search) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (t) =>
          (t.train_no || "").toLowerCase().includes(q) ||
          (t.train_name || "").toLowerCase().includes(q) ||
          (t.source_station || "").toLowerCase().includes(q) ||
          (t.source_station_name || "").toLowerCase().includes(q) ||
          (t.destination_station || "").toLowerCase().includes(q) ||
          (t.destination_station_name || "").toLowerCase().includes(q)
      );
    }

    if (type && type !== "ALL") {
      const upper = type.toUpperCase();
      if (upper === "VANDE_BHARAT" || upper === "VANDE BHARAT" || upper === "VB") {
        results = results.filter((t) => (t.train_name || "").toLowerCase().includes("vande bharat"));
      } else if (upper === "RAJDHANI" || upper === "RAJ") {
        results = results.filter((t) => t.train_type === "RAJ" || (t.train_name || "").toLowerCase().includes("rajdhani"));
      } else if (upper === "SHATABDI" || upper === "SHTB") {
        results = results.filter((t) => t.train_type === "SHTB" || t.train_type === "JSHTB" || (t.train_name || "").toLowerCase().includes("shatabdi"));
      } else if (upper === "SUPERFAST" || upper === "SF") {
        results = results.filter((t) => t.train_type === "SF" || (t.train_type || "").toUpperCase() === "SUPERFAST");
      } else if (upper === "DURONTO" || upper === "DRNT") {
        results = results.filter((t) => t.train_type === "DRNT" || (t.train_name || "").toLowerCase().includes("duronto"));
      } else if (upper === "EXPRESS" || upper === "EXP") {
        results = results.filter((t) => t.train_type === "EXP" || (t.train_type || "").toUpperCase() === "EXPRESS");
      } else if (upper === "PASSENGER" || upper === "PASS") {
        results = results.filter((t) => ["PASS", "DEMU", "MEMU", "PASSENGER"].includes((t.train_type || "").toUpperCase()));
      } else if (upper === "GOODS" || upper === "FREIGHT") {
        results = results.filter((t) => (t.train_type || "").toUpperCase() === "GOODS" || (t.train_no || "").startsWith("G-"));
      } else {
        results = results.filter((t) => (t.train_type || "").toUpperCase() === upper);
      }
    }

    if (zone && zone !== "ALL") {
      const z = zone.toUpperCase();
      results = results.filter((t) => (t.zone || "").toUpperCase() === z);
    }

    const total = results.length;
    const paginated = results.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: {
        total,
        count: paginated.length,
        offset: Number(offset),
        limit: Number(limit),
        trains: paginated,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trains/upcoming
async function getUpcomingTrainsEndpoint(req, res, next) {
  try {
    const { zone, type, limit = 40 } = req.query;
    // Current time in IST (UTC + 5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const curHour = istTime.getUTCHours();
    const curMin = istTime.getUTCMinutes();
    const curTotalMinutes = curHour * 60 + curMin;

    let candidates = trainsCache;
    if (zone && zone !== "ALL") {
      candidates = candidates.filter((t) => (t.zone || "").toUpperCase() === zone.toUpperCase());
    }
    if (type && type !== "ALL") {
      const upper = type.toUpperCase();
      if (upper === "VANDE_BHARAT" || upper === "VANDE BHARAT" || upper === "VB") {
        candidates = candidates.filter((t) => (t.train_name || "").toLowerCase().includes("vande bharat"));
      } else if (upper === "RAJDHANI" || upper === "RAJ") {
        candidates = candidates.filter((t) => t.train_type === "RAJ" || (t.train_name || "").toLowerCase().includes("rajdhani"));
      }
    }

    const mapped = candidates
      .filter((t) => t.departure_time)
      .map((t) => {
        const parts = t.departure_time.split(":");
        const depMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
        let diff = depMinutes - curTotalMinutes;
        if (diff < 0) diff += 1440; // Next day schedule
        const numLast = parseInt(String(t.train_no).slice(-1), 10);
        const platform = isNaN(numLast) ? 1 : (numLast % 8) + 1;
        return {
          ...t,
          minutes_until_departure: diff,
          formatted_departure: `${parts[0]}:${parts[1]}`,
          platform: String(platform),
          status: diff < 30 ? "BOARDING" : diff < 90 ? "EXPEDITED" : "ON SCHEDULE",
        };
      })
      .sort((a, b) => a.minutes_until_departure - b.minutes_until_departure);

    const upcoming = mapped.slice(0, Number(limit));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: upcoming.length,
      data: upcoming,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trains/live
async function getLiveTrainsEndpoint(req, res, next) {
  try {
    const { zone, type, search, limit = 250 } = req.query;
    const result = await liveTrainService.getLiveTrains({
      zone,
      type,
      search,
      limit: parseInt(limit, 10) || 250,
    });
    const liveTrains = Array.isArray(result) ? result : (result.data || []);
    const totalCount = result.total !== undefined ? result.total : liveTrains.length;
    res.json({
      success: true,
      provider: liveTrainService.getActiveProviderName(),
      timestamp: new Date().toISOString(),
      total: totalCount,
      count: liveTrains.length,
      data: liveTrains,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trains/:trainNo
async function getTrainByNo(req, res, next) {
  try {
    const { trainNo } = req.params;
    const train = findTrainInCache(trainNo);

    if (!train) {
      return res.status(404).json({
        success: false,
        error: { code: "TRAIN_NOT_FOUND", message: `Official Indian Railway train ${trainNo} not found` },
      });
    }

    const stops = findStopsInCache(trainNo);

    res.json({
      success: true,
      data: {
        ...train,
        total_stops: stops.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

const STATIONS_PATH = path.join(__dirname, "../../data/normalized/stations.json");
let stationsMap = null;

function getStationCoordinates(code) {
  if (!stationsMap) {
    stationsMap = new Map();
    try {
      if (fs.existsSync(STATIONS_PATH)) {
        const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
        stations.forEach((s) => stationsMap.set(s.station_code, s));
      }
    } catch (e) {
      console.warn("Could not load stations in train controller:", e.message);
    }
  }
  return stationsMap.get(code);
}

// GET /api/trains/:trainNo/route
async function getTrainRoute(req, res, next) {
  try {
    const { trainNo } = req.params;
    const train = findTrainInCache(trainNo);
    const rawStops = findStopsInCache(trainNo);

    if (!train && rawStops.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "ROUTE_NOT_FOUND", message: `Timetable route for train ${trainNo} not found` },
      });
    }

    const geometry = getTrainGeometry(trainNo);

    // Enrich stops with coordinates
    const stops = rawStops.map((s) => {
      const st = getStationCoordinates(s.station_code);
      return {
        ...s,
        latitude: st?.latitude || null,
        longitude: st?.longitude || null,
      };
    });

    // Enrich route geometry using physical OSM railway tracks
    let enhancedGeom = null;
    try {
      enhancedGeom = getEnhancedTrainGeometry(trainNo, rawStops);
    } catch (e) {
      console.warn("Enhanced geometry fallback:", e.message);
    }

    let coordinates = enhancedGeom?.coordinates || geometry?.coordinates;
    if (!coordinates || coordinates.length === 0) {
      coordinates = stops
        .filter((s) => s.latitude && s.longitude)
        .map((s) => [s.longitude, s.latitude]);
    }

    res.json({
      success: true,
      data: {
        train_no: train?.train_no || trainNo,
        train_name: train?.train_name || `Train ${trainNo}`,
        train_type: train?.train_type || "EXPRESS",
        zone: train?.zone || null,
        departure_time: train?.departure_time || (stops[0] ? stops[0].departure_time : null),
        arrival_time: train?.arrival_time || (stops[stops.length - 1] ? stops[stops.length - 1].arrival_time : null),
        duration_hours: train?.duration_hours || 0,
        duration_minutes: train?.duration_minutes || 0,
        running_days: train?.running_days || "DAILY",
        classes: train?.classes || "",
        source_station: train?.source_station || (stops[0] ? stops[0].station_code : null),
        source_station_name: train?.source_station_name || (stops[0] ? stops[0].station_name : null),
        destination_station: train?.destination_station || (stops[stops.length - 1] ? stops[stops.length - 1].station_code : null),
        destination_station_name: train?.destination_station_name || (stops[stops.length - 1] ? stops[stops.length - 1].station_name : null),
        distance_km: train?.distance_km || 0,
        total_stops: stops.length,
        stops,
        route_geometry: {
          type: "LineString",
          coordinates,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trains/:trainNo/live
async function getTrainLiveEndpoint(req, res, next) {
  try {
    const { trainNo } = req.params;
    const live = await liveTrainService.getLiveTrainByNumber(trainNo);

    if (!live) {
      return res.status(404).json({
        success: false,
        error: { code: "LIVE_DATA_UNAVAILABLE", message: `Live tracking position for train ${trainNo} is currently unavailable.` },
      });
    }

    res.json({
      success: true,
      data: live,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrains,
  getLiveTrainsEndpoint,
  getUpcomingTrainsEndpoint,
  getTrainByNo,
  getTrainRoute,
  getTrainLiveEndpoint,
};
