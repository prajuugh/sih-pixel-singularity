// backend/scripts/generateIndiaRailwayNetwork.js
const fs = require("fs");
const path = require("path");

const TRAIN_STOPS_PATH = path.join(__dirname, "../data/normalized/train_stops.json");
const STATIONS_PATH = path.join(__dirname, "../data/normalized/stations.json");
const OUTPUT_GEOJSON_PATH = path.join(__dirname, "../data/india_railways_network.geojson");
const FRONTEND_PUBLIC_PATH = path.join(__dirname, "../../frontend/public/india_railways_network.geojson");

function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function generateIndiaRailwayNetwork() {
  console.log("=== Generating Full India Railway Network GeoJSON ===");
  const trainStops = JSON.parse(fs.readFileSync(TRAIN_STOPS_PATH, "utf8"));
  const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));

  const stationMap = new Map();
  stations.forEach((s) => stationMap.set(s.station_code, s));

  const edgeMap = new Map();

  for (const [trainNo, stops] of Object.entries(trainStops)) {
    for (let i = 0; i < stops.length - 1; i++) {
      const c1 = stops[i].station_code;
      const c2 = stops[i + 1].station_code;
      if (!c1 || !c2 || c1 === c2) continue;

      const edgeKey = c1 < c2 ? `${c1}_${c2}` : `${c2}_${c1}`;
      if (!edgeMap.has(edgeKey)) {
        const s1 = stationMap.get(c1);
        const s2 = stationMap.get(c2);
        if (s1 && s2 && s1.latitude && s1.longitude && s2.latitude && s2.longitude) {
          // Bounding box filter for India geographic territory
          if (
            s1.latitude >= 6.0 && s1.latitude <= 38.0 && s1.longitude >= 68.0 && s1.longitude <= 98.0 &&
            s2.latitude >= 6.0 && s2.latitude <= 38.0 && s2.longitude >= 68.0 && s2.longitude <= 98.0
          ) {
            const distance = Number(distKm(s1.latitude, s1.longitude, s2.latitude, s2.longitude).toFixed(2));
            edgeMap.set(edgeKey, {
              from: c1,
              to: c2,
              fromName: s1.station_name,
              toName: s2.station_name,
              distanceKm: distance,
              coords: [
                [s1.longitude, s1.latitude],
                [s2.longitude, s2.latitude],
              ],
              trainCount: 1,
              trains: [trainNo],
            });
          }
        }
      } else {
        const existing = edgeMap.get(edgeKey);
        existing.trainCount++;
        if (existing.trains.length < 5 && !existing.trains.includes(trainNo)) {
          existing.trains.push(trainNo);
        }
      }
    }
  }

  console.log(`Generated ${edgeMap.size} unique Pan-India railway track segments.`);

  const features = [];
  for (const [key, edge] of edgeMap.entries()) {
    const sectionId = `SEC-${edge.from}-${edge.to}`;
    features.push({
      type: "Feature",
      properties: {
        track_id: sectionId,
        section_id: sectionId,
        from_station: edge.from,
        from_station_name: edge.fromName,
        to_station: edge.to,
        to_station_name: edge.toName,
        distance_km: edge.distanceKm,
        train_count: edge.trainCount,
        sample_trains: edge.trains,
        source: "official_ir_network",
        source_id: key,
        is_official_ir_track_id: false,
        official_ir_identifier: null,
      },
      geometry: {
        type: "LineString",
        coordinates: edge.coords,
      },
    });
  }

  const geojson = {
    type: "FeatureCollection",
    properties: {
      title: "Pan-India Complete Railway Network",
      total_sections: features.length,
      coverage: "All India Railway Zones (Northern, Western, Central, Eastern, Southern, etc.)",
      disclaimer: "Section IDs (SEC-...) are application routing identifiers derived from official station coordinates.",
      generated_at: new Date().toISOString(),
    },
    features,
  };

  fs.writeFileSync(OUTPUT_GEOJSON_PATH, JSON.stringify(geojson), "utf8");
  console.log(`✅ Saved ${features.length} India railway track features to: ${OUTPUT_GEOJSON_PATH}`);

  const frontendDir = path.dirname(FRONTEND_PUBLIC_PATH);
  if (fs.existsSync(frontendDir)) {
    fs.writeFileSync(FRONTEND_PUBLIC_PATH, JSON.stringify(geojson), "utf8");
    console.log(`✅ Synced to frontend public at: ${FRONTEND_PUBLIC_PATH}`);
  }

  return geojson;
}

if (require.main === module) {
  generateIndiaRailwayNetwork().catch((err) => {
    console.error("Failed to generate India railway network:", err);
    process.exit(1);
  });
}

module.exports = { generateIndiaRailwayNetwork };
