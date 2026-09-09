// backend/src/routes/trains.routes.js
const express = require("express");
const router = express.Router();
const {
  getTrains,
  getTrainByNo,
  getTrainRoute,
} = require("../controllers/train.controller");

router.get("/", getTrains);
router.get("/:trainNo", getTrainByNo);
router.get("/:trainNo/route", getTrainRoute);

module.exports = router;
