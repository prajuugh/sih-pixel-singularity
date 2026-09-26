// frontend/src/utils/api.js
import {
  mockUsers,
  mockRequests,
  mockDashboardStats,
  mockUpcomingMaintenance,
  mockTasksByDate,
  mockAdminStats,
  mockDepartmentUsage,
  mockActivity,
} from "./constants";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function delay(data, ms = 200) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function getTokenRole(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded));
    return decoded?.role ? String(decoded.role).toUpperCase() : null;
  } catch {
    return null;
  }
}

// ---- Auth ----
export async function loginRequest(username, password) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    console.warn("Backend auth offline, using fallback mock users:", err.message);
  }

  const cleanIdent = (username || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  let adminUsers = [];
  try {
    const stored = localStorage.getItem("rbps_admin_users");
    if (stored) adminUsers = JSON.parse(stored);
  } catch (e) {
    console.warn("Could not load rbps_admin_users in api.js", e);
  }

  const foundAdmin = adminUsers.find((u) => {
    const uname = (u.username || "").trim().toLowerCase();
    const uemail = (u.email || "").trim().toLowerCase();
    const unameDisplay = (u.name || "").trim().toLowerCase();
    const match = uname === cleanIdent || uemail === cleanIdent || unameDisplay === cleanIdent;
    const expected = (u.password || "123456").trim();
    return match && expected === cleanPassword;
  });

  if (foundAdmin) {
    const role = (foundAdmin.role || "").toLowerCase();
    const normalizedRole = role === "officer" ? "officer" : role === "admin" ? "admin" : "teams";
    return delay({ success: true, user: { ...foundAdmin, role: normalizedRole } });
  }

  const found = mockUsers.find(
    (u) =>
      ((u.username || "").trim().toLowerCase() === cleanIdent ||
        (u.email || "").trim().toLowerCase() === cleanIdent) &&
      u.password === cleanPassword
  );
  if (found) return delay({ success: true, user: found });
  return delay({ success: false, message: "Invalid username or password" });
}

function getAuthHeaders(defaultRole = "TEAMS") {
  const token = localStorage.getItem("rbps_token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("rbps_user") || "null");
  } catch {
    localStorage.removeItem("rbps_user");
  }

  const role = (user?.role || defaultRole).toUpperCase();
  const email = user?.email || (role === "OFFICER" ? "officer@rbps.com" : (role === "TEAMS" ? "teams@rbps.com" : "admin@rbps.com"));

  const headers = {
    "Content-Type": "application/json",
    "x-user-role": role,
    "x-user-email": email,
  };
  // The backend gives a valid JWT priority over the mock-user headers. Only
  // forward it when it belongs to the role currently active in the UI.
  if (token && getTokenRole(token) === role) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (token) {
    localStorage.removeItem("rbps_token");
  }
  return headers;
}

// ---- Requests ----
export async function fetchRequests() {
  try {
    const headers = getAuthHeaders("OFFICER");
    const res = await fetch(`${BASE_URL}/requests`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.requests) {
        // Return newest first
        const sorted = [...json.data.requests].reverse();
        return sorted.map((r) => {
          let uiStatus = r.status;
          if (r.status === "SUBMITTED") uiStatus = "Waiting for Approval";
          else if (r.status === "UNDER_REVIEW") uiStatus = "Waiting for Approval";
          else if (r.status === "REVISION_REQUIRED") uiStatus = "Revised Plan";
          else if (r.status === "APPROVED") uiStatus = "Approved";
          else if (r.status === "REJECTED") uiStatus = "Declined";
          else if (r.status === "COMPLETED" || r.status === "WORK_COMPLETED") uiStatus = "Completed";

          let uiStage = "Officer Review";
          if (r.status === "APPROVED") uiStage = "Scheduled";
          else if (r.status === "REVISION_REQUIRED") uiStage = "Plan Revised";
          else if (r.status === "REJECTED") uiStage = "Closed";
          else if (r.status === "COMPLETED" || r.status === "WORK_COMPLETED") uiStage = "Completed";

          return {
            id: r.request_id,
            type: r.task_type || "Maintenance Work",
            department: r.department,
            date: r.requested_date || r.from_date,
            status: uiStatus,
            reason: r.officer_feedback || r.description || "Submitted for planning evaluation.",
            stage: uiStage,
            updated: r.updated_at ? new Date(r.updated_at).toLocaleString() : r.requested_date,
            completionProof: r.completion_proof || null,
            completedAt: r.completion_proof?.completed_at || null,
            // Multi-Agent Block Plan fields
            agentPlan: r.agent_plan,
            priorityScore: r.priority_score ?? r.agent_plan?.priorityScore ?? (r.agent_plan?.schemaVersion === "2.0" ? null : 75),
            conflict: r.conflict !== undefined ? r.conflict : Boolean(r.agent_plan?.conflict),
            conflictingTrains: r.conflicting_trains || r.agent_plan?.conflictingTrains || [],
            recommendedBlock: r.recommended_block || r.agent_plan?.recommendedBlock || null,
            prohibitedWindow: r.prohibited_window || r.agent_plan?.prohibitedWindow || null,
            aiExplanation: r.ai_explanation || r.agent_plan?.explanation || "",
            alternatives: r.alternatives || r.agent_plan?.alternatives || [],
            raw: r,
          };
        });
      }
    }
  } catch (err) {
    console.warn("Using fallback mock requests:", err.message);
  }
  return delay(mockRequests);
}

