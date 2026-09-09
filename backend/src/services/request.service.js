// backend/src/services/request.service.js
const { fallbackStore } = require("../config/database");

async function createRequest(userId, payload) {
  const reqCount = fallbackStore.maintenance_requests.length + 1;
  const deptCode = payload.department ? payload.department.substring(0, 3).toUpperCase() : "REQ";
  const requestId = `${deptCode}-2026-${String(reqCount).padStart(5, "0")}`;

  const newRequest = {
    id: reqCount,
    request_id: requestId,
    created_by: userId,
    department: payload.department || "Engineering",
    asset_type: payload.asset_type || "TRACK",
    track_id: payload.track_id || "KA-T-000342",
    task_type: payload.task_type || "Routine Maintenance",
    description: payload.description || "",
    requested_date: payload.requested_date || new Date().toISOString().split("T")[0],
    preferred_start_time: payload.preferred_start_time || "09:00",
    preferred_end_time: payload.preferred_end_time || "11:00",
    estimated_duration_minutes: payload.estimated_duration_minutes || 120,
    required_block: payload.required_block !== undefined ? payload.required_block : true,
    status: payload.status || "SUBMITTED",
    officer_feedback: null,
    officer_id: null,
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  fallbackStore.maintenance_requests.push(newRequest);
  return newRequest;
}

async function reviewRequest(requestId, officerId, decision, feedback, alternativeId = null) {
  const req = fallbackStore.maintenance_requests.find((r) => r.request_id === requestId);
  if (!req) {
    throw { statusCode: 404, code: "REQUEST_NOT_FOUND", message: `Request ${requestId} not found` };
  }

  // Update request status based on officer decision
  if (decision === "APPROVED") {
    req.status = "APPROVED";
  } else if (decision === "REJECTED") {
    req.status = "REJECTED";
  } else if (decision === "REVISION_REQUIRED") {
    req.status = "REVISION_REQUIRED";
  }

  req.officer_feedback = feedback;
  req.officer_id = officerId;
  req.reviewed_at = new Date().toISOString();
  req.updated_at = new Date().toISOString();

  // Record officer review in request_reviews
  const review = {
    id: fallbackStore.request_reviews.length + 1,
    request_id: requestId,
    officer_id: officerId,
    decision,
    feedback,
    alternative_id: alternativeId,
    created_at: new Date().toISOString(),
  };
  fallbackStore.request_reviews.push(review);

  // Add to audit log
  fallbackStore.audit_logs.push({
    id: fallbackStore.audit_logs.length + 1,
    user_id: officerId,
    action: `OFFICER_${decision}_REQUEST`,
    entity_type: "MAINTENANCE_REQUEST",
    entity_id: requestId,
    new_value: { status: req.status, feedback, decision },
    timestamp: new Date().toISOString(),
  });

  return { request: req, review };
}

module.exports = {
  createRequest,
  reviewRequest,
};
