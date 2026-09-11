// backend/scripts/init_db.js
const { generateKarnatakaTracks } = require("./import_tracks");
const { generateSeedData } = require("./seed_data");
const { query, fallbackStore } = require("../src/config/database");
const { hydrateLocalStore } = require("../src/services/local-store.service");

async function initializeDatabase() {
  console.log("=== Automatic Block Planning System — Database Initialization ===");

  // 1. Generate Karnataka Tracks
  console.log("Generating 5,461 Karnataka GeoJSON railway track segments...");
  const tracks = generateKarnatakaTracks(5461);
  console.log(`Generated ${tracks.length} track segments. (e.g. ${tracks[0].track_id} to ${tracks[tracks.length - 1].track_id})`);

  // 2. Generate Seed Data
  console.log("Generating domain seed data (Users, Corridors, Assets, Tasks, Requests, Trains, Route Segments)...");
  const seedData = await generateSeedData(tracks.length);

  // Populate fallbackStore (and PostgreSQL if active)
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