export function buildRequestId(department, existingCount = 0) {
  const deptCode = String(department || "ENG").substring(0, 3).toUpperCase();
  return `${deptCode}-2026-${String(Number(existingCount) + 1).padStart(5, "0")}`;
}

export async function submitRequest(payload) {
  try {
    const headers = getAuthHeaders("TEAMS");
    const res = await fetch(`${BASE_URL}/requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      const requestId = json.data?.request_id || payload.requestId;
      return { success: true, requestId, data: json.data };
    }
    const errorBody = await res.json().catch(() => null);
    return {
      success: false,
      message: errorBody?.error?.message || `Request submission failed (${res.status})`,
    };
  } catch (err) {
    console.warn("Backend request submission unavailable:", err.message);
    return {
      success: false,
      message: "The request service is unavailable. Keep this form open and try again.",
    };
  }
}

export async function updateRequestStatus(requestId, status, decision = "APPROVED", feedback = "", alternativeId = null, prohibitedWindow = null, newWindow = null) {
  try {
    const headers = getAuthHeaders("OFFICER");
    const res = await fetch(`${BASE_URL}/requests/${requestId}/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        decision: decision.toUpperCase(),
        feedback: feedback || `Officer status changed to ${status}`,
        alternative_id: alternativeId,
        prohibited_window: prohibitedWindow,
        new_window: newWindow,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, data: json.data };
    }
  } catch (err) {
    console.warn("Backend status update offline, falling back:", err.message);
  }
  return delay({ success: true });
}

