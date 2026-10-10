// backend/src/routes/trains.routes.js
const express = require("express");
const router = express.Router();
const {
  getTrains,
  getLiveTrainsEndpoint,
  getUpcomingTrainsEndpoint,
  getTrainByNo,
  getTrainRoute,
  getTrainLiveEndpoint,
} = require("../controllers/train.controller");

router.get("/", getTrains);
router.get("/live", getLiveTrainsEndpoint);
router.get("/upcoming", getUpcomingTrainsEndpoint);
router.get("/:trainNo", getTrainByNo);
router.get("/:trainNo/route", getTrainRoute);
router.get("/:trainNo/live", getTrainLiveEndpoint);

module.exports = router;
