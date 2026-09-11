// backend/src/controllers/train.controller.js
const { fallbackStore } = require("../config/database");
const { REAL_WORLD_TRAIN_FLEET, formatMinutesToHHMM } = require("../services/schedule.service");

function getAllCombinedTrains() {
  const trainMap = new Map();
  for (const t of REAL_WORLD_TRAIN_FLEET) {
    trainMap.set(t.trainNo, {
      id: trainMap.size + 1,
      train_no: t.trainNo,
      train_name: t.trainName,
      train_type: t.type,
      source: t.source,
      destination: t.destination,
      operating_days: t.operatingDays.join(", "),
      priority: t.priority,
    });
  }
  for (const t of fallbackStore.trains) {
    if (!trainMap.has(t.train_no)) {
      trainMap.set(t.train_no, t);
    }
  }
  return Array.from(trainMap.values());
}

async function getTrains(req, res, next) {
  try {
    const { type } = req.query;
    let trains = getAllCombinedTrains();

    if (type) {
      trains = trains.filter((t) => (t.train_type || "").toUpperCase() === type.toUpperCase());
    }

    res.json({
      success: true,
      data: {
        total: trains.length,
        trains,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getTrainByNo(req, res, next) {
  try {
    const { trainNo } = req.params;
    const all = getAllCombinedTrains();
    const train = all.find((t) => t.train_no === trainNo);

    if (!train) {
      return res.status(404).json({
        success: false,
        error: { code: "TRAIN_NOT_FOUND", message: `Train ${trainNo} not found` },
      });
    }

    res.json({
      success: true,
      data: train,
    });
  } catch (err) {
    next(err);
  }
}

async function getTrainRoute(req, res, next) {
  try {
    const { trainNo } = req.params;
    let segments = fallbackStore.train_route_segments
      .filter((s) => s.train_no === trainNo)
      .sort((a, b) => a.sequence - b.sequence);

    // If not in fallbackStore, dynamically generate route across Karnataka tracks
    if (segments.length === 0) {
      const fleetItem = REAL_WORLD_TRAIN_FLEET.find((t) => t.trainNo === trainNo);
      const baseMin = fleetItem?.baseMinutes || 480;
      const numMatch = trainNo.match(/\d+/);
      const seedNum = numMatch ? parseInt(numMatch[0], 10) : 100;
      const startTrack = (seedNum * 13) % 4500 + 1;

      segments = [];
      for (let seq = 1; seq <= 25; seq++) {
        const trkId = `KA-T-${String(startTrack + seq).padStart(6, "0")}`;
        const arr = (baseMin + seq * 6) % 1440;
        const dep = (arr + 5) % 1440;
        segments.push({
          id: seq,
          train_no: trainNo,
          track_id: trkId,
          sequence: seq,
          arrival_time: formatMinutesToHHMM(arr),
          departure_time: formatMinutesToHHMM(dep),
        });
      }
    }

    res.json({
      success: true,
      data: {
        trainNo,
        totalSegments: segments.length,
        routeSegments: segments,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrains,
  getTrainByNo,
  getTrainRoute,
};
