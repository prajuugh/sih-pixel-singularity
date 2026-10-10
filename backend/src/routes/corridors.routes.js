// backend/src/routes/corridors.routes.js
const express = require("express");
const router = express.Router();
const { getCorridors, getCorridorById } = require("../controllers/corridor.controller");

router.get("/", getCorridors);
router.get("/:corridorId", getCorridorById);

module.exports = router;
