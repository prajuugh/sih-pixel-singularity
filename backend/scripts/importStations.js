// backend/scripts/importStations.js
const fs = require("fs");
const path = require("path");

const RAW_STATIONS_PATH = path.join(__dirname, "../data/raw/stations.json");
const NORMALIZED_STATIONS_PATH = path.join(__dirname, "../data/normalized/stations.json");

async function importStations() {
  console.log("=== Importing Indian Railway Stations ===");
  if (!fs.existsSync(RAW_STATIONS_PATH)) {
    throw new Error(`Raw stations file not found at: ${RAW_STATIONS_PATH}`);
  }

  const rawData = JSON.parse(fs.readFileSync(RAW_STATIONS_PATH, "utf8"));
  const features = rawData.features || [];
  console.log(`Read ${features.length} raw station features.`);

  const stationsMap = new Map();

  for (const feature of features) {
    const props = feature.properties || {};
    const geom = feature.geometry || {};
    const coords = geom.coordinates || [null, null];

    const code = (props.code || "").trim().toUpperCase();
    if (!code) continue;

    const station = {
      station_code: code,
      station_name: (props.name || code).trim(),
      latitude: coords[1] !== undefined && coords[1] !== null ? Number(Number(coords[1]).toFixed(6)) : null,
      longitude: coords[0] !== undefined && coords[0] !== null ? Number(Number(coords[0]).toFixed(6)) : null,
      zone: (props.zone || "IR").trim().toUpperCase(),
      state: (props.state || "").trim(),
      address: (props.address || "").trim(),
      source: "OGD_INDIA",
      source_id: code,
    };

    if (!stationsMap.has(code) || (station.latitude && !stationsMap.get(code).latitude)) {
      stationsMap.set(code, station);
    }
  }

  const normalizedStations = Array.from(stationsMap.values()).sort((a, b) =>
    a.station_code.localeCompare(b.station_code)
  );

  const outDir = path.dirname(NORMALIZED_STATIONS_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(NORMALIZED_STATIONS_PATH, JSON.stringify(normalizedStations, null, 2), "utf8");
  console.log(`✅ Successfully normalized ${normalizedStations.length} stations to: ${NORMALIZED_STATIONS_PATH}`);

  return normalizedStations;
}

if (require.main === module) {
  importStations().catch((err) => {
    console.error("Failed to import stations:", err);
    process.exit(1);
  });
}

module.exports = { importStations };
