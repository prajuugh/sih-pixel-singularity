// backend/src/routes/requests.routes.js
const express = require("express");
const router = express.Router();
const {
  getAllRequests,
  getRequestById,
  postCreateRequest,
  submitRequest,
  postReviewRequest,
  completeWorkRequest,
} = require("../controllers/request.controller");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

router.get("/", requireAuth, getAllRequests);
router.get("/:requestId", requireAuth, getRequestById);
router.post("/", requireAuth, requireRole("ADMIN", "TEAMS"), postCreateRequest);
router.post("/:requestId/submit", requireAuth, submitRequest);
router.post("/:requestId/complete", requireAuth, completeWorkRequest);
router.post("/:requestId/review", requireAuth, requireRole("OFFICER", "ADMIN"), postReviewRequest);

module.exports = router;
