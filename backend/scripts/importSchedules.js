// backend/scripts/importSchedules.js
const fs = require("fs");
const path = require("path");

const RAW_SCHEDULES_PATH = path.join(__dirname, "../data/raw/schedules.json");
const TRAIN_STOPS_PATH = path.join(__dirname, "../data/normalized/train_stops.json");
const STATION_INDEX_PATH = path.join(__dirname, "../data/normalized/station_trains.json");

function cleanTime(t) {
  if (!t || t === "None" || t === "null") return null;
  const parts = t.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return t;
}

async function importSchedules() {
  console.log("=== Importing Indian Railway Timetable Schedules ===");
  if (!fs.existsSync(RAW_SCHEDULES_PATH)) {
    throw new Error(`Raw schedules file not found at: ${RAW_SCHEDULES_PATH}`);
  }

  const rawSchedules = JSON.parse(fs.readFileSync(RAW_SCHEDULES_PATH, "utf8"));
  console.log(`Read ${rawSchedules.length} raw schedule records.`);

  // Group by train_number
  const trainMap = new Map();
  const stationIndex = {};

  for (const stop of rawSchedules) {
    const trainNo = String(stop.train_number || "").trim();
    if (!trainNo) continue;

    if (!trainMap.has(trainNo)) {
      trainMap.set(trainNo, []);
    }
    trainMap.get(trainNo).push(stop);
  }

  console.log(`Grouped into ${trainMap.size} distinct trains.`);

  const normalizedTrainStops = {};
  let totalStopsCount = 0;

  for (const [trainNo, stops] of trainMap.entries()) {
    // Sort by stop id which preserves route sequence
    stops.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    const sequenceStops = stops.map((s, idx) => {
      let arr = cleanTime(s.arrival);
      let dep = cleanTime(s.departure);
      if (!arr && dep) arr = dep;
      if (!dep && arr) dep = arr;

      const stationCode = (s.station_code || "").trim().toUpperCase();
      const stationName = (s.station_name || stationCode).trim();
      const trainName = (s.train_name || "").trim();

      // Build station reverse index
      if (stationCode) {
        if (!stationIndex[stationCode]) stationIndex[stationCode] = [];
        stationIndex[stationCode].push({
          train_no: trainNo,
          train_name: trainName,
          sequence: idx + 1,
          arrival_time: arr,
          departure_time: dep,
          day: Number(s.day) || 1,
        });
      }

      return {
        sequence: idx + 1,
        station_code: stationCode,
        station_name: stationName,
        arrival_time: arr,
        departure_time: dep,
        day: Number(s.day) || 1,
        stop_id: s.id,
      };
    });

    normalizedTrainStops[trainNo] = sequenceStops;
    totalStopsCount += sequenceStops.length;
  }

  const outDir = path.dirname(TRAIN_STOPS_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(TRAIN_STOPS_PATH, JSON.stringify(normalizedTrainStops, null, 2), "utf8");
  fs.writeFileSync(STATION_INDEX_PATH, JSON.stringify(stationIndex, null, 2), "utf8");

  console.log(`✅ Successfully normalized ${totalStopsCount} stops across ${Object.keys(normalizedTrainStops).length} trains to: ${TRAIN_STOPS_PATH}`);
  console.log(`✅ Station reverse index created for ${Object.keys(stationIndex).length} stations to: ${STATION_INDEX_PATH}`);

  return normalizedTrainStops;
}

if (require.main === module) {
  importSchedules().catch((err) => {
    console.error("Failed to import schedules:", err);
    process.exit(1);
  });
}

module.exports = { importSchedules };