export async function submitWorkCompletion(requestId, completionData) {
  try {
    const headers = getAuthHeaders("TEAMS");
    const res = await fetch(`${BASE_URL}/requests/${requestId}/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify(completionData),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, data: json.data, message: json.message };
    }
    const errorBody = await res.json().catch(() => null);
    return { success: false, message: errorBody?.error?.message || "Failed to submit completion" };
  } catch (err) {
    console.warn("Backend submitWorkCompletion offline:", err.message);
    return { success: false, message: err.message };
  }
}

export async function verifyWorkCompletion(requestId, feedback = "Work completion verified and approved.") {
  return updateRequestStatus(requestId, "COMPLETED", "VERIFIED", feedback);
}

// ---- Railway Tracks & Train Information API ----
const LOCAL_TRACKS_URL = "/india_railways_network.geojson";
const REGIONAL_TRACKS_URL = "/karnataka_tracks.geojson";

function isTrackFeatureCollection(data) {
  return data?.type === "FeatureCollection" && Array.isArray(data.features) && data.features.length > 0;
}

// Returns GeoJSON FeatureCollection for India or regional network
export async function fetchTracks(scope = "india") {
  try {
    const q = scope ? `?scope=${scope}` : "";
    const res = await fetch(`${BASE_URL}/tracks${q}`);
    if (res.ok) {
      const data = await res.json();
      if (isTrackFeatureCollection(data)) return data;
    }
  } catch (err) {
    console.warn("Backend tracks offline, using local railway snapshot:", err.message);
  }

  const fallbackUrl = scope === "karnataka" ? REGIONAL_TRACKS_URL : LOCAL_TRACKS_URL;
  try {
    const fallbackResponse = await fetch(fallbackUrl);
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (isTrackFeatureCollection(fallbackData)) return fallbackData;
    }
  } catch (e) {}

  const fallbackResponse2 = await fetch("/railway_tracks.geojson");
  if (fallbackResponse2.ok) {
    const fallbackData2 = await fallbackResponse2.json();
    if (isTrackFeatureCollection(fallbackData2)) return fallbackData2;
  }
  throw new Error("Railway network snapshot unavailable");
}

export async function fetchTrainsList(paramsOrSearch = "", limit = 50, offset = 0) {
  try {
    let q = "";
    const isObject = typeof paramsOrSearch === "object" && paramsOrSearch !== null;
    if (isObject) {
      const p = new URLSearchParams();
      if (paramsOrSearch.search) p.append("search", paramsOrSearch.search);
      if (paramsOrSearch.type && paramsOrSearch.type !== "ALL") p.append("type", paramsOrSearch.type);
      if (paramsOrSearch.zone && paramsOrSearch.zone !== "ALL") p.append("zone", paramsOrSearch.zone);
      p.append("limit", paramsOrSearch.limit || limit || 50);
      p.append("offset", paramsOrSearch.offset || offset || 0);
      q = `?${p.toString()}`;
    } else {
      const searchStr = paramsOrSearch ? `&search=${encodeURIComponent(paramsOrSearch)}` : "";
      q = `?limit=${limit}&offset=${offset}${searchStr}`;
    }

    const res = await fetch(`${BASE_URL}/trains${q}`);
    if (res.ok) {
      const json = await res.json();
      if (isObject) {
        return json.data || { total: 0, count: 0, offset: 0, limit: 50, trains: [] };
      }
      return json.data?.trains || [];
    }
  } catch (err) {
    console.warn("Backend trains list offline:", err.message);
  }
  return typeof paramsOrSearch === "object" ? { total: 0, count: 0, offset: 0, limit: 50, trains: [] } : [];
}

// Returns upcoming scheduled departures based on current Indian Standard Time
export async function fetchUpcomingTrains({ zone = "ALL", type = "ALL", limit = 30 } = {}) {
  try {
    const p = new URLSearchParams();
    if (zone && zone !== "ALL") p.append("zone", zone);
    if (type && type !== "ALL") p.append("type", type);
    p.append("limit", limit);
    const res = await fetch(`${BASE_URL}/trains/upcoming?${p.toString()}`);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {
    console.warn("Backend upcoming trains offline:", err.message);
  }
  return [];
}

// Returns train schedules for a specific track segment
export async function fetchTrackSchedule(trackId, day) {
  try {
    const params = day ? `?day=${day}` : "";
    const res = await fetch(`${BASE_URL}/tracks/${trackId}/schedule${params}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend track schedule offline:", err.message);
  }
  return { trackId, schedules: [] };
}

// Returns live train positions across the network
export async function fetchLiveTrains(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.zone && params.zone !== "ALL") query.set("zone", params.zone);
    if (params.type && params.type !== "ALL") query.set("type", params.type);
    if (params.search) query.set("search", params.search);
    if (params.limit) query.set("limit", params.limit);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${BASE_URL}/trains/live${qs}`);
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (err) {
    console.warn("Backend live trains offline:", err.message);
  }
  return { success: false, total: 0, count: 0, data: [] };
}

// Returns live trains matched to a specific section
export async function fetchSectionLive(trackId) {
  try {
    const res = await fetch(`${BASE_URL}/tracks/${trackId}/live`);
    if (res.ok) {
      const json = await res.json();
      return json.trains || [];
    }
  } catch (err) {
    console.warn("Backend section live offline:", err.message);
  }
  return [];
}

// Returns route timetable stops for a specific train
export async function fetchTrainRoute(trainNo) {
  try {
    const res = await fetch(`${BASE_URL}/trains/${trainNo}/route`);
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn("Backend train route offline:", err.message);
  }
  return null;
}

// Search official Indian Railway stations
export async function fetchStations(search = "", limit = 20) {
  try {
    const q = search ? `&search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`${BASE_URL}/stations?limit=${limit}${q}`);
    if (res.ok) {
      const json = await res.json();
      return json.data?.stations || [];
    }
  } catch (err) {
    console.warn("Backend stations offline:", err.message);
  }
  return [];
}

