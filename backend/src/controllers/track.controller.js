// backend/src/controllers/track.controller.js
const fs = require("fs");
const path = require("path");

// ============================================================
// LOAD REAL KARNATAKA RAILWAY DATA ON MODULE STARTUP
// ============================================================

const tracksPath = path.join(__dirname, "../../data/karnataka_tracks.geojson");
const schedulesPath = path.join(__dirname, "../../data/trainSchedules.json");

let trackFeatureCollection = { type: "FeatureCollection", features: [] };
let explicitTrainSchedules = [];

try {
  trackFeatureCollection = JSON.parse(fs.readFileSync(tracksPath, "utf8"));
  console.log(`✅ Loaded ${trackFeatureCollection.features.length} real OSM railway track segments`);
} catch (err) {
  console.warn("⚠️  Could not load karnataka_tracks.geojson:", err.message);
}

try {
  explicitTrainSchedules = JSON.parse(fs.readFileSync(schedulesPath, "utf8"));
  console.log(`✅ Loaded ${explicitTrainSchedules.length} explicit train schedules`);
} catch (err) {
  console.warn("⚠️  Could not load trainSchedules.json:", err.message);
}

// Master pool of real Karnataka railway services
const KARNATAKA_TRAIN_POOL = [
  {
    trainNo: "16589",
    trainName: "Rani Chennamma Express",
    type: "SUPERFAST",
    source: "Bengaluru (SBC)",
    destination: "Miraj (MRJ) via Belagavi",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 19,
    baseMin: 15,
  },
  {
    trainNo: "16591",
    trainName: "Hampi Express",
    type: "EXPRESS",
    source: "Mysuru (MYS)",
    destination: "Hubballi (UBL)",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 21,
    baseMin: 30,
  },
  {
    trainNo: "12725",
    trainName: "Siddhaganga Intercity Express",
    type: "INTERCITY",
    source: "Bengaluru (SBC)",
    destination: "Dharwad (DWR)",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 13,
    baseMin: 45,
  },
  {
    trainNo: "16595",
    trainName: "Panchaganga Superfast Express",
    type: "SUPERFAST",
    source: "Bengaluru (SBC)",
    destination: "Karwar (KAWR) via Mangaluru",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 22,
    baseMin: 15,
  },
  {
    trainNo: "16535",
    trainName: "Gol Gumbaz Express",
    type: "EXPRESS",
    source: "Mysuru (MYS)",
    destination: "Pandharpur via Solapur",
    operatingDays: ["MON", "WED", "FRI", "SUN"],
    baseHour: 16,
    baseMin: 10,
  },
  {
    trainNo: "20671",
    trainName: "Vande Bharat Express",
    type: "VANDE BHARAT",
    source: "Bengaluru (SBC)",
    destination: "Kalaburagi (KLBG)",
    operatingDays: ["MON", "TUE", "WED", "FRI", "SAT", "SUN"],
    baseHour: 11,
    baseMin: 20,
  },
  {
    trainNo: "12627",
    trainName: "Karnataka Express",
    type: "SUPERFAST",
    source: "Bengaluru (SBC)",
    destination: "New Delhi (NDLS)",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 18,
    baseMin: 30,
  },
  {
    trainNo: "22691",
    trainName: "Rajdhani Express",
    type: "RAJDHANI",
    source: "Bengaluru (SBC)",
    destination: "Hazrat Nizamuddin (NZM)",
    operatingDays: ["MON", "THU", "SAT"],
    baseHour: 20,
    baseMin: 0,
  },
  {
    trainNo: "12027",
    trainName: "Shatabdi Express",
    type: "SHATABDI",
    source: "Bengaluru (SBC)",
    destination: "Chennai Central (MAS)",
    operatingDays: ["MON", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 6,
    baseMin: 0,
  },
  {
    trainNo: "16515",
    trainName: "Karwar Express",
    type: "EXPRESS",
    source: "Yesvantpur (YPR)",
    destination: "Karwar (KAWR) via Hassan",
    operatingDays: ["MON", "WED", "FRI"],
    baseHour: 7,
    baseMin: 30,
  },
  {
    trainNo: "G-BOXN-401",
    trainName: "Iron Ore Heavy Freight",
    type: "GOODS",
    source: "Ballari (BAY)",
    destination: "Mangaluru Port (MAQ)",
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    baseHour: 2,
    baseMin: 15,
  },
  {
    trainNo: "G-BCN-204",
    trainName: "Container Cargo Freight",
    type: "GOODS",
    source: "Hubballi (UBL)",
    destination: "Whitefield ICD (SBC)",
    operatingDays: ["TUE", "THU", "SAT"],
    baseHour: 23,
    baseMin: 40,
  },
];

// Helper to format minutes to HH:MM
function formatTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(normalized / 60)).padStart(2, "0");
  const m = String(normalized % 60).padStart(2, "0");
  return `${h}:${m}`;
}

