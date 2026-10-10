// backend/src/routes/tracks.routes.js
const express = require("express");
const router = express.Router();
const {
  getTracks,
  getTrackById,
  getTrackSchedule,
  getTrackTrains,
  getTrackLive,
  getTrackTraffic,
  getTrackMaintenance,
} = require("../controllers/track.controller");

// Track / Section endpoints
router.get("/", getTracks);                               // GET /api/tracks
router.get("/:trackId/schedule", getTrackSchedule);       // GET /api/tracks/:id/schedule (legacy/agent)
router.get("/:trackId/trains", getTrackTrains);           // GET /api/tracks/:id/trains (scheduled trains)
router.get("/:trackId/live", getTrackLive);               // GET /api/tracks/:id/live (live trains on section)
router.get("/:trackId/traffic", getTrackTraffic);         // GET /api/tracks/:id/traffic
router.get("/:trackId/maintenance", getTrackMaintenance); // GET /api/tracks/:id/maintenance
router.get("/:trackId", getTrackById);                    // GET /api/tracks/:id

module.exports = router;
