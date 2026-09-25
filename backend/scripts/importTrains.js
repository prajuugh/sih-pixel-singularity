// backend/scripts/importTrains.js
const fs = require("fs");
const path = require("path");

const RAW_TRAINS_PATH = path.join(__dirname, "../data/raw/trains.json");
const NORMALIZED_TRAINS_PATH = path.join(__dirname, "../data/normalized/trains.json");

async function importTrains() {
  console.log("=== Importing Indian Railway Official Trains ===");
  if (!fs.existsSync(RAW_TRAINS_PATH)) {
    throw new Error(`Raw trains file not found at: ${RAW_TRAINS_PATH}`);
  }

  const rawData = JSON.parse(fs.readFileSync(RAW_TRAINS_PATH, "utf8"));
  const features = rawData.features || [];
  console.log(`Read ${features.length} raw train features.`);

  const trainsMap = new Map();

  for (const feature of features) {
    const props = feature.properties || {};
    const trainNo = String(props.number || "").trim();
    if (!trainNo) continue;

    const sourceCode = (props.from_station_code || "").trim().toUpperCase();
    const destCode = (props.to_station_code || "").trim().toUpperCase();

    const train = {
      train_no: trainNo,
      train_name: (props.name || `Train ${trainNo}`).trim(),
      source_station: sourceCode,
      source_station_name: (props.from_station_name || sourceCode).trim(),
      destination_station: destCode,
      destination_station_name: (props.to_station_name || destCode).trim(),
      departure_time: props.departure || null,
      arrival_time: props.arrival || null,
      duration_hours: props.duration_h || 0,
      duration_minutes: props.duration_m || 0,
      distance_km: props.distance ? Number(props.distance) : 0,
      train_type: (props.type || "EXPRESS").toUpperCase(),
      zone: (props.zone || "IR").toUpperCase(),
      return_train: props.return_train ? String(props.return_train).trim() : null,
      classes: props.classes || "",
      running_days: "DAILY",
      route_coordinates_count: feature.geometry?.coordinates?.length || 0,
      route_geometry: feature.geometry || null,
      source: "OGD_INDIA",
      source_id: trainNo,
    };

    if (!trainsMap.has(trainNo)) {
      trainsMap.set(trainNo, train);
    }
  }

  const normalizedTrains = Array.from(trainsMap.values()).sort((a, b) =>
    a.train_no.localeCompare(b.train_no)
  );

  const outDir = path.dirname(NORMALIZED_TRAINS_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Save lightweight version without full line geometry for faster API serving
  const lightweightTrains = normalizedTrains.map(({ route_geometry, ...rest }) => rest);
  fs.writeFileSync(NORMALIZED_TRAINS_PATH, JSON.stringify(lightweightTrains, null, 2), "utf8");

  // Save full geometry master separately
  const fullGeometryPath = path.join(__dirname, "../data/normalized/trains_geometry.json");
  fs.writeFileSync(fullGeometryPath, JSON.stringify(normalizedTrains, null, 2), "utf8");

  console.log(`✅ Successfully normalized ${normalizedTrains.length} trains to: ${NORMALIZED_TRAINS_PATH}`);
  return normalizedTrains;
}

if (require.main === module) {
  importTrains().catch((err) => {
    console.error("Failed to import trains:", err);
    process.exit(1);
  });
}

module.exports = { importTrains };