const { generateRealWorldTrackSchedule, getTrackCorridorInfo } = require("../services/schedule.service");

// Generate realistic schedules for ANY track segment across Karnataka
function getOrGenerateSchedulesForTrack(trackId, requestedDay) {
  return generateRealWorldTrackSchedule(trackId, requestedDay);
}


// ============================================================
// GET ALL TRACKS — returns full GeoJSON FeatureCollection
// ============================================================

async function getTracks(req, res, next) {
  try {
    res.json(trackFeatureCollection);
  } catch (err) {
    next(err);
  }
}


// ============================================================
// GET ONE TRACK — returns a single GeoJSON Feature
// ============================================================

async function getTrackById(req, res, next) {
  try {
    const trackId = req.params.trackId.toUpperCase();
    const feature = trackFeatureCollection.features.find(
      (f) => f.properties.track_id === trackId
    );

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: { code: "TRACK_NOT_FOUND", message: `Track ${trackId} not found` },
      });
    }

    res.json({ success: true, data: { track: feature } });
  } catch (err) {
    next(err);
  }
}


// ============================================================
// GET TRACK SCHEDULE — trains passing through a given segment
// ============================================================

async function getTrackSchedule(req, res, next) {
  try {
    const trackId = req.params.trackId.toUpperCase();
    const requestedDay = req.query.day?.toUpperCase();

    const schedules = getOrGenerateSchedulesForTrack(trackId, requestedDay);
    const corridor = getTrackCorridorInfo(trackId);

    res.json({
      trackId,
      corridor,
      requestedDay: requestedDay || "ALL",
      trainCount: schedules.length,
      schedules,
    });
  } catch (err) {
    next(err);
  }
}


// ============================================================
// GET TRACK TRAFFIC — alias for schedule (legacy compat)
// ============================================================

async function getTrackTraffic(req, res, next) {
  try {
    const trackId = req.params.trackId.toUpperCase();
    const schedules = getOrGenerateSchedulesForTrack(trackId);

    const matchedTrains = schedules.map((s) => ({
      train_no: s.trainNo,
      train_name: s.trainName,
      train_type: s.type || "EXPRESS",
      source: s.source,
      destination: s.destination,
      priority: s.type === "GOODS" ? 45 : 85,
      operatingDays: s.operatingDays,
    }));

    const matchedSegments = schedules.map((s) => ({
      train_no: s.trainNo,
      track_id: trackId,
      arrival_time: s.arrival,
      departure_time: s.departure,
    }));

    res.json({
      success: true,
      data: {
        trackId,
        scheduledTrains: matchedTrains,
        routeSegments: matchedSegments,
        goodsForecasts: [],
      },
    });
  } catch (err) {
    next(err);
  }
}


// ============================================================
// GET TRACK MAINTENANCE
// ============================================================

async function getTrackMaintenance(req, res, next) {
  try {
    const { fallbackStore } = require("../config/database");
    const trackId = req.params.trackId.toUpperCase();
    const tasks = fallbackStore.maintenance_tasks.filter((m) => m.track_id === trackId);
    const requests = fallbackStore.maintenance_requests.filter((r) => r.track_id === trackId);

    res.json({ success: true, data: { trackId, tasks, requests } });
  } catch (err) {
    next(err);
  }
}


// ============================================================
// GET ALL TRAINS
// ============================================================

async function getTrains(req, res, next) {
  try {
    res.json({ trainCount: KARNATAKA_TRAIN_POOL.length, trains: KARNATAKA_TRAIN_POOL });
  } catch (err) {
    next(err);
  }
}


// ============================================================
// GET ONE TRAIN FULL ROUTE
// ============================================================

async function getTrainRoute(req, res, next) {
  try {
    const trainNo = req.params.trainNo;
    const train = KARNATAKA_TRAIN_POOL.find((t) => t.trainNo === trainNo) ||
      explicitTrainSchedules.find((t) => t.trainNo === trainNo);

    if (!train) {
      return res.status(404).json({ message: "Train not found" });
    }

    res.json(train);
  } catch (err) {
    next(err);
  }
}


module.exports = {
  getTracks,
  getTrackById,
  getTrackSchedule,
  getTrackTraffic,
  getTrackMaintenance,
  getTrains,
  getTrainRoute,
  getOrGenerateSchedulesForTrack,
};
