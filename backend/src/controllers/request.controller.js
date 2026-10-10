// backend/src/controllers/request.controller.js
const { query, fallbackStore } = require("../config/database");
const { createRequest, reviewRequest, enrichRequestWithAgentPlan } = require("../services/request.service");
const { persistLocalStore } = require("../services/local-store.service");
const {
  sendNewRequestSubmittedEmail,
  sendWorkRequestApprovedEmail,
  sendWorkRequestCompletedEmail,
  sendWorkVerifiedEmail,
} = require("../services/email.service");

async function getOfficerEmails() {
  const emailSet = new Set();

  // 1. Check database if PostgreSQL query is functional
  try {
    const dbRes = await query("SELECT email, role FROM users WHERE email IS NOT NULL");
    if (dbRes && Array.isArray(dbRes.rows)) {
      for (const u of dbRes.rows) {
        const r = String(u.role || "").toUpperCase().trim();
        if (r.includes("OFFICER") || r.includes("CONTROLLER") || r === "ADMIN") {
          const email = String(u.email || "").trim().toLowerCase();
          if (email && email.includes("@")) {
            emailSet.add(email);
          }
        }
      }
    }
  } catch (err) {
    // DB query error or offline fallback
  }

  // 2. Check fallbackStore.users in memory
  if (Array.isArray(fallbackStore.users)) {
    for (const u of fallbackStore.users) {
      const r = String(u.role || "").toUpperCase().trim();
      if (r.includes("OFFICER") || r.includes("CONTROLLER") || r === "ADMIN") {
        const email = String(u.email || "").trim().toLowerCase();
        if (email && email.includes("@")) {
          emailSet.add(email);
        }
      }
    }
  }

  // 3. Check environment configuration overrides if set
  if (process.env.OFFICER_EMAILS) {
    process.env.OFFICER_EMAILS.split(",").forEach((e) => {
      const clean = e.trim().toLowerCase();
      if (clean && clean.includes("@")) emailSet.add(clean);
    });
  }
  if (process.env.OFFICER_EMAIL) {
    const clean = process.env.OFFICER_EMAIL.trim().toLowerCase();
    if (clean && clean.includes("@")) emailSet.add(clean);
  }

  const list = Array.from(emailSet);
  if (list.length > 0) return list;
  return ["officer@rbps.com"];
}

async function getEngineerEmail(request) {
  let engineer = null;
  if (Array.isArray(fallbackStore.users)) {
    engineer = fallbackStore.users.find(
      (u) =>
        (request.created_by && u.id === request.created_by) ||
        (request.created_by_username && u.username?.toLowerCase() === request.created_by_username.toLowerCase()) ||
        (request.created_by_name && (u.name?.toLowerCase() === request.created_by_name.toLowerCase() || u.username?.toLowerCase() === request.created_by_name.toLowerCase())) ||
        (request.department && (u.role || "").toUpperCase().includes("ENG") && u.department === request.department)
    );
  }

  if (!engineer?.email) {
    try {
      const dbRes = await query("SELECT id, name, username, email, role, department FROM users WHERE email IS NOT NULL");
      if (dbRes && Array.isArray(dbRes.rows)) {
        engineer = dbRes.rows.find(
          (u) =>
            (request.created_by && u.id === request.created_by) ||
            (request.created_by_username && u.username?.toLowerCase() === request.created_by_username.toLowerCase()) ||
            (request.created_by_name && (u.name?.toLowerCase() === request.created_by_name.toLowerCase() || u.username?.toLowerCase() === request.created_by_name.toLowerCase())) ||
            (request.department && (u.role || "").toUpperCase().includes("ENG") && u.department === request.department)
        );
      }
    } catch (e) {}
  }

  if (!engineer?.email) {
    const defaultEng = fallbackStore.users.find(
      (u) => (u.role || "").toUpperCase() === "ENGINEER" || (u.role || "").toUpperCase() === "TEAMS"
    );
    if (defaultEng?.email) return defaultEng.email;
  }
  return engineer?.email || "engineer@rbps.com";
}

function getRequestTimestamp(r) {
  if (!r) return 0;
  const timeStr =
    r.submitted_at ||
    r.created_at ||
    r.raw?.submitted_at ||
    r.raw?.created_at ||
    r.submittedAt ||
    r.createdAt ||
    r.updated_at ||
    r.raw?.updated_at ||
    r.updatedAt;
  if (!timeStr) return 0;
  const t = new Date(timeStr).getTime();
  return isNaN(t) ? 0 : t;
}

function getRequestSequence(r) {
  if (!r) return 0;
  if (typeof r.id === "number" && !isNaN(r.id)) return r.id;
  if (typeof r.raw?.id === "number" && !isNaN(r.raw.id)) return r.raw.id;
  const rawId = String(r.id || r.request_id || r.raw?.id || r.raw?.request_id || "").trim();
  if (rawId) {
    const parts = rawId.split("-");
    const lastPart = parts[parts.length - 1];
    const parsed = parseInt(lastPart, 10);
    if (!isNaN(parsed)) return parsed;
    const digits = rawId.replace(/\D/g, "");
    if (digits) return parseInt(digits, 10);
  }
  return 0;
}

