// backend/src/services/section-matching.service.js
const fs = require("fs");
const path = require("path");

const TRACKS_PATH = path.join(__dirname, "../../data/karnataka_tracks.geojson");

let cachedSections = null;

function loadSections() {
  if (!cachedSections) {
    try {
      const geo = JSON.parse(fs.readFileSync(TRACKS_PATH, "utf8"));
      cachedSections = geo.features || [];
    } catch (err) {
      console.warn("Could not load track sections for spatial matching:", err.message);
      cachedSections = [];
    }
  }
  return cachedSections;
}

// Haversine distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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

// Distance from point to line segment in meters
function pointToSegmentDistanceMeters(pLat, pLon, s1Lat, s1Lon, s2Lat, s2Lon) {
  const l2 = (s2Lat - s1Lat) ** 2 + (s2Lon - s1Lon) ** 2;
  if (l2 === 0) return haversineMeters(pLat, pLon, s1Lat, s1Lon);

  let t = ((pLat - s1Lat) * (s2Lat - s1Lat) + (pLon - s1Lon) * (s2Lon - s1Lon)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = s1Lat + t * (s2Lat - s1Lat);
  const projLon = s1Lon + t * (s2Lon - s1Lon);

  return haversineMeters(pLat, pLon, projLat, projLon);
}

/**
 * Matches a GPS coordinate to the nearest track section.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {number} maxToleranceMeters Max search radius in meters (default 2000m)
 * @returns {object|null} Match result with sectionId, distanceMeters, and confidence (0-100%)
 */
function matchPointToSection(lat, lon, maxToleranceMeters = 2000) {
  const features = loadSections();
  let bestSection = null;
  let minDistanceM = Infinity;

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    // Quick bounding box check (~0.05 deg is ~5km)
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const c of coords) {
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
      if (c[0] < minLon) minLon = c[0];
      if (c[0] > maxLon) maxLon = c[0];
    }
    if (
      lat < minLat - 0.05 ||
      lat > maxLat + 0.05 ||
      lon < minLon - 0.05 ||
      lon > maxLon + 0.05
    ) {
      continue;
    }

    // Check distance to all segments of this LineString
    for (let i = 0; i < coords.length - 1; i++) {
      const d = pointToSegmentDistanceMeters(
        lat,
        lon,
        coords[i][1],
        coords[i][0],
        coords[i + 1][1],
        coords[i + 1][0]
      );
      if (d < minDistanceM) {
        minDistanceM = d;
        bestSection = feature;
      }
    }
  }

  if (!bestSection || minDistanceM > maxToleranceMeters) {
    return null;
  }

  // Calculate confidence score: 100% at 0m, 50% at 500m, 10% at 2000m
  const confidence = Math.max(10, Math.min(100, Math.round(100 - (minDistanceM / maxToleranceMeters) * 90)));

  return {
    sectionId: bestSection.properties.section_id,
    trackId: bestSection.properties.track_id,
    legacyTrackId: bestSection.properties.legacy_track_id,
    fromStation: bestSection.properties.from_station,
    toStation: bestSection.properties.to_station,
    distanceMeters: Number(minDistanceM.toFixed(1)),
    confidence,
  };
}

module.exports = { matchPointToSection, haversineMeters };
