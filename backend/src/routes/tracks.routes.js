// backend/src/routes/tracks.routes.js
const express = require("express");
const router = express.Router();
const {
  getTracks,
  getTrackById,
  getTrackSchedule,
  getTrackTraffic,
  getTrackMaintenance,
  getTrains,
  getTrainRoute,
} = require("../controllers/track.controller");

// Track endpoints
router.get("/", getTracks);                              // GET /api/tracks        → full GeoJSON FeatureCollection
router.get("/:trackId/schedule", getTrackSchedule);     // GET /api/tracks/:id/schedule
router.get("/:trackId/traffic", getTrackTraffic);       // GET /api/tracks/:id/traffic  (legacy)
router.get("/:trackId/maintenance", getTrackMaintenance);
router.get("/:trackId", getTrackById);                  // GET /api/tracks/:id    → single feature

module.exports = router;
