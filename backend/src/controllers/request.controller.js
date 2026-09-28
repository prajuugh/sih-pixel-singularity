// backend/src/controllers/request.controller.js
const { fallbackStore } = require("../config/database");
const { createRequest, reviewRequest, enrichRequestWithAgentPlan } = require("../services/request.service");
const { persistLocalStore } = require("../services/local-store.service");
const { sendWorkRequestApprovedEmail, sendWorkRequestCompletedEmail } = require("../services/email.service");

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
    const normReqId = String(requestId || "").trim().toUpperCase();
    const request = fallbackStore.maintenance_requests.find(
      (r) => (r.request_id && r.request_id.toUpperCase() === normReqId) ||
             String(r.id).trim().toUpperCase() === normReqId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: `Maintenance request ${requestId} not found` },
      });
    }

    await enrichRequestWithAgentPlan(request);
    const reviews = fallbackStore.request_reviews.filter(
      (rv) => (rv.request_id && rv.request_id.toUpperCase() === normReqId) || String(rv.request_id) === String(requestId)
    );
    const alternatives = fallbackStore.planning_alternatives.filter(
      (a) => (a.request_id && a.request_id.toUpperCase() === normReqId) || String(a.request_id) === String(requestId)
    );

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
    const normReqId = String(requestId || "").trim().toUpperCase();
    const request = fallbackStore.maintenance_requests.find(
      (r) => (r.request_id && r.request_id.toUpperCase() === normReqId) ||
             String(r.id).trim().toUpperCase() === normReqId
    );

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
    const normReqId = String(requestId || "").trim().toUpperCase();
    const officerId = req.user ? req.user.id : 2;
    const { decision, feedback, alternative_id, prohibited_window, prohibitedStartTime, prohibitedEndTime, new_window, newWindow } = req.body;

    if (!decision || !["APPROVED", "REJECTED", "REVISION_REQUIRED", "VERIFIED", "VERIFY_COMPLETED"].includes(decision.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_DECISION", message: "Decision must be APPROVED, REJECTED, REVISION_REQUIRED, or VERIFIED" },
      });
    }

    if (decision.toUpperCase() === "VERIFIED" || decision.toUpperCase() === "VERIFY_COMPLETED") {
      const request = fallbackStore.maintenance_requests.find(
        (r) => (r.request_id && r.request_id.toUpperCase() === normReqId) ||
               String(r.id).trim().toUpperCase() === normReqId
      );
      if (!request) {
        return res.status(404).json({ success: false, error: { code: "REQUEST_NOT_FOUND", message: `Request ${requestId} not found` } });
      }
      request.status = "COMPLETED";
      if (!request.completion_proof) {
        request.completion_proof = {};
      }
      request.completion_proof.verified_by_officer = true;
      request.completion_proof.verified_at = new Date().toISOString();
      request.completion_proof.verified_by_id = officerId;
      request.officer_feedback = feedback || "Work completion verified and certified safe for normal train traffic.";
      request.updated_at = new Date().toISOString();
      persistLocalStore(fallbackStore);
      return res.json({ success: true, data: { request } });
    }

    const prohibitedWindow = prohibited_window || (prohibitedStartTime && prohibitedEndTime ? {
      startTime: prohibitedStartTime,
      endTime: prohibitedEndTime,
    } : null);

    const targetNewWindow = new_window || newWindow || null;

    const result = await reviewRequest(requestId, officerId, decision.toUpperCase(), feedback, alternative_id, prohibitedWindow, targetNewWindow);

    if (decision.toUpperCase() === "APPROVED") {
      const officer = req.user || fallbackStore.users.find((u) => u.id === officerId || u.role === "OFFICER");
      const officerEmail = officer?.email;
      const officerName = officer?.name || officer?.username || "Controlling Officer";

      const targetReq = result.request || fallbackStore.maintenance_requests.find(
        (r) => (r.request_id && r.request_id.toUpperCase() === normReqId) ||
               String(r.id).trim().toUpperCase() === normReqId
      );
      if (targetReq) {
        let engineer = fallbackStore.users.find(
          (u) =>
            (targetReq.created_by && u.id === targetReq.created_by) ||
            (targetReq.created_by_username && u.username?.toLowerCase() === targetReq.created_by_username.toLowerCase()) ||
            (targetReq.department && u.role === "ENGINEER" && u.department === targetReq.department)
        );
        if (!engineer) {
          engineer = fallbackStore.users.find((u) => u.role === "ENGINEER");
        }
        const engineerEmail = engineer?.email;

        // 1. Send confirmation to Officer
        if (officerEmail) {
          sendWorkRequestApprovedEmail({
            to: officerEmail,
            request: targetReq,
            officerName,
            feedback,
          }).catch((err) => console.warn("[Email] Officer approval email error:", err.message));
        }

        // 2. Send notification to Engineer (if different from officer)
        if (engineerEmail && engineerEmail !== officerEmail) {
          sendWorkRequestApprovedEmail({
            to: engineerEmail,
            request: targetReq,
            officerName,
            feedback,
          }).catch((err) => console.warn("[Email] Engineer approval email error:", err.message));
        }
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function completeWorkRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const normReqId = String(requestId || "").trim().toUpperCase();
    const request = fallbackStore.maintenance_requests.find(
      (r) => (r.request_id && r.request_id.toUpperCase() === normReqId) ||
             String(r.id).trim().toUpperCase() === normReqId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: `Request ${requestId} not found` },
      });
    }

    const { photo, photo_name, photoName, notes, completedBy, completed_by } = req.body;

    const completionProof = {
      photo: photo || null,
      photo_name: photo_name || photoName || "site_work_completion.jpg",
      notes: notes || "Track maintenance and inspection completed. Normal sectional speed restored.",
      completed_by: completed_by || completedBy || (req.user?.name || req.user?.username || "Field Engineering Crew"),
      completed_at: new Date().toISOString(),
      verified_by_officer: false,
    };

    request.status = "COMPLETED";
    request.completion_proof = completionProof;
    request.updated_at = new Date().toISOString();

    fallbackStore.audit_logs.push({
      id: fallbackStore.audit_logs.length + 1,
      user_id: req.user ? req.user.id : 1,
      action: "WORK_COMPLETED_SUBMITTED",
      entity_type: "MAINTENANCE_REQUEST",
      entity_id: requestId,
      new_value: {
        status: "COMPLETED",
        completion_proof: completionProof,
      },
      timestamp: new Date().toISOString(),
    });

    persistLocalStore(fallbackStore);

    // Send email to Officer(s)
    try {
      const officerReviews = fallbackStore.request_reviews.filter(
        (rv) => (rv.request_id && rv.request_id.toUpperCase() === normReqId) || String(rv.request_id) === String(requestId)
      );
      let officerEmail = null;
      if (officerReviews.length > 0) {
        const lastReview = officerReviews[officerReviews.length - 1];
        const reviewingOfficer = fallbackStore.users.find((u) => u.id === lastReview.officer_id);
        if (reviewingOfficer?.email) officerEmail = reviewingOfficer.email;
      }
      if (!officerEmail) {
        const defaultOfficer = fallbackStore.users.find((u) => u.role === "OFFICER");
        if (defaultOfficer?.email) officerEmail = defaultOfficer.email;
      }

      if (officerEmail) {
        sendWorkRequestCompletedEmail({
          to: officerEmail,
          request,
          engineerName: completionProof.completed_by,
          completionProof,
        }).catch((err) => console.warn("[Email] Work completed email error:", err.message));
      }
    } catch (e) {
      console.warn("Work completion notification dispatch error:", e.message);
    }

    res.json({
      success: true,
      data: request,
      message: "Work marked as completed and evidence submitted for officer review.",
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
  completeWorkRequest,
};
