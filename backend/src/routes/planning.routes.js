// backend/src/routes/planning.routes.js
const express = require("express");
const router = express.Router();
const {
  postWeeklyPlan,
  postMonthlyPlan,
  getPlanById,
  getPlanBlocks,
  getPlanAlternatives,
  postAgentPlan,
  getAgentRun,
} = require("../controllers/planning.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/agent-plan", requireAuth, postAgentPlan);
router.post("/weekly", requireAuth, postWeeklyPlan);
router.post("/monthly", requireAuth, postMonthlyPlan);
router.get("/agent-runs/:runId", requireAuth, getAgentRun);
router.get("/:planId", requireAuth, getPlanById);
router.get("/:planId/blocks", requireAuth, getPlanBlocks);
router.get("/:planId/alternatives", requireAuth, getPlanAlternatives);

module.exports = router;
