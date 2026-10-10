// backend/scripts/generateSections.js
const fs = require("fs");
const path = require("path");

const TRACKS_PATH = path.join(__dirname, "../data/karnataka_tracks.geojson");
const STATIONS_PATH = path.join(__dirname, "../data/normalized/stations.json");
const OUTPUT_SECTIONS_PATH = path.join(__dirname, "../data/normalized/track_sections.json");

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

function calculatePathDistance(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distKm(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return Number(total.toFixed(2));
}

function findNearestStation(lat, lon, stations, maxKm = 15) {
  let best = null;
  let minDist = maxKm;
  for (const s of stations) {
    if (!s.latitude || !s.longitude) continue;
    // Quick bounding box check before sqrt
    if (Math.abs(s.latitude - lat) > 0.2 || Math.abs(s.longitude - lon) > 0.2) continue;
    const d = distKm(lat, lon, s.latitude, s.longitude);
    if (d < minDist) {
      minDist = d;
      best = s;
    }
  }
  return best ? { station: best, distanceKm: Number(minDist.toFixed(2)) } : null;
}

async function generateSections() {
  console.log("=== Generating Application Track Sections from Real OSM Geometry ===");
  const geojson = JSON.parse(fs.readFileSync(TRACKS_PATH, "utf8"));
  const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
  console.log(`Processing ${geojson.features.length} OSM railway tracks with ${stations.length} stations.`);

  const idCounts = new Map();
  const normalizedSections = [];
  const updatedFeatures = [];

  for (let i = 0; i < geojson.features.length; i++) {
    const f = geojson.features[i];
    const coords = f.geometry?.coordinates || [];
    if (coords.length < 2) continue;

    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    const startMatch = findNearestStation(startCoord[1], startCoord[0], stations);
    const endMatch = findNearestStation(endCoord[1], endCoord[0], stations);

    const fromCode = startMatch ? startMatch.station.station_code : null;
    const toCode = endMatch ? endMatch.station.station_code : null;

    const osmIdRaw = f.properties["@id"] || f.properties.osm_id || `way/${i + 1}`;
    const osmNum = osmIdRaw.replace(/[^0-9]/g, "") || String(i + 1);

    let baseSectionId = "";
    if (fromCode && toCode && fromCode !== toCode) {
      baseSectionId = `SEC-${fromCode}-${toCode}`;
    } else if (fromCode) {
      baseSectionId = `SEC-${fromCode}-${osmNum}`;
    } else {
      baseSectionId = `SEC-OSM-${osmNum}`;
    }

    const currentCount = (idCounts.get(baseSectionId) || 0) + 1;
    idCounts.set(baseSectionId, currentCount);

    const sectionId = currentCount === 1 ? baseSectionId : `${baseSectionId}-${String(currentCount).padStart(2, "0")}`;
    const distanceKm = calculatePathDistance(coords);

    const legacyId = f.properties.track_id || `KA-T-${String(i + 1).padStart(6, "0")}`;

    const props = {
      section_id: sectionId,
      track_id: sectionId, // Alias for seamless UI / client backwards compatibility
      legacy_track_id: legacyId,
      from_station: fromCode || "UNKNOWN",
      from_station_name: startMatch ? startMatch.station.station_name : null,
      to_station: toCode || "UNKNOWN",
      to_station_name: endMatch ? endMatch.station.station_name : null,
      distance_km: distanceKm,
      source: "osm",
      source_id: osmIdRaw,
      osm_id: osmIdRaw,
      is_official_ir_track_id: false,
      official_ir_identifier: null,
      dataset_provenance: `OSM Railway Track Geometry (${osmIdRaw}) / IR Timetable Corridor`,
      electrified: f.properties.electrified || "contact_line",
      maxspeed: f.properties.maxspeed ? Number(f.properties.maxspeed) : 110,
      usage: f.properties.usage || "main",
      gauge: f.properties.gauge || "1676",
      passenger_lines: f.properties.passenger_lines ? Number(f.properties.passenger_lines) : 2,
    };

    const updatedFeature = {
      type: "Feature",
      properties: props,
      geometry: f.geometry,
    };

    updatedFeatures.push(updatedFeature);
    normalizedSections.push({
      ...props,
      coordinates_count: coords.length,
      start_coord: startCoord,
      end_coord: endCoord,
    });
  }

  // Write updated GeoJSON back to karnataka_tracks.geojson
  const updatedGeoJSON = {
    type: "FeatureCollection",
    properties: {
      description: "Authentic Karnataka Railway Network derived from OpenStreetMap geometry and Official Indian Railways Station Network",
      generated_at: new Date().toISOString(),
      disclaimer: "Section IDs (SEC-...) are application-level routing identifiers. Indian Railways does not publish public digital track segment IDs.",
    },
    features: updatedFeatures,
  };

  fs.writeFileSync(TRACKS_PATH, JSON.stringify(updatedGeoJSON, null, 2), "utf8");
  fs.writeFileSync(OUTPUT_SECTIONS_PATH, JSON.stringify(normalizedSections, null, 2), "utf8");

  console.log(`✅ Successfully generated ${updatedFeatures.length} real application sections.`);
  console.log(`✅ Saved GeoJSON to: ${TRACKS_PATH}`);
  console.log(`✅ Saved normalized sections to: ${OUTPUT_SECTIONS_PATH}`);

  return normalizedSections;
}

if (require.main === module) {
  generateSections().catch((err) => {
    console.error("Failed to generate sections:", err);
    process.exit(1);
  });
}

module.exports = { generateSections };
