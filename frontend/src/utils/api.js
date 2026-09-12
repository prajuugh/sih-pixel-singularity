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

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl !== "http://localhost:5000/api") {
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location) {
    // Only connect directly to localhost:5000 if developing locally on Vite port 5173
    if (window.location.hostname === "localhost" && window.location.port === "5173") {
      return "http://localhost:5000/api";
    }
    // In Docker Nginx, Cloudflare tunnel, and production, use relative /api
    return "/api";
  }
  return "/api";
}

export const BASE_URL = resolveApiBaseUrl();
export const AGENT_URL = import.meta.env.VITE_AGENT_BASE_URL || "/api/planning/agent-plan";

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

  const found = mockUsers.find(
    (u) => u.username === username && u.password === password
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
          else if (r.status === "COMPLETED") uiStatus = "Completed";

          let uiStage = "Officer Review";
          if (r.status === "APPROVED") uiStage = "Scheduled";
          else if (r.status === "REVISION_REQUIRED") uiStage = "Plan Revised";
          else if (r.status === "REJECTED") uiStage = "Closed";
          else if (r.status === "COMPLETED") uiStage = "Completed";

          return {
            id: r.request_id,
            type: r.task_type || "Maintenance Work",
            department: r.department,
            date: r.requested_date || r.from_date,
            status: uiStatus,
            reason: r.officer_feedback || r.description || "Submitted for planning evaluation.",
            stage: uiStage,
            updated: r.updated_at ? new Date(r.updated_at).toLocaleString() : r.requested_date,
            // Multi-Agent Block Plan fields
            agentPlan: r.agent_plan,
            priorityScore: r.priority_score ?? r.agent_plan?.priorityScore ?? 75,
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

export async function updateRequestStatus(requestId, status, decision = "APPROVED", feedback = "", alternativeId = null, prohibitedWindow = null) {
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

// ---- Railway Tracks & Train Information API ----

const LOCAL_TRACKS_URL = "/railway_tracks.geojson";

function isTrackFeatureCollection(data) {
  return data?.type === "FeatureCollection" && Array.isArray(data.features) && data.features.length > 0;
}

// Returns the full GeoJSON FeatureCollection. The checked-in snapshot keeps the
// map usable when the API service is not running (for example in a frontend-only demo).
export async function fetchTracks() {
  try {
    const res = await fetch(`${BASE_URL}/tracks`);
    if (res.ok) {
      const data = await res.json();
      if (isTrackFeatureCollection(data)) return data;
    }
  } catch (err) {
    console.warn("Backend tracks offline, using local railway snapshot:", err.message);
  }

  const fallbackResponse = await fetch(LOCAL_TRACKS_URL);
  if (!fallbackResponse.ok) {
    throw new Error(`Railway snapshot unavailable (${fallbackResponse.status})`);
  }
  const fallbackData = await fallbackResponse.json();
  if (!isTrackFeatureCollection(fallbackData)) {
    throw new Error("Railway snapshot contains no track segments");
  }
  return fallbackData;
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
  // 1. First try through Node backend proxy (port 5000)
  try {
    const res = await fetch(`${BASE_URL}/planning/agent-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // try direct
  }

  // 2. Try direct Python agent service (port 5001)
  try {
    const res = await fetch(`${AGENT_URL}/agent/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Python agent offline:", err.message);
  }

  return {
    priorityScore: 78,
    breakdown: { safety: 85, criticality: 80, urgency: 75, overdue: 60, failureProbability: 65 },
    conflict: false,
    conflictingTrains: [],
    recommendedBlock: { date: payload.planningDate || "2026-09-15", startTime: "19:00", endTime: "20:30", trackId: payload.trackId || "KA-T-000342" },
    alternatives: [
      { id: 1, type: "DIRECT CLEARANCE", description: `Sanction window directly on ${payload.trackId}. No passenger conflict.`, delayMinutes: 0, rank: 1 },
      { id: 2, type: "SHADOW CLUSTERING", description: "Cluster multi-department S&T + Electrical maintenance during window.", delayMinutes: 0, rank: 2 },
    ],
    explanation: `MCDA Priority Score: 78/100 for ${payload.trackId}. Direct maintenance clearance recommended.`,
  };
}

// ---- Other Dashboard Stats (Dynamically derived from live requests) ----
export async function fetchDashboardStats() {
  const requests = await fetchRequests();
  const total = requests.length;
  const pending = requests.filter(
    (r) =>
      r.status === "Waiting for Approval" ||
      r.status === "AI Processing" ||
      r.status === "Revised Plan" ||
      r.status === "SUBMITTED" ||
      r.status === "UNDER_REVIEW"
  ).length;
  const approved = requests.filter(
    (r) => r.status === "Approved" || r.status === "APPROVED" || r.status === "Completed"
  ).length;
  const active = requests.filter(
    (r) => r.status === "Approved" || r.stage === "Scheduled" || r.status === "SCHEDULED"
  ).length;

  return [
    { key: "total", label: "Total Requests", value: total },
    { key: "pending", label: "Pending Requests", value: pending },
    { key: "approved", label: "Approved Requests", value: approved },
    { key: "active", label: "Active Work", value: active },
  ];
}

export async function fetchUpcomingMaintenance() {
  const requests = await fetchRequests();
  const relevant = requests.filter(
    (r) => r.status === "Approved" || r.status === "Waiting for Approval" || r.status === "Revised Plan"
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

    return {
      day,
      month,
      time: `${startTime} - ${endTime}`,
      requestId: r.id,
      name: r.type,
      department: r.department || "Engineering",
      description: r.reason || r.raw?.description || "Maintenance track possession work",
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
export async function fetchUsers() {
  try {
    const headers = getAuthHeaders("ADMIN");
    const res = await fetch(`${BASE_URL}/users`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data.users)) {
        return json.data.users;
      }
    }
  } catch (err) {
    console.warn("Backend fetchUsers unavailable, using mock:", err.message);
  }
  return delay(mockUsers);
}

export async function createUser(form) {
  try {
    const headers = getAuthHeaders("ADMIN");
    const res = await fetch(`${BASE_URL}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role || "Teams",
        department: form.department || "—",
      }),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, data: json.data?.user };
    }
    const errBody = await res.json().catch(() => null);
    return {
      success: false,
      message: errBody?.error?.message || `Failed to create user (${res.status})`,
    };
  } catch (err) {
    console.warn("Backend createUser unavailable:", err.message);
    return {
      success: false,
      message: "User service is unavailable. Keep this form open and try again.",
    };
  }
}

export function deleteUser(username) { return delay({ success: true }); }

