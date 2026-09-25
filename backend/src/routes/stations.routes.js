// backend/src/routes/stations.routes.js
const express = require("express");
const router = express.Router();
const { getStations, getStationByCode } = require("../controllers/station.controller");

router.get("/", getStations);
router.get("/:code", getStationByCode);

module.exports = router;
