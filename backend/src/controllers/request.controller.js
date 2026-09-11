// backend/src/controllers/request.controller.js
const { fallbackStore } = require("../config/database");
const { createRequest, reviewRequest, enrichRequestWithAgentPlan } = require("../services/request.service");
const { persistLocalStore } = require("../services/local-store.service");

async function getAllRequests(req, res, next) {
  try {
    const { status, department } = req.query;
    let requests = [...fallbackStore.maintenance_requests];

    if (status) {
      requests = requests.filter((r) => r.status.toUpperCase() === status.toUpperCase());
    }
    if (department) {
      requests = requests.filter((r) => r.department.toLowerCase() === department.toLowerCase());
    }

    // Ensure all requests are enriched with agent plan data
    for (const r of requests) {
      await enrichRequestWithAgentPlan(r);
    }

    res.json({
      success: true,
      data: {
        total: requests.length,
        requests,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getRequestById(req, res, next) {
  try {
    const { requestId } = req.params;
    const request = fallbackStore.maintenance_requests.find((r) => r.request_id === requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: `Maintenance request ${requestId} not found` },
      });
    }

    await enrichRequestWithAgentPlan(request);
    const reviews = fallbackStore.request_reviews.filter((rv) => rv.request_id === requestId);
    const alternatives = fallbackStore.planning_alternatives.filter((a) => a.request_id === requestId);

    res.json({
      success: true,
      data: {
        request,
        reviews,
        alternatives: alternatives.length > 0 ? alternatives : (request.alternatives || []),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function postCreateRequest(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const newRequest = await createRequest(userId, req.body);

    res.status(201).json({
      success: true,
      data: newRequest,
    });
  } catch (err) {
    next(err);
  }
}

async function submitRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const request = fallbackStore.maintenance_requests.find((r) => r.request_id === requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: `Request ${requestId} not found` },
      });
    }

    request.status = "SUBMITTED";
    request.submitted_at = new Date().toISOString();
    request.updated_at = new Date().toISOString();
    persistLocalStore(fallbackStore);

    res.json({
      success: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

async function postReviewRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const officerId = req.user ? req.user.id : 2;
    const { decision, feedback, alternative_id, prohibited_window, prohibitedStartTime, prohibitedEndTime } = req.body;

    if (!decision || !["APPROVED", "REJECTED", "REVISION_REQUIRED"].includes(decision.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_DECISION", message: "Decision must be APPROVED, REJECTED, or REVISION_REQUIRED" },
      });
    }

    const prohibitedWindow = prohibited_window || (prohibitedStartTime && prohibitedEndTime ? {
      startTime: prohibitedStartTime,
      endTime: prohibitedEndTime,
    } : null);

    const result = await reviewRequest(requestId, officerId, decision.toUpperCase(), feedback, alternative_id, prohibitedWindow);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRequests,
  getRequestById,
  postCreateRequest,
  submitRequest,
  postReviewRequest,
};
