// backend/src/controllers/planning.controller.js
const { fallbackStore } = require("../config/database");
const { generatePlan } = require("../services/planning.service");
const { recordAgentRun } = require("../services/agent-run.service");
const { persistLocalStore } = require("../services/local-store.service");

async function postWeeklyPlan(req, res, next) {
  try {
    const { startDate } = req.body;
    const userId = req.user ? req.user.id : 1;
    const result = await generatePlan(startDate, "WEEKLY", userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function postMonthlyPlan(req, res, next) {
  try {
    const { month } = req.body;
    const startDate = month ? `${month}-01` : null;
    const userId = req.user ? req.user.id : 1;
    const result = await generatePlan(startDate, "MONTHLY", userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getPlanById(req, res, next) {
  try {
    const { planId } = req.params;
    const plan = fallbackStore.block_plans.find((p) => p.plan_id === planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { code: "PLAN_NOT_FOUND", message: `Block plan ${planId} not found` },
      });
    }

    const blocks = fallbackStore.blocks.filter((b) => b.block_plan_id === plan.id);

    res.json({
      success: true,
      data: {
        plan,
        blocks,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPlanBlocks(req, res, next) {
  try {
    const { planId } = req.params;
    const plan = fallbackStore.block_plans.find((p) => p.plan_id === planId);
    const blocks = plan ? fallbackStore.blocks.filter((b) => b.block_plan_id === plan.id) : fallbackStore.blocks;

    res.json({
      success: true,
      data: {
        total: blocks.length,
        blocks,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPlanAlternatives(req, res, next) {
  try {
    const { planId } = req.params;
    const alternatives = fallbackStore.planning_alternatives;

    res.json({
      success: true,
      data: {
        total: alternatives.length,
        alternatives,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function postAgentPlan(req, res, next) {
  try {
    const { callPythonAgentService } = require("../services/agent.service");
    const plan = await callPythonAgentService("/agent/plan", req.body);
    recordAgentRun(plan, req.body.requestId || req.body.taskId);
    persistLocalStore(fallbackStore);
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

async function getAgentRun(req, res, next) {
  try {
    const run = fallbackStore.agent_runs.find((item) => item.run_id === req.params.runId);
    if (!run) {
      return res.status(404).json({
        success: false,
        error: { code: "AGENT_RUN_NOT_FOUND", message: `Agent run ${req.params.runId} not found` },
      });
    }

    const steps = fallbackStore.agent_steps.filter((step) => step.run_id === run.run_id);
    const constraints = fallbackStore.constraint_results.filter((result) => result.run_id === run.run_id);
    return res.json({ success: true, data: { run, steps, constraints } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  postWeeklyPlan,
  postMonthlyPlan,
  getPlanById,
  getPlanBlocks,
  getPlanAlternatives,
  postAgentPlan,
  getAgentRun,
};
