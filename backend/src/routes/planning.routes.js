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
} = require("../controllers/planning.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/agent-plan", postAgentPlan);
router.post("/weekly", requireAuth, postWeeklyPlan);
router.post("/monthly", requireAuth, postMonthlyPlan);
router.get("/:planId", requireAuth, getPlanById);
router.get("/:planId/blocks", requireAuth, getPlanBlocks);
router.get("/:planId/alternatives", requireAuth, getPlanAlternatives);

module.exports = router;
