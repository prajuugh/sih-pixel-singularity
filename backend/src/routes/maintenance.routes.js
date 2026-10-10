// backend/src/routes/maintenance.routes.js
const express = require("express");
const router = express.Router();
const {
  getMaintenanceTasks,
  getMaintenanceTaskById,
  postCheckConflict,
} = require("../controllers/maintenance.controller");

router.get("/", getMaintenanceTasks);
router.get("/:taskId", getMaintenanceTaskById);
router.post("/check", postCheckConflict);

module.exports = router;