export async function fetchTrackTraffic(trackId) {
  try {
    const res = await fetch(`${BASE_URL}/tracks/${trackId}/traffic`);
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn("Backend track traffic offline:", err.message);
  }
  return {
    trackId,
    scheduledTrains: [
      { train_no: "12627", train_name: "India Express", train_type: "SUPERFAST", source: "SBC Bengaluru", destination: "NDLS New Delhi", priority: 95 },
      { train_no: "G-BOXN-401", train_name: "Iron Ore Freight Special", train_type: "GOODS", source: "BAY Ballari", destination: "MAQ Mangaluru", priority: 40 },
    ],
    routeSegments: [
      { train_no: "12627", track_id: trackId, sequence: 15, arrival_time: "19:15", departure_time: "19:22" },
      { train_no: "G-BOXN-401", track_id: trackId, sequence: 8, arrival_time: "20:00", departure_time: "20:12" },
    ],
    goodsForecasts: [],
  };
}

export async function checkConflict(payload) {
  try {
    const res = await fetch(`${BASE_URL}/maintenance/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn("Backend conflict check offline:", err.message);
  }
  return { safe: false, conflicts: [{ trainNo: "12627", trainName: "India Express", arrival: "19:15", departure: "19:22" }] };
}

export async function fetchAgentPlan(payload) {
  // Planning always passes through the authenticated API boundary. The browser
  // never calls the Python service or fabricates an operational recommendation.
  try {
    const res = await fetch(`${BASE_URL}/planning/agent-plan`, {
      method: "POST",
      headers: getAuthHeaders("OFFICER"),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Planning API unavailable:", err.message);
  }

  const now = new Date().toISOString();
  return {
    schemaVersion: "2.0",
    runId: `frontend_degraded_${Date.now()}`,
    requestId: payload.requestId || null,
    status: "DEGRADED",
    priorityScore: null,
    breakdown: {},
    conflict: null,
    conflictingTrains: [],
    recommendedBlock: null,
    alternatives: [],
    explanation: "The planning API is unavailable. No operational recommendation was generated.",
    verification: {
      passed: false,
      checkedRules: ["PLANNING_API_AVAILABLE"],
      failedRules: [{ ruleId: "PLANNING_API_AVAILABLE", severity: "HARD", message: "The authenticated planning API is unavailable." }],
    },
    trace: [{
      stepId: "planning-api-1",
      agent: "agent-service",
      status: "FAILED",
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      inputArtifactIds: ["planning-request:v1"],
      outputArtifactIds: [],
      evidence: [],
      summary: "Planning API unavailable; execution stopped safely.",
      implementationVersion: "frontend-api@2.0.0",
    }],
    warnings: ["Retry when the backend planning API is healthy."],
    requiresHumanApproval: true,
  };
}

// ---- Other Dashboard Stats (Dynamically derived from live requests) ----
export async function fetchDashboardStats(role = "OFFICER") {
  const requests = await fetchRequests();
  const total = requests.length;

  const isVerified = (r) => Boolean(
    r.completionProof?.verified_by_officer ||
    r.raw?.completion_proof?.verified_by_officer ||
    r.raw?.status === "VERIFIED" ||
    r.status === "VERIFIED"
  );

  const isCompleted = (r) => Boolean(
    r.completionProof ||
    r.raw?.completion_proof ||
    r.status === "Completed" ||
    r.status === "COMPLETED" ||
    r.status === "WORK_COMPLETED"
  );

  const pending = requests.filter(
    (r) =>
      !isCompleted(r) &&
      (r.status === "Waiting for Approval" ||
      r.status === "AI Processing" ||
      r.status === "Revised Plan" ||
      r.status === "SUBMITTED" ||
      r.status === "UNDER_REVIEW")
  ).length;

  const awaitingVerification = requests.filter((r) => isCompleted(r) && !isVerified(r)).length;
  const verifiedRestored = requests.filter((r) => isVerified(r)).length;

  const approved = requests.filter(
    (r) => (r.status === "Approved" || r.status === "APPROVED") && !isCompleted(r)
  ).length;

  const isTeam = String(role || "").toUpperCase() === "TEAM" || String(role || "").toUpperCase() === "TEAMS";

  if (isTeam) {
    return [
      { key: "total", label: "Total Requests", value: total },
      { key: "pending", label: "Awaiting Approval", value: pending },
      { key: "approved", label: "Ready to Execute", value: approved },
      { key: "awaitingVerification", label: "Proof Submitted", value: awaitingVerification },
      { key: "verifiedRestored", label: "Line Restored", value: verifiedRestored },
    ];
  }

  return [
    { key: "total", label: "Total Requests", value: total },
    { key: "pending", label: "Pending Review", value: pending },
    { key: "approved", label: "Approved Blocks", value: approved },
    { key: "awaitingVerification", label: "Awaiting Verification", value: awaitingVerification },
    { key: "verifiedRestored", label: "Verified & Restored", value: verifiedRestored },
  ];
}

export async function fetchUpcomingMaintenance() {
  const requests = await fetchRequests();
  const relevant = requests.filter(
    (r) => r.status === "Approved" || r.status === "Waiting for Approval" || r.status === "Revised Plan" || r.status === "Completed"
  );

  return relevant.map((r) => {
    let day = "15";
    let month = "SEP";
    if (r.date) {
      try {
        const parts = r.date.includes("-") ? r.date.split("-") : [];
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            day = parts[2];
            const mIdx = parseInt(parts[1], 10) - 1;
            const mNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            month = mNames[mIdx] || "SEP";
          } else {
            day = parts[0];
            month = "SEP";
          }
        }
      } catch (e) {}
    }

    const startTime = r.recommendedBlock?.startTime || r.raw?.preferred_start_time || "19:00";
    const endTime = r.recommendedBlock?.endTime || r.raw?.preferred_end_time || "21:00";
    const trackId = r.raw?.track_ids?.[0] || r.raw?.track_id || r.agentPlan?.trackId || "Track";

    const isVerified = Boolean(
      r.completionProof?.verified_by_officer ||
      r.raw?.completion_proof?.verified_by_officer ||
      r.raw?.status === "VERIFIED" ||
      r.status === "VERIFIED"
    );

    const isCompleted = Boolean(
      r.completionProof ||
      r.raw?.completion_proof ||
      r.status === "Completed" ||
      r.status === "COMPLETED" ||
      r.status === "WORK_COMPLETED"
    );

    return {
      day,
      month,
      time: `${startTime}–${endTime}`,
      requestId: r.id,
      name: r.type,
      department: r.department || "Engineering",
      description: r.reason || r.raw?.description || "Maintenance track possession work",
      trackId,
      status: r.status,
      rawStatus: r.raw?.status || r.status,
      completionProof: r.completionProof,
      isVerified,
      isCompleted,
      conflict: r.conflict,
      priorityScore: r.priorityScore,
      raw: r.raw,
    };
  });
}

export async function fetchTasksByDate() {
  const requests = await fetchRequests();
  const tasksMap = {};

  for (const r of requests) {
    let dateKey = r.date;
    if (!dateKey) {
      dateKey = new Date().toISOString().split("T")[0];
    } else if (dateKey.includes("-")) {
      const parts = dateKey.split("-");
      if (parts[0].length !== 4 && parts.length === 3) {
        dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    if (!tasksMap[dateKey]) {
      tasksMap[dateKey] = [];
    }
    tasksMap[dateKey].push({
      id: r.id,
      name: r.type,
      department: r.department,
      description: r.reason || r.raw?.description || "Scheduled block maintenance",
    });
  }

  return tasksMap;
}

export function fetchAdminStats() { return delay(mockAdminStats); }
export function fetchDepartmentUsage() { return delay(mockDepartmentUsage); }
export function fetchRecentActivity() { return delay(mockActivity); }
export function fetchUsers() { return delay(mockUsers); }
export function createUser(form) { return delay({ success: true }); }
export function deleteUser(username) { return delay({ success: true }); }
