// backend/src/controllers/station.controller.js
const fs = require("fs");
const path = require("path");

const STATIONS_PATH = path.join(__dirname, "../../data/normalized/stations.json");
const STATION_INDEX_PATH = path.join(__dirname, "../../data/normalized/station_trains.json");

let stationsCache = [];
let stationTrainsCache = {};

try {
  if (fs.existsSync(STATIONS_PATH)) {
    stationsCache = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
  }
} catch (err) {
  console.warn("Could not load normalized stations:", err.message);
}

try {
  if (fs.existsSync(STATION_INDEX_PATH)) {
    stationTrainsCache = JSON.parse(fs.readFileSync(STATION_INDEX_PATH, "utf8"));
  }
} catch (err) {
  console.warn("Could not load station reverse index:", err.message);
}

// GET /api/stations
async function getStations(req, res, next) {
  try {
    const { search, zone, state, limit = 100, offset = 0 } = req.query;
    let results = stationsCache;

    if (search) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (s) =>
          s.station_code.toLowerCase().includes(q) ||
          s.station_name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
      );
    }

    if (zone) {
      results = results.filter((s) => s.zone.toUpperCase() === zone.toUpperCase());
    }

    if (state) {
      results = results.filter((s) => s.state.toLowerCase() === state.toLowerCase());
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
        stations: paginated,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stations/:code
async function getStationByCode(req, res, next) {
  try {
    const code = req.params.code.trim().toUpperCase();
    const station = stationsCache.find((s) => s.station_code === code);

    if (!station) {
      return res.status(404).json({
        success: false,
        error: { code: "STATION_NOT_FOUND", message: `Indian Railway station ${code} not found` },
      });
    }

    const passingTrains = stationTrainsCache[code] || [];

    res.json({
      success: true,
      data: {
        ...station,
        passing_train_count: passingTrains.length,
        trains: passingTrains,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStations,
  getStationByCode,
};