function compareRequestsLatestFirst(a, b) {
  const tA = getRequestTimestamp(a);
  const tB = getRequestTimestamp(b);
  if (tA > 0 && tB > 0 && Math.abs(tB - tA) > 1000) {
    return tB - tA;
  }
  if (tA > 0 && tB === 0) return -1;
  if (tB > 0 && tA === 0) return 1;
  const sA = getRequestSequence(a);
  const sB = getRequestSequence(b);
  if (sB !== sA) return sB - sA;
  return tB - tA;
}

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

    // Always return requests sorted latest first
    requests.sort(compareRequestsLatestFirst);

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

    // Workflow 1: Send email alert to Officer(s) that a new request was submitted
    try {
      const officerEmails = await getOfficerEmails();
      const engineerName =
        newRequest.created_by_name ||
        newRequest.created_by_username ||
        (req.user?.name || req.user?.username || "Departmental Engineer");

      console.log(`[Email] Dispatching new request alert (#${newRequest.request_id}) to ${officerEmails.length} officer(s): ${officerEmails.join(", ")}`);
      for (const email of officerEmails) {
        sendNewRequestSubmittedEmail({
          to: email,
          request: newRequest,
          engineerName,
        }).catch((err) => console.warn(`[Email] New request alert to officer (${email}) error:`, err.message));
      }
    } catch (e) {
      console.warn("New request email dispatch notice:", e.message);
    }
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

    // Workflow 1: Send email alert to Officer(s) that a request was officially submitted
    try {
      const officerEmails = await getOfficerEmails();
      const engineerName =
        request.created_by_name ||
        request.created_by_username ||
        (req.user?.name || req.user?.username || "Departmental Engineer");

      console.log(`[Email] Dispatching submitted request alert (#${request.request_id}) to ${officerEmails.length} officer(s): ${officerEmails.join(", ")}`);
      for (const email of officerEmails) {
        sendNewRequestSubmittedEmail({
          to: email,
          request,
          engineerName,
        }).catch((err) => console.warn(`[Email] Submitted request alert to officer (${email}) error:`, err.message));
      }
    } catch (e) {
      console.warn("Submit request email dispatch notice:", e.message);
    }
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

      // Workflow 4: Engineer and officer should get mail if an officer accepts a request of completed work
      try {
        const officer = req.user || fallbackStore.users.find((u) => u.id === officerId || (u.role && u.role.includes("OFFICER")));
        const officerEmail = officer?.email || "officer@rbps.com";
        const officerName = officer?.name || officer?.username || "Controlling Officer";
        const engineerEmail = await getEngineerEmail(request);

        // 1. Send confirmation to Officer
        if (officerEmail) {
          sendWorkVerifiedEmail({
            to: officerEmail,
            request,
            officerName,
            recipientRole: "OFFICER",
            feedback: request.officer_feedback,
          }).catch((err) => console.warn("[Email] Officer line restoration confirmation error:", err.message));
        }

        // 2. Send certification alert to Engineer
        if (engineerEmail) {
          sendWorkVerifiedEmail({
            to: engineerEmail,
            request,
            officerName,
            recipientRole: "ENGINEER",
            feedback: request.officer_feedback,
          }).catch((err) => console.warn("[Email] Engineer line restoration alert error:", err.message));
        }
      } catch (e) {
        console.warn("Work verification email dispatch error:", e.message);
      }

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
      const officerEmail = officer?.email || "officer@rbps.com";
      const officerName = officer?.name || officer?.username || "Controlling Officer";

      const targetReq = result.request || fallbackStore.maintenance_requests.find(
        (r) => (r.request_id && r.request_id.toUpperCase() === normReqId) ||
               String(r.id).trim().toUpperCase() === normReqId
      );
      if (targetReq) {
        const engineerEmail = await getEngineerEmail(targetReq);

        // Workflow 2: Engineer and officer should get mail if an officer accepts a request
        // 1. Send confirmation to Officer
        if (officerEmail) {
          sendWorkRequestApprovedEmail({
            to: officerEmail,
            request: targetReq,
            recipientRole: "OFFICER",
            officerName,
            feedback,
          }).catch((err) => console.warn("[Email] Officer approval email error:", err.message));
        }

        // 2. Send notification to Engineer
        if (engineerEmail) {
          sendWorkRequestApprovedEmail({
            to: engineerEmail,
            request: targetReq,
            recipientRole: "ENGINEER",
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

    // Send email to all Officer(s) (Workflow 3: Officer should get a mail if an engineering team adds completed work for request)
    try {
      const officerEmails = await getOfficerEmails();
      console.log(`[Email] Dispatching work completed alert (#${request.request_id || requestId}) to ${officerEmails.length} officer(s): ${officerEmails.join(", ")}`);

      for (const to of officerEmails) {
        sendWorkRequestCompletedEmail({
          to,
          request,
          engineerName: completionProof.completed_by,
          completionProof,
        }).catch((err) => console.warn(`[Email] Work completed email to officer (${to}) error:`, err.message));
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
