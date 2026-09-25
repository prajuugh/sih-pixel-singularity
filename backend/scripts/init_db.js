const fs = require("fs");
const path = require("path");
const { generateSeedData } = require("./seed_data");
const { query, fallbackStore } = require("../src/config/database");
const { hydrateLocalStore } = require("../src/services/local-store.service");

async function initializeDatabase() {
  console.log("=== Automatic Block Planning System — Database Initialization ===");

  // 1. Load Authentic Karnataka Track Sections
  const tracksGeojsonPath = path.join(__dirname, "../data/karnataka_tracks.geojson");
  let tracks = [];
  try {
    if (fs.existsSync(tracksGeojsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(tracksGeojsonPath, "utf8"));
      tracks = (parsed.features || []).map((f) => ({
        track_id: f.properties.section_id || f.properties.track_id,
        section_id: f.properties.section_id,
        legacy_track_id: f.properties.legacy_track_id,
        osm_id: f.properties.source_id,
        geometry: f.geometry,
        geojson: f,
        ...f.properties,
      }));
      console.log(`✅ Loaded ${tracks.length} authentic OSM railway track sections (e.g. ${tracks[0]?.track_id})`);
    }
  } catch (e) {
    console.warn("Could not load karnataka_tracks.geojson:", e.message);
  }

  // 2. Load Official Stations
  const stationsPath = path.join(__dirname, "../data/normalized/stations.json");
  if (fs.existsSync(stationsPath)) {
    fallbackStore.stations = JSON.parse(fs.readFileSync(stationsPath, "utf8"));
    console.log(`✅ Loaded ${fallbackStore.stations.length} official Indian Railway stations.`);
  }

  // 3. Load Official Trains
  const trainsPath = path.join(__dirname, "../data/normalized/trains.json");
  if (fs.existsSync(trainsPath)) {
    fallbackStore.official_trains = JSON.parse(fs.readFileSync(trainsPath, "utf8"));
    console.log(`✅ Loaded ${fallbackStore.official_trains.length} official Indian Railway trains.`);
  }

  // 4. Generate Domain Seed Data
  console.log("Generating domain seed data (Users, Corridors, Assets, Tasks, Requests)...");
  const seedData = await generateSeedData(tracks.length);

  // Populate fallbackStore
  fallbackStore.tracks = tracks;
  fallbackStore.users = seedData.users;
  fallbackStore.corridors = seedData.corridors;
  fallbackStore.assets = seedData.assets;
  fallbackStore.maintenance_tasks = seedData.maintenanceTasks;
  fallbackStore.maintenance_requests = seedData.maintenanceRequests;
  fallbackStore.trains = seedData.trains;
  fallbackStore.train_route_segments = seedData.trainRouteSegments;
  fallbackStore.goods_forecasts = seedData.goodsForecasts;
  fallbackStore.corridor_availability = seedData.corridorAvailability;

  const localState = hydrateLocalStore(fallbackStore);
  console.log(
    localState.restored
      ? `Restored ${localState.requestCount} requests from the local JSON store.`
      : `Created local JSON store with ${localState.requestCount} seed requests.`
  );

  // Try DB queries to seed PostgreSQL if online
  try {
    for (const u of seedData.users) {
      await query(
        `INSERT INTO users (name, email, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING;`,
        [u.name, u.email, u.password_hash, u.role, u.department]
      );
    }
  } catch (err) {
    // Handled by database fallback
  }

  console.log("=== Seed Statistics ===");
  console.log(`Tracks: ${fallbackStore.tracks.length}`);
  console.log(`Users: ${fallbackStore.users.length}`);
  console.log(`Assets: ${fallbackStore.assets.length}`);
  console.log(`Maintenance Tasks: ${fallbackStore.maintenance_tasks.length}`);
  console.log(`Maintenance Requests: ${fallbackStore.maintenance_requests.length}`);
  console.log(`Trains: ${fallbackStore.trains.length}`);
  console.log(`Train Route Segments: ${fallbackStore.train_route_segments.length}`);
  console.log(`Goods Forecasts: ${fallbackStore.goods_forecasts.length}`);
  console.log(`Corridors: ${fallbackStore.corridors.length}`);
  console.log(`Corridor Availability Slots: ${fallbackStore.corridor_availability.length}`);

  console.log("Database initialized successfully!");
}

if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };
